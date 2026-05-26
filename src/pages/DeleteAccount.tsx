import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Mail, ShieldX, Trash2, Loader2 } from "lucide-react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Public, no-sign-in-required account & data deletion page.
// Linked from Google Play Console under "App Content → Data safety →
// Account deletion URL". Also linked from the website footer.
const DeleteAccount = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    reason: "",
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.fullName.trim()) {
      toast.error("Please enter your full name and the email on your Shop4Me account.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Reuse contact_submissions so the request lands in the existing
      // admin Submissions inbox. The fixed subject lets admins filter.
      const [firstName, ...rest] = form.fullName.trim().split(" ");
      const lastName = rest.join(" ") || firstName;
      const { error } = await supabase.from("contact_submissions").insert({
        first_name: firstName,
        last_name: lastName,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        subject: "Account Deletion Request",
        message:
          (form.reason.trim() || "(No reason provided)") +
          "\n\n— Submitted via /delete-account",
      });
      if (error) throw error;
      setIsSubmitted(true);
      toast.success("Your deletion request has been received.");
    } catch (err) {
      console.error("Account deletion request error:", err);
      toast.error("We couldn't send your request. Please email support@shop4meng.com instead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-3xl mx-auto">
                <span className="inline-block px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-semibold mb-4">
                  Account &amp; Data Deletion
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
                  Delete your <span className="text-gradient">Shop4Me</span> account
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Developer: <strong>Shop4Me</strong> &nbsp;·&nbsp; App: <strong>Shop4Me — Smart Shopping. Delivered.</strong>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can permanently delete your Shop4Me account and the
                  personal data associated with it at any time. Below are
                  the two ways to do that and what happens to your data.
                </p>
              </div>
            </ScrollAnimation>
          </div>
        </section>

        {/* Two ways to delete */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
              <ScrollAnimation>
                <div className="border border-border rounded-2xl p-6 h-full bg-card">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Trash2 className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-display font-semibold mb-2">
                    Option 1 — Delete in the app (recommended)
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    The fastest way. Account deletion is immediate.
                  </p>
                  <ol className="text-sm text-foreground/90 space-y-2 list-decimal pl-5 mb-4">
                    <li>Open the Shop4Me app or sign in at <Link to="/auth" className="text-primary hover:underline">shop4meng.com</Link>.</li>
                    <li>Go to <strong>Settings</strong> in the side menu.</li>
                    <li>Scroll to the <strong>Danger Zone</strong> section.</li>
                    <li>Tap <strong>Delete Account</strong> and confirm by typing your account email.</li>
                  </ol>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/dashboard/settings">Open Settings</Link>
                  </Button>
                </div>
              </ScrollAnimation>

              <ScrollAnimation>
                <div className="border border-border rounded-2xl p-6 h-full bg-card">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <Mail className="w-5 h-5 text-destructive" />
                  </div>
                  <h2 className="text-xl font-display font-semibold mb-2">
                    Option 2 — Request deletion below
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Use this if you can't sign in (lost device, uninstalled
                    the app, forgotten password and email link not
                    arriving). We process requests within <strong>7 business
                    days</strong>.
                  </p>
                  <Button asChild className="w-full">
                    <a href="#request-form">Submit deletion request</a>
                  </Button>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* What gets deleted vs retained */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <ScrollAnimation>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-8 text-center">
                  What happens to your data
                </h2>
              </ScrollAnimation>

              <div className="grid md:grid-cols-2 gap-6">
                <ScrollAnimation>
                  <div className="bg-card border border-border rounded-2xl p-6 h-full">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">Deleted immediately</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-foreground/90 list-disc pl-5">
                      <li>Your profile (name, email, phone, photo)</li>
                      <li>Delivery addresses</li>
                      <li>Saved payment cards</li>
                      <li>Push-notification subscriptions</li>
                      <li>Agent / rider application files (if any)</li>
                      <li>Role assignments (buyer, agent, rider)</li>
                      <li>Chat messages you sent (anonymized on the recipient's side)</li>
                    </ul>
                  </div>
                </ScrollAnimation>

                <ScrollAnimation>
                  <div className="bg-card border border-border rounded-2xl p-6 h-full">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldX className="w-5 h-5 text-amber-600" />
                      <h3 className="text-lg font-semibold">Retained (for legal &amp; safety reasons)</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-foreground/90 list-disc pl-5">
                      <li>
                        Past order records — anonymized (your name and contact
                        info are removed) but the order line items, prices,
                        and timestamps are kept for accounting and dispute
                        resolution.
                      </li>
                      <li>
                        Payment &amp; wallet transaction records — retained
                        for <strong>7 years</strong> in line with Nigerian
                        financial-record-keeping requirements.
                      </li>
                      <li>
                        Aggregated, non-identifiable analytics (e.g. total
                        orders per market) that cannot be linked back to you.
                      </li>
                      <li>
                        Records of any safety / compliance incidents, retained
                        only for as long as legally required.
                      </li>
                    </ul>
                  </div>
                </ScrollAnimation>
              </div>

              <ScrollAnimation>
                <div className="mt-8 p-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-sm text-amber-900 dark:text-amber-200">
                  <p>
                    <strong>Backup retention:</strong> Encrypted database
                    backups containing your data may persist for up to
                    <strong> 30 days</strong> after deletion before being
                    permanently overwritten. During this window, your data
                    is inaccessible to staff and used only for disaster
                    recovery.
                  </p>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* Before you delete */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <ScrollAnimation>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-6 text-center">
                  Before you delete
                </h2>
                <ul className="space-y-3 text-sm text-foreground/90 list-disc pl-5">
                  <li>
                    Any <strong>wallet balance</strong> you have left will be
                    forfeited. Withdraw or spend it before deleting. (Agents
                    and riders: submit any pending earnings as a withdrawal
                    first.)
                  </li>
                  <li>
                    Active orders (placed but not yet delivered) must either
                    be completed or cancelled before your account can be
                    deleted. We'll contact you if any are still open.
                  </li>
                  <li>
                    Deletion is <strong>permanent</strong>. We cannot restore
                    your account, order history, or wallet balance once the
                    deletion is processed.
                  </li>
                  <li>
                    If you only want to stop receiving notifications, you
                    don't need to delete your account — turn them off in
                    <strong> Settings → Notifications</strong> instead.
                  </li>
                </ul>
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* Request form */}
        <section id="request-form" className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <ScrollAnimation>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
                  Submit a deletion request
                </h2>
                <p className="text-muted-foreground mb-8">
                  We'll verify the request from the email on file and confirm
                  the deletion. You'll get a confirmation email within
                  <strong> 7 business days</strong>.
                </p>
              </ScrollAnimation>

              {isSubmitted ? (
                <ScrollAnimation>
                  <div className="bg-card border border-border rounded-2xl p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-display font-semibold mb-2">
                      Request received
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Thanks. We'll process your account deletion within 7
                      business days and email a confirmation to{" "}
                      <strong>{form.email}</strong>. If you don't hear from us,
                      check your spam folder or email{" "}
                      <a href="mailto:support@shop4meng.com" className="text-primary hover:underline">
                        support@shop4meng.com
                      </a>.
                    </p>
                  </div>
                </ScrollAnimation>
              ) : (
                <ScrollAnimation>
                  <form onSubmit={onSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-6 md:p-8">
                    <div>
                      <Label htmlFor="fullName">Full name *</Label>
                      <Input
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        value={form.fullName}
                        onChange={onChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email on your Shop4Me account *</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={onChange}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use the email you signed up with so we can match the
                        account.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone number (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={onChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reason">Reason (optional)</Label>
                      <Textarea
                        id="reason"
                        rows={3}
                        value={form.reason}
                        onChange={onChange}
                        placeholder="Helps us improve — but it's not required."
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="destructive"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending request…
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Request account deletion
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      By submitting, you confirm you own the account at the
                      email above and that you understand deletion is
                      permanent.
                    </p>
                  </form>
                </ScrollAnimation>
              )}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <ScrollAnimation>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                  Questions?
                </h2>
                <p className="text-muted-foreground mb-2">
                  Email us at{" "}
                  <a href="mailto:support@shop4meng.com" className="text-primary hover:underline">
                    support@shop4meng.com
                  </a>{" "}
                  with the subject line "Account Deletion".
                </p>
                <p className="text-sm text-muted-foreground">
                  Last updated: 26 May 2026
                </p>
              </ScrollAnimation>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default DeleteAccount;
