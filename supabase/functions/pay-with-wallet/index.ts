import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayWithWalletPayload {
  orderId: string;
  amount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: PayWithWalletPayload = await req.json();
    const { orderId, amount } = payload;

    console.log(`Processing wallet payment for order ${orderId}, amount ${amount}, user ${user.id}`);

    // Verify order exists and belongs to user
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      console.error("Order error:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check order is in correct status
    if (order.status !== "payment_pending" && order.status !== "items_confirmed") {
      return new Response(
        JSON.stringify({ error: "Order is not awaiting payment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use atomic wallet update function
    const { data: walletResult, error: walletError } = await supabase.rpc(
      "update_wallet_balance",
      {
        p_user_id: user.id,
        p_amount: amount,
        p_type: "debit",
        p_description: `Payment for order ${orderId.slice(0, 8)}`,
        p_reference: `order_${orderId}`,
      }
    );

    if (walletError) {
      console.error("Wallet error:", walletError);
      return new Response(
        JSON.stringify({ error: "Failed to process wallet payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!walletResult.success) {
      console.log("Wallet debit failed:", walletResult.error);
      return new Response(
        JSON.stringify({ error: walletResult.error || "Insufficient balance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: user.id,
      order_id: orderId,
      amount: amount,
      currency: "NGN",
      provider: "wallet",
      payment_method: "wallet",
      status: "success",
      provider_reference: walletResult.transaction_id,
    });

    if (paymentError) {
      console.error("Payment record error:", paymentError);
      // Try to refund the wallet
      await supabase.rpc("update_wallet_balance", {
        p_user_id: user.id,
        p_amount: amount,
        p_type: "credit",
        p_description: `Refund for failed order ${orderId.slice(0, 8)}`,
        p_reference: `refund_${orderId}`,
      });
      return new Response(
        JSON.stringify({ error: "Failed to record payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order status to paid
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateError) {
      console.error("Order update error:", updateError);
    }

    // Create agent earnings if agent is assigned
    if (order.agent_id && order.service_fee) {
      await supabase.from("agent_earnings").insert({
        agent_id: order.agent_id,
        order_id: orderId,
        amount: order.service_fee,
        type: "service_fee",
        status: "pending",
      });
    }

    // Send email notifications (fire-and-forget)
    const supabaseFnUrl = `${supabaseUrl}/functions/v1/send-notification-email`;
    const emailHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` };

    // Get buyer profile
    const { data: buyerProfile } = await supabase.from("profiles").select("full_name, email").eq("user_id", user.id).single();

    // Email to buyer
    if (buyerProfile?.email) {
      fetch(supabaseFnUrl, {
        method: 'POST',
        headers: emailHeaders,
        body: JSON.stringify({
          type: 'wallet_spent',
          data: {
            email: buyerProfile.email,
            name: buyerProfile.full_name,
            amount,
            newBalance: walletResult.new_balance,
            orderId,
            locationName: order.location_name,
          },
        }),
      }).catch(e => console.error('Buyer wallet spent email error:', e));
    }

    // Email to admin(s)
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (adminRoles) {
      for (const admin of adminRoles) {
        const { data: adminProfile } = await supabase.from("profiles").select("email").eq("user_id", admin.user_id).single();
        if (adminProfile?.email) {
          fetch(supabaseFnUrl, {
            method: 'POST',
            headers: emailHeaders,
            body: JSON.stringify({
              type: 'wallet_spent_admin',
              data: {
                email: adminProfile.email,
                amount,
                newBalance: walletResult.new_balance,
                buyerName: buyerProfile?.full_name || 'A user',
                orderId,
                locationName: order.location_name,
              },
            }),
          }).catch(e => console.error('Admin wallet spent email error:', e));
        }
      }
    }

    console.log(`Wallet payment successful for order ${orderId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment successful",
        newBalance: walletResult.new_balance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in pay-with-wallet:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
