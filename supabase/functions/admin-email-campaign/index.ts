import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin email campaigns via Resend.
// Actions (POST, admin JWT): preview | count | test | create | send_batch | cancel
// Sends are chunked (<=100 per Resend batch call) and resumable: the admin UI
// calls send_batch repeatedly until done, so large audiences never hit a
// function timeout.

const FROM_EMAIL = "Shop4Me <Support@shop4meng.com>";
const BRAND = "#16a34a";
const WEB = "https://www.shop4meng.com";
const LOGO_URL = `${WEB}/logo.png`;
const APP_STORE_URL = "https://apps.apple.com/app/shop4me-app/id6795087455";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.shop4meng.app";
const CONTACT = {
  address: "23 Golden Valley Estate, Port Harcourt, Rivers State, Nigeria",
  phone: "+234 704 700 8840",
  email: "Support@shop4meng.com",
};
const SOCIALS: [string, string][] = [
  ["Facebook", "https://web.facebook.com/Shop4Memarkets"],
  ["X", "https://x.com/Shop4memarkets"],
  ["Instagram", "https://www.instagram.com/shop4memarkets"],
  ["TikTok", "https://www.tiktok.com/@shop4memarkets"],
];
const BATCH_SIZE = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function escapeHtml(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;");
}

// ── Unsubscribe tokens ──────────────────────────────────────────────────────
function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function unsubscribeUrl(supabaseUrl: string, secret: string, email: string): Promise<string> {
  const e = email.trim().toLowerCase();
  const token = `${b64url(e)}.${await hmacHex(secret, e)}`;
  return `${supabaseUrl}/functions/v1/email-unsubscribe?token=${encodeURIComponent(token)}`;
}

// ── Body → email-safe HTML ──────────────────────────────────────────────────
function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base|svg)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base|svg)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\b(href|src)\s*=\s*("|')\s*(javascript|vbscript|data):[^"']*\2/gi, '$1="#"');
}
function getAttr(attrs: string, name: string): string {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : "";
}
const safeUrl = (u: string) => (/^(https?:|mailto:|tel:)/i.test(u.trim()) ? u.trim() : "#");

function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:22px auto;"><tr><td style="border-radius:10px;background:${BRAND};"><a href="${href}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a></td></tr></table>`;
}

function transformBody(html: string): string {
  let out = sanitizeHtml(html);

  // Video: email clients strip <video>, so it becomes a clickable thumbnail + button.
  out = out.replace(/<a\b([^>]*\bdata-s4m-video\b[^>]*)>([\s\S]*?)<\/a>/gi, (_m, attrs: string, inner: string) => {
    const href = safeUrl(getAttr(attrs, "href"));
    const title = getAttr(attrs, "title") || "Watch the video";
    const src = safeUrl(getAttr(inner, "src"));
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr><td align="center"><a href="${href}" target="_blank" style="text-decoration:none;"><img src="${src}" alt="${title}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:12px;border:0;" /></a></td></tr><tr><td align="center">${emailButton(href, `&#9654;&nbsp; ${title}`)}</td></tr></table>`;
  });

  // CTA buttons.
  out = out.replace(/<a\b([^>]*\bdata-s4m-button\b[^>]*)>([\s\S]*?)<\/a>/gi, (_m, attrs: string, label: string) =>
    emailButton(safeUrl(getAttr(attrs, "href")), label.replace(/<[^>]+>/g, "").trim() || "Learn more"));

  // Responsive images (the video thumbnail already carries width=).
  out = out.replace(/<img\b(?![^>]*\bwidth=)([^>]*?)\s*\/?>/gi, (_m, attrs: string) => {
    const rest = attrs.replace(/\sstyle\s*=\s*"[^"]*"/i, "");
    return `<img${rest} style="display:block;max-width:100%;height:auto;border-radius:10px;margin:16px auto;border:0;" />`;
  });

  const addStyle = (tag: string, base: string) => {
    out = out.replace(new RegExp(`<${tag}(\\s[^>]*)?>`, "gi"), (_m, a: string = "") => {
      const existing = getAttr(a, "style");
      const rest = a.replace(/\sstyle\s*=\s*"[^"]*"/i, "");
      return `<${tag}${rest} style="${base}${existing ? ";" + existing : ""}">`;
    });
  };
  addStyle("p", "margin:0 0 14px;font-size:16px;line-height:1.65;color:#374151");
  addStyle("h1", "margin:0 0 14px;font-size:26px;line-height:1.25;color:#111827");
  addStyle("h2", "margin:22px 0 12px;font-size:21px;line-height:1.3;color:#111827");
  addStyle("h3", "margin:18px 0 10px;font-size:18px;line-height:1.35;color:#111827");
  addStyle("ul", "margin:0 0 14px;padding-left:22px;color:#374151");
  addStyle("ol", "margin:0 0 14px;padding-left:22px;color:#374151");
  addStyle("li", "margin:0 0 6px;font-size:16px;line-height:1.6");
  addStyle("blockquote", "margin:18px 0;padding:12px 18px;border-left:4px solid #16a34a;background:#f0fdf4;color:#374151;border-radius:6px");
  addStyle("hr", "border:none;border-top:1px solid #e5e7eb;margin:24px 0");

  // Plain links (buttons/videos above already carry a style attribute).
  out = out.replace(/<a\b(?![^>]*\bstyle=)([^>]*)>/gi, `<a$1 style="color:${BRAND};text-decoration:underline;">`);
  return out;
}

