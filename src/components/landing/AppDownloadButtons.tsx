import { useState, useCallback } from "react";
import { Apple, Play } from "lucide-react";

interface AppDownloadButtonsProps {
  variant?: "light" | "dark";
  className?: string;
}

const AppDownloadButtons = ({ variant = "dark", className = "" }: AppDownloadButtonsProps) => {
  const isDark = variant === "dark";
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleAppleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 2000);
  }, []);

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {/* Apple – Coming Soon */}
      <div className="relative">
        <button
          onClick={handleAppleClick}
          className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer opacity-80 hover:opacity-100 hover:scale-105 ${
            isDark
              ? "bg-foreground text-background border-foreground hover:bg-foreground/90"
              : "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/20"
          }`}
        >
          <Apple className="w-6 h-6" />
          <div className="text-left">
            <div className="text-[10px] leading-tight opacity-80">Download on the</div>
            <div className="text-sm font-semibold leading-tight">App Store</div>
          </div>
        </button>

        {/* Coming Soon tooltip */}
        <div
          className={`absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-all duration-300 pointer-events-none ${
            showComingSoon
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-2 scale-95"
          } ${
            isDark
              ? "bg-amber-500 text-white"
              : "bg-amber-400 text-gray-900"
          }`}
        >
          🍎 Coming Soon!
          {/* tiny arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 ${
              isDark ? "bg-amber-500" : "bg-amber-400"
            }`}
          />
        </div>
      </div>

      {/* Google Play */}
      <a
        href="https://play.google.com/store/apps/details?id=com.shop4meng.app"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200 hover:scale-105 ${
          isDark
            ? "bg-foreground text-background border-foreground hover:bg-foreground/90"
            : "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/20"
        }`}
      >
        <Play className="w-6 h-6" />
        <div className="text-left">
          <div className="text-[10px] leading-tight opacity-80">Get it on</div>
          <div className="text-sm font-semibold leading-tight">Google Play</div>
        </div>
      </a>
    </div>
  );
};

export default AppDownloadButtons;
