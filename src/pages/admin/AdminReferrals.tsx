import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet, Star, StarOff, Search, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReferralRow {
  referrer_id: string;
  full_name: string | null;
  email: string;
  referral_code: string | null;
  is_marketer: boolean;
  total_referred: number;
  pending_count: number;
  earned_count: number;
  paid_count: number;
  earned_amount: number;
  paid_amount: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n ?? 0);

const AdminReferrals = () => {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [reward, setReward] = useState<string>("1000");
  const [savingSettings, setSavingSettings] = useState(false);
  const [payingOut, setPayingOut] = useState(false);
  const [tab, setTab] = useState<"general" | "marketers">("general");
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [markSearch, setMarkSearch] = useState("");
  const [markResults, setMarkResults] = useState<Array<{ user_id: string; full_name: string | null; email: string }>>([]);
  const [searching, setSearching] = useState(false);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("referral_settings")
      .select("enabled, reward_amount")
      .eq("id", 1)
      .maybeSingle();
    if (data) {
      setEnabled(!!data.enabled);
      setReward(String(data.reward_amount ?? 1000));
    }
  }, []);

  const loadRows = useCallback(
    async (marketers: boolean) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("admin_list_referrals", { p_marketers: marketers });
        if (error) throw error;
        setRows((data ?? []) as unknown as ReferralRow[]);
      } catch (e: any) {
        console.error("Error loading referrals:", e);
        toast({ title: "Error", description: e.message || "Failed to load referrals", variant: "destructive" });
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadRows(tab === "marketers"); }, [tab, loadRows]);

  const saveSettings = async (nextEnabled: boolean) => {
    setSavingSettings(true);
    try {
      const { error } = await supabase.rpc("admin_set_referral_settings", {
        p_enabled: nextEnabled,
        p_reward_amount: Number(reward) || 1000,
      });
      if (error) throw error;
      setEnabled(nextEnabled);
      toast({ title: "Saved", description: `Referral program ${nextEnabled ? "is now ON" : "is now OFF"}.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const runPayout = async () => {
    setPayingOut(true);
    try {
      const { data, error } = await supabase.rpc("admin_run_referral_payout");
      if (error) throw error;
      const d = data as any;
      toast({
        title: "Payout complete",
        description: `Paid ${d?.paid_count ?? 0} referral(s) — ${fmt(Number(d?.paid_total ?? 0))} credited to wallets.`,
      });
      loadRows(tab === "marketers");
    } catch (e: any) {
      toast({ title: "Payout failed", description: e.message, variant: "destructive" });
    } finally {
      setPayingOut(false);
    }
  };

  const toggleMarketer = async (row: ReferralRow) => {
    try {
      const { error } = await supabase.rpc("admin_set_marketer", {
        p_user_id: row.referrer_id,
        p_is_marketer: !row.is_marketer,
      });
      if (error) throw error;
      toast({
        title: "Updated",
        description: `${row.full_name || row.email} ${!row.is_marketer ? "tagged as Marketer" : "moved to General"}.`,
      });
      loadRows(tab === "marketers");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const searchToTag = async () => {
    if (!markSearch.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_users", {
        p_search: markSearch.trim(), p_role: null, p_limit: 8, p_offset: 0,
      });
      if (error) throw error;
      setMarkResults((data ?? []) as any);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const tagAsMarketer = async (userId: string, name: string) => {
    try {
      const { error } = await supabase.rpc("admin_set_marketer", { p_user_id: userId, p_is_marketer: true });
      if (error) throw error;
      toast({ title: "Tagged", description: `${name} is now a Marketer.` });
      setMarkResults([]);
      setMarkSearch("");
      loadRows(tab === "marketers");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const renderTable = (marketers: boolean) => (
    <Card>
      <CardHeader>
        <CardTitle>{marketers ? "Marketers" : "General Customers"}</CardTitle>
        <CardDescription>
          {marketers
            ? "Shop4Me's own promoters using the customer Refer & Earn feature."
            : "Ordinary customers who referred others."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No referrals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Referred</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Earned (unpaid)</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.referrer_id}>
                    <TableCell>
                      <div className="font-medium">{r.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{r.referral_code || "—"}</Badge></TableCell>
                    <TableCell className="text-right">{r.total_referred}</TableCell>
                    <TableCell className="text-right">{r.pending_count}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">{fmt(Number(r.earned_amount))}</span>
                      <span className="text-xs text-muted-foreground"> ({r.earned_count})</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(Number(r.paid_amount))}
                      <span className="text-xs text-muted-foreground"> ({r.paid_count})</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => toggleMarketer(r)}>
                        {r.is_marketer ? (<><StarOff className="w-3.5 h-3.5 mr-1" /> Untag</>) : (<><Star className="w-3.5 h-3.5 mr-1" /> Mark Marketer</>)}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Referrals</h1>
          <p className="text-muted-foreground">Refer &amp; Earn program, marketers, and weekly payouts.</p>
        </div>

        {/* Settings + payout */}
        <Card>
          <CardHeader>
            <CardTitle>Program Settings</CardTitle>
            <CardDescription>Turn the whole Refer &amp; Earn feature on or off, set the reward, and pay out earnings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="font-medium">Referral program {enabled ? "ON" : "OFF"}</div>
                <div className="text-sm text-muted-foreground">When off, codes can't be applied and no rewards accrue.</div>
              </div>
              <Switch checked={enabled} disabled={savingSettings} onCheckedChange={(v) => saveSettings(v)} />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-sm font-medium">Reward per referral (₦)</label>
                <Input
                  type="number" min={0} className="w-40"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  onBlur={() => saveSettings(enabled)}
                />
              </div>
              <Button onClick={runPayout} disabled={payingOut}>
                {payingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
                Activate Payout (pay earned → wallets)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Payout also runs automatically every Friday. It credits each referrer's Shop4Me wallet with their earned (unpaid) rewards.
            </p>
          </CardContent>
        </Card>

        {/* Tag a marketer by name/email */}
        <Card>
          <CardHeader>
            <CardTitle>Tag a Marketer</CardTitle>
            <CardDescription>
              Find a customer and mark them as a Shop4Me marketer. Marketers use the same Refer &amp; Earn
              feature, but their qualifying referrals are rewarded <strong>offline</strong> — they do not get the
              ₦ wallet reward or appear in the weekly payout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email…"
                value={markSearch}
                onChange={(e) => setMarkSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") searchToTag(); }}
              />
              <Button onClick={searchToTag} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {markResults.length > 0 && (
              <div className="space-y-2">
                {markResults.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <div className="font-medium text-sm">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => tagAsMarketer(u.user_id, u.full_name || u.email)}>
                      <UserPlus className="w-3.5 h-3.5 mr-1" /> Tag as Marketer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "general" | "marketers")}>
          <TabsList>
            <TabsTrigger value="general">General Customers</TabsTrigger>
            <TabsTrigger value="marketers">Marketers</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="mt-4">{renderTable(false)}</TabsContent>
          <TabsContent value="marketers" className="mt-4">{renderTable(true)}</TabsContent>
        </Tabs>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminReferrals;
