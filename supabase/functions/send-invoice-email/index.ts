import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS: if ALLOWED_ORIGINS (comma-separated) is configured, only matching
// browser origins are echoed back; otherwise we fall back to '*'.
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
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
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = isAllowedOrigin(origin) ? origin : "https://shop4meng.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// HTML-escape any user/DB-supplied string before interpolating into email HTML.
function escapeHtml(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    const callerRole = (claimsData?.claims as Record<string, any> | undefined)?.role;
    // Require a real logged-in user (or service role) — reject the public anon
    // key so this can't be used as an unauthenticated relay.
    if (claimsError || (callerRole !== "authenticated" && callerRole !== "service_role")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "invoiceId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch invoice with service role to get buyer info
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invoice, error: invoiceError } = await adminClient
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    // Get buyer profile
    const { data: buyerProfile } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", invoice.buyer_id)
      .single();

    if (!buyerProfile?.email) {
      throw new Error("Buyer email not found");
    }

    // Get order info
    const { data: order } = await adminClient
      .from("orders")
      .select("location_name")
      .eq("id", invoice.order_id)
      .single();

    // Recipient stays raw (buyerProfile.email); everything interpolated into the
    // HTML body is escaped. invoice_number is escaped at its use sites below.
    const buyerName = escapeHtml(buyerProfile.full_name || "Valued Customer");
    const locationName = escapeHtml(order?.location_name || "your order");
    const invoiceNumberEsc = escapeHtml(invoice.invoice_number);
    const formattedTotal = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(invoice.total);

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #16a34a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Shop4Me</h1>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #1a1a1a; margin-top: 0;">Invoice ${invoiceNumberEsc}</h2>
          <p style="color: #4a4a4a; font-size: 16px;">Hi ${buyerName},</p>
          <p style="color: #4a4a4a; font-size: 16px;">
            Your agent has generated a final invoice for your order from <strong>${locationName}</strong>.
          </p>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Invoice Number</span>
              <strong>${invoiceNumberEsc}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Subtotal</span>
              <span>${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(invoice.subtotal)}</span>
            </div>
            ${invoice.service_fee > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Service Fee</span>
              <span>${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(invoice.service_fee)}</span>
            </div>` : ""}
            ${invoice.delivery_fee > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Delivery Fee</span>
              <span>${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(invoice.delivery_fee)}</span>
            </div>` : ""}
            ${invoice.discount > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #16a34a;">Discount</span>
              <span style="color: #16a34a;">-${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(invoice.discount)}</span>
            </div>` : ""}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
            <div style="display: flex; justify-content: space-between;">
              <strong style="font-size: 18px;">Total</strong>
              <strong style="font-size: 18px; color: #16a34a;">${formattedTotal}</strong>
            </div>
          </div>
          <p style="color: #4a4a4a; font-size: 14px;">
            Log in to your Shop4Me account to view the full invoice and download a PDF copy.
          </p>
        </div>
        <div style="background: #f8f9fa; padding: 16px 24px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Shop4Me. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Shop4Me <onboarding@resend.dev>",
        to: [buyerProfile.email],
        subject: `Invoice ${invoiceNumberEsc} - ${locationName}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(`Email send failed [${emailRes.status}]: ${JSON.stringify(emailData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error sending invoice email:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
