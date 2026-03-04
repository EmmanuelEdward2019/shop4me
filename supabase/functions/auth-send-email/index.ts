import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  emailLayout,
  greetingLine,
  ctaButton,
  sendEmail,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

/**
 * Supabase Auth "Send Email" Hook
 *
 * This edge function is called by Supabase Auth whenever it needs to send an
 * email (signup confirmation, password recovery, magic link, email change, invite).
 *
 * It replaces the default Supabase auth emails with branded Shop4Me emails
 * sent via the already-verified Resend account (Support@shop4meng.com).
 *
 * Configure in Supabase Dashboard → Authentication → Hooks → Send Email
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const payload = await req.json();

    // Supabase Auth Hook payload structure
    const user = payload.user;
    const emailData = payload.email_data;

    if (!user || !emailData) {
      throw new Error("Invalid hook payload: missing user or email_data");
    }

    const email = user.email;
    const name = user.user_metadata?.full_name || "";
    const tokenHash = emailData.token_hash;
    const token = emailData.token;
    const redirectTo = emailData.redirect_to || "https://shop4meng.com/auth";
    const emailActionType = emailData.email_action_type;

    // Build the verification/action URL using Supabase's verify endpoint
    const confirmationUrl = `${SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${emailActionType}&redirect_to=${encodeURIComponent(redirectTo)}`;

    let subject = "";
    let body = "";

    switch (emailActionType) {
      case "signup": {
        subject = "Confirm Your Shop4Me Account";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Welcome to <strong>Shop4Me</strong>! We're excited to have you on board.</p>` +
            `<p style="color:#4a4a4a;font-size:16px;">Please confirm your email address to get started. Once confirmed, you can place orders and have a personal shopping agent deliver items right to your doorstep.</p>` +
            ctaButton("Confirm Email", confirmationUrl) +
            `<p style="color:#6b7280;font-size:13px;">Or copy and paste this link into your browser:</p>` +
            `<p style="color:#6b7280;font-size:12px;word-break:break-all;">${confirmationUrl}</p>` +
            `<p style="color:#6b7280;font-size:13px;">This link expires in 24 hours. If you didn't create this account, please ignore this email.</p>`
        );
        break;
      }

      case "recovery": {
        subject = "Reset Your Shop4Me Password";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">We received a request to reset your Shop4Me password. Click the button below to set a new password.</p>` +
            ctaButton("Reset Password", confirmationUrl) +
            `<p style="color:#6b7280;font-size:13px;">Or copy and paste this link into your browser:</p>` +
            `<p style="color:#6b7280;font-size:12px;word-break:break-all;">${confirmationUrl}</p>` +
            `<p style="color:#6b7280;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>`
        );
        break;
      }

      case "magic_link":
      case "magiclink": {
        subject = "Your Shop4Me Login Link";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Click the button below to log in to your Shop4Me account. No password needed!</p>` +
            ctaButton("Log In to Shop4Me", confirmationUrl) +
            `<p style="color:#6b7280;font-size:13px;">Or copy and paste this link into your browser:</p>` +
            `<p style="color:#6b7280;font-size:12px;word-break:break-all;">${confirmationUrl}</p>` +
            `<p style="color:#6b7280;font-size:13px;">This link expires in 10 minutes. If you didn't request this, please ignore this email.</p>`
        );
        break;
      }

      case "email_change": {
        subject = "Confirm Your New Email - Shop4Me";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">You requested to change your email address on Shop4Me. Please confirm this change by clicking the button below.</p>` +
            ctaButton("Confirm Email Change", confirmationUrl) +
            `<p style="color:#6b7280;font-size:13px;">Or copy and paste this link into your browser:</p>` +
            `<p style="color:#6b7280;font-size:12px;word-break:break-all;">${confirmationUrl}</p>` +
            `<p style="color:#6b7280;font-size:13px;">If you didn't request this change, please contact support immediately.</p>`
        );
        break;
      }

      case "invite": {
        subject = "You've Been Invited to Shop4Me!";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">You've been invited to join <strong>Shop4Me</strong> — Nigeria's personal shopping and delivery platform.</p>` +
            `<p style="color:#4a4a4a;font-size:16px;">Click the button below to accept the invitation and set up your account.</p>` +
            ctaButton("Accept Invitation", confirmationUrl) +
            `<p style="color:#6b7280;font-size:13px;">Or copy and paste this link into your browser:</p>` +
            `<p style="color:#6b7280;font-size:12px;word-break:break-all;">${confirmationUrl}</p>`
        );
        break;
      }

      case "reauthentication": {
        // OTP-based reauthentication — use the raw token code
        subject = "Shop4Me Verification Code";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Use the code below to verify your identity:</p>` +
            `<div style="text-align:center;margin:24px 0;">
              <span style="display:inline-block;background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:16px 32px;font-size:28px;font-weight:700;letter-spacing:6px;color:#1F7A4D;">${token}</span>
            </div>` +
            `<p style="color:#6b7280;font-size:13px;">This code expires in 10 minutes. If you didn't request this, please secure your account immediately.</p>`
        );
        break;
      }

      default: {
        // Fallback for unknown types — still send a branded email
        subject = "Shop4Me - Action Required";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Please click the button below to complete your action.</p>` +
            ctaButton("Continue", confirmationUrl)
        );
      }
    }

    const result = await sendEmail(RESEND_API_KEY, email, subject, body);

    if (!result.success) {
      console.error("Auth email send failed:", result.error);
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Auth email sent: type=${emailActionType}, to=${email}, id=${result.id}`);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auth email hook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
