import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, History, Loader2, Mail, Monitor, Send, Smartphone, TestTube2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import EmailEditor from "@/components/admin/EmailEditor";
import AdminUserPicker, { type PickedUser } from "@/components/admin/AdminUserPicker";
import { callAdminFunction, sleep } from "@/lib/adminFunctions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Audience = "individual" | "all" | "role";
interface Campaign {
  id: string;
  subject: string;
  status: string;
  audience: string;
  audience_role: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  created_at: string;
  last_error: string | null;
}

const DRAFT_KEY = "s4m:admin-email-draft";
const statusStyle: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-800",
  sending: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-700",
  draft: "bg-amber-100 text-amber-800",
};

const AdminEmail = () => {
  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as { subject?: string; preheader?: string; html?: string };
    } catch {
      return {};
    }
  }, []);

  const [subject, setSubject] = useState(draft.subject ?? "");
  const [preheader, setPreheader] = useState(draft.preheader ?? "");
  const [html, setHtml] = useState(draft.html ?? "");
  const [audience, setAudience] = useState<Audience>("individual");
  const [role, setRole] = useState("buyer");
  const [picked, setPicked] = useState<PickedUser[]>([]);

  const [count, setCount] = useState<{ total: number; suppressed: number; sendable: number } | null>(null);
  const [counting, setCounting] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewMobile, setPreviewMobile] = useState(false);
  const [busy, setBusy] = useState<null | "preview" | "test">(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; failed: number; skipped: number; total: number } | null>(null);
  const cancelRef = useRef<string | null>(null);
  const [history, setHistory] = useState<Campaign[]>([]);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, preheader, html }));
    } catch { /* storage unavailable */ }
  }, [subject, preheader, html]);

  const audiencePayload = useCallback(
    () => ({ audience, role, userIds: picked.map((p) => p.user_id) }),
    [audience, role, picked],
  );

  const loadHistory = useCallback(async () => {
    const { data } = await (supabase as never as { from: (t: string) => any })
      .from("email_campaigns")
      .select("id, subject, status, audience, audience_role, total_recipients, sent_count, failed_count, skipped_count, created_at, last_error")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data ?? []) as Campaign[]);
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  useEffect(() => {
    setCount(null);
    if (audience === "individual" && picked.length === 0) return;
    const t = setTimeout(async () => {
      setCounting(true);
      try {
        setCount(await callAdminFunction("admin-email-campaign", { action: "count", ...audiencePayload() }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not count recipients");
      } finally {
        setCounting(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [audience, role, picked, audiencePayload]);

  const content = () => ({ subject, preheader, bodyHtml: html });

  const openPreview = async () => {
    setBusy("preview");
    try {
      const res = await callAdminFunction<{ html: string }>("admin-email-campaign", { action: "preview", ...content() });
      setPreviewHtml(res.html);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("test");
    try {
      const res = await callAdminFunction<{ to: string }>("admin-email-campaign", { action: "test", ...content() });
      toast.success(`Test email sent to ${res.to}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test send failed");
    } finally {
      setBusy(null);
    }
  };

  const runCampaign = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const created = await callAdminFunction<{ campaignId: string; total: number; skipped: number }>(
        "admin-email-campaign", { action: "create", ...content(), ...audiencePayload() },
      );
      cancelRef.current = created.campaignId;
      setProgress({ sent: 0, failed: 0, skipped: created.skipped, total: created.total });

      let done = false;
      for (let guard = 0; !done && guard < 10000; guard++) {
        if (cancelRef.current === null) break;
        const r = await callAdminFunction<{ done: boolean; sent: number; failed: number; skipped: number; rateLimited?: boolean; retryAfterMs?: number }>(
          "admin-email-campaign", { action: "send_batch", campaignId: created.campaignId },
        );
        setProgress({ sent: r.sent, failed: r.failed, skipped: r.skipped, total: created.total });
        done = r.done;
        if (!done) await sleep(r.rateLimited ? r.retryAfterMs ?? 2000 : 350);
      }

      if (done) {
        toast.success("Campaign sent");
        localStorage.removeItem(DRAFT_KEY);
      } else {
        toast.message("Sending stopped");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sending failed");
    } finally {
      setSending(false);
      cancelRef.current = null;
      void loadHistory();
    }
  };

  const stopSending = async () => {
    const id = cancelRef.current;
    cancelRef.current = null;
    if (!id) return;
    try {
      await callAdminFunction("admin-email-campaign", { action: "cancel", campaignId: id });
      toast.message("Campaign cancelled — remaining recipients were skipped");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel");
    }
  };

  const resetDraft = () => {
    setSubject("");
    setPreheader("");
    setHtml("");
    setEditorKey((k) => k + 1);
    localStorage.removeItem(DRAFT_KEY);
  };

  const canSend = subject.trim() && html.replace(/<[^>]+>/g, "").trim() && !sending
    && (audience !== "individual" || picked.length > 0) && (count?.sendable ?? 0) > 0;
  const pct = progress && progress.total ? Math.round(((progress.sent + progress.failed + progress.skipped) / progress.total) * 100) : 0;
  const audienceLabel = audience === "all" ? "all users" : audience === "role" ? `all ${role}s` : `${picked.length} selected user${picked.length === 1 ? "" : "s"}`;

  return (
    <AdminDashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold"><Mail className="h-6 w-6 text-primary" /> Email campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Your logo, contact details, social links and an unsubscribe link are added automatically — just write the message.
          </p>
        </div>

        <Tabs defaultValue="compose">
          <TabsList>
            <TabsTrigger value="compose" className="gap-2"><Send className="h-4 w-4" /> Compose</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Message</CardTitle>
                  <CardDescription>Use <code className="rounded bg-muted px-1">{"{{first_name}}"}</code> to personalise.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">Subject line</Label>
                    <Input id="subject" value={subject} maxLength={200} placeholder="e.g. {{first_name}}, your market run is on us this week" onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="preheader">Preview text <span className="font-normal text-muted-foreground">(shown after the subject in the inbox)</span></Label>
                    <Input id="preheader" value={preheader} maxLength={200} placeholder="A short teaser that appears in the inbox" onChange={(e) => setPreheader(e.target.value)} />
                  </div>
                  <EmailEditor key={editorKey} value={html} onChange={setHtml} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={openPreview} disabled={busy !== null}>
                      {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={sendTest} disabled={busy !== null}>
                      {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Send test to me
                    </Button>
                    <Button variant="ghost" className="ml-auto text-muted-foreground" onClick={resetDraft}>Clear draft</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Recipients</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup value={audience} onValueChange={(v) => setAudience(v as Audience)} className="space-y-2">
                      {([
                        ["individual", "Specific users"],
                        ["role", "Everyone with a role"],
                        ["all", "All users"],
                      ] as const).map(([v, label]) => (
                        <div key={v} className="flex items-center gap-2">
                          <RadioGroupItem value={v} id={`aud-${v}`} />
                          <Label htmlFor={`aud-${v}`} className="font-normal">{label}</Label>
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
                      ) : count ? (
                        <>
                          <p><span className="font-semibold">{count.sendable.toLocaleString()}</span> will receive it</p>
                          {count.suppressed > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {count.suppressed.toLocaleString()} skipped (unsubscribed, bounced or marked as spam)
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Choose recipients to see the count</span>
                      )}
                    </div>

                    <Button className="w-full gap-2" size="lg" disabled={!canSend} onClick={() => setConfirmOpen(true)}>
                      <Send className="h-4 w-4" /> Send campaign
                    </Button>
                  </CardContent>
                </Card>

                {progress && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{sending ? "Sending…" : "Last send"}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <Progress value={pct} />
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div><p className="text-lg font-semibold text-emerald-600">{progress.sent}</p>sent</div>
                        <div><p className="text-lg font-semibold text-red-600">{progress.failed}</p>failed</div>
                        <div><p className="text-lg font-semibold text-muted-foreground">{progress.skipped}</p>skipped</div>
                      </div>
                      {sending && <Button variant="outline" size="sm" className="w-full" onClick={stopSending}>Stop sending</Button>}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="divide-y p-0">
                {history.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No campaigns yet.</p>}
                {history.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString()} · {c.audience === "role" ? `${c.audience_role}s` : c.audience === "all" ? "all users" : "selected users"}
                      </p>
                      {c.last_error && c.status !== "sent" && <p className="mt-1 truncate text-xs text-red-600">{c.last_error}</p>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{c.sent_count}</span>/{c.total_recipients} sent
                      {c.failed_count > 0 && <> · <span className="text-red-600">{c.failed_count} failed</span></>}
                      {c.skipped_count > 0 && <> · {c.skipped_count} skipped</>}
                    </div>
                    <Badge className={`capitalize ${statusStyle[c.status] ?? ""}`} variant="secondary">{c.status}</Badge>
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
            <AlertDialogTitle>Send this email to {count?.sendable.toLocaleString()} people?</AlertDialogTitle>
            <AlertDialogDescription>
              "{subject}" will go to {audienceLabel}. Emails can't be recalled once sent — send yourself a test first if you haven't.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runCampaign}>Send now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewHtml !== null} onOpenChange={(o) => !o && setPreviewHtml(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4 pr-6">
              <span>Preview</span>
              <span className="flex gap-1">
                <Button size="sm" variant={previewMobile ? "outline" : "default"} onClick={() => setPreviewMobile(false)} className="gap-1"><Monitor className="h-4 w-4" /> Desktop</Button>
                <Button size="sm" variant={previewMobile ? "default" : "outline"} onClick={() => setPreviewMobile(true)} className="gap-1"><Smartphone className="h-4 w-4" /> Mobile</Button>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center rounded-lg bg-muted p-3">
            <iframe
              title="Email preview"
              srcDoc={previewHtml ?? ""}
              sandbox=""
              className="h-[70vh] rounded-md bg-white shadow"
              style={{ width: previewMobile ? 390 : "100%" }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
};

export default AdminEmail;
