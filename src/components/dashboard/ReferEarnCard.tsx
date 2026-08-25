import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

/** localStorage key holding a referral code captured from ?ref= at signup, so it
 *  can be applied once the user is actually authenticated (post email-verify). */
export const REF_CODE_KEY = "s4m_ref_code";

interface Summary {
  enabled: boolean;
  reward_amount: number;
  referral_code: string | null;
  is_marketer: boolean;
  pending_count: number;
  earned_count: number;
  paid_count: number;
  earned_amount: number;
  paid_amount: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n ?? 0);

export const ReferEarnCard = () => {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      // Apply a referral code captured at signup, exactly once.
      try {
        const pending = localStorage.getItem(REF_CODE_KEY);
        if (pending) {
          localStorage.removeItem(REF_CODE_KEY);
          await supabase.rpc("apply_referral_code", { p_code: pending });
        }
      } catch {
        /* non-fatal */
      }
      const { data } = await supabase.rpc("get_my_referral_summary");
      if (active) setSummary((data as unknown as Summary) ?? null);
    })();
    return () => { active = false; };
  }, []);

  if (!summary || !summary.enabled || !summary.referral_code) return null;

  const link = `${window.location.origin}/auth?ref=${summary.referral_code}`;
  const shareText = `Shop smarter with Shop4Me! Sign up with my link and we both win. ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied!");
    } catch {
      toast.message("Copy this link", { description: link });
    }
  };
  const share = async () => {
    const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
    if (nav?.share) {
      try {
        await nav.share({ title: "Shop4Me", text: shareText, url: link });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return; // user dismissed the share sheet
        // any other failure (desktop / unsupported) → fall through to copying
      }
    }
    copy();
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          {summary.is_marketer ? <>Refer Friends</> : <>Refer &amp; Earn {fmt(summary.reward_amount)}</>}
          {summary.is_marketer && <Badge className="ml-1">Marketer</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {summary.is_marketer
            ? "Invite people to Shop4Me. Your qualifying referrals are tracked here and rewarded offline by the Shop4Me team."
            : `Invite friends to Shop4Me. When someone you refer completes their first order, you earn ${fmt(summary.reward_amount)} — credited to your wallet.`}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-base px-3 py-1">{summary.referral_code}</Badge>
          <Button size="sm" variant="outline" onClick={copy}><Copy className="w-4 h-4 mr-1" /> Copy link</Button>
          <Button size="sm" onClick={share}><Share2 className="w-4 h-4 mr-1" /> Share</Button>
        </div>
        {summary.is_marketer ? (
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="font-bold">{summary.pending_count}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Successful referrals</div>
              <div className="font-bold">{summary.earned_count + summary.paid_count}</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="font-bold">{summary.pending_count}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Earned</div>
              <div className="font-bold">{fmt(summary.earned_amount)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Paid out</div>
              <div className="font-bold">{fmt(summary.paid_amount)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferEarnCard;
