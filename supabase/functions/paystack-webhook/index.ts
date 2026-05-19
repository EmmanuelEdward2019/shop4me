import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createNotification, getAdminUserIds } from "../_shared/notifications.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

// HMAC-SHA512 helper using Web Crypto API
async function verifySignature(secret: string, payload: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex === signature;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      throw new Error('Webhook not configured');
    }

    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    
    if (!signature) {
      console.error('Missing webhook signature');
      return new Response('Missing signature', { status: 401 });
    }
    
    const isValid = await verifySignature(paystackSecretKey, body, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('Received Paystack webhook:', event.event);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Collect background tasks (emails + push) to await before responding,
    // so Deno doesn't suspend the isolate and cancel in-flight fetches.
    const backgroundTasks: Promise<unknown>[] = [];

    // Helper to send notification emails — returns the promise so callers can
    // push it onto backgroundTasks. The downstream send-notification-email
    // function checks RESEND_API_KEY itself, so we don't gate on it here.
    async function sendNotificationEmail(type: string, data: Record<string, any>): Promise<void> {
      try {
        const url = `${supabaseUrl}/functions/v1/send-notification-email`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({ type, data }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) console.error(`Email notification (${type}) failed [${res.status}]:`, result);
        else console.log(`Email notification (${type}) sent: id=${result?.emailId || "?"}`);
      } catch (e) {
        console.error(`Email notification (${type}) error:`, e);
      }
    }

    // Wrapper that auto-tracks the promise so we can await all at the end.
    function queueEmail(type: string, data: Record<string, any>): void {
      backgroundTasks.push(sendNotificationEmail(type, data));
    }

    // Helper to get profile
    async function getProfile(userId: string) {
      const { data } = await supabase.from('profiles').select('full_name, email').eq('user_id', userId).single();
      return data;
    }

    // Handle different event types
    switch (event.event) {
      case 'charge.success': {
        const transaction = event.data;
        const reference = transaction.reference;
        const metadata = transaction.metadata || {};
        
        console.log(`Processing successful charge for reference: ${reference}`);

        // Fetch original payment record BEFORE updating (to preserve original payment_method)
        const { data: originalPayment, error: fetchError } = await supabase
          .from('payments')
          .select('id, order_id, user_id, amount, payment_method')
          .eq('provider_reference', reference)
          .single();

        if (fetchError || !originalPayment) {
          console.error('Failed to find payment:', fetchError);
          break;
        }

        // Now update the payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'success',
            payment_method: originalPayment.payment_method === 'wallet_topup' ? 'wallet_topup' : transaction.channel,
            provider_response: transaction,
          })
          .eq('id', originalPayment.id);

        if (paymentError) {
          console.error('Failed to update payment:', paymentError);
        }

        const payment = originalPayment;

        // Get buyer profile for emails
        const buyerProfile = await getProfile(payment.user_id);

        // Handle wallet topup using atomic function. Topups are explicitly
        // flagged with `payment_method = 'wallet_topup'` (or via metadata) —
        // direct order payments via Paystack never reach this branch, so
        // those amounts never get added to the wallet balance.
        if (payment.payment_method === 'wallet_topup' || metadata.type === 'wallet_topup') {
          console.log(`Processing wallet topup for user ${payment.user_id}, amount: ${payment.amount}`);

          const { data: walletResult, error: walletError } = await supabase.rpc(
            'update_wallet_balance',
            {
              p_user_id: payment.user_id,
              p_amount: payment.amount,
              p_type: 'credit',
              p_description: 'Wallet topup via Paystack',
              p_reference: reference,
            }
          );

          if (walletError) {
            console.error('Failed to update wallet balance:', walletError);
          } else {
            console.log(`Wallet credited successfully, new balance: ${walletResult?.new_balance}`);
            // In-app notification for buyer
            backgroundTasks.push(
              createNotification(supabase, {
                userId: payment.user_id,
                type: 'wallet_topup',
                title: 'Wallet funded',
                body: `₦${Number(payment.amount).toLocaleString('en-NG')} added to your wallet. New balance: ₦${Number(walletResult?.new_balance ?? 0).toLocaleString('en-NG')}.`,
                link: '/dashboard/wallet',
                data: { amount: payment.amount, newBalance: walletResult?.new_balance, reference },
              })
            );
            // Send wallet topup email to user
            if (buyerProfile?.email) {
              queueEmail('wallet_topup', {
                email: buyerProfile.email,
                name: buyerProfile.full_name,
                amount: payment.amount,
                newBalance: walletResult?.new_balance,
                reference,
              });
            }

            // Send wallet topup notification to admin(s)
            const { data: adminRolesWallet } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
            if (adminRolesWallet && adminRolesWallet.length > 0) {
              for (const admin of adminRolesWallet) {
                backgroundTasks.push(
                  createNotification(supabase, {
                    userId: admin.user_id,
                    type: 'wallet_topup_admin',
                    title: `Wallet topup — ₦${Number(payment.amount).toLocaleString('en-NG')}`,
                    body: `${buyerProfile?.full_name || 'A user'} topped up ₦${Number(payment.amount).toLocaleString('en-NG')}.`,
                    link: '/admin/payments',
                    data: { amount: payment.amount, buyerId: payment.user_id, reference },
                  })
                );
                const adminProfile = await getProfile(admin.user_id);
                if (adminProfile?.email) {
                  queueEmail('wallet_topup_admin', {
                    email: adminProfile.email,
                    amount: payment.amount,
                    newBalance: walletResult?.new_balance,
                    buyerName: buyerProfile?.full_name || 'A user',
                    buyerEmail: buyerProfile?.email,
                    reference,
                  });
                }
              }
            }
          }
        }

        // Update order status to paid. Direct paystack order payments are
        // recorded as a `payments` row (visible in admin dashboard) but
        // never touch the wallet balance.
        if (payment?.order_id) {
          // Get order details for email
          const { data: order } = await supabase
            .from('orders')
            .select('location_name, agent_id')
            .eq('id', payment.order_id)
            .single();

          const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', payment.order_id);
          if (orderUpdateError) {
            console.error('Failed to update order status:', orderUpdateError);
          } else {
            console.log(`Order ${payment.order_id} marked as paid`);
          }

          const amountStr = `₦${Number(payment.amount).toLocaleString('en-NG')}`;
          const orderShort = String(payment.order_id).slice(0, 8);
          const buyerName = buyerProfile?.full_name || 'A buyer';

          // In-app notification: buyer
          backgroundTasks.push(
            createNotification(supabase, {
              userId: payment.user_id,
              type: 'order_payment_success',
              title: 'Payment successful',
              body: `${amountStr} payment confirmed for your order${order?.location_name ? ` at ${order.location_name}` : ''}.`,
              link: `/dashboard/orders/${payment.order_id}`,
              data: { orderId: payment.order_id, amount: payment.amount, reference, source: 'paystack' },
            })
          );

          // Send payment success email to buyer
          if (buyerProfile?.email) {
            queueEmail('payment_success', {
              email: buyerProfile.email,
              name: buyerProfile.full_name,
              amount: payment.amount,
              orderId: payment.order_id,
              locationName: order?.location_name,
              reference,
            });
          }

          // Send email + in-app to agent
          if (order?.agent_id) {
            backgroundTasks.push(
              createNotification(supabase, {
                userId: order.agent_id,
                type: 'order_paid',
                title: 'Order paid — start delivery',
                body: `${buyerName} paid ${amountStr} for order #${orderShort}${order?.location_name ? ` at ${order.location_name}` : ''}.`,
                link: `/agent/orders/${payment.order_id}`,
                data: { orderId: payment.order_id, amount: payment.amount, source: 'paystack' },
              })
            );
            const agentProfile = await getProfile(order.agent_id);
            if (agentProfile?.email) {
              queueEmail('order_paid_agent', {
                email: agentProfile.email,
                name: agentProfile.full_name,
                amount: payment.amount,
                orderId: payment.order_id,
                locationName: order.location_name,
                buyerName,
              });
            }
          }

          // Send email + in-app to admin(s) + push to agent and admins
          const adminUserIds = await getAdminUserIds(supabase);
          for (const adminUserId of adminUserIds) {
            backgroundTasks.push(
              createNotification(supabase, {
                userId: adminUserId,
                type: 'order_paid_admin',
                title: `Order paid (Paystack) — ${amountStr}`,
                body: `${buyerName} paid ${amountStr} for order #${orderShort}${order?.location_name ? ` at ${order.location_name}` : ''}.`,
                link: `/admin/orders/${payment.order_id}`,
                data: { orderId: payment.order_id, amount: payment.amount, source: 'paystack', buyerId: payment.user_id, agentId: order?.agent_id ?? null },
              })
            );
            const adminProfile = await getProfile(adminUserId);
            if (adminProfile?.email) {
              const agentProfile = order?.agent_id ? await getProfile(order.agent_id) : null;
              queueEmail('order_paid_admin', {
                email: adminProfile.email,
                amount: payment.amount,
                orderId: payment.order_id,
                locationName: order?.location_name,
                buyerName: buyerProfile?.full_name,
                agentName: agentProfile?.full_name,
              });
            }
          }

          // Push notifications: alert agent and all admins that payment was made
          const pushTargets = [
            ...(order?.agent_id ? [order.agent_id] : []),
            ...adminUserIds,
          ];
          if (pushTargets.length > 0) {
            backgroundTasks.push(
              fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'apikey': supabaseServiceKey,
                },
                body: JSON.stringify({
                  userIds: pushTargets,
                  title: 'Payment Received!',
                  body: `${buyerProfile?.full_name || 'A buyer'} paid for their order at ${order?.location_name || 'a store'}.`,
                  url: `/agent/orders/${payment.order_id}`,
                }),
              }).catch((e) => console.error('Push notification error:', e))
            );
          }
        }
        break;
      }

      case 'charge.failed': {
        const transaction = event.data;
        const reference = transaction.reference;
        
        console.log(`Processing failed charge for reference: ${reference}`);

        const { data: failedPayment } = await supabase
          .from('payments')
          .update({
            status: 'failed',
            provider_response: transaction,
          })
          .eq('provider_reference', reference)
          .select('user_id, amount')
          .single();

        // Send failure email + in-app notification to buyer
        if (failedPayment) {
          backgroundTasks.push(
            createNotification(supabase, {
              userId: failedPayment.user_id,
              type: 'payment_failed',
              title: 'Payment failed',
              body: `Your payment of ₦${Number(failedPayment.amount).toLocaleString('en-NG')} could not be processed. Please try again.`,
              link: '/dashboard/orders',
              data: { reference, amount: failedPayment.amount },
            })
          );
          const failedBuyer = await getProfile(failedPayment.user_id);
          if (failedBuyer?.email) {
            queueEmail('payment_failed', {
              email: failedBuyer.email,
              name: failedBuyer.full_name,
              amount: failedPayment.amount,
              reference,
            });
          }
        }
        break;
      }

      case 'transfer.success': {
        // Handle successful payout to agents
        const transfer = event.data;
        console.log(`Transfer successful: ${transfer.reference}`);
        break;
      }

      case 'transfer.failed': {
        // Handle failed payout
        const transfer = event.data;
        console.log(`Transfer failed: ${transfer.reference}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    // Wait for all queued emails / push notifications to complete before
    // responding, so the Deno isolate isn't suspended mid-fetch.
    if (backgroundTasks.length > 0) {
      await Promise.allSettled(backgroundTasks);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
