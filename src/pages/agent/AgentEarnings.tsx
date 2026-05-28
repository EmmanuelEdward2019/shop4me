import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentDashboardLayout from "@/components/dashboard/AgentDashboardLayout";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Wallet, TrendingUp, Clock, CheckCircle2, Loader2, AlertCircle,
  BanknoteIcon, History, Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────
interface AgentEarning {
  id: string;
  order_id: string | null;
  amount: number;
  type: string;       // 'commission' | 'service_fee' | 'bonus' | 'tip'
  status: string;     // 'pending' | 'withdraw_requested' | 'paid' | 'cancelled'
  created_at: string;
  paid_at: string | null;
  available_at: string | null;
  withdrawal_id: string | null;
  order_status: string | null;  // joined
}

interface AgentWithdrawal {
  id: string;
  amount: number;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  status: string;          // 'pending' | 'transferred' | 'confirmed'
  requested_at: string;
  transferred_at: string | null;
  confirmed_at: string | null;
}

const fmt = (n: number) =>
  "₦" + new Intl.NumberFormat("en-NG").format(Math.round(n));

const typeLabel = (t: string) => {
  switch (t) {
    case "commission": return "Order Commission";
    case "service_fee": return "Service Fee";
    case "bonus": return "Bonus";
    case "tip": return "Customer Tip";
    default: return t;
  }
};

// Compute the user-visible status for a row. "Available" means: pending,
// order is delivered, and available_at (if any) has elapsed.
const rowStatus = (
  e: AgentEarning,
  now: Date,
): "paid" | "withdraw_requested" | "cancelled" | "locked" | "available" | "pending" => {
  if (e.status === "paid") return "paid";
  if (e.status === "withdraw_requested") return "withdraw_requested";
  if (e.status === "cancelled") return "cancelled";
  // status === 'pending' below
  if (e.order_status !== "delivered") return "pending";
  if (e.available_at && new Date(e.available_at) > now) return "locked";
  return "available";
};

