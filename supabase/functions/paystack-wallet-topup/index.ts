import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WalletTopupRequest {
  amount: number;
  email: string;
  callbackUrl?: string;
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
      throw new Error('Payment service not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Not authenticated');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Invalid authentication');
    }

    const { amount, email, callbackUrl } = await req.json() as WalletTopupRequest;

    if (!amount || amount < 100) {
      throw new Error('Minimum amount is ₦100');
    }

    if (!email) {
      throw new Error('Email is required');
    }

    console.log(`Initializing wallet topup for user ${user.id}, amount: ${amount}`);

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet not found:', walletError);
      throw new Error('Wallet not found');
    }

    // Create a unique reference for this topup
    const reference = `wallet_${wallet.id}_${Date.now()}`;

    // Create payment record (without order_id for wallet topup)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: 'NGN',
        status: 'pending',
        provider: 'paystack',
        provider_reference: reference,
        payment_method: 'wallet_topup',
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      throw new Error('Failed to initialize payment');
    }

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack uses kobo
        reference: reference,
        callback_url: callbackUrl || `${req.headers.get('origin')}/dashboard/wallet?verify=${reference}`,
        metadata: {
          payment_id: payment.id,
          user_id: user.id,
          wallet_id: wallet.id,
          type: 'wallet_topup',
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack initialization failed:', paystackData);
      
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ status: 'failed', provider_response: paystackData })
        .eq('id', payment.id);

      throw new Error(paystackData.message || 'Payment initialization failed');
    }

    console.log('Paystack wallet topup initialized:', paystackData.data.reference);

    // Update payment with Paystack response
    await supabase
      .from('payments')
      .update({ 
        provider_response: paystackData.data,
      })
      .eq('id', payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
        payment_id: payment.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Wallet topup initialization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
