import { Apple, Play } from "lucide-react";

interface AppDownloadButtonsProps {
  variant?: "light" | "dark";
  className?: string;
}

const AppDownloadButtons = ({ variant = "dark", className = "" }: AppDownloadButtonsProps) => {
  const isDark = variant === "dark";
  
  return (
    <div className={`flex flex-wrap justify-center gap-3 ${className}`}>
      <a
        href="#"
        className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200 hover:scale-105 ${
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
      </a>
      
      <a
        href="#"
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
