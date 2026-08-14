import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Inlined audit helper (see _shared/audit.ts) ──────────────────
// `supabase functions deploy` doesn't bundle `_shared/`, so the
// helper is duplicated here. Keep in sync with `_shared/audit.ts`.
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
// ─── End inlined audit helper ─────────────────────────────────────

// CORS: if ALLOWED_ORIGINS (comma-separated) is configured, only matching
// browser origins are echoed back; otherwise we fall back to '*' to preserve
// the previous behaviour. Set ALLOWED_ORIGINS to lock the API down.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.length > 0) return ALLOWED_ORIGINS.includes(origin);
  return (
    /^https:\/\/(www\.)?shop4meng\.com$/.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin)
  );
}

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = isAllowedOrigin(origin) ? origin : 'https://shop4meng.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

// Resolve how much this order should actually be charged, SERVER-SIDE. Never
// trust a client-supplied amount: the authoritative price is the agent's
// invoice total for the order, falling back to the order's own stored totals.
// Returns null only when no server-side price exists at all.
async function resolveOrderChargeAmount(
  supabase: any,
  order: { id: string; final_total?: number | null; estimated_total?: number | null },
): Promise<number | null> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const candidates = [invoice?.total, order.final_total, order.estimated_total];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
  }
  return null;
}

interface InitializePaymentRequest {
  orderId: string;
  amount: number;
  email: string;
  callbackUrl?: string;
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
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

    const { orderId, amount: clientAmount, email, callbackUrl } = await req.json() as InitializePaymentRequest;

    if (!orderId || !clientAmount || !email) {
      throw new Error('Missing required fields: orderId, amount, email');
    }

    console.log(`Initializing payment for order ${orderId}, client amount: ${clientAmount}, email: ${email}`);

    // Verify the order belongs to the user
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, final_total, estimated_total')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      console.error('Order not found or access denied:', orderError);
      throw new Error('Order not found');
    }

    // Determine the authoritative charge amount SERVER-SIDE. The client's
    // amount is only used as a last-resort fallback when the order has no
    // server-side price at all (which should not happen in the normal
    // invoice-then-pay flow). This closes the underpayment hole where a
    // buyer could initialize a large order for ₦1.
    const serverAmount = await resolveOrderChargeAmount(supabase, order);
    const amount = serverAmount ?? clientAmount;
    if (serverAmount != null && Math.abs(serverAmount - clientAmount) > 0.5) {
      console.warn(
        `Amount mismatch for order ${orderId}: client=${clientAmount}, server=${serverAmount}. Charging server amount.`,
      );
      await recordAudit(supabase, req, {
        action: 'payment.amount_mismatch',
        actorId: user.id,
        actorRole: 'buyer',
        targetType: 'order',
        targetId: orderId,
        metadata: { client_amount: clientAmount, server_amount: serverAmount, method: 'paystack' },
      });
    }

    // Create payment record. Note `payment_method` is explicitly set to
    // 'order_payment' (not null) so the webhook can never accidentally
    // treat a direct order payment as a wallet topup. The real channel
    // ('card', 'bank', 'ussd', etc.) overwrites this once Paystack
    // confirms the charge.
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: user.id,
        amount: amount,
        currency: 'NGN',
        status: 'pending',
        provider: 'paystack',
        payment_method: 'order_payment',
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
        amount: Math.round(amount * 100), // Paystack uses kobo (smallest unit)
        reference: payment.id,
        callback_url: callbackUrl || `${req.headers.get('origin')}/dashboard/orders/${orderId}`,
        metadata: {
          order_id: orderId,
          payment_id: payment.id,
          user_id: user.id,
          // Explicit discriminator so the webhook never confuses an order
          // payment with a wallet topup. NEVER set this to "wallet_topup".
          type: 'order_payment',
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

    console.log('Paystack initialized successfully:', paystackData.data.reference);

    // Update payment with Paystack reference
    await supabase
      .from('payments')
      .update({
        provider_reference: paystackData.data.reference,
        provider_response: paystackData.data,
      })
      .eq('id', payment.id);

    await recordAudit(supabase, req, {
      action: "payment.paystack_initialized",
      actorId: user.id,
      actorRole: "buyer",
      targetType: "order",
      targetId: orderId,
      metadata: {
        amount,
        payment_id: payment.id,
        reference: paystackData.data.reference,
      },
    });

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
    console.error('Payment initialization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
