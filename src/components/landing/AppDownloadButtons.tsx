import { Apple, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { isIOS, openA2HSHelper } from "@/lib/pwa";

interface AppDownloadButtonsProps {
  variant?: "light" | "dark";
  className?: string;
}

const AppDownloadButtons = ({ variant = "dark", className = "" }: AppDownloadButtonsProps) => {
  const isDark = variant === "dark";

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {/* Apple – on iPhone, pop the "Add to Home Screen" guide right here;
          on other devices, go to the /ios page (TestFlight + instructions). */}
      <Link
        to="/ios"
        onClick={(e) => {
          if (isIOS()) {
            e.preventDefault();
            openA2HSHelper();
          }
        }}
        className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200 hover:scale-105 ${
          isDark
            ? "bg-foreground text-background border-foreground hover:bg-foreground/90"
            : "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/20"
        }`}
      >
        <Apple className="w-6 h-6" />
        <div className="text-left">
          <div className="text-[10px] leading-tight opacity-80">Download on</div>
          <div className="text-sm font-semibold leading-tight">iPhone</div>
        </div>
      </Link>

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
