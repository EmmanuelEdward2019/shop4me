import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X, Share, Plus, ArrowDown, Compass } from "lucide-react";
import {
  isIOS,
  isIOSSafari,
  isStandalone,
  wasA2HSDismissed,
  setA2HSDismissed,
  A2HS_EVENT,
} from "@/lib/pwa";
import { APP_STORE_URL } from "@/lib/appStores";

// Pages where the guide appears automatically.
const AUTO_OPEN_PATHS = ["/", "/ios"];

/**
 * Auto-appearing "Add to Home Screen" guide for iPhone.
 * - Mounted once globally (inside the router).
 * - Auto-opens on the home page and /ios (unless already dismissed/installed).
 * - Also opens on demand when a "Download for iPhone" button fires A2HS_EVENT
 *   (that path ignores the dismissed flag — it's an explicit user request).
 * - Renders nothing on Android/desktop or when running as an installed app.
 */
export const InstallPrompt = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Auto-open on the relevant pages.
  useEffect(() => {
    if (isStandalone() || !isIOS()) return;
    if (wasA2HSDismissed()) return;
    if (!AUTO_OPEN_PATHS.includes(location.pathname)) return;
    const timer = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Open on demand from a button (explicit → ignores the dismissed flag).
  useEffect(() => {
    const onOpen = () => {
      if (isStandalone() || !isIOS()) return;
      setOpen(true);
    };
    window.addEventListener(A2HS_EVENT, onOpen);
    return () => window.removeEventListener(A2HS_EVENT, onOpen);
  }, []);

  const dismiss = () => {
    setOpen(false);
    setA2HSDismissed(); // don't nag again (covers users who've already added it)
  };

  if (!open || isStandalone() || !isIOS()) return null;

  const safari = isIOSSafari();

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-3">
      <div className="relative w-full max-w-md animate-in slide-in-from-bottom-4 fade-in rounded-2xl border border-border bg-card p-5 shadow-2xl duration-300">
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <img
            src="/apple-touch-icon.png"
            alt="Shop4Me"
            className="h-12 w-12 flex-shrink-0 rounded-xl border border-border"
          />
          <div className="min-w-0 pr-4">
            <h3 className="font-display text-base font-bold text-foreground">
              Add Shop4Me to your Home Screen
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Tap the <Share className="mx-0.5 inline h-4 w-4 align-text-bottom text-primary" />{" "}
              <strong className="text-foreground">Share</strong> button, then choose{" "}
              <strong className="text-foreground">Add to Home Screen</strong>{" "}
              <Plus className="mx-0.5 inline h-4 w-4 align-text-bottom text-primary" />.
            </p>
          </div>
        </div>

        {safari ? (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-primary">
            <ArrowDown className="h-4 w-4 animate-bounce" />
            Tap the Share icon below
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
            <Compass className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              This only works in <strong>Safari</strong>. Open{" "}
              <strong>shop4meng.com</strong> in Safari, then follow the steps above.
            </span>
          </div>
        )}

        <div className="mt-3 text-center">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            Prefer the app? Get it on the App Store →
          </a>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
