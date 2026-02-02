import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // If payment successful, update order status
    if (newStatus === 'success' && payment.order_id) {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', payment.order_id);

      if (orderError) {
        console.error('Failed to update order status:', orderError);
      }

      // Add funds to user wallet (if needed for the service)
      // This could be credit for refunds, etc.
      console.log(`Payment ${payment.id} successful for order ${payment.order_id}`);
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
