import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public unsubscribe endpoint for marketing email.
//   GET  ?token=…            → redirect to the web confirmation page (no side
//                              effect, so link-scanning mail gateways can't
//                              unsubscribe people by prefetching the link)
//   POST ?token=… (form "List-Unsubscribe=One-Click") → RFC 8058 one-click
//   POST JSON {token, action: "status"|"unsubscribe"|"resubscribe"} → web page
//
// Tokens are base64url(email) + "." + HMAC-SHA256(EMAIL_UNSUB_SECRET, email).

const WEB = "https://www.shop4meng.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64urlDecode(s: string): string {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verifyToken(token: string, secret: string): Promise<string | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  let email: string;
  try {
    email = b64urlDecode(payload).trim().toLowerCase();
  } catch {
    return null;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  return safeEqual(await hmacHex(secret, email), sig.toLowerCase()) ? email : null;
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const shown = user.length <= 2 ? user[0] ?? "" : user.slice(0, 2);
  return `${shown}${"•".repeat(Math.max(user.length - shown.length, 3))}@${domain}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("EMAIL_UNSUB_SECRET") ?? "";
  if (!secret) return json({ ok: false, error: "Unsubscribe is not configured" }, 500);

  const url = new URL(req.url);
  let token = url.searchParams.get("token") ?? "";
  let action = "unsubscribe";

  if (req.method === "GET") {
    // Never change state on GET — send the person to the confirmation page.
    const dest = token
      ? `${WEB}/unsubscribe?token=${encodeURIComponent(token)}`
      : `${WEB}/unsubscribe?status=invalid`;
    return Response.redirect(dest, 302);
  }
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const b = await req.json();
      token = typeof b?.token === "string" ? b.token : token;
      action = typeof b?.action === "string" ? b.action : "status";
    } catch {
      return json({ ok: false, error: "Invalid request" }, 400);
    }
  }
  // Anything else (mail client one-click form post) is an unsubscribe.

  const email = token ? await verifyToken(token, secret) : null;
  if (!email) return json({ ok: false, error: "This link is invalid or has been altered." }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (action === "status") {
    const { data } = await supabase
      .from("email_suppressions").select("reason").eq("email", email).maybeSingle();
    return json({ ok: true, email: maskEmail(email), subscribed: !data, reason: data?.reason ?? null });
  }

  if (action === "resubscribe") {
    // Only undo a voluntary unsubscribe — never re-enable a bounced/complained address.
    await supabase.from("email_suppressions").delete().eq("email", email).eq("reason", "unsubscribed");
    const { data } = await supabase
      .from("email_suppressions").select("reason").eq("email", email).maybeSingle();
    return json({ ok: true, email: maskEmail(email), subscribed: !data, reason: data?.reason ?? null });
  }

  if (action !== "unsubscribe") return json({ ok: false, error: "Unknown action" }, 400);

  const { error } = await supabase.from("email_suppressions").upsert(
    { email, reason: "unsubscribed", source: contentType.includes("application/json") ? "web" : "one_click" },
    { onConflict: "email", ignoreDuplicates: true },
  );
  if (error) {
    console.error("unsubscribe failed:", error);
    return json({ ok: false, error: "Could not update your preferences. Please try again." }, 500);
  }
  return json({ ok: true, email: maskEmail(email), subscribed: false, reason: "unsubscribed" });
});
