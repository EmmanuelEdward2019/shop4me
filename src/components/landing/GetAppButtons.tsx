import { useEffect, useState } from "react";
import { Apple, Play } from "lucide-react";
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

interface Props {
  size?: "md" | "lg";
  /** "dark" = dark pills on light bg. "light" = translucent pills on a coloured bg. */
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
  const isDark = variant === "dark";

  const pad = size === "lg" ? "px-6 py-3.5" : "px-4 py-2.5";
  const iconSize = size === "lg" ? "h-7 w-7" : "h-6 w-6";
  const bigText = size === "lg" ? "text-base" : "text-sm";

  const base = `group inline-flex items-center gap-3 rounded-2xl border font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${pad}`;
  const primaryCls = isDark
    ? "bg-foreground text-background border-foreground shadow-lg hover:shadow-xl"
    : "bg-white text-foreground border-white shadow-lg hover:shadow-xl";
  const secondaryCls = isDark
    ? "bg-background text-foreground border-border hover:border-foreground/40"
    : "bg-white/10 text-white border-white/40 hover:bg-white/20 backdrop-blur";

  const AppStoreBtn = ({ primary }: { primary: boolean }) => (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackDownload("app_store")}
      aria-label="Download Shop4Me on the App Store"
      className={`${base} ${primary ? primaryCls : secondaryCls}`}
    >
      <Apple className={iconSize} />
      <span className="text-left leading-tight">
        <span className="block text-[10px] opacity-75">Download on the</span>
        <span className={`block font-semibold ${bigText}`}>App Store</span>
      </span>
    </a>
  );

  const PlayStoreBtn = ({ primary }: { primary: boolean }) => (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackDownload("play_store")}
      aria-label="Get Shop4Me on Google Play"
      className={`${base} ${primary ? primaryCls : secondaryCls}`}
    >
      <Play className={iconSize} />
      <span className="text-left leading-tight">
        <span className="block text-[10px] opacity-75">Get it on</span>
        <span className={`block font-semibold ${bigText}`}>Google Play</span>
      </span>
    </a>
  );

  // Lead with the visitor's own store; the other stays available for shared links.
  const iosFirst = platform !== "android";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        {iosFirst ? (
          <>
            <AppStoreBtn primary={platform === "ios" || platform === "other"} />
            <PlayStoreBtn primary={platform === "other"} />
          </>
        ) : (
          <>
            <PlayStoreBtn primary />
            <AppStoreBtn primary={false} />
          </>
        )}
      </div>
      {showNote && (
        <p
          className={`mt-3 text-xs ${
            isDark ? "text-muted-foreground" : "text-white/70"
          }`}
        >
          Free to download · Available on iPhone &amp; Android
        </p>
      )}
    </div>
  );
};

export default GetAppButtons;
