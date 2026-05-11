// Resend Webhook Receiver
//
// Configure this in Resend Dashboard → Webhooks:
//   URL:    https://<your-project>.supabase.co/functions/v1/resend-webhook
//   Events: email.sent, email.delivered, email.bounced, email.complained,
//           email.opened, email.clicked, email.delivery_delayed
//
// Resend uses Svix for webhook signing. After creating the webhook, copy the
// "Signing Secret" (starts with `whsec_`) and add it as a Supabase Edge
// Function secret named `RESEND_WEBHOOK_SECRET`. If the secret is missing,
// the webhook will still accept events but log a warning — this lets you
// verify Resend → Supabase connectivity before locking down signature checks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, svix-id, svix-timestamp, svix-signature",
};

// Svix-style HMAC-SHA256 signature verification used by Resend.
// The signed payload is `${svix_id}.${svix_timestamp}.${body}`.
// The header `svix-signature` contains one or more space-separated values
// of the form `v1,<base64-hmac>`; any matching value is accepted.
async function verifySvixSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  body: string,
  signatureHeader: string,
): Promise<boolean> {
  // Strip the `whsec_` prefix and decode base64
  const cleanSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const secretBytes = Uint8Array.from(atob(cleanSecret), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signedPayload = `${svixId}.${svixTimestamp}.${body}`;
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // Header format: "v1,<sig1> v1,<sig2> ..."
  return signatureHeader.split(" ").some((entry) => {
    const [_version, value] = entry.split(",");
    return value === expected;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const svixId = req.headers.get("svix-id") || "";
    const svixTimestamp = req.headers.get("svix-timestamp") || "";
    const svixSignature = req.headers.get("svix-signature") || "";

    const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (secret) {
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("Missing Svix headers");
        return new Response("Missing signature headers", { status: 401, headers: corsHeaders });
      }
      const valid = await verifySvixSignature(secret, svixId, svixTimestamp, body, svixSignature);
      if (!valid) {
        console.error("Invalid Svix signature");
        return new Response("Invalid signature", { status: 401, headers: corsHeaders });
      }
    } else {
      console.warn("RESEND_WEBHOOK_SECRET not set — accepting unsigned webhook. Set the secret to enable verification.");
    }

    const event = JSON.parse(body);
    console.log("Resend webhook event:", event.type, "id:", event.data?.email_id);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const data = event.data || {};
    const { error } = await supabase.from("email_events").insert({
      email_id: data.email_id || null,
      event_type: event.type || "unknown",
      to_address: Array.isArray(data.to) ? data.to.join(", ") : (data.to || null),
      from_address: data.from || null,
      subject: data.subject || null,
      tags: data.tags || null,
      raw: event,
    });

    if (error) {
      console.error("Failed to store email event:", error);
      // Still return 200 so Resend doesn't retry — we logged the error.
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("resend-webhook error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
