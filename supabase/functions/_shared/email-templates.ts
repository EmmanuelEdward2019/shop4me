const BRAND_COLOR = "#16a34a";
const BRAND_NAME = "Shop4Me";
const SENDER_EMAIL = "info@techfieldsdigital.com.ng";
const SENDER_NAME = "Shop4Me";

export const FROM_EMAIL = `${SENDER_NAME} <${SENDER_EMAIL}>`;

export function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
  <tr><td style="background:${BRAND_COLOR};padding:24px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:26px;letter-spacing:1px;">${BRAND_NAME}</h1>
  </td></tr>
  <tr><td style="padding:32px 24px;">
    ${body}
  </td></tr>
  <tr><td style="background:#f8f9fa;padding:16px 24px;text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
    <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">This email was sent by Shop4Me. If you didn't expect this, please ignore it.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function formatNGN(amount: number): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);
}

export function greetingLine(name: string): string {
  return `<p style="color:#4a4a4a;font-size:16px;margin:0 0 16px;">Hi ${name},</p>`;
}

export function infoBox(content: string): string {
  return `<div style="background:#f0fdf4;border-left:4px solid ${BRAND_COLOR};border-radius:6px;padding:16px;margin:20px 0;">${content}</div>`;
}

export function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">${text}</a>
  </div>`;
}

export async function sendEmail(
  resendApiKey: string,
  to: string | string[],
  subject: string,
  html: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Resend API error:", data);
    return { success: false, error: `Email send failed [${res.status}]: ${JSON.stringify(data)}` };
  }
  return { success: true, id: data.id };
}
