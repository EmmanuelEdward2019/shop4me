import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Loader2 } from "lucide-react";

interface BuyerWithdrawal {
  id: string;
  buyer_id: string;
  amount: number;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  status: string;              // pending | transferred
  requested_at: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n ?? 0);

const AdminCustomerPayouts = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<BuyerWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data: wData, error } = await supabase
        .from("buyer_withdrawals" as any)
        .select("*")
        .in("status", ["pending", "transferred"])
        .order("requested_at", { ascending: false });
      if (error) throw error;

      const list = (wData ?? []) as any[];
      if (list.length === 0) { setRows([]); return; }

      const buyerIds = [...new Set(list.map((r: any) => r.buyer_id))];
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, full_name, email, phone").in("user_id", buyerIds);
      const pMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

      setRows(list.map((r: any) => ({
        id: r.id,
        buyer_id: r.buyer_id,
        amount: Number(r.amount),
        bank_name: r.bank_name,
        account_name: r.account_name,
        account_number: r.account_number,
        status: r.status,
        requested_at: r.requested_at,
        buyer_name: pMap[r.buyer_id]?.full_name ?? "—",
        buyer_email: pMap[r.buyer_id]?.email ?? "—",
        buyer_phone: pMap[r.buyer_id]?.phone ?? "—",
      })));
    } catch (err) {
      console.error("Error fetching customer withdrawals:", err);
      toast({ title: "Error", description: "Failed to load customer payouts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  const markAsTransferred = async (w: BuyerWithdrawal) => {
    setBusyId(w.id);
    try {
      const { error } = await supabase
        .from("buyer_withdrawals" as any)
        .update({ status: "transferred", transferred_at: new Date().toISOString() } as any)
        .eq("id", w.id);
      if (error) throw error;
      toast({ title: "Marked as Transferred", description: "The customer will see a confirmation prompt." });
      supabase.functions.invoke("send-notification-email", {
        body: {
          type: "withdrawal_transferred",
          data: { buyerId: w.buyer_id, role: "buyer", amount: w.amount, bankName: w.bank_name, accountNumber: w.account_number },
        },
      }).catch(() => {});
      fetchRows();
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to update", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const cancelRefund = async (w: BuyerWithdrawal) => {
    if (!window.confirm(`Cancel this withdrawal and refund ${fmt(w.amount)} to ${w.buyer_name}'s wallet?`)) return;
    setBusyId(w.id);
    try {
      const { data, error } = await supabase.rpc("admin_cancel_buyer_withdrawal", { p_withdrawal_id: w.id });
      if (error) throw error;
      const d = data as any;
      if (!d?.success) throw new Error(d?.error || "Could not cancel");
      toast({ title: "Cancelled & Refunded", description: `${fmt(w.amount)} returned to the wallet.` });
      fetchRows();
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to cancel", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Customer Payouts</h1>
          <p className="text-muted-foreground">
            Customers cashing out their wallet (e.g. referral earnings) to a bank account. Pay the account,
            mark it transferred, then the customer confirms receipt. You can cancel a request to refund the wallet.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Requests</CardTitle>
            <CardDescription>Awaiting transfer, and transferred but not yet confirmed.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No pending customer withdrawal requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>
                          <p className="font-medium">{w.buyer_name}</p>
                          <p className="text-xs text-muted-foreground">{w.buyer_email}</p>
                          <p className="text-xs text-muted-foreground">{w.buyer_phone}</p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-sm">{w.bank_name || <span className="italic text-muted-foreground">—</span>}</p>
                            <p className="text-xs font-mono">{w.account_number || "—"}</p>
                            <p className="text-xs text-muted-foreground">{w.account_name || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(w.amount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(w.requested_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          {w.status === "pending" ? (
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Awaiting Transfer</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Transferred — Awaiting Confirmation</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {w.status === "pending" && (
                              <Button size="sm" onClick={() => markAsTransferred(w)} disabled={busyId === w.id}>
                                {busyId === w.id && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                                Mark Transferred
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => cancelRefund(w)} disabled={busyId === w.id}>
                              Cancel & Refund
                            </Button>
                          </div>
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
    </AdminDashboardLayout>
  );
};

export default AdminCustomerPayouts;
