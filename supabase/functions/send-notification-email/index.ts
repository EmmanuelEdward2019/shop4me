import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  emailLayout,
  greetingLine,
  infoBox,
  ctaButton,
  formatNGN,
  sendEmail,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailType =
  | "welcome"
  | "password_reset"
  | "payment_success"
  | "payment_failed"
  | "wallet_topup"
  | "wallet_topup_admin"
  | "wallet_spent"
  | "wallet_spent_admin"
  | "order_paid_agent"
  | "order_paid_admin"
  | "order_delivered"
  | "invoice_created"
  | "compliance_warning"
  | "compliance_suspension"
  | "compliance_reinstatement"
  | "withdrawal_requested"
  | "withdrawal_transferred"
  | "withdrawal_confirmed";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { type, data } = (await req.json()) as { type: EmailType; data: Record<string, any> };

    let to: string | string[] = "";
    let subject = "";
    let body = "";

    switch (type) {
      // ─── Welcome / Signup ─────────────────────────────────
      case "welcome": {
        const { email, name } = data;
        to = email;
        subject = "Welcome to Shop4Me! 🎉";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Your account has been created successfully. You can now place orders and have a personal shopping agent bring items right to your doorstep.</p>` +
            ctaButton("Start Shopping", "https://shop4meng.com/auth") +
            `<p style="color:#6b7280;font-size:14px;">Need help? Visit our <a href="https://shop4meng.com/help" style="color:#16a34a;">Help Center</a>.</p>`
        );
        break;
      }

      // ─── Password Reset ───────────────────────────────────
      case "password_reset": {
        const { email, name, resetLink } = data;
        to = email;
        subject = "Reset Your Shop4Me Password";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">We received a request to reset your password. Click the button below to create a new password.</p>` +
            ctaButton("Reset Password", resetLink) +
            `<p style="color:#6b7280;font-size:14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`
        );
        break;
      }

      // ─── Payment Success (Buyer) ──────────────────────────
      case "payment_success": {
        const { email, name, amount, orderId, locationName, reference } = data;
        to = email;
        subject = `Payment Confirmed - ${formatNGN(amount)}`;
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Your payment of <strong>${formatNGN(amount)}</strong> for your order from <strong>${locationName}</strong> has been confirmed.</p>` +
            infoBox(
              `<p style="margin:0;"><strong>Order:</strong> #${orderId?.slice(0, 8) || "N/A"}</p>
               <p style="margin:4px 0 0;"><strong>Reference:</strong> ${reference || "N/A"}</p>
               <p style="margin:4px 0 0;"><strong>Amount:</strong> ${formatNGN(amount)}</p>`
            ) +
            `<p style="color:#4a4a4a;font-size:16px;">Your agent will begin delivery shortly.</p>` +
            ctaButton("View Order", `https://shop4meng.com/dashboard/orders/${orderId}`)
        );
        break;
      }

      // ─── Payment Failed (Buyer) ───────────────────────────
      case "payment_failed": {
        const { email, name, amount, reference } = data;
        to = email;
        subject = "Payment Failed - Action Required";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Your payment of <strong>${formatNGN(amount)}</strong> could not be processed.</p>` +
            infoBox(
              `<p style="margin:0;color:#dc2626;"><strong>Status:</strong> Failed</p>
               <p style="margin:4px 0 0;"><strong>Reference:</strong> ${reference || "N/A"}</p>`
            ) +
            `<p style="color:#4a4a4a;font-size:16px;">Please try again or use a different payment method.</p>` +
            ctaButton("Retry Payment", "https://shop4meng.com/dashboard/orders")
        );
        break;
      }

      // ─── Wallet Topup (Buyer) ─────────────────────────────
      case "wallet_topup": {
        const { email, name, amount, newBalance, reference } = data;
        to = email;
        subject = `Wallet Funded - ${formatNGN(amount)}`;
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Your Shop4Me wallet has been funded successfully.</p>` +
            infoBox(
              `<p style="margin:0;"><strong>Amount Added:</strong> ${formatNGN(amount)}</p>
               <p style="margin:4px 0 0;"><strong>New Balance:</strong> ${formatNGN(newBalance)}</p>
               <p style="margin:4px 0 0;"><strong>Reference:</strong> ${reference || "N/A"}</p>`
            ) +
            ctaButton("View Wallet", "https://shop4meng.com/dashboard/wallet")
        );
        break;
      }

      // ─── Wallet Topup (Admin notification) ────────────────
      case "wallet_topup_admin": {
        const { email, amount, newBalance, buyerName, buyerEmail, reference } = data;
        to = email;
        subject = `[Admin] Wallet Funded - ${formatNGN(amount)}`;
        body = emailLayout(
          subject,
          `<p style="color:#4a4a4a;font-size:16px;">A user has funded their wallet.</p>` +
            infoBox(
              `<p style="margin:0;"><strong>User:</strong> ${buyerName || "N/A"} (${buyerEmail || "N/A"})</p>
               <p style="margin:4px 0 0;"><strong>Amount:</strong> ${formatNGN(amount)}</p>
               <p style="margin:4px 0 0;"><strong>New Balance:</strong> ${formatNGN(newBalance)}</p>
               <p style="margin:4px 0 0;"><strong>Reference:</strong> ${reference || "N/A"}</p>`
            ) +
            ctaButton("View in Admin", "https://shop4meng.com/admin")
        );
        break;
      }

      // ─── Wallet Spent (Buyer) ─────────────────────────────
      case "wallet_spent": {
        const { email, name, amount, newBalance, orderId, locationName } = data;
        to = email;
        subject = `Wallet Payment - ${formatNGN(amount)}`;
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">A payment of <strong>${formatNGN(amount)}</strong> was made from your wallet for your order from <strong>${locationName || "a store"}</strong>.</p>` +
            infoBox(
              `<p style="margin:0;"><strong>Amount Deducted:</strong> ${formatNGN(amount)}</p>
               <p style="margin:4px 0 0;"><strong>Remaining Balance:</strong> ${formatNGN(newBalance)}</p>
               <p style="margin:4px 0 0;"><strong>Order:</strong> #${orderId?.slice(0, 8) || "N/A"}</p>`
            ) +
            ctaButton("View Order", `https://shop4meng.com/dashboard/orders/${orderId}`)
        );
        break;
      }

      // ─── Wallet Spent (Admin notification) ────────────────
      case "wallet_spent_admin": {
        const { email, amount, newBalance, buyerName, orderId, locationName } = data;
        to = email;
        subject = `[Admin] Wallet Payment - ${formatNGN(amount)}`;
        body = emailLayout(
          subject,
          `<p style="color:#4a4a4a;font-size:16px;">A wallet payment has been processed.</p>` +
            infoBox(
              `<p style="margin:0;"><strong>Buyer:</strong> ${buyerName || "N/A"}</p>
               <p style="margin:4px 0 0;"><strong>Amount:</strong> ${formatNGN(amount)}</p>
               <p style="margin:4px 0 0;"><strong>Remaining Balance:</strong> ${formatNGN(newBalance)}</p>
               <p style="margin:4px 0 0;"><strong>Order:</strong> #${orderId?.slice(0, 8) || "N/A"}</p>
               <p style="margin:4px 0 0;"><strong>Location:</strong> ${locationName || "N/A"}</p>`
            ) +
            ctaButton("View in Admin", `https://shop4meng.com/admin/orders/${orderId}`)
        );
      }

      // ─── Order Paid (Agent notification) ──────────────────
      case "order_paid_agent": {
        const { email, name, amount, orderId, locationName, buyerName } = data;
        to = email;
        subject = `Order Paid - ${locationName}`;
        body = emailLayout(
          subject,
          greetingLine(name || "Agent") +
            `<p style="color:#4a4a4a;font-size:16px;">Great news! <strong>${buyerName}</strong> has completed payment of <strong>${formatNGN(amount)}</strong> for the order from <strong>${locationName}</strong>.</p>` +
            `<p style="color:#4a4a4a;font-size:16px;">You can now proceed with delivery.</p>` +
            ctaButton("Start Delivery", `https://shop4meng.com/agent/orders/${orderId}`)
        );
        break;
      }

      // ─── Order Paid (Admin notification) ──────────────────
      case "order_paid_admin": {
        const { email, amount, orderId, locationName, buyerName, agentName } = data;
        to = email;
        subject = `[Admin] Payment Received - ${formatNGN(amount)}`;
        body = emailLayout(
          subject,
          `<p style="color:#4a4a4a;font-size:16px;">A payment has been processed on the platform.</p>` +
            infoBox(
              `<p style="margin:0;"><strong>Order:</strong> #${orderId?.slice(0, 8) || "N/A"}</p>
               <p style="margin:4px 0 0;"><strong>Location:</strong> ${locationName}</p>
               <p style="margin:4px 0 0;"><strong>Buyer:</strong> ${buyerName || "N/A"}</p>
               <p style="margin:4px 0 0;"><strong>Agent:</strong> ${agentName || "N/A"}</p>
               <p style="margin:4px 0 0;"><strong>Amount:</strong> ${formatNGN(amount)}</p>`
            ) +
            ctaButton("View in Admin", `https://shop4meng.com/admin/orders/${orderId}`)
        );
        break;
      }

      // ─── Order Delivered ──────────────────────────────────
      case "order_delivered": {
        let { email, name, orderId, locationName } = data;
        // Resolve buyer email from order if not provided
        if (!email && orderId) {
          const { data: order } = await supabase.from("orders").select("user_id, location_name").eq("id", orderId).single();
          if (order) {
            locationName = locationName || order.location_name;
            const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", order.user_id).single();
            if (profile) { email = profile.email; name = profile.full_name; }
          }
        }
        if (!email) { return new Response(JSON.stringify({ error: "Buyer email not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
        to = email;
        subject = `Order Delivered - ${locationName}`;
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Your order from <strong>${locationName}</strong> has been delivered! 🎉</p>` +
            `<p style="color:#4a4a4a;font-size:16px;">We'd love to hear about your experience. Please rate your agent.</p>` +
            ctaButton("Rate Your Agent", `https://shop4meng.com/dashboard/orders/${orderId}`)
        );
        break;
      }

      // ─── Invoice Created (Buyer) ──────────────────────────
      case "invoice_created": {
        let { email, name, invoiceNumber, locationName, subtotal, serviceFee, deliveryFee, discount, total, invoiceId } = data;
        // Resolve buyer email from invoice if not provided
        if (!email && invoiceId) {
          const { data: inv } = await supabase.from("invoices").select("buyer_id, order_id, invoice_number, subtotal, service_fee, delivery_fee, discount, total").eq("id", invoiceId).single();
          if (inv) {
            invoiceNumber = invoiceNumber || inv.invoice_number;
            subtotal = subtotal ?? inv.subtotal;
            serviceFee = serviceFee ?? inv.service_fee;
            deliveryFee = deliveryFee ?? inv.delivery_fee;
            discount = discount ?? inv.discount;
            total = total ?? inv.total;
            const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", inv.buyer_id).single();
            if (profile) { email = profile.email; name = name || profile.full_name; }
            const { data: order } = await supabase.from("orders").select("location_name").eq("id", inv.order_id).single();
            if (order) { locationName = locationName || order.location_name; }
          }
        }
        if (!email) { return new Response(JSON.stringify({ error: "Buyer email not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
        to = email;
        subject = `Invoice ${invoiceNumber} - ${locationName}`;
        body = emailLayout(
          subject,
          greetingLine(name || "Valued Customer") +
            `<p style="color:#4a4a4a;font-size:16px;">Your agent has generated a final invoice for your order from <strong>${locationName}</strong>.</p>` +
            infoBox(
              `<p style="margin:0;"><strong>Invoice:</strong> ${invoiceNumber}</p>
               <p style="margin:4px 0 0;"><strong>Subtotal:</strong> ${formatNGN(subtotal)}</p>
               ${serviceFee > 0 ? `<p style="margin:4px 0 0;"><strong>Service Fee:</strong> ${formatNGN(serviceFee)}</p>` : ""}
               ${deliveryFee > 0 ? `<p style="margin:4px 0 0;"><strong>Delivery Fee:</strong> ${formatNGN(deliveryFee)}</p>` : ""}
               ${discount > 0 ? `<p style="margin:4px 0 0;color:#16a34a;"><strong>Discount:</strong> -${formatNGN(discount)}</p>` : ""}
               <hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;" />
               <p style="margin:0;font-size:18px;"><strong>Total: ${formatNGN(total)}</strong></p>`
            ) +
            `<p style="color:#4a4a4a;font-size:14px;">Log in to view the full invoice and download a PDF copy.</p>` +
            ctaButton("View Invoice", "https://shop4meng.com/dashboard/orders")
        );
        break;
      }

      // ─── Compliance Warning ─────────────────────────────
      case "compliance_warning": {
        const { email, name, reason, notes, role, score } = data;
        to = email;
        subject = "Shop4Me Compliance Warning";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">This is a formal warning regarding your performance as a <strong>${role}</strong> on the Shop4Me platform.</p>` +
            infoBox(
              `<p style="margin:0;color:#d97706;"><strong>⚠️ Warning Issued</strong></p>
               <p style="margin:4px 0 0;"><strong>Reason:</strong> ${reason}</p>
               ${notes ? `<p style="margin:4px 0 0;"><strong>Details:</strong> ${notes}</p>` : ""}
               ${score !== undefined ? `<p style="margin:4px 0 0;"><strong>Compliance Score:</strong> ${score}/100</p>` : ""}`
            ) +
            `<p style="color:#4a4a4a;font-size:16px;">Please take steps to improve your performance. Continued violations may result in suspension of your account.</p>` +
            `<p style="color:#6b7280;font-size:14px;">If you have questions, please contact support through the app.</p>`
        );
        break;
      }

      // ─── Compliance Suspension ────────────────────────────
      case "compliance_suspension": {
        const { email, name, reason, notes, role, score } = data;
        to = email;
        subject = "Shop4Me Account Suspended";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Your <strong>${role}</strong> account on Shop4Me has been <strong>suspended</strong> due to compliance issues.</p>` +
            infoBox(
              `<p style="margin:0;color:#dc2626;"><strong>🚫 Account Suspended</strong></p>
               <p style="margin:4px 0 0;"><strong>Reason:</strong> ${reason}</p>
               ${notes ? `<p style="margin:4px 0 0;"><strong>Details:</strong> ${notes}</p>` : ""}
               ${score !== undefined ? `<p style="margin:4px 0 0;"><strong>Compliance Score:</strong> ${score}/100</p>` : ""}`
            ) +
            `<p style="color:#4a4a4a;font-size:16px;">Your role has been reverted to a regular buyer account. You will no longer be able to accept orders or deliveries until your account is reinstated.</p>` +
            `<p style="color:#6b7280;font-size:14px;">If you believe this was an error, please contact our support team.</p>`
        );
        break;
      }

      // ─── Compliance Reinstatement ─────────────────────────
      case "compliance_reinstatement": {
        const { email, name, reason, notes, role, score } = data;
        to = email;
        subject = "Shop4Me Account Reinstated 🎉";
        body = emailLayout(
          subject,
          greetingLine(name || "there") +
            `<p style="color:#4a4a4a;font-size:16px;">Great news! Your <strong>${role}</strong> account on Shop4Me has been <strong>reinstated</strong>.</p>` +
            infoBox(
              `<p style="margin:0;color:#16a34a;"><strong>✅ Account Reinstated</strong></p>
               <p style="margin:4px 0 0;"><strong>Reason:</strong> ${reason}</p>
               ${notes ? `<p style="margin:4px 0 0;"><strong>Details:</strong> ${notes}</p>` : ""}`
            ) +
            `<p style="color:#4a4a4a;font-size:16px;">You can now resume accepting orders and deliveries. Please ensure you maintain high performance standards going forward.</p>` +
            ctaButton("Go to Dashboard", `https://shop4meng.com/${role === "rider" ? "rider" : "agent"}/dashboard`)
        );
        break;
      }

      // ─── Rider: Withdrawal Requested → Admin ──────────────
      case "withdrawal_requested": {
        const { riderId, withdrawalId } = data;

        // Look up rider profile and bank details
        const [profileRes, appRes, adminRolesRes] = await Promise.all([
          supabase.from("profiles").select("full_name, email, phone").eq("user_id", riderId).single(),
          supabase.from("agent_applications").select("bank_name, account_number, account_name").eq("user_id", riderId).single(),
          supabase.from("user_roles").select("user_id").eq("role", "admin"),
        ]);

        const riderName = profileRes.data?.full_name || "A Rider";
        const riderEmail = profileRes.data?.email || "";
        const riderPhone = profileRes.data?.phone || "";
        const bankName = appRes.data?.bank_name || "—";
        const accountNumber = appRes.data?.account_number || "—";
        const accountName = appRes.data?.account_name || "—";

        // Fetch the withdrawal amount
        const { data: wRow } = await supabase.from("rider_withdrawals").select("amount").eq("id", withdrawalId).single();
        const amount = Number(wRow?.amount ?? 0);

        const adminEmails: string[] = [];
        for (const admin of (adminRolesRes.data ?? [])) {
          const { data: ap } = await supabase.from("profiles").select("email").eq("user_id", admin.user_id).single();
          if (ap?.email) adminEmails.push(ap.email);
        }
        if (adminEmails.length === 0) break;

        subject = `[Admin] Rider Withdrawal Request — ${formatNGN(amount)}`;
        body = emailLayout(
          subject,
          `<p style="color:#4a4a4a;font-size:16px;">A rider has requested a withdrawal. Please transfer the amount to their bank account and mark it as transferred in the admin panel.</p>` +
            infoBox(
              `<p style="margin:0;"><strong>Rider:</strong> ${riderName}</p>
               <p style="margin:4px 0 0;"><strong>Email:</strong> ${riderEmail}</p>
               <p style="margin:4px 0 0;"><strong>Phone:</strong> ${riderPhone}</p>
               <hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;" />
               <p style="margin:0;"><strong>Bank:</strong> ${bankName}</p>
               <p style="margin:4px 0 0;"><strong>Account Number:</strong> ${accountNumber}</p>
               <p style="margin:4px 0 0;"><strong>Account Name:</strong> ${accountName}</p>
               <hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;" />
               <p style="margin:0;font-size:18px;"><strong>Amount to Transfer: ${formatNGN(amount)}</strong></p>`
            ) +
            ctaButton("Manage Withdrawals", "https://shop4meng.com/admin/riders")
        );

        const results = await Promise.all(adminEmails.map((e) => sendEmail(RESEND_API_KEY!, e, subject, body)));
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) throw new Error(failed[0].error);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ─── Rider: Withdrawal Transferred → Rider ────────────
      case "withdrawal_transferred": {
        const { riderId, amount, bankName, accountNumber } = data;

        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", riderId).single();
        if (!profile?.email) break;

        to = profile.email;
        subject = `Your Withdrawal of ${formatNGN(amount)} Has Been Sent`;
        body = emailLayout(
          subject,
          greetingLine(profile.full_name || "Rider") +
            `<p style="color:#4a4a4a;font-size:16px;">Great news! We have transferred your earnings to your bank account. Please check and confirm receipt in the app.</p>` +
            infoBox(
              `<p style="margin:0;"><strong>Amount Transferred:</strong> ${formatNGN(amount)}</p>
               <p style="margin:4px 0 0;"><strong>Bank:</strong> ${bankName || "—"}</p>
               <p style="margin:4px 0 0;"><strong>Account:</strong> ${accountNumber || "—"}</p>`
            ) +
            `<p style="color:#4a4a4a;font-size:16px;">Once you see the money in your account, please open the app and tap <strong>"I Have Received Payment"</strong> to complete the transaction.</p>` +
            ctaButton("Confirm Receipt", "https://shop4meng.com/rider/earnings")
        );
        break;
      }

      // ─── Rider: Withdrawal Confirmed → Admin ──────────────
      case "withdrawal_confirmed": {
        const { riderId, amount } = data;

        const [profileRes, adminRolesRes] = await Promise.all([
          supabase.from("profiles").select("full_name, email").eq("user_id", riderId).single(),
          supabase.from("user_roles").select("user_id").eq("role", "admin"),
        ]);

        const riderName = profileRes.data?.full_name || "A Rider";
        const riderEmail = profileRes.data?.email || "";

        const adminEmails: string[] = [];
        for (const admin of (adminRolesRes.data ?? [])) {
          const { data: ap } = await supabase.from("profiles").select("email").eq("user_id", admin.user_id).single();
          if (ap?.email) adminEmails.push(ap.email);
        }
        if (adminEmails.length === 0) break;

        subject = `[Admin] Rider Confirmed Receipt — ${formatNGN(amount)} — Transaction Complete`;
        body = emailLayout(
          subject,
          `<p style="color:#4a4a4a;font-size:16px;">A rider has confirmed receipt of their withdrawal. The transaction is now marked as complete.</p>` +
            infoBox(
              `<p style="margin:0;color:#16a34a;"><strong>✅ Transaction Complete</strong></p>
               <p style="margin:4px 0 0;"><strong>Rider:</strong> ${riderName} (${riderEmail})</p>
               <p style="margin:4px 0 0;font-size:18px;"><strong>Amount:</strong> ${formatNGN(amount)}</p>`
            ) +
            ctaButton("View Rider Withdrawals", "https://shop4meng.com/admin/riders")
        );

        const results = await Promise.all(adminEmails.map((e) => sendEmail(RESEND_API_KEY!, e, subject, body)));
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) throw new Error(failed[0].error);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const result = await sendEmail(RESEND_API_KEY, to, subject, body);

    if (!result.success) {
      throw new Error(result.error);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