function personalize(s: string, name: string | null | undefined, html: boolean): string {
  const full = (name ?? "").trim();
  const first = full.split(/\s+/)[0] || "there";
  const f = html ? escapeHtml(first) : first;
  const n = html ? escapeHtml(full || "there") : full || "there";
  return s.replace(/\{\{\s*first_name\s*\}\}/gi, f).replace(/\{\{\s*name\s*\}\}/gi, n);
}

function buildEmail(subject: string, preheader: string, bodyHtml: string, unsubUrl: string): string {
  const year = new Date().getFullYear();
  const socials = SOCIALS.map(([label, href]) =>
    `<a href="${href}" target="_blank" style="color:${BRAND};text-decoration:none;font-weight:600;">${label}</a>`,
  ).join(`<span style="color:#d1d5db;">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>`);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(subject)}</title>
<style>a{color:${BRAND}}img{max-width:100%;height:auto}@media (max-width:620px){.s4m-container{width:100%!important}.s4m-pad{padding:22px 18px!important}}</style></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}&#8203;&zwnj;&nbsp;&#8203;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:28px 12px;"><tr><td align="center">
<table role="presentation" class="s4m-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<tr><td style="height:6px;background:${BRAND};line-height:6px;font-size:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:26px 24px 8px;"><a href="${WEB}" target="_blank"><img src="${LOGO_URL}" alt="Shop4Me" height="48" style="display:block;height:48px;width:auto;border:0;" /></a></td></tr>
<tr><td class="s4m-pad" style="padding:18px 40px 8px;">${bodyHtml}</td></tr>
<tr><td align="center" style="padding:8px 40px 30px;">
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;">Shop smarter with the Shop4Me app</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
<td style="padding:0 5px;"><a href="${APP_STORE_URL}" target="_blank" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:9px;">App Store</a></td>
<td style="padding:0 5px;"><a href="${PLAY_STORE_URL}" target="_blank" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:9px;">Google Play</a></td>
</tr></table></td></tr>
<tr><td style="background:#f9fafb;border-top:1px solid #eef0f3;padding:26px 36px;text-align:center;">
<p style="margin:0 0 12px;font-size:13px;">${socials}</p>
<p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#6b7280;">${escapeHtml(CONTACT.address)}</p>
<p style="margin:0 0 14px;font-size:12px;line-height:1.6;color:#6b7280;"><a href="tel:${CONTACT.phone.replace(/\s/g, "")}" style="color:#6b7280;text-decoration:none;">${CONTACT.phone}</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="mailto:${CONTACT.email}" style="color:#6b7280;text-decoration:none;">${CONTACT.email}</a></p>
<p style="margin:0 0 6px;font-size:11px;line-height:1.6;color:#9ca3af;">You're receiving this email because you have a Shop4Me account.</p>
<p style="margin:0;font-size:11px;line-height:1.6;color:#9ca3af;"><a href="${unsubUrl}" target="_blank" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="${WEB}/privacy" target="_blank" style="color:#6b7280;text-decoration:underline;">Privacy policy</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;&copy; ${year} Shop4Me</p>
</td></tr></table></td></tr></table></body></html>`;
}

// ── Audience ────────────────────────────────────────────────────────────────
type Recipient = { user_id: string; email: string; full_name: string | null };

// deno-lint-ignore no-explicit-any
type Sb = any;

async function fetchProfiles(supabase: Sb, ids?: string[]): Promise<Recipient[]> {
  const out: Recipient[] = [];
  const keep = (p: { user_id: string; email: string | null; full_name: string | null; is_suspended?: boolean | null }) => {
    if (!p.is_suspended && p.email) out.push({ user_id: p.user_id, email: p.email, full_name: p.full_name });
  };
  if (ids) {
    for (let i = 0; i < ids.length; i += 500) {
      const { data, error } = await supabase.from("profiles")
        .select("user_id, email, full_name, is_suspended").in("user_id", ids.slice(i, i + 500));
      if (error) throw error;
      (data ?? []).forEach(keep);
    }
    return out;
  }
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("profiles")
      .select("user_id, email, full_name, is_suspended")
      .order("created_at", { ascending: true }).range(from, from + 999);
    if (error) throw error;
    (data ?? []).forEach(keep);
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function roleUserIds(supabase: Sb, role: string): Promise<string[]> {
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("user_roles").select("user_id").eq("role", role).range(from, from + 999);
    if (error) throw error;
    ids.push(...(data ?? []).map((r: { user_id: string }) => r.user_id));
    if (!data || data.length < 1000) break;
  }
  return [...new Set(ids)];
}

async function resolveAudience(supabase: Sb, audience: unknown, role: unknown, userIds: unknown): Promise<Recipient[]> {
  let list: Recipient[];
  if (audience === "individual") {
    const ids = (Array.isArray(userIds) ? userIds : []).filter(isUuid).slice(0, 1000);
    if (!ids.length) throw new Error("Select at least one recipient");
    list = await fetchProfiles(supabase, ids);
  } else if (audience === "role") {
    if (typeof role !== "string" || !["buyer", "agent", "rider", "admin"].includes(role)) throw new Error("Choose a valid role");
    list = await fetchProfiles(supabase, await roleUserIds(supabase, role));
  } else if (audience === "all") {
    list = await fetchProfiles(supabase);
  } else {
    throw new Error("Choose who should receive this email");
  }
  const seen = new Set<string>();
  return list.filter((r) => {
    const e = r.email.trim().toLowerCase();
    if (seen.has(e)) return false;
    seen.add(e);
    r.email = e;
    return true;
  });
}

async function suppressedSet(supabase: Sb, emails: string[]): Promise<Set<string>> {
  const s = new Set<string>();
  for (let i = 0; i < emails.length; i += 500) {
    const { data } = await supabase.from("email_suppressions").select("email").in("email", emails.slice(i, i + 500));
    (data ?? []).forEach((r: { email: string }) => s.add(r.email));
  }
  return s;
}

function validateContent(p: Record<string, unknown>) {
  const subject = typeof p.subject === "string" ? p.subject.trim() : "";
  const preheader = typeof p.preheader === "string" ? p.preheader.trim().slice(0, 200) : "";
  const bodyHtml = typeof p.bodyHtml === "string" ? p.bodyHtml : "";
  if (!subject) throw new Error("Add a subject line");
  if (subject.length > 200) throw new Error("Subject is too long (max 200 characters)");
  const textOnly = bodyHtml.replace(/<(?!img|a\b)[^>]+>/gi, "").replace(/&nbsp;/g, " ").trim();
  if (!textOnly) throw new Error("Write the email body");
  if (bodyHtml.length > 500_000) throw new Error("Email body is too large");
  return { subject, preheader, bodyHtml };
}

async function refreshCounts(supabase: Sb, campaignId: string) {
  const count = async (statuses: string[]) => {
    const { count: c } = await supabase.from("email_campaign_recipients")
      .select("*", { count: "exact", head: true }).eq("campaign_id", campaignId).in("status", statuses);
    return c ?? 0;
  };
  const [sent, failed, skipped, remaining] = await Promise.all([
    count(["sent"]), count(["failed"]), count(["skipped"]), count(["pending", "sending"]),
  ]);
  await supabase.from("email_campaigns")
    .update({ sent_count: sent, failed_count: failed, skipped_count: skipped }).eq("id", campaignId);
  return { sent, failed, skipped, remaining };
}

async function requireAdmin(req: Request, supabase: Sb) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  const user = data?.user;
  if (!user) return null;
  const { data: row } = await supabase.from("user_roles").select("role")
    .eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return row ? user : null;
}

function unsubHeaders(unsub: string) {
  return {
    "List-Unsubscribe": `<${unsub}>, <mailto:${CONTACT.email}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const admin = await requireAdmin(req, supabase);
  if (!admin) return json({ error: "Only admins can send email campaigns" }, 403);

  const RESEND = Deno.env.get("RESEND_API_KEY");
  const SECRET = Deno.env.get("EMAIL_UNSUB_SECRET");
  if (!RESEND || !SECRET) return json({ error: "Email sending is not configured" }, 500);

  let p: Record<string, unknown>;
  try {
    p = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  try {
    switch (p.action) {
      case "preview": {
        const { subject, preheader, bodyHtml } = validateContent(p);
        const name = (admin.user_metadata?.full_name as string | undefined) ?? "Ada Obi";
        const html = buildEmail(
          personalize(subject, name, false), preheader,
          personalize(transformBody(bodyHtml), name, true), `${WEB}/unsubscribe`,
        );
        return json({ html, subject: personalize(subject, name, false) });
      }

      case "count": {
        const list = await resolveAudience(supabase, p.audience, p.role, p.userIds);
        const sup = await suppressedSet(supabase, list.map((r) => r.email));
        return json({ total: list.length, suppressed: sup.size, sendable: list.length - sup.size });
      }

      case "test": {
        const { subject, preheader, bodyHtml } = validateContent(p);
        const to = (admin.email ?? "").toLowerCase();
        if (!to) throw new Error("Your admin account has no email address");
        const name = (admin.user_metadata?.full_name as string | undefined) ?? null;
        const unsub = await unsubscribeUrl(supabaseUrl, SECRET, to);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL, to: [to],
            subject: `[TEST] ${personalize(subject, name, false)}`,
            html: buildEmail(personalize(subject, name, false), preheader, personalize(transformBody(bodyHtml), name, true), unsub),
            headers: unsubHeaders(unsub),
            tags: [{ name: "type", value: "campaign_test" }],
          }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`Resend rejected the test email (${res.status}): ${JSON.stringify(out).slice(0, 200)}`);
        return json({ ok: true, to });
      }

      case "create": {
        const { subject, preheader, bodyHtml } = validateContent(p);
        const list = await resolveAudience(supabase, p.audience, p.role, p.userIds);
        if (!list.length) throw new Error("No recipients match this audience");
        const sup = await suppressedSet(supabase, list.map((r) => r.email));

        const { data: camp, error } = await supabase.from("email_campaigns").insert({
          subject, preheader, body_html: sanitizeHtml(bodyHtml),
          audience: p.audience, audience_role: p.audience === "role" ? p.role : null,
          status: "sending", total_recipients: list.length, skipped_count: sup.size,
          created_by: admin.id, started_at: new Date().toISOString(),
        }).select("id").single();
        if (error) throw error;

        try {
          const rows = list.map((r) => ({
            campaign_id: camp.id, user_id: r.user_id, email: r.email, full_name: r.full_name,
            status: sup.has(r.email) ? "skipped" : "pending",
            error: sup.has(r.email) ? "suppressed (unsubscribed, bounced or complained)" : null,
          }));
          for (let i = 0; i < rows.length; i += 500) {
            const { error: e } = await supabase.from("email_campaign_recipients").insert(rows.slice(i, i + 500));
            if (e) throw e;
          }
        } catch (e) {
          await supabase.from("email_campaigns")
            .update({ status: "failed", last_error: String((e as Error).message ?? e) }).eq("id", camp.id);
          throw e;
        }
        return json({ campaignId: camp.id, total: list.length, skipped: sup.size, pending: list.length - sup.size });
      }

      case "send_batch": {
        const campaignId = p.campaignId;
        if (!isUuid(campaignId)) throw new Error("Invalid campaign");
        const { data: camp } = await supabase.from("email_campaigns")
          .select("id, subject, preheader, body_html, status").eq("id", campaignId).maybeSingle();
        if (!camp) throw new Error("Campaign not found");
        if (camp.status !== "sending") {
          return json({ done: true, status: camp.status, ...(await refreshCounts(supabase, campaignId)) });
        }

        // Rows claimed by an invocation that died mid-send go back in the queue.
        await supabase.from("email_campaign_recipients")
          .update({ status: "pending", claimed_at: null })
          .eq("campaign_id", campaignId).eq("status", "sending")
          .lt("claimed_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

        const { data: pending } = await supabase.from("email_campaign_recipients")
          .select("user_id").eq("campaign_id", campaignId).eq("status", "pending").limit(BATCH_SIZE);

        let batchSent = 0;
        let batchFailed = 0;
        if (pending && pending.length) {
          const { data: claimed, error: claimErr } = await supabase.from("email_campaign_recipients")
            .update({ status: "sending", claimed_at: new Date().toISOString() })
            .eq("campaign_id", campaignId).eq("status", "pending")
            .in("user_id", pending.map((r: { user_id: string }) => r.user_id))
            .select("user_id, email, full_name");
          if (claimErr) throw claimErr;

          if (claimed && claimed.length) {
            const body = transformBody(camp.body_html);
            const messages = await Promise.all(claimed.map(async (r: Recipient) => {
              const unsub = await unsubscribeUrl(supabaseUrl, SECRET, r.email);
              const subj = personalize(camp.subject, r.full_name, false);
              return {
                from: FROM_EMAIL, to: [r.email], subject: subj,
                html: buildEmail(subj, camp.preheader ?? "", personalize(body, r.full_name, true), unsub),
                headers: unsubHeaders(unsub),
                tags: [{ name: "campaign_id", value: campaignId }],
              };
            }));

            const res = await fetch("https://api.resend.com/emails/batch", {
              method: "POST",
              headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
              body: JSON.stringify(messages),
            });
            const result = await res.json().catch(() => ({}));
            const now = new Date().toISOString();

            let updates: Record<string, unknown>[];
            if (res.ok && Array.isArray(result?.data)) {
              updates = claimed.map((r: Recipient, i: number) => {
                const id = result.data[i]?.id ?? null;
                return {
                  campaign_id: campaignId, user_id: r.user_id, email: r.email, full_name: r.full_name,
                  status: id ? "sent" : "failed", resend_id: id, error: id ? null : "No message id returned",
                  sent_at: id ? now : null, claimed_at: null,
                };
              });
            } else {
              const msg = `Resend ${res.status}: ${JSON.stringify(result).slice(0, 300)}`;
              const retryable = res.status === 429 || res.status >= 500;
              updates = claimed.map((r: Recipient) => ({
                campaign_id: campaignId, user_id: r.user_id, email: r.email, full_name: r.full_name,
                status: retryable ? "pending" : "failed", error: retryable ? null : msg, claimed_at: null,
              }));
              await supabase.from("email_campaigns").update({ last_error: msg }).eq("id", campaignId);
              if (retryable) {
                await supabase.from("email_campaign_recipients").upsert(updates, { onConflict: "campaign_id,user_id" });
                return json({ done: false, rateLimited: true, retryAfterMs: 2000, ...(await refreshCounts(supabase, campaignId)) });
              }
            }
            const { error: upErr } = await supabase.from("email_campaign_recipients")
              .upsert(updates, { onConflict: "campaign_id,user_id" });
            if (upErr) throw upErr;
            batchSent = updates.filter((u) => u.status === "sent").length;
            batchFailed = updates.filter((u) => u.status === "failed").length;
          }
        }

        const c = await refreshCounts(supabase, campaignId);
        const done = c.remaining === 0;
        if (done) {
          await supabase.from("email_campaigns").update({
            status: c.sent === 0 && c.failed > 0 ? "failed" : "sent",
            completed_at: new Date().toISOString(),
          }).eq("id", campaignId);
        }
        return json({ done, batchSent, batchFailed, ...c });
      }

      case "cancel": {
        const campaignId = p.campaignId;
        if (!isUuid(campaignId)) throw new Error("Invalid campaign");
        await supabase.from("email_campaign_recipients")
          .update({ status: "skipped", error: "cancelled", claimed_at: null })
          .eq("campaign_id", campaignId).in("status", ["pending", "sending"]);
        await supabase.from("email_campaigns")
          .update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", campaignId);
        return json({ ok: true, ...(await refreshCounts(supabase, campaignId)) });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error("admin-email-campaign error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
