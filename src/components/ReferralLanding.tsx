import { useEffect, useState } from "react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/appStores";
import { Button } from "@/components/ui/button";
import { Apple, Play, Gift } from "lucide-react";
import logo from "@/assets/logo.png";

const isIOS = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Shown when someone opens a referral link (/auth?ref=CODE) on a phone. Instead
 * of the web sign-up, it surfaces the invite + code and sends them to the right
 * app store. The code is shown prominently so they can enter it at sign-up in
 * the app (attribution then flows through the app's optional referral field).
 */
export const ReferralLanding = ({ code }: { code: string }) => {
  const ios = isIOS();
  const storeUrl = ios ? APP_STORE_URL : PLAY_STORE_URL;
  const storeName = ios ? "App Store" : "Google Play";
  const [count, setCount] = useState(5);

  useEffect(() => {
    const tick = setInterval(() => setCount((c) => (c > 0 ? c - 1 : 0)), 1000);
    const go = setTimeout(() => { window.location.href = storeUrl; }, 5000);
    return () => { clearInterval(tick); clearTimeout(go); };
  }, [storeUrl]);

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 text-center text-white">
      <img src={logo} alt="Shop4Me" className="h-14 mb-6 brightness-0 invert" />
      <Gift className="w-12 h-12 mb-3" />
      <h1 className="text-2xl font-bold mb-2">You've been invited to Shop4Me!</h1>
      <p className="text-white/85 mb-6 max-w-sm">
        Get the app and enter your friend's code when you sign up — you both win on your first order.
      </p>

      <div className="bg-white/15 rounded-2xl px-6 py-4 mb-2">
        <div className="text-xs text-white/80 font-semibold">Your referral code</div>
        <div className="text-3xl font-extrabold tracking-widest">{code}</div>
      </div>
      <p className="text-white/80 text-sm mb-8">Enter this code at sign-up in the app.</p>

      <Button
        size="lg"
        variant="secondary"
        className="w-full max-w-sm text-primary font-bold"
        onClick={() => { window.location.href = storeUrl; }}
      >
        {ios ? <Apple className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
        {ios ? "Download on the App Store" : "Get it on Google Play"}
      </Button>

      <p className="text-white/70 text-sm mt-6">Taking you to the {storeName} in {count}s…</p>
    </div>
  );
};

export default ReferralLanding;
