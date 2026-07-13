import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Inlined helpers ──────────────────────────────────────────────
// `supabase functions deploy <name>` does not bundle the
// `supabase/functions/_shared/` directory alongside the function, so
// we inline the helpers here. Keep this block in sync with
// `_shared/notifications.ts` and `_shared/audit.ts`.

interface NotificationPayload {
  userId: string | null | undefined;
  type: string;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
}

async function createNotification(
  supabase: any,
  payload: NotificationPayload,
): Promise<void> {
  if (!payload.userId) return;
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
      data: payload.data ?? null,
    });
    if (error) console.error(`[notifications] insert failed user=${payload.userId} type=${payload.type}:`, error);
  } catch (e) {
    console.error(`[notifications] error user=${payload.userId} type=${payload.type}:`, e);
  }
}

async function getAdminUserIds(supabase: any): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (error) {
    console.error("[notifications] failed to fetch admins:", error);
    return [];
  }
  return (data ?? []).map((r: { user_id: string }) => r.user_id);
}

function getRequestIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

interface AuditPayload {
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

async function recordAudit(
  supabase: any,
  req: Request | null,
  payload: AuditPayload,
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("record_audit", {
      p_action: payload.action,
      p_actor_id: payload.actorId ?? null,
      p_actor_role: payload.actorRole ?? null,
      p_target_type: payload.targetType ?? null,
      p_target_id: payload.targetId ?? null,
      p_ip: req ? getRequestIp(req) : null,
      p_user_agent: req ? req.headers.get("user-agent") : null,
      p_metadata: payload.metadata ?? null,
    });
    if (error) {
      console.error(`[audit] record_audit failed for action=${payload.action}:`, error);
      return null;
    }
    return typeof data === "number" ? data : null;
  } catch (e) {
    console.error(`[audit] unexpected failure for action=${payload.action}:`, e);
    return null;
  }
}
// ─── End inlined helpers ──────────────────────────────────────────

// CORS: if ALLOWED_ORIGINS (comma-separated) is configured, only matching
// browser origins are echoed back; otherwise we fall back to '*' to preserve
// the previous behaviour. Set ALLOWED_ORIGINS to lock the API down.
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin =
    ALLOWED_ORIGINS.length === 0
      ? "*"
      : ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// Resolve how much this order should actually be charged, SERVER-SIDE. Never
// trust a client-supplied amount: the authoritative price is the agent's
// invoice total for the order, falling back to the order's own stored totals.
async function resolveOrderChargeAmount(
  supabase: any,
  order: { id: string; final_total?: number | null; estimated_total?: number | null },
): Promise<number | null> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("total")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const candidates = [invoice?.total, order.final_total, order.estimated_total];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
  }
  return null;
}

interface PayWithWalletPayload {
  orderId: string;
  amount: number;
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
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
    const { orderId, amount: clientAmount } = payload;

    console.log(`Processing wallet payment for order ${orderId}, client amount ${clientAmount}, user ${user.id}`);

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

    // Determine the authoritative charge amount SERVER-SIDE. The client's
    // amount is only a last-resort fallback when the order has no server-side
    // price at all. This closes the underpayment hole where a buyer could
    // debit ₦1 from their wallet for a large order and have it marked paid.
    const serverAmount = await resolveOrderChargeAmount(supabase, order);
    const amount = serverAmount ?? clientAmount;
    if (serverAmount != null && Math.abs(serverAmount - clientAmount) > 0.5) {
      console.warn(
        `Amount mismatch for order ${orderId}: client=${clientAmount}, server=${serverAmount}. Charging server amount.`,
      );
      await recordAudit(supabase, req, {
        action: "payment.amount_mismatch",
        actorId: user.id,
        actorRole: "buyer",
        targetType: "order",
        targetId: orderId,
        metadata: { client_amount: clientAmount, server_amount: serverAmount, method: "wallet" },
      });
    }

