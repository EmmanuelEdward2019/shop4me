import { useEffect, useState } from "react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/appStores";

type Platform = "ios" | "android" | "other";

/** Detect the visitor's platform so we can lead with the store they can actually use. */
export const usePlatform = (): Platform => {
  const [platform, setPlatform] = useState<Platform>("other");
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const iOS =
      /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as Mac but has touch points
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (iOS) setPlatform("ios");
    else if (/Android/i.test(ua)) setPlatform("android");
  }, []);
  return platform;
};

/** Fire ad-platform conversion events if the pixels are installed. No-ops otherwise. */
const trackDownload = (store: "app_store" | "play_store") => {
  const w = window as unknown as {
    fbq?: (...a: unknown[]) => void;
    gtag?: (...a: unknown[]) => void;
  };
  try {
    w.fbq?.("track", "Lead", { content_name: store, content_category: "app_download" });
  } catch { /* pixel absent */ }
  try {
    w.gtag?.("event", "app_download_click", { store });
  } catch { /* analytics absent */ }
};

/** Apple's logo mark. */
const AppleLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 384 512" aria-hidden="true" focusable="false" className={className} fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM262.1 104.5c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

/** Google Play's four-colour mark. */
const GooglePlayLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false" className={className}>
    <path fill="#4285F4" d="M32.139 20.116C25.698 28.679 21.99 39.193 21.99 50.315v411.358c0 11.123 3.708 21.636 10.149 30.199l235.877-235.877L32.139 20.116z" />
    <path fill="#34A853" d="M99.617 8.057a50.191 50.191 0 0 0-38.815-6.713l230.932 230.933 74.846-74.846L99.617 8.057z" />
    <path fill="#FBBC04" d="M464.291 227.128l-88.117-48.238-82.41 82.411 82.41 82.411 88.117-48.238c16.045-8.79 25.941-25.523 25.941-43.653s-9.896-34.864-25.941-43.653z" />
    <path fill="#EA4335" d="M60.802 510.654a50.194 50.194 0 0 0 38.815-6.713l266.965-149.31-74.846-74.846L60.802 510.654z" />
  </svg>
);

interface Props {
  size?: "md" | "lg";
  /** "light" adds a hairline ring so the black badges read cleanly on a coloured background. */
  variant?: "dark" | "light";
  className?: string;
  /** Show a small "Free download" line under the buttons. */
  showNote?: boolean;
}

const GetAppButtons = ({
  size = "lg",
  variant = "dark",
  className = "",
  showNote = false,
}: Props) => {
  const platform = usePlatform();

  const pad = size === "lg" ? "px-5 py-2.5" : "px-4 py-2";
  const mark = size === "lg" ? "h-7 w-7" : "h-6 w-6";
  const small = size === "lg" ? "text-[10px]" : "text-[9px]";
  const big = size === "lg" ? "text-[17px]" : "text-[15px]";

  // Official badges are black; a hairline ring keeps them crisp on dark/coloured sections.
  const badge = `inline-flex items-center gap-2.5 rounded-xl bg-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-black/90 active:translate-y-0 ${pad} ${
    variant === "light" ? "ring-1 ring-white/40" : "ring-1 ring-black/10"
  }`;

  const AppStoreBadge = () => (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackDownload("app_store")}
      aria-label="Download Shop4Me on the App Store"
      className={badge}
    >
      <AppleLogo className={mark} />
      <span className="text-left leading-none">
        <span className={`block ${small} font-normal`}>Download on the</span>
        <span className={`mt-0.5 block ${big} font-semibold leading-tight tracking-tight`}>
          App Store
        </span>
      </span>
    </a>
  );

  const PlayStoreBadge = () => (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackDownload("play_store")}
      aria-label="Get Shop4Me on Google Play"
      className={badge}
    >
      <GooglePlayLogo className={mark} />
      <span className="text-left leading-none">
        <span className={`block ${small} font-normal uppercase tracking-wide`}>Get it on</span>
        <span className={`mt-0.5 block ${big} font-semibold leading-tight tracking-tight`}>
          Google Play
        </span>
      </span>
    </a>
  );

  // Lead with the visitor's own store; the other stays available for shared links.
  const androidFirst = platform === "android";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        {androidFirst ? (
          <>
            <PlayStoreBadge />
            <AppStoreBadge />
          </>
        ) : (
          <>
            <AppStoreBadge />
            <PlayStoreBadge />
          </>
        )}
      </div>
      {showNote && (
        <p
          className={`mt-3 text-xs ${
            variant === "light" ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          Free to download &middot; Available on iPhone &amp; Android
        </p>
      )}
    </div>
  );
};

export default GetAppButtons;
