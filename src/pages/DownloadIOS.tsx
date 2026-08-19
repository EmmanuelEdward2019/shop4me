import { Link } from "react-router-dom";
import { Apple, Share, Plus, CheckCircle2, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { APP_STORE_URL } from "@/lib/appStores";

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
              Shop4Me is now{" "}
              <span className="font-medium text-foreground">live on the App Store</span> —
              download the full app in a couple of taps.
            </p>
          </div>

          {/* Option 1 — App Store (the real app) */}
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Recommended
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              1. Download from the App Store
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The complete native app — live tracking, push notifications and everything
              else, straight from Apple's App Store.
            </p>

            <StepList
              steps={[
                <>Tap <strong>Download on the App Store</strong> below.</>,
                <>The App Store opens on the Shop4Me listing — tap <strong>Get</strong>.</>,
                <>Open Shop4Me and sign in (or sign up) — you're in! 🎉</>,
              ]}
            />

            <div className="mt-6">
              <Button asChild variant="hero" size="lg" className="w-full sm:w-auto">
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                  <Apple className="h-4 w-4" />
                  Download on the App Store
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Option 2 — Add to Home Screen (no install) */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              No install · Web app
            </span>
            <h2 className="mt-3 font-display text-xl font-bold text-foreground">
              2. Add to Home Screen (Web App)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prefer not to install anything? Add Shop4Me to your home screen and it opens
              full-screen, just like the app.
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
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to="/auth">Open the Web App</Link>
              </Button>
            </div>
          </div>

          {/* Reassurance + back */}
          <div className="mt-8 flex items-start gap-2 rounded-xl bg-muted/50 p-4">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary" />
            <p className="text-sm text-muted-foreground">
              However you start, your account and data carry over — sign in with the same
              details and pick up right where you left off.
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
