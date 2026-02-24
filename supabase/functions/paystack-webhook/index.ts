import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    // Helper to send notification emails (fire-and-forget)
    async function sendNotificationEmail(type: string, data: Record<string, any>) {
      if (!RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not set, skipping email notification');
        return;
      }
      try {
        const url = `${supabaseUrl}/functions/v1/send-notification-email`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ type, data }),
        });
        const result = await res.json();
        if (!res.ok) console.error(`Email notification (${type}) failed:`, result);
        else console.log(`Email notification (${type}) sent successfully`);
      } catch (e) {
        console.error(`Email notification (${type}) error:`, e);
      }
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

        // Update payment record
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'success',
            payment_method: transaction.channel,
            provider_response: transaction,
          })
          .eq('provider_reference', reference)
          .select('order_id, user_id, amount, payment_method')
          .single();

        if (paymentError) {
          console.error('Failed to update payment:', paymentError);
          break;
        }

        // Get buyer profile for emails
        const buyerProfile = payment ? await getProfile(payment.user_id) : null;

        // Handle wallet topup using atomic function
        if (payment?.payment_method === 'wallet_topup' && metadata.type === 'wallet_topup') {
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
            // Send wallet topup email
            if (buyerProfile?.email) {
              sendNotificationEmail('wallet_topup', {
                email: buyerProfile.email,
                name: buyerProfile.full_name,
                amount: payment.amount,
                newBalance: walletResult?.new_balance,
                reference,
              });
            }
          }
        }

        // Update order status to paid
        if (payment?.order_id) {
          // Get order details for email
          const { data: order } = await supabase
            .from('orders')
            .select('location_name, agent_id')
            .eq('id', payment.order_id)
            .single();

          await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', payment.order_id);
          
          console.log(`Order ${payment.order_id} marked as paid`);

          // Send payment success email to buyer
          if (buyerProfile?.email) {
            sendNotificationEmail('payment_success', {
              email: buyerProfile.email,
              name: buyerProfile.full_name,
              amount: payment.amount,
              orderId: payment.order_id,
              locationName: order?.location_name,
              reference,
            });
          }

          // Send email to agent
          if (order?.agent_id) {
            const agentProfile = await getProfile(order.agent_id);
            if (agentProfile?.email) {
              sendNotificationEmail('order_paid_agent', {
                email: agentProfile.email,
                name: agentProfile.full_name,
                amount: payment.amount,
                orderId: payment.order_id,
                locationName: order.location_name,
                buyerName: buyerProfile?.full_name || 'A buyer',
              });
            }
          }

          // Send email to admin(s)
          const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
          if (adminRoles && adminRoles.length > 0) {
            for (const admin of adminRoles) {
              const adminProfile = await getProfile(admin.user_id);
              if (adminProfile?.email) {
                const agentProfile = order?.agent_id ? await getProfile(order.agent_id) : null;
                sendNotificationEmail('order_paid_admin', {
                  email: adminProfile.email,
                  amount: payment.amount,
                  orderId: payment.order_id,
                  locationName: order?.location_name,
                  buyerName: buyerProfile?.full_name,
                  agentName: agentProfile?.full_name,
                });
              }
            }
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

        // Send failure email to buyer
        if (failedPayment) {
          const failedBuyer = await getProfile(failedPayment.user_id);
          if (failedBuyer?.email) {
            sendNotificationEmail('payment_failed', {
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
