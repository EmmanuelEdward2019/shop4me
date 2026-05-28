import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RiderDashboardLayout from "@/components/dashboard/RiderDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Wallet, TrendingUp, Clock, CheckCircle2, Loader2, AlertCircle, BanknoteIcon, History,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Earning {
  id: string;
  order_id: string;
  delivery_fee: number;
  platform_cut: number;
  rider_amount: number;
  available_at: string;
  status: string;
  completed_at: string;
  withdrawal_id: string | null;
}

interface Withdrawal {
  id: string;
  amount: number;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  status: string;
  requested_at: string;
  transferred_at: string | null;
  confirmed_at: string | null;
}

const fmt = (n: number) =>
  "₦" + new Intl.NumberFormat("en-NG").format(Math.round(n));

const statusBadge = (status: string, availableAt: string) => {
  if (status === "paid")
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
  if (status === "withdraw_requested")
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Requested</Badge>;
  if (new Date(availableAt) > new Date())
    return <Badge variant="outline" className="text-orange-600 border-orange-300">Locked</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Available</Badge>;
};

const RiderEarnings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [activeWithdrawal, setActiveWithdrawal] = useState<Withdrawal | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // History filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  // Re-rendering "now" so locked → available flips without a manual
  // refresh. Ticks every 60s; cheap because the comparison is local.
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [earningsRes, activeRes, historyRes] = await Promise.all([
        supabase
          .from("rider_earnings" as any)
          .select("*")
          .eq("rider_id", user.id)
          .order("completed_at", { ascending: false }),
        supabase
          .from("rider_withdrawals" as any)
          .select("*")
          .eq("rider_id", user.id)
          .in("status", ["pending", "transferred"])
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("rider_withdrawals" as any)
          .select("*")
          .eq("rider_id", user.id)
          .order("requested_at", { ascending: false })
          .limit(50),
      ]);
      setEarnings(((earningsRes.data ?? []) as any[]).map((r) => ({
        id: r.id,
        order_id: r.order_id,
        delivery_fee: Number(r.delivery_fee),
        platform_cut: Number(r.platform_cut),
        rider_amount: Number(r.rider_amount),
        available_at: r.available_at,
        status: r.status,
        completed_at: r.completed_at,
        withdrawal_id: r.withdrawal_id ?? null,
      })));
      setActiveWithdrawal(activeRes.data ? (activeRes.data as any) : null);
      setWithdrawalHistory(((historyRes.data ?? []) as any[]) as Withdrawal[]);
    } catch (err) {
      console.error("Error loading earnings:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 60-second ticker: re-evaluates `now` so the "Locked → Available"
  // transition fires automatically when an earning crosses available_at.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // `tick` participates so memoised filtering/summing recomputes when
  // the minute rolls over.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _tickDep = tick;
  const now = new Date();
  const totalEarned = earnings.reduce((s, e) => s + e.rider_amount, 0);
  const availableAmount = earnings
    .filter((e) => e.status === "pending" && new Date(e.available_at) <= now)
    .reduce((s, e) => s + e.rider_amount, 0);
  const lockedAmount = earnings
    .filter((e) => e.status === "pending" && new Date(e.available_at) > now)
    .reduce((s, e) => s + e.rider_amount, 0);
  const paidAmount = earnings
    .filter((e) => e.status === "paid")
    .reduce((s, e) => s + e.rider_amount, 0);

  const canWithdraw = availableAmount > 0 && !activeWithdrawal;

  const handleRequestWithdrawal = async () => {
    setRequesting(true);
    try {
      const { data: withdrawalId, error } = await supabase.rpc("request_rider_withdrawal" as any);
      if (error) throw error;
      toast({ title: "Withdrawal Requested", description: "Admin has been notified. Transfer usually happens within 24 hours." });
      // Notify admin by email (fire-and-forget)
      supabase.functions.invoke("send-notification-email", {
        body: { type: "withdrawal_requested", data: { riderId: user?.id, withdrawalId } },
      }).catch(() => {});
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to request withdrawal", variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!activeWithdrawal) return;
    setConfirming(true);
    try {
      const { error } = await supabase.rpc("confirm_withdrawal_receipt" as any, {
        p_withdrawal_id: activeWithdrawal.id,
      });
      if (error) throw error;
      toast({ title: "Payment Confirmed!", description: "Your earnings have been marked as paid." });
      // Notify admin by email (fire-and-forget)
      supabase.functions.invoke("send-notification-email", {
        body: { type: "withdrawal_confirmed", data: { riderId: user?.id, amount: activeWithdrawal.amount } },
      }).catch(() => {});
      setActiveWithdrawal(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to confirm receipt", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const nextAvailableTime = () => {
    const locked = earnings.find(
      (e) => e.status === "pending" && new Date(e.available_at) > now,
    );
    if (!locked) return null;
    const d = new Date(locked.available_at);
    return d.toLocaleString("en-NG", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <RiderDashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Earnings</h1>
          <p className="text-muted-foreground">Your delivery earnings after platform commission (15%).</p>
        </div>

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Total Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(totalEarned)}</p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> Available
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(availableAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Locked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-500">{fmt(lockedAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {nextAvailableTime() ? `Unlocks ${nextAvailableTime()}` : "Available 6am next day"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Paid Out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(paidAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active withdrawal status */}
        {activeWithdrawal && (
          <Card className={
            activeWithdrawal.status === "transferred"
              ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950"
              : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950"
          }>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BanknoteIcon className="w-5 h-5" />
                {activeWithdrawal.status === "transferred" ? "Payment Sent — Confirm Receipt" : "Withdrawal Request Pending"}
              </CardTitle>
              <CardDescription>
                {activeWithdrawal.status === "pending"
                  ? "Admin has been notified and will transfer your earnings."
                  : "Admin has marked this as transferred. Confirm once you receive the money."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Amount</p>
                  <p className="font-bold text-lg">{fmt(Number(activeWithdrawal.amount))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Bank</p>
                  <p className="font-medium">{activeWithdrawal.bank_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Account</p>
                  <p className="font-medium">{activeWithdrawal.account_number || "—"} · {activeWithdrawal.account_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Requested</p>
                  <p className="font-medium">
                    {new Date(activeWithdrawal.requested_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {activeWithdrawal.status === "transferred" && (
                <>
                  <Separator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="bg-green-600 hover:bg-green-700" disabled={confirming}>
                        {confirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        I Have Received Payment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Payment Receipt</AlertDialogTitle>
                        <AlertDialogDescription>
                          Confirm that you have received {fmt(Number(activeWithdrawal.amount))} in your bank account. This will mark the transaction as complete.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmReceipt} className="bg-green-600 hover:bg-green-700">
                          Yes, I Received It
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Withdraw button */}
        {!activeWithdrawal && !loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Available to Withdraw</p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fmt(availableAmount)}</p>
                  {lockedAmount > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      {fmt(lockedAmount)} more unlocks at 6am tomorrow
                    </p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="lg"
                      disabled={!canWithdraw || requesting}
                      className="min-w-36"
                    >
                      {requesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Wallet className="w-4 h-4 mr-2" />
                      Withdraw
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Request Withdrawal</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are requesting a withdrawal of <strong>{fmt(availableAmount)}</strong>. Admin will transfer the amount to your registered bank account. You will then confirm receipt to complete the transaction.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRequestWithdrawal}>
                        Confirm Request
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {!canWithdraw && availableAmount === 0 && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  {lockedAmount > 0
                    ? "Your earnings unlock at 6am the day after each delivery."
                    : "Complete deliveries to start earning."}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Earnings history table — with filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <CardTitle>Earnings History</CardTitle>
                <CardDescription>
                  85% of delivery fee per order goes to you. 15% is the platform commission.
                </CardDescription>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-end gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                      <SelectItem value="withdraw_requested">Requested</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">From</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-full sm:w-40" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">To</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-full sm:w-40" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : earnings.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No earnings yet. Complete your first delivery!</p>
              </div>
            ) : (() => {
              const filtered = earnings.filter((e) => {
                if (statusFilter !== "all") {
                  if (statusFilter === "locked") {
                    if (!(e.status === "pending" && new Date(e.available_at) > now)) return false;
                  } else if (statusFilter === "available") {
                    if (!(e.status === "pending" && new Date(e.available_at) <= now)) return false;
                  } else {
                    if (e.status !== statusFilter) return false;
                  }
                }
                if (dateFrom && new Date(e.completed_at) < new Date(dateFrom)) return false;
                if (dateTo) {
                  const end = new Date(dateTo);
                  end.setHours(23, 59, 59, 999);
                  if (new Date(e.completed_at) > end) return false;
                }
                return true;
              });
              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No earnings match your filters.
                  </div>
                );
              }
              return (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Delivery Fee</TableHead>
                        <TableHead className="text-right">Platform (15%)</TableHead>
                        <TableHead className="text-right">Your Earnings</TableHead>
                        <TableHead>Unlocks</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <p className="font-medium text-sm">
                              {new Date(e.completed_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(e.completed_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">{fmt(e.delivery_fee)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">−{fmt(e.platform_cut)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(e.rider_amount)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(e.available_at).toLocaleString("en-NG", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell>{statusBadge(e.status, e.available_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Withdrawal history */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" /> Withdrawal History
            </CardTitle>
            <CardDescription>All your past and pending withdrawal requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : withdrawalHistory.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                You haven't made any withdrawal requests yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Transferred</TableHead>
                      <TableHead>Confirmed</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalHistory.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-sm">
                          {new Date(w.requested_at).toLocaleString("en-NG", {
                            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-right font-bold">{fmt(Number(w.amount))}</TableCell>
                        <TableCell className="text-sm">
                          {w.bank_name || "—"}<br />
                          <span className="text-xs text-muted-foreground">{w.account_number || ""}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {w.transferred_at
                            ? new Date(w.transferred_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {w.confirmed_at
                            ? new Date(w.confirmed_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {w.status === "confirmed" ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Confirmed</Badge>
                          ) : w.status === "transferred" ? (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Transferred</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RiderDashboardLayout>
  );
};

export default RiderEarnings;
