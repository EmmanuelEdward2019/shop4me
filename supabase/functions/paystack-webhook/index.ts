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

    // Handle different event types
    switch (event.event) {
      case 'charge.success': {
        const transaction = event.data;
        const reference = transaction.reference;
        
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
          .select('order_id, user_id')
          .single();

        if (paymentError) {
          console.error('Failed to update payment:', paymentError);
          break;
        }

        // Update order status to paid
        if (payment?.order_id) {
          await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', payment.order_id);
          
          console.log(`Order ${payment.order_id} marked as paid`);
        }
        break;
      }

      case 'charge.failed': {
        const transaction = event.data;
        const reference = transaction.reference;
        
        console.log(`Processing failed charge for reference: ${reference}`);

        await supabase
          .from('payments')
          .update({
            status: 'failed',
            provider_response: transaction,
          })
          .eq('provider_reference', reference);
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
