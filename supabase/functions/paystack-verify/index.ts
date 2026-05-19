import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createNotification, getAdminUserIds } from "../_shared/notifications.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      throw new Error('Payment service not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { reference } = await req.json();

    if (!reference) {
      throw new Error('Missing payment reference');
    }

    console.log(`Verifying payment reference: ${reference}`);

    // Verify with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.error('Paystack verification failed:', paystackData);
      throw new Error(paystackData.message || 'Payment verification failed');
    }

    const transaction = paystackData.data;
    console.log('Paystack verification result:', transaction.status);

    // Find the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, orders(id, user_id, status)')
      .eq('provider_reference', reference)
      .single();

    if (paymentError || !payment) {
      console.error('Payment record not found:', paymentError);
      throw new Error('Payment record not found');
    }

    // Determine new payment status
    let newStatus = 'pending';
    if (transaction.status === 'success') {
      newStatus = 'success';
    } else if (transaction.status === 'failed' || transaction.status === 'abandoned') {
      newStatus = 'failed';
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        payment_method: transaction.channel, // 'card', 'bank', 'ussd', etc.
        provider_response: transaction,
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Failed to update payment record:', updateError);
    }

    // If payment successful, handle based on payment type
    if (newStatus === 'success' && payment.status !== 'success') {
      // Save card authorization if available
      if (transaction.authorization && transaction.authorization.reusable) {
        const auth = transaction.authorization;
        
        // Check if card already exists
        const { data: existingCard } = await supabase
          .from('payment_cards')
          .select('id')
          .eq('user_id', payment.user_id)
          .eq('last4', auth.last4)
          .eq('exp_month', auth.exp_month)
          .eq('exp_year', auth.exp_year)
          .maybeSingle();

        if (!existingCard) {
          const { count } = await supabase
            .from('payment_cards')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', payment.user_id);

          await supabase
            .from('payment_cards')
            .insert({
              user_id: payment.user_id,
              authorization_code: auth.authorization_code,
              card_type: auth.card_type || 'unknown',
              last4: auth.last4,
              exp_month: auth.exp_month,
              exp_year: auth.exp_year,
              bank: auth.bank,
              brand: auth.brand,
              is_default: count === 0,
            });
        }
      }

      if (payment.order_id) {
        // Order payment - update order status. The matching `payments` row
        // is what shows up in the admin dashboard; we do NOT touch the
        // wallet balance for direct Paystack order payments.
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', payment.order_id);
        if (orderUpdateError) {
          console.error('Failed to update order status:', orderUpdateError);
        }

        console.log(`Payment ${payment.id} successful for order ${payment.order_id}`);

        // Send emails + in-app notifications — awaited so the Deno isolate
        // isn't suspended mid-fetch. Only reaches here when the webhook
        // hasn't already processed this payment.
        try {
          const [buyerProfile, orderRow, adminIds] = await Promise.all([
            supabase.from('profiles').select('email, full_name').eq('user_id', payment.user_id).maybeSingle(),
            supabase.from('orders').select('agent_id, location_name, estimated_total').eq('id', payment.order_id).maybeSingle(),
            getAdminUserIds(supabase),
          ]);

          const order = orderRow.data;
          const amount = transaction.amount / 100;
          const amountStr = `₦${amount.toLocaleString('en-NG')}`;
          const orderShort = String(payment.order_id).slice(0, 8);
          const buyerName = buyerProfile.data?.full_name || 'A buyer';
          const emailTasks: Promise<unknown>[] = [];

          const postEmail = (type: string, data: Record<string, any>) => {
            emailTasks.push(
              fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'apikey': supabaseServiceKey,
                },
                body: JSON.stringify({ type, data }),
              }).then(async (r) => {
                const j = await r.json().catch(() => ({}));
                if (!r.ok) console.error(`Email (${type}) failed [${r.status}]:`, JSON.stringify(j));
                else console.log(`Email (${type}) sent: id=${(j as any)?.emailId || "?"}`);
              }).catch((e) => console.error(`Email (${type}) error:`, e))
            );
          };

          // In-app: buyer
          emailTasks.push(
            createNotification(supabase, {
              userId: payment.user_id,
              type: 'order_payment_success',
              title: 'Payment successful',
              body: `${amountStr} payment confirmed for your order${order?.location_name ? ` at ${order.location_name}` : ''}.`,
              link: `/dashboard/orders/${payment.order_id}`,
              data: { orderId: payment.order_id, amount, reference, source: 'paystack' },
            })
          );

          if (buyerProfile.data?.email) {
            postEmail('payment_success', { email: buyerProfile.data.email, name: buyerProfile.data.full_name, orderId: payment.order_id, amount, locationName: order?.location_name, reference });
          }

          let agentName: string | null = null;
          if (order?.agent_id) {
            const agentProfile = await supabase.from('profiles').select('email, full_name').eq('user_id', order.agent_id).maybeSingle();
            agentName = agentProfile.data?.full_name || null;
            emailTasks.push(
              createNotification(supabase, {
                userId: order.agent_id,
                type: 'order_paid',
                title: 'Order paid — start delivery',
                body: `${buyerName} paid ${amountStr} for order #${orderShort}${order?.location_name ? ` at ${order.location_name}` : ''}.`,
                link: `/agent/orders/${payment.order_id}`,
                data: { orderId: payment.order_id, amount, source: 'paystack' },
              })
            );
            if (agentProfile.data?.email) {
              postEmail('order_paid_agent', { email: agentProfile.data.email, name: agentProfile.data.full_name, orderId: payment.order_id, amount, buyerName: buyerProfile.data?.full_name, locationName: order.location_name });
            }
          }

          for (const adminUserId of adminIds) {
            emailTasks.push(
              createNotification(supabase, {
                userId: adminUserId,
                type: 'order_paid_admin',
                title: `Order paid (Paystack) — ${amountStr}`,
                body: `${buyerName} paid ${amountStr} for order #${orderShort}${order?.location_name ? ` at ${order.location_name}` : ''}.`,
                link: `/admin/orders/${payment.order_id}`,
                data: { orderId: payment.order_id, amount, source: 'paystack', buyerId: payment.user_id, agentId: order?.agent_id ?? null },
              })
            );
            const adminProfile = await supabase.from('profiles').select('email').eq('user_id', adminUserId).maybeSingle();
            if (adminProfile.data?.email) {
              postEmail('order_paid_admin', { email: adminProfile.data.email, orderId: payment.order_id, amount, buyerName: buyerProfile.data?.full_name, agentName, locationName: order?.location_name });
            }
          }

          await Promise.allSettled(emailTasks);
        } catch (e) { console.error('Email dispatch error (order payment):', e); }
      } else if (payment.payment_method === 'wallet_topup') {
        // Wallet topup - credit using atomic RPC
        const { data: walletResult, error: walletRpcError } = await supabase.rpc(
          'update_wallet_balance',
          {
            p_user_id: payment.user_id,
            p_amount: transaction.amount / 100,
            p_type: 'credit',
            p_description: 'Wallet topup via Paystack',
            p_reference: reference,
          }
        );

        if (walletRpcError) {
          console.error('Failed to credit wallet:', walletRpcError);
        } else {
          console.log(`Wallet credited via verify, new balance: ${walletResult?.new_balance}`);
        }

        // Send emails + in-app notifications — awaited so the Deno isolate
        // isn't suspended mid-fetch. Only reaches here when the webhook
        // hasn't already processed this payment.
        try {
          const amount = transaction.amount / 100;
          const amountStr = `₦${amount.toLocaleString('en-NG')}`;
          const newBalance = walletResult?.new_balance;
          const [buyerProfile, adminIds] = await Promise.all([
            supabase.from('profiles').select('email, full_name').eq('user_id', payment.user_id).maybeSingle(),
            getAdminUserIds(supabase),
          ]);
          const emailTasks: Promise<unknown>[] = [];

          const postEmail = (type: string, data: Record<string, any>) => {
            emailTasks.push(
              fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'apikey': supabaseServiceKey,
                },
                body: JSON.stringify({ type, data }),
              }).then(async (r) => {
                const j = await r.json().catch(() => ({}));
                if (!r.ok) console.error(`Email (${type}) failed [${r.status}]:`, JSON.stringify(j));
                else console.log(`Email (${type}) sent: id=${(j as any)?.emailId || "?"}`);
              }).catch((e) => console.error(`Email (${type}) error:`, e))
            );
          };

          // In-app: buyer
          emailTasks.push(
            createNotification(supabase, {
              userId: payment.user_id,
              type: 'wallet_topup',
              title: 'Wallet funded',
              body: `${amountStr} added to your wallet. New balance: ₦${Number(newBalance ?? 0).toLocaleString('en-NG')}.`,
              link: '/dashboard/wallet',
              data: { amount, newBalance, reference },
            })
          );

          if (buyerProfile.data?.email) {
            postEmail('wallet_topup', { email: buyerProfile.data.email, name: buyerProfile.data.full_name, amount, newBalance, reference });
          }

          for (const adminUserId of adminIds) {
            emailTasks.push(
              createNotification(supabase, {
                userId: adminUserId,
                type: 'wallet_topup_admin',
                title: `Wallet topup — ${amountStr}`,
                body: `${buyerProfile.data?.full_name || 'A user'} topped up ${amountStr}.`,
                link: '/admin/payments',
                data: { amount, buyerId: payment.user_id, reference },
              })
            );
            const adminProfile = await supabase.from('profiles').select('email').eq('user_id', adminUserId).maybeSingle();
            if (adminProfile.data?.email) {
              postEmail('wallet_topup_admin', { email: adminProfile.data.email, amount, newBalance, buyerName: buyerProfile.data?.full_name, buyerEmail: buyerProfile.data?.email, reference });
            }
          }

          await Promise.allSettled(emailTasks);
        } catch (e) { console.error('Email dispatch error (wallet topup):', e); }
      }
    } else if (newStatus === 'success' && payment.status === 'success') {
      console.log('Payment already processed (likely by webhook), skipping');
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
        transaction: {
          amount: transaction.amount / 100, // Convert from kobo
          currency: transaction.currency,
          channel: transaction.channel,
          paid_at: transaction.paid_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
