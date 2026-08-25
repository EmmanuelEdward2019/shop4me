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

interface AgentWithdrawal {
  id: string;
  agent_id: string;
  amount: number;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  status: string;              // pending | transferred
  requested_at: string;
  transferred_at: string | null;
  agent_name: string;
  agent_email: string;
  agent_phone: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n ?? 0);

const AdminAgentPayouts = () => {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<AgentWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const { data: wData, error } = await supabase
        .from("agent_withdrawals" as any)
        .select("*")
        .in("status", ["pending", "transferred"])
        .order("requested_at", { ascending: false });
      if (error) throw error;

      const rows = (wData ?? []) as any[];
      if (rows.length === 0) { setWithdrawals([]); return; }

      const agentIds = [...new Set(rows.map((r: any) => r.agent_id))];
      // Bank details are captured at onboarding in agent_applications; fall back
      // to those when the withdrawal row didn't freeze them.
      const [profilesResult, applicationsResult] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", agentIds),
        supabase.from("agent_applications").select("user_id, bank_name, account_number, account_name").in("user_id", agentIds),
      ]);

      const profileMap = Object.fromEntries((profilesResult.data ?? []).map((p) => [p.user_id, p]));
      const appMap = Object.fromEntries((applicationsResult.data ?? []).map((a: any) => [a.user_id, a]));

      setWithdrawals(rows.map((r: any) => {
        const app = appMap[r.agent_id];
        return {
          id: r.id,
          agent_id: r.agent_id,
          amount: Number(r.amount),
          bank_name: r.bank_name || app?.bank_name || null,
          account_name: r.account_name || app?.account_name || null,
          account_number: r.account_number || app?.account_number || null,
          status: r.status,
          requested_at: r.requested_at,
          transferred_at: r.transferred_at,
          agent_name: profileMap[r.agent_id]?.full_name ?? "—",
          agent_email: profileMap[r.agent_id]?.email ?? "—",
          agent_phone: profileMap[r.agent_id]?.phone ?? "—",
        };
      }));
    } catch (err) {
      console.error("Error fetching agent withdrawals:", err);
      toast({ title: "Error", description: "Failed to load agent payouts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWithdrawals(); }, []);

  const markAsTransferred = async (id: string) => {
    setMarkingId(id);
    try {
      const { error } = await supabase
        .from("agent_withdrawals" as any)
        .update({ status: "transferred", transferred_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Marked as Transferred", description: "The agent will now see a confirmation prompt." });
      // Notify the agent (email + in-app bell) that their payout was sent.
      const w = withdrawals.find((x) => x.id === id);
      if (w) {
        supabase.functions.invoke("send-notification-email", {
          body: {
            type: "withdrawal_transferred",
            data: {
              agentId: w.agent_id,
              role: "agent",
              amount: w.amount,
              bankName: w.bank_name,
              accountNumber: w.account_number,
            },
          },
        }).catch(() => {});
      }
      fetchWithdrawals();
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to update", variant: "destructive" });
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Agent Payouts</h1>
          <p className="text-muted-foreground">
            Pending agent withdrawal requests. Pay the agent's bank account, then mark it transferred —
            the agent confirms receipt and the earnings are marked paid.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Requests</CardTitle>
            <CardDescription>Agents awaiting transfer, and those transferred but not yet confirmed.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No pending agent withdrawal requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>
                          <p className="font-medium">{w.agent_name}</p>
                          <p className="text-xs text-muted-foreground">{w.agent_email}</p>
                          <p className="text-xs text-muted-foreground">{w.agent_phone}</p>
                        </TableCell>
                        <TableCell>
                          {w.bank_name || w.account_number || w.account_name ? (
                            <div className="space-y-0.5">
                              <p className="font-medium text-sm">
                                {w.bank_name || <span className="text-muted-foreground italic">Bank not set</span>}
                              </p>
                              <p className="text-xs font-mono">
                                {w.account_number || <span className="text-muted-foreground italic">No account number</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {w.account_name || <span className="italic">No account name</span>}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-destructive italic">
                              No bank details on file — contact agent before transferring.
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {fmt(w.amount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(w.requested_at).toLocaleString("en-NG", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          {w.status === "pending" ? (
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Awaiting Transfer</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Transferred — Awaiting Confirmation</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {w.status === "pending" && (
                            <Button size="sm" onClick={() => markAsTransferred(w.id)} disabled={markingId === w.id}>
                              {markingId === w.id && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                              Mark Transferred
                            </Button>
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
    </AdminDashboardLayout>
  );
};

export default AdminAgentPayouts;
