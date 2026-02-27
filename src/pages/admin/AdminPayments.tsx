import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Wallet, ArrowDownCircle, ArrowUpCircle, Search, DollarSign } from "lucide-react";
import { format } from "date-fns";
import AdminPaymentsExport from "@/components/admin/AdminPaymentsExport";

const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

const statusColor = (status: string) => {
  switch (status) {
    case "success": return "default";
    case "pending": return "secondary";
    case "failed": return "destructive";
    default: return "outline";
  }
};

const AdminPayments = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch Paystack payments
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, profiles!inner(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch wallet transactions (with wallet owner info)
  const { data: walletTxns = [], isLoading: loadingWallet } = useQuery({
    queryKey: ["admin-wallet-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*, wallets!inner(user_id, balance)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      // Fetch profiles for each unique user
      const userIds = [...new Set((data || []).map((t: any) => t.wallets.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((t: any) => ({
        ...t,
        profile: profileMap.get(t.wallets.user_id) || { full_name: "Unknown", email: "" },
      }));
    },
  });

  // Summary stats
  const totalPaystackRevenue = payments.filter((p: any) => p.status === "success").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalWalletCredits = walletTxns.filter((t: any) => t.type === "credit").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalWalletDebits = walletTxns.filter((t: any) => t.type === "debit").reduce((s: number, t: any) => s + Number(t.amount), 0);

  // Filter payments
  const filteredPayments = payments.filter((p: any) => {
    const matchesSearch = !searchTerm || 
      p.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.provider_reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter wallet txns
  const filteredWalletTxns = walletTxns.filter((t: any) => {
    const matchesSearch = !searchTerm ||
      t.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.type === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Payments & Transactions</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paystack Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatNaira(totalPaystackRevenue)}</div>
              <p className="text-xs text-muted-foreground">{payments.filter((p: any) => p.status === "success").length} successful payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Top-ups</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatNaira(totalWalletCredits)}</div>
              <p className="text-xs text-muted-foreground">{walletTxns.filter((t: any) => t.type === "credit").length} credits</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Spending</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatNaira(totalWalletDebits)}</div>
              <p className="text-xs text-muted-foreground">{walletTxns.filter((t: any) => t.type === "debit").length} debits</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="credit">Credits</SelectItem>
              <SelectItem value="debit">Debits</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="paystack" className="space-y-4">
          <TabsList>
            <TabsTrigger value="paystack" className="gap-2"><CreditCard className="h-4 w-4" /> Paystack Payments</TabsTrigger>
            <TabsTrigger value="wallet" className="gap-2"><Wallet className="h-4 w-4" /> Wallet Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="paystack">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPayments ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filteredPayments.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
                    ) : filteredPayments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{format(new Date(p.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{p.profiles?.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{p.profiles?.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.payment_method === "wallet_topup" ? "Wallet Top-up" : p.payment_method || "Card"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatNaira(Number(p.amount))}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{p.provider_reference || "—"}</TableCell>
                        <TableCell><Badge variant={statusColor(p.status)}>{p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingWallet ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filteredWalletTxns.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
                    ) : filteredWalletTxns.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">{format(new Date(t.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{t.profile?.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{t.profile?.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.type === "credit" ? "default" : "destructive"} className="text-xs">
                            {t.type === "credit" ? "Credit" : "Debit"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatNaira(Number(t.amount))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{t.description || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{t.reference || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminPayments;
