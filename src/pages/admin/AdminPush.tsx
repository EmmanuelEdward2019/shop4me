import { useCallback, useEffect, useState } from "react";
import { BellRing, History, Loader2, Send, Sparkles, TestTube2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import AdminUserPicker, { type PickedUser } from "@/components/admin/AdminUserPicker";
import { callAdminFunction } from "@/lib/adminFunctions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Audience = "individual" | "all" | "role";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

const DEEP_LINKS = [
  ["home", "Home"],
  ["new_order", "Start a new order"],
  ["wallet", "Wallet"],
  ["orders", "My orders"],
  ["referrals", "Refer & Earn"],
  ["notifications", "Notifications"],
  ["custom", "Custom web link"],
] as const;

interface NudgeSetting {
  kind: "never_ordered" | "inactive" | "idle_wallet";
  enabled: boolean;
  title: string;
  body: string;
  deep_link: string;
  min_days: number;
  cooldown_days: number;
  wallet_min_balance: number;
}

const NUDGE_COPY: Record<NudgeSetting["kind"], { name: string; rule: (s: NudgeSetting) => string }> = {
  never_ordered: {
    name: "Signed up, never ordered",
    rule: (s) => `Customers who joined more than ${s.min_days} day(s) ago and haven't placed an order.`,
  },
  inactive: {
    name: "Inactive customers",
    rule: (s) => `Customers who have ordered before but not in the last ${s.min_days} day(s).`,
  },
  idle_wallet: {
    name: "Unused wallet balance",
    rule: (s) => `Customers with at least ₦${Number(s.wallet_min_balance).toLocaleString()} in their wallet and no order in ${s.min_days} day(s).`,
  },
};

interface PushCampaign {
  id: string;
  source: string;
  nudge_kind: string | null;
  title: string;
  body: string;
  audience: string;
  audience_role: string | null;
  target_users: number;
  web_sent: number;
  expo_sent: number;
  failed: number;
  error_summary: Record<string, number> | null;
  created_at: string;
}

type SendResult = { webSent: number; expoSent: number; failed: number; removed?: number; reasons?: Record<string, number> };

const REASON_LABELS: Record<string, string> = {
  web_gone: "browser subscription expired",
  web_key_mismatch: "old browser subscription (made before a key change)",
  web_rejected: "rejected by the browser's push service",
  web_network: "browser push service unreachable",
  expo_DeviceNotRegistered: "app uninstalled or notifications turned off",
  expo_InvalidCredentials: "app push credentials problem",
  expo_MessageTooBig: "message too long",
  expo_MessageRateExceeded: "sending too fast to one device",
  expo_network: "Expo push service unreachable",
};

/** "2 old browser subscriptions (made before a key change) — removed" */
function describeFailures(reasons: Record<string, number> | null | undefined, removed?: number): string {
  if (!reasons) return "";
  const parts = Object.entries(reasons)
    .filter(([k, n]) => k !== "removed" && n > 0)
    .map(([k, n]) => `${n} × ${REASON_LABELS[k] ?? k.replace(/^(web|expo)_/, "")}`);
  if (!parts.length) return "";
  const gone = removed ?? reasons.removed ?? 0;
  return parts.join(" · ") + (gone ? ` — ${gone} dead device${gone === 1 ? "" : "s"} removed` : "");
}

const AdminPush = () => {
  // Compose
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("home");
  const [customUrl, setCustomUrl] = useState("");
  const [audience, setAudience] = useState<Audience>("individual");
  const [role, setRole] = useState("buyer");
  const [picked, setPicked] = useState<PickedUser[]>([]);
  const [reach, setReach] = useState<{ targetUsers: number; reachableUsers: number; webDevices: number; mobileDevices: number } | null>(null);
  const [counting, setCounting] = useState(false);
  const [busy, setBusy] = useState<null | "test" | "send">(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Automations
  const [nudges, setNudges] = useState<NudgeSetting[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [savingKind, setSavingKind] = useState<string | null>(null);
  const [testingKind, setTestingKind] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<PushCampaign[]>([]);

  const audiencePayload = useCallback(
    () => ({ audience, role, userIds: picked.map((p) => p.user_id) }),
    [audience, role, picked],
  );

  const loadHistory = useCallback(async () => {
    const { data } = await db.from("push_campaigns").select("*").order("created_at", { ascending: false }).limit(50);
    setHistory((data ?? []) as PushCampaign[]);
  }, []);

  const loadNudges = useCallback(async () => {
    const { data } = await db.from("engagement_nudge_settings").select("*").order("kind");
    setNudges((data ?? []) as NudgeSetting[]);
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const entries = await Promise.all(
      (["never_ordered", "inactive", "idle_wallet"] as const).map(async (k) => {
        const { count } = await db.from("engagement_nudge_log").select("*", { count: "exact", head: true }).eq("kind", k).gte("sent_at", since);
        return [k, count ?? 0] as const;
      }),
    );
    setStats(Object.fromEntries(entries));
  }, []);

  useEffect(() => { void loadHistory(); void loadNudges(); }, [loadHistory, loadNudges]);

  useEffect(() => {
    setReach(null);
    if (audience === "individual" && picked.length === 0) return;
    const t = setTimeout(async () => {
      setCounting(true);
      try {
        setReach(await callAdminFunction("admin-push-campaign", { action: "count", ...audiencePayload() }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not count recipients");
      } finally {
        setCounting(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [audience, role, picked, audiencePayload]);

  const message = () => ({ title, body, deepLink, customUrl });

  const sendTest = async () => {
    setBusy("test");
    try {
      const r = await callAdminFunction<SendResult>("admin-push-campaign", { action: "test", ...message() });
      const delivered = r.webSent + r.expoSent;
      const why = describeFailures(r.reasons, r.removed);
      if (delivered + r.failed === 0) {
        toast.message("Your account has no registered devices — open the Shop4Me app or allow browser notifications first.");
      } else if (delivered === 0) {
        toast.error("None of your devices accepted the test", { description: why });
      } else {
        toast.success(`Test delivered to ${delivered} of your device${delivered === 1 ? "" : "s"}`, why ? { description: `Not delivered: ${why}` } : undefined);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setBusy(null);
    }
  };

  const sendNow = async () => {
    setConfirmOpen(false);
    setBusy("send");
    try {
      const r = await callAdminFunction<SendResult & { targetUsers: number }>(
        "admin-push-campaign", { action: "send", ...message(), ...audiencePayload() },
      );
      const why = describeFailures(r.reasons, r.removed);
      toast.success(
        `Delivered to ${(r.webSent + r.expoSent).toLocaleString()} device(s) · ${r.targetUsers.toLocaleString()} users also see it in their notifications`,
        why ? { description: `Not delivered: ${why}` } : undefined,
      );
      setTitle("");
      setBody("");
      void loadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sending failed");
    } finally {
      setBusy(null);
    }
  };

  const updateNudge = (kind: string, patch: Partial<NudgeSetting>) =>
    setNudges((list) => list.map((n) => (n.kind === kind ? { ...n, ...patch } : n)));

  const saveNudge = async (n: NudgeSetting) => {
    if (!n.title.trim() || !n.body.trim()) return toast.error("Title and message are required");
    setSavingKind(n.kind);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("engagement_nudge_settings").update({
      enabled: n.enabled,
      title: n.title.trim().slice(0, 65),
      body: n.body.trim().slice(0, 240),
      deep_link: n.deep_link,
      min_days: Math.min(365, Math.max(1, Number(n.min_days) || 1)),
      cooldown_days: Math.min(365, Math.max(1, Number(n.cooldown_days) || 1)),
      wallet_min_balance: Math.max(0, Number(n.wallet_min_balance) || 0),
      updated_at: new Date().toISOString(),
      updated_by: auth.user?.id ?? null,
    }).eq("kind", n.kind);
    setSavingKind(null);
    if (error) toast.error(error.message);
    else toast.success(`${NUDGE_COPY[n.kind].name} saved${n.enabled ? " and active" : ""}`);
  };

  const testNudge = async (kind: string) => {
    setTestingKind(kind);
    try {
      const r = await callAdminFunction<{ webSent: number; expoSent: number }>("engagement-nudges", { action: "test", kind });
      if (r.webSent + r.expoSent === 0) toast.message("No devices registered on your account to receive the test.");
      else toast.success("Test nudge sent to your device(s) — save first to test edited copy");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTestingKind(null);
    }
  };

  const canSend = title.trim() && body.trim() && busy === null
    && (audience !== "individual" || picked.length > 0)
    && (deepLink !== "custom" || /^https:\/\//i.test(customUrl.trim()))
    && (reach?.targetUsers ?? 0) > 0;

  return (
    <AdminDashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold"><BellRing className="h-6 w-6 text-primary" /> Push notifications</h1>
          <p className="text-sm text-muted-foreground">Reach users on their phones and browsers, and automate reminders that bring customers back.</p>
        </div>

        <Tabs defaultValue="compose">
          <TabsList>
            <TabsTrigger value="compose" className="gap-2"><Send className="h-4 w-4" /> Send</TabsTrigger>
            <TabsTrigger value="automations" className="gap-2"><Zap className="h-4 w-4" /> Automations</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-lg">Notification</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><Label htmlFor="ptitle">Title</Label><span className="text-xs text-muted-foreground">{title.length}/65</span></div>
                    <Input id="ptitle" value={title} maxLength={65} placeholder="e.g. Free delivery this weekend 🎉" onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><Label htmlFor="pbody">Message</Label><span className="text-xs text-muted-foreground">{body.length}/240</span></div>
                    <Textarea id="pbody" value={body} maxLength={240} rows={4} placeholder="Keep it short and give people a reason to tap." onChange={(e) => setBody(e.target.value)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>When tapped, open</Label>
                      <Select value={deepLink} onValueChange={setDeepLink}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{DEEP_LINKS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {deepLink === "custom" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="purl">Link</Label>
                        <Input id="purl" value={customUrl} placeholder="https://www.shop4meng.com/…" onChange={(e) => setCustomUrl(e.target.value)} />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Preview</Label>
                    <div className="mx-auto max-w-sm rounded-2xl bg-neutral-900/90 p-3 text-white shadow-lg">
                      <div className="flex items-start gap-3">
                        <img src="/icon-192.png" alt="" className="h-9 w-9 rounded-lg" />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between text-[11px] text-white/60"><span>SHOP4ME</span><span>now</span></div>
                          <p className="truncate text-sm font-semibold">{title || "Your title"}</p>
                          <p className="line-clamp-3 text-sm text-white/85">{body || "Your message will appear here."}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="gap-2" onClick={sendTest} disabled={!title.trim() || !body.trim() || busy !== null}>
                    {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Send test to my devices
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-lg">Audience</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={audience} onValueChange={(v) => setAudience(v as Audience)} className="space-y-2">
                    {([["individual", "Specific users"], ["role", "Everyone with a role"], ["all", "All users"]] as const).map(([v, l]) => (
                      <div key={v} className="flex items-center gap-2">
                        <RadioGroupItem value={v} id={`paud-${v}`} />
                        <Label htmlFor={`paud-${v}`} className="font-normal">{l}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {audience === "individual" && <AdminUserPicker value={picked} onChange={setPicked} />}
                  {audience === "role" && (
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">Customers (buyers)</SelectItem>
                        <SelectItem value="agent">Shopping agents</SelectItem>
                        <SelectItem value="rider">Riders</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <div className="rounded-lg bg-muted/60 p-3 text-sm">
                    {counting ? (
                      <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Counting…</span>
                    ) : reach ? (
                      <>
                        <p><span className="font-semibold">{reach.targetUsers.toLocaleString()}</span> users</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {reach.reachableUsers.toLocaleString()} can get a push ({reach.mobileDevices} phones · {reach.webDevices} browsers). Everyone sees it in their in-app notifications.
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Choose an audience to see the reach</span>
                    )}
                  </div>
                  <Button className="w-full gap-2" size="lg" disabled={!canSend} onClick={() => setConfirmOpen(true)}>
                    {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send notification
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="automations" className="mt-4 space-y-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex gap-3 p-4 text-sm">
                <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <p>
                  Automations run every day at <strong>9:00 AM (WAT)</strong> for customers who have the app or browser notifications enabled.
                  To avoid spamming, a customer gets <strong>at most one reminder every 3 days</strong>, and each reminder respects its own cooldown.
                  They start <strong>switched off</strong> — review the copy, then turn them on.
                </p>
              </CardContent>
            </Card>

            {nudges.map((n) => (
              <Card key={n.kind}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {NUDGE_COPY[n.kind].name}
                      <Badge variant="secondary" className={n.enabled ? "bg-emerald-100 text-emerald-800" : ""}>{n.enabled ? "Active" : "Off"}</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">{NUDGE_COPY[n.kind].rule(n)} Sent last 7 days: <strong>{stats[n.kind] ?? 0}</strong></CardDescription>
                  </div>
                  <Switch checked={n.enabled} onCheckedChange={(v) => updateNudge(n.kind, { enabled: v })} aria-label="Enable automation" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Title</Label>
                      <Input value={n.title} maxLength={65} onChange={(e) => updateNudge(n.kind, { title: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>When tapped, open</Label>
                      <Select value={n.deep_link} onValueChange={(v) => updateNudge(n.kind, { deep_link: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{DEEP_LINKS.filter(([v]) => v !== "custom").map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Message</Label>
                    <Textarea value={n.body} maxLength={240} rows={2} onChange={(e) => updateNudge(n.kind, { body: e.target.value })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>{n.kind === "never_ordered" ? "Days since signup" : "Days without an order"}</Label>
                      <Input type="number" min={1} max={365} value={n.min_days} onChange={(e) => updateNudge(n.kind, { min_days: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Don't repeat for (days)</Label>
                      <Input type="number" min={1} max={365} value={n.cooldown_days} onChange={(e) => updateNudge(n.kind, { cooldown_days: Number(e.target.value) })} />
                    </div>
                    {n.kind === "idle_wallet" && (
                      <div className="space-y-1.5">
                        <Label>Minimum balance (₦)</Label>
                        <Input type="number" min={0} value={n.wallet_min_balance} onChange={(e) => updateNudge(n.kind, { wallet_min_balance: Number(e.target.value) })} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => saveNudge(n)} disabled={savingKind === n.kind}>
                      {savingKind === n.kind && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => testNudge(n.kind)} disabled={testingKind === n.kind}>
                      {testingKind === n.kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Send test to me
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="divide-y p-0">
                {history.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nothing sent yet.</p>}
                {history.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.title}</p>
                      <p className="truncate text-sm text-muted-foreground">{c.body}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString()} · {c.source === "nudge" ? `Automation: ${NUDGE_COPY[c.nudge_kind as NudgeSetting["kind"]]?.name ?? c.nudge_kind}` : c.audience === "role" ? `${c.audience_role}s` : c.audience === "all" ? "all users" : "selected users"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p><span className="font-semibold text-foreground">{(c.web_sent + c.expo_sent).toLocaleString()}</span> devices · {c.target_users.toLocaleString()} users</p>
                      {c.failed > 0 && (
                        <p className={c.web_sent + c.expo_sent > 0 ? "max-w-[260px] text-amber-700" : "max-w-[260px] text-red-600"}>
                          {c.failed} not delivered{describeFailures(c.error_summary) ? `: ${describeFailures(c.error_summary)}` : ""}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">{c.source === "nudge" ? "Automation" : "Manual"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {reach?.targetUsers.toLocaleString()} users?</AlertDialogTitle>
            <AlertDialogDescription>"{title}" will be pushed immediately and added to everyone's in-app notifications. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={sendNow}>Send now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminDashboardLayout>
  );
};

export default AdminPush;
