import { Link } from "react-router-dom";
import { Apple, Share, Plus, CheckCircle2, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

// Public TestFlight link (App Store Connect → TestFlight → External group).
// Override without editing code via VITE_TESTFLIGHT_URL if it ever changes.
const TESTFLIGHT_URL =
  (import.meta.env.VITE_TESTFLIGHT_URL as string | undefined) ||
  "https://testflight.apple.com/join/u5YAu2zj";

const testflightReady = !TESTFLIGHT_URL.includes("XXXX");

const StepList = ({ steps }: { steps: React.ReactNode[] }) => (
  <ol className="mt-4 space-y-3">
    {steps.map((step, i) => (
      <li key={i} className="flex gap-3">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {i + 1}
        </span>
        <span className="text-sm leading-relaxed text-muted-foreground">{step}</span>
      </li>
    ))}
  </ol>
);

const DownloadIOS = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pt-28 pb-16 md:pt-32">
        <div className="container mx-auto max-w-2xl px-4">
          {/* Heading */}
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Apple className="h-3.5 w-3.5" />
              iPhone &amp; iPad
            </span>
            <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Get Shop4Me on your iPhone
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
              Our App Store listing is in its final review with Apple. In the meantime,
              here are two quick ways to start using Shop4Me on iPhone{" "}
              <span className="font-medium text-foreground">today</span>.
            </p>
          </div>

          {/* Option 1 — Add to Home Screen (fastest, no install) */}
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Fastest · No install
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              1. Add to Home Screen (Web App)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The quickest way to start — add Shop4Me to your home screen and it opens
              full-screen, just like the app. Nothing to install.
            </p>

            <StepList
              steps={[
                <>Open <strong>shop4meng.com</strong> in <strong>Safari</strong> (this must be Safari, not Chrome).</>,
                <>Tap the <strong>Share</strong> icon <Share className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" /> at the bottom of the screen.</>,
                <>Scroll down and tap <strong>Add to Home Screen</strong> <Plus className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" />.</>,
                <>Tap <strong>Add</strong> — the Shop4Me icon appears on your home screen. Open it from there.</>,
              ]}
            />

            <div className="mt-6">
              <Button asChild variant="hero" size="lg" className="w-full sm:w-auto">
                <Link to="/auth">Open the Web App</Link>
              </Button>
            </div>
          </div>

          {/* Option 2 — TestFlight (full native app) */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              Full app · via TestFlight
            </span>
            <h2 className="mt-3 font-display text-xl font-bold text-foreground">
              2. Get the app via TestFlight
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prefer the complete native app? Install through Apple's official{" "}
              <strong>TestFlight</strong> app — with live tracking, notifications and
              everything else.
            </p>

            <StepList
              steps={[
                <>Tap <strong>Open TestFlight beta</strong> below.</>,
                <>If prompted, install the free <strong>TestFlight</strong> app from the App Store, then come back and tap the link again.</>,
                <>In TestFlight, tap <strong>Install</strong> next to Shop4Me.</>,
                <>Open Shop4Me and sign up — you're in! 🎉</>,
              ]}
            />

            <div className="mt-6">
              {testflightReady ? (
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <a href={TESTFLIGHT_URL} target="_blank" rel="noopener noreferrer">
                    Open TestFlight beta
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <div className="rounded-lg border border-dashed border-primary/40 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  🛠️ Beta access is opening shortly — please check back soon, or use the
                  Web App above in the meantime.
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                TestFlight is Apple's official beta platform. It's free and safe.
              </p>
            </div>
          </div>

          {/* Reassurance + back */}
          <div className="mt-8 flex items-start gap-2 rounded-xl bg-muted/50 p-4">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary" />
            <p className="text-sm text-muted-foreground">
              The full App Store version is coming very soon. However you start now, your
              account and data carry over — no need to reinstall or sign up again.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DownloadIOS;
