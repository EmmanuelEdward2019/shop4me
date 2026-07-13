import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Inlined helpers (see _shared/{notifications,audit}.ts) ───────
// `supabase functions deploy` doesn't bundle `_shared/`, so we
// duplicate the helpers here. Keep in sync with the shared files.

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
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin =
    ALLOWED_ORIGINS.length === 0
      ? '*'
      : ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
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

    // Update payment record. Preserve the topup flag if this was a wallet
    // topup, otherwise record the actual Paystack channel — so wallet
    // topups stay clearly labelled and direct order payments never appear
    // as topups in the admin dashboard.
    const verifiedPaymentMethod =
      payment.payment_method === 'wallet_topup'
        ? 'wallet_topup'
        : (transaction.channel || payment.payment_method || 'card');
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        payment_method: verifiedPaymentMethod,
        provider_response: transaction,
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Failed to update payment record:', updateError);
    }

    // If payment successful, handle based on payment type.
    // `alreadyProcessed` tells the client whether THIS call actually applied
    // the credit/paid-transition, or whether it was already done (by the
    // webhook or a previous verify). The client uses it to avoid showing a
    // duplicate "Wallet Funded" toast / sending a duplicate email.
    // `creditedBalance` is the server-authoritative wallet balance so the
    // client never has to compute `balance + amount` itself.
    let alreadyProcessed = false;
    let creditedBalance: number | null = null;
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

        await recordAudit(supabase, req, {
          action: "payment.order_verified",
          actorId: payment.user_id,
          actorRole: "buyer",
          targetType: "order",
          targetId: payment.order_id,
          metadata: {
            payment_id: payment.id,
            amount: transaction.amount / 100,
            channel: transaction.channel,
            reference,
          },
        });

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
      } else if (payment.payment_method === 'wallet_topup' && !payment.order_id) {
        // Wallet topup - credit using atomic RPC.
        // Belt-and-braces: require BOTH the wallet_topup flag AND a null
        // order_id. A payment tied to an order can never credit the wallet.
        const { data: walletResult, error: walletRpcError } = await supabase.rpc(
          'update_wallet_balance',
          {
            p_user_id: payment.user_id,
            p_amount: transaction.amount / 100,
            p_type: 'credit',
            p_description: 'Wallet topup via Paystack',
            p_reference: reference,
            // Idempotent: the webhook and this client-side verify can both
            // fire for the same reference. Keyed on the reference, only the
            // first one actually credits the wallet.
            p_idempotent: true,
          }
        );

        if (walletRpcError) {
          console.error('Failed to credit wallet:', walletRpcError);
        } else if (walletResult?.already_processed) {
          alreadyProcessed = true;
          creditedBalance = walletResult?.new_balance ?? null;
          console.log(`Wallet topup ${reference} already processed — skipping duplicate credit via verify.`);
        } else {
          creditedBalance = walletResult?.new_balance ?? null;
          console.log(`Wallet credited via verify, new balance: ${walletResult?.new_balance}`);
          await recordAudit(supabase, req, {
            action: "wallet.topup_verified",
            actorId: payment.user_id,
            actorRole: "buyer",
            targetType: "payment",
            targetId: payment.id,
            metadata: {
              amount: transaction.amount / 100,
              new_balance: walletResult?.new_balance,
              channel: transaction.channel,
              reference,
            },
          });
        }

        // Send emails + in-app notifications — awaited so the Deno isolate
        // isn't suspended mid-fetch. Skip entirely if the credit was already
        // applied (by the webhook or a racing verify), so we don't send a
        // duplicate "wallet funded" email/notification.
        if (!alreadyProcessed) try {
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
      alreadyProcessed = true;
      console.log('Payment already processed (likely by webhook), skipping');
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
        // True when the credit/paid-transition was already applied before this
        // call (by the webhook or a prior verify). Clients should suppress the
        // success toast / confirmation email when this is true.
        alreadyProcessed,
        // Server-authoritative wallet balance after a top-up credit (null for
        // order payments, or when already processed by the webhook path).
        newBalance: creditedBalance,
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