const statusBadge = (e: AgentEarning, now: Date) => {
  const s = rowStatus(e, now);
  switch (s) {
    case "paid":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
    case "withdraw_requested":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Requested</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "locked":
      return <Badge variant="outline" className="text-orange-600 border-orange-300">Locked</Badge>;
    case "available":
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Available</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

const AgentEarnings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<AgentEarning[]>([]);
  const [activeWithdrawal, setActiveWithdrawal] = useState<AgentWithdrawal | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<AgentWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // 60s ticker so "available" flips without a manual refresh.
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [earningsRes, activeRes, historyRes] = await Promise.all([
        // Earnings + joined order status
        supabase
          .from("agent_earnings")
          .select("*, orders:order_id (status)")
          .eq("agent_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("agent_withdrawals" as never)
          .select("*")
          .eq("agent_id", user.id)
          .in("status", ["pending", "transferred"])
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("agent_withdrawals" as never)
          .select("*")
          .eq("agent_id", user.id)
          .order("requested_at", { ascending: false })
          .limit(50),
      ]);

      setEarnings(((earningsRes.data ?? []) as any[]).map((r) => ({
        id: r.id,
        order_id: r.order_id ?? null,
        amount: Number(r.amount),
        type: r.type,
        status: r.status,
        created_at: r.created_at,
        paid_at: r.paid_at ?? null,
        available_at: r.available_at ?? null,
        withdrawal_id: r.withdrawal_id ?? null,
        order_status: r.orders?.status ?? null,
      })));
      setActiveWithdrawal(activeRes.data ? (activeRes.data as any as AgentWithdrawal) : null);
      setWithdrawalHistory(((historyRes.data ?? []) as any[]) as AgentWithdrawal[]);
    } catch (err) {
      console.error("Error loading agent earnings:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _tickDep = tick;
  const now = new Date();

  const totalEarned = earnings
    .filter((e) => e.status === "paid")
    .reduce((s, e) => s + e.amount, 0);
  const availableAmount = earnings
    .filter((e) => rowStatus(e, now) === "available")
    .reduce((s, e) => s + e.amount, 0);
  const lockedAmount = earnings
    .filter((e) => rowStatus(e, now) === "locked")
    .reduce((s, e) => s + e.amount, 0);
  const pendingAmount = earnings
    .filter((e) => rowStatus(e, now) === "pending")
    .reduce((s, e) => s + e.amount, 0);

  const canWithdraw = availableAmount > 0 && !activeWithdrawal;

  const handleRequestWithdrawal = async () => {
    setRequesting(true);
    try {
      const { error } = await supabase.rpc("request_agent_withdrawal" as never);
      if (error) throw error;
      toast({
        title: "Withdrawal Requested",
        description: "Admin has been notified. Transfer usually happens within 24 hours.",
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message ?? "Failed to request withdrawal",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!activeWithdrawal) return;
    setConfirming(true);
    try {
      const { error } = await supabase.rpc(
        "confirm_agent_withdrawal_receipt" as never,
        { p_withdrawal_id: activeWithdrawal.id } as never,
      );
      if (error) throw error;
      toast({
        title: "Payment Confirmed!",
        description: "Your earnings have been marked as paid.",
      });
      setActiveWithdrawal(null);
      fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message ?? "Failed to confirm receipt",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const filteredEarnings = earnings.filter((e) => {
    if (statusFilter !== "all" && rowStatus(e, now) !== statusFilter) return false;
    if (dateFrom && new Date(e.created_at) < new Date(dateFrom)) return false;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (new Date(e.created_at) > end) return false;
    }
    return true;
  });

  return (
    <AgentDashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Earnings</h1>
          <p className="text-muted-foreground">
            Service fees and commissions from completed orders. Earnings unlock once the order is delivered.
          </p>
        </div>

        {/* Stats */}
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
                <p className="text-xs text-muted-foreground mt-1">Paid out</p>
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
                <p className="text-xs text-muted-foreground mt-1">Unlocks soon</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> In-flight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(pendingAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting delivery</p>
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
                {activeWithdrawal.status === "transferred"
                  ? "Payment Sent — Confirm Receipt"
                  : "Withdrawal Request Pending"}
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
                  <p className="font-medium">
                    {activeWithdrawal.account_number || "—"} · {activeWithdrawal.account_name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Requested</p>
                  <p className="font-medium">
                    {new Date(activeWithdrawal.requested_at).toLocaleString("en-NG", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
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

        {/* Withdraw CTA */}
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
                      {fmt(lockedAmount)} more unlocks once those orders are delivered
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
                        You are requesting a withdrawal of <strong>{fmt(availableAmount)}</strong>. Admin will transfer the amount to the bank account on file. You will then confirm receipt to complete the transaction.
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
                  {lockedAmount > 0 || pendingAmount > 0
                    ? "Earnings become available once their orders are delivered."
                    : "Accept and complete orders to start earning."}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Earnings history */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <CardTitle>Earnings History</CardTitle>
                <CardDescription>
                  Each row is one earning from an order you handled.
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
                      <SelectItem value="pending">Pending</SelectItem>
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
            ) : filteredEarnings.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {earnings.length === 0
                    ? "No earnings yet. Complete your first order!"
                    : "No earnings match your filters."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Order Status</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEarnings.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <p className="font-medium text-sm">
                            {new Date(e.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(e.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </TableCell>
                        <TableCell>{typeLabel(e.type)}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {fmt(e.amount)}
                        </TableCell>
                        <TableCell className="text-sm capitalize text-muted-foreground">
                          {e.order_status?.replace("_", " ") ?? "—"}
                        </TableCell>
                        <TableCell>{statusBadge(e, now)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
    </AgentDashboardLayout>
  );
};

export default AgentEarnings;