    // Allow payment from any "active, not-yet-paid" state. Status names
    // diverged in the wild — agent flow sets `items_confirmed`, some legacy
    // orders stay on `accepted` until invoice approval. Reject only states
    // where payment makes no sense.
    const blockedStatuses = new Set([
      "paid",
      "in_transit",
      "delivered",
      "cancelled",
    ]);
    if (blockedStatuses.has(order.status)) {
      console.warn(`Wallet payment rejected — order ${orderId} status is ${order.status}`);
      return new Response(
        JSON.stringify({ error: `Order is already ${order.status.replace("_", " ")}` }),
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

    if (!walletResult?.success) {
      console.log("Wallet debit failed:", walletResult?.error);
      // Audit the rejection — useful for spotting fraud (an attacker
      // repeatedly probing wallets) and for buyer support.
      await recordAudit(supabase, req, {
        action: "wallet.debit_failed",
        actorId: user.id,
        actorRole: "buyer",
        targetType: "order",
        targetId: orderId,
        metadata: { amount, reason: walletResult?.error ?? "insufficient_balance" },
      });
      return new Response(
        JSON.stringify({ error: walletResult?.error || "Insufficient balance" }),
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
    } else {
      console.log(`Order ${orderId} status -> paid`);
    }

    // Audit the successful debit. Fire-and-forget — recordAudit
    // swallows errors so a logging failure can never affect the
    // user's payment.
    await recordAudit(supabase, req, {
      action: "wallet.debit_for_order",
      actorId: user.id,
      actorRole: "buyer",
      targetType: "order",
      targetId: orderId,
      metadata: {
        amount,
        new_balance: walletResult.new_balance,
        transaction_id: walletResult.transaction_id,
      },
    });

    // Create agent earnings if agent is assigned
    if (order.agent_id && order.service_fee) {
      const { error: earningsError } = await supabase.from("agent_earnings").insert({
        agent_id: order.agent_id,
        order_id: orderId,
        amount: order.service_fee,
        type: "service_fee",
        status: "pending",
      });
      if (earningsError) {
        console.error("Agent earnings insert error:", earningsError);
      }
    }

    // Resolve profiles for notification fan-out
    const [buyerProfileRes, agentProfileRes, adminIds] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle(),
      order.agent_id
        ? supabase.from("profiles").select("full_name, email").eq("user_id", order.agent_id).maybeSingle()
        : Promise.resolve({ data: null }) as any,
      getAdminUserIds(supabase),
    ]);

    const buyerProfile = buyerProfileRes.data;
    const agentProfile = agentProfileRes?.data;
    const buyerName = buyerProfile?.full_name || "A buyer";
    const orderShort = orderId.slice(0, 8);
    const locationName = (order as any).location_name as string | null;

    // ── In-app notifications (await before responding so the bell badge
    //    is up to date when the buyer's screen re-fetches). ─────────────
    const inAppTasks: Promise<unknown>[] = [];

    // Buyer
    inAppTasks.push(
      createNotification(supabase, {
        userId: user.id,
        type: "wallet_payment_success",
        title: "Payment successful",
        body: `₦${amount.toLocaleString("en-NG")} paid from wallet for your order${locationName ? ` at ${locationName}` : ""}. New balance: ₦${Number(walletResult.new_balance).toLocaleString("en-NG")}.`,
        link: `/dashboard/orders/${orderId}`,
        data: { orderId, amount, newBalance: walletResult.new_balance },
      })
    );

    // Agent
    if (order.agent_id) {
      inAppTasks.push(
        createNotification(supabase, {
          userId: order.agent_id,
          type: "order_paid",
          title: "Order paid — start delivery",
          body: `${buyerName} paid ₦${amount.toLocaleString("en-NG")} for order #${orderShort}${locationName ? ` at ${locationName}` : ""}.`,
          link: `/agent/orders/${orderId}`,
          data: { orderId, amount, source: "wallet" },
        })
      );
    }

    // Admins
    for (const adminId of adminIds) {
      inAppTasks.push(
        createNotification(supabase, {
          userId: adminId,
          type: "order_paid_admin",
          title: `Order paid (wallet) — ₦${amount.toLocaleString("en-NG")}`,
          body: `${buyerName} paid ₦${amount.toLocaleString("en-NG")} from wallet for order #${orderShort}${locationName ? ` at ${locationName}` : ""}.`,
          link: `/admin/orders/${orderId}`,
          data: { orderId, amount, source: "wallet", buyerId: user.id, agentId: order.agent_id ?? null },
        })
      );
    }
    await Promise.allSettled(inAppTasks);

    // ── Email notifications (fire-and-forget — Resend latency shouldn't
    //    delay the buyer's confirmation toast). ────────────────────────
    const supabaseFnUrl = `${supabaseUrl}/functions/v1/send-notification-email`;
    const emailHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseServiceKey}`,
      "apikey": supabaseServiceKey,
    };
    const postEmail = (type: string, data: Record<string, unknown>) =>
      fetch(supabaseFnUrl, {
        method: "POST",
        headers: emailHeaders,
        body: JSON.stringify({ type, data }),
      }).catch((e) => console.error(`Email (${type}) error:`, e));

    if (buyerProfile?.email) {
      // 1. The order-payment confirmation — same template every order
      //    pays sees, regardless of method (wallet vs direct Paystack).
      //    Keeps the buyer's "your order is paid" mail consistent.
      postEmail("payment_success", {
        email: buyerProfile.email,
        name: buyerProfile.full_name,
        amount,
        orderId,
        locationName,
        reference: `wallet_${walletResult.transaction_id ?? orderId}`,
      });
      // 2. The wallet-movement receipt — surfaces the new balance so the
      //    buyer can reconcile their wallet without opening the app.
      postEmail("wallet_spent", {
        email: buyerProfile.email,
        name: buyerProfile.full_name,
        amount,
        newBalance: walletResult.new_balance,
        orderId,
        locationName,
      });
    }

    if (order.agent_id && agentProfile?.email) {
      postEmail("order_paid_agent", {
        email: agentProfile.email,
        name: agentProfile.full_name,
        amount,
        orderId,
        locationName,
        buyerName: buyerProfile?.full_name || "A buyer",
      });
    }

    if (adminIds.length > 0) {
      const adminProfiles = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", adminIds);
      for (const admin of adminProfiles.data ?? []) {
        if (!admin.email) continue;
        postEmail("order_paid_admin", {
          email: admin.email,
          amount,
          orderId,
          locationName,
          buyerName: buyerProfile?.full_name,
          agentName: agentProfile?.full_name,
        });
        postEmail("wallet_spent_admin", {
          email: admin.email,
          amount,
          newBalance: walletResult.new_balance,
          buyerName: buyerProfile?.full_name || "A user",
          orderId,
          locationName,
        });
      }
    }

    // ── Push notifications for agent + admins (fire-and-forget). ──────
    const pushTargets = [
      ...(order.agent_id ? [order.agent_id] : []),
      ...adminIds,
    ];
    if (pushTargets.length > 0) {
      fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: emailHeaders,
        body: JSON.stringify({
          userIds: pushTargets,
          title: "Payment received",
          body: `${buyerName} paid ₦${amount.toLocaleString("en-NG")} for order #${orderShort}${locationName ? ` at ${locationName}` : ""}.`,
          url: `/agent/orders/${orderId}`,
        }),
      }).catch((e) => console.error("Push notification error:", e));
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
