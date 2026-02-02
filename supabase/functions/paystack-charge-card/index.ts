import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChargeCardRequest {
  cardId: string;
  amount: number;
  email: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('Payment service not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Not authenticated');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { cardId, amount, email, description } = await req.json() as ChargeCardRequest;

    if (!cardId || !amount || !email) {
      throw new Error('Missing required fields: cardId, amount, email');
    }

    if (amount < 100) {
      throw new Error('Minimum amount is ₦100');
    }

    // Fetch the saved card and verify ownership
    const { data: card, error: cardError } = await supabase
      .from('payment_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single();

    if (cardError || !card) {
      console.error('Card not found or access denied:', cardError);
      throw new Error('Card not found');
    }

    console.log(`Charging card ${card.last4} for user ${user.id}, amount: ${amount}`);

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    // Create unique reference
    const reference = `card_${cardId.slice(0, 8)}_${Date.now()}`;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: 'NGN',
        status: 'pending',
        provider: 'paystack',
        provider_reference: reference,
        payment_method: 'saved_card',
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error('Failed to create payment record');
    }

    // Charge the authorization
    const paystackResponse = await fetch('https://api.paystack.co/transaction/charge_authorization', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorization_code: card.authorization_code,
        email: email,
        amount: Math.round(amount * 100), // Convert to kobo
        reference: reference,
        metadata: {
          payment_id: payment.id,
          user_id: user.id,
          wallet_id: wallet.id,
          card_id: cardId,
          type: 'wallet_topup',
          description: description || 'Wallet top-up via saved card',
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack charge failed:', paystackData);
      
      await supabase
        .from('payments')
        .update({ status: 'failed', provider_response: paystackData })
        .eq('id', payment.id);

      throw new Error(paystackData.message || 'Card charge failed');
    }

    const transaction = paystackData.data;
    console.log('Paystack charge result:', transaction.status);

    // Update payment record
    await supabase
      .from('payments')
      .update({ 
        status: transaction.status === 'success' ? 'success' : 'pending',
        provider_response: transaction,
      })
      .eq('id', payment.id);

    // If successful, credit wallet immediately
    if (transaction.status === 'success') {
      const { data: currentWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', wallet.id)
        .single();

      if (currentWallet) {
        await supabase
          .from('wallets')
          .update({ balance: currentWallet.balance + amount })
          .eq('id', wallet.id);

        await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            amount: amount,
            type: 'credit',
            description: description || `Wallet top-up via saved card (****${card.last4})`,
            reference: reference,
          });

        console.log(`Wallet ${wallet.id} credited with ₦${amount}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: transaction.status === 'success',
        status: transaction.status,
        reference: reference,
        payment_id: payment.id,
        message: transaction.status === 'success' 
          ? 'Card charged successfully' 
          : 'Charge is being processed',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Card charge error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
