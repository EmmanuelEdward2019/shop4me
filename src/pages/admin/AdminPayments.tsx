import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CreditCard, Wallet, ArrowDownCircle, ArrowUpCircle, Search, CalendarIcon, X, TrendingUp, ChevronLeft, ChevronRight, BarChart3, AreaChart as AreaChartIcon } from "lucide-react";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import AdminPaymentsExport from "@/components/admin/AdminPaymentsExport";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

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
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [paystackPage, setPaystackPage] = useState(1);
  const [walletPage, setWalletPage] = useState(1);
  const pageSize = 20;

  const matchesDateRange = (dateStr: string) => {
    const date = new Date(dateStr);
    if (dateFrom && isBefore(date, startOfDay(dateFrom))) return false;
    if (dateTo && isAfter(date, endOfDay(dateTo))) return false;
    return true;
  };

  const clearDates = () => { setDateFrom(undefined); setDateTo(undefined); setActivePreset(null); };
  const hasDateFilter = dateFrom || dateTo;

  const [chartView, setChartView] = useState<"daily" | "weekly">("daily");
  const [chartType, setChartType] = useState<"bar" | "area">("bar");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = (preset: string) => {
    const today = new Date();
    setActivePreset(preset);
    switch (preset) {
      case "today":
        setDateFrom(today);
        setDateTo(today);
        break;
      case "7days":
        setDateFrom(subDays(today, 6));
        setDateTo(today);
        break;
      case "this_month":
        setDateFrom(startOfMonth(today));
        setDateTo(today);
        break;
      case "last_month": {
        const last = subMonths(today, 1);
        setDateFrom(startOfMonth(last));
        setDateTo(endOfMonth(last));
        break;
      }
    }
  };

  const presets = [
    { key: "today", label: "Today" },
    { key: "7days", label: "Last 7 days" },
    { key: "this_month", label: "This month" },
    { key: "last_month", label: "Last month" },
  ];

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
    return matchesSearch && matchesStatus && matchesDateRange(p.created_at);
  });

  // Filter wallet txns
  const filteredWalletTxns = walletTxns.filter((t: any) => {
    const matchesSearch = !searchTerm ||
      t.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.type === statusFilter;
    return matchesSearch && matchesStatus && matchesDateRange(t.created_at);
  });

  // Pagination
  const paystackTotalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const walletTotalPages = Math.max(1, Math.ceil(filteredWalletTxns.length / pageSize));
  const paginatedPayments = filteredPayments.slice((paystackPage - 1) * pageSize, paystackPage * pageSize);
  const paginatedWalletTxns = filteredWalletTxns.slice((walletPage - 1) * pageSize, walletPage * pageSize);

  // Reset pages when filters change
  const resetPages = () => { setPaystackPage(1); setWalletPage(1); };

  // Chart data computation
  const chartData = useMemo(() => {
    const successPayments = payments.filter((p: any) => p.status === "success");
    const credits = walletTxns.filter((t: any) => t.type === "credit");
    const debits = walletTxns.filter((t: any) => t.type === "debit");

    if (chartView === "daily") {
      const end = new Date();
      const start = subDays(end, 29);
      const days = eachDayOfInterval({ start, end });
      return days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const label = format(day, "dd MMM");
        const paystack = successPayments
          .filter((p: any) => format(new Date(p.created_at), "yyyy-MM-dd") === dayStr)
          .reduce((s: number, p: any) => s + Number(p.amount), 0);
        const walletIn = credits
          .filter((t: any) => format(new Date(t.created_at), "yyyy-MM-dd") === dayStr)
          .reduce((s: number, t: any) => s + Number(t.amount), 0);
        const walletOut = debits
          .filter((t: any) => format(new Date(t.created_at), "yyyy-MM-dd") === dayStr)
          .reduce((s: number, t: any) => s + Number(t.amount), 0);
        return { label, paystack, walletIn, walletOut };
      });
    } else {
      const end = new Date();
      const start = subDays(end, 83);
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      return weeks.map((weekStart) => {
        const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const label = format(weekStart, "dd MMM");
        const inRange = (dateStr: string) => {
          const d = new Date(dateStr);
          return d >= startOfDay(weekStart) && d <= endOfDay(wEnd);
        };
        const paystack = successPayments.filter((p: any) => inRange(p.created_at)).reduce((s: number, p: any) => s + Number(p.amount), 0);
        const walletIn = credits.filter((t: any) => inRange(t.created_at)).reduce((s: number, t: any) => s + Number(t.amount), 0);
        const walletOut = debits.filter((t: any) => inRange(t.created_at)).reduce((s: number, t: any) => s + Number(t.amount), 0);
        return { label, paystack, walletIn, walletOut };
      });
    }
  }, [payments, walletTxns, chartView]);

  const chartTooltipFormatter = (value: number) => formatNaira(value);

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

        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Revenue Trends</CardTitle>
            </div>
            <div className="flex gap-1">
              <Button
                variant={chartView === "daily" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartView("daily")}
                className="text-xs h-7 px-3"
              >
                Daily
              </Button>
              <Button
                variant={chartView === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartView("weekly")}
                className="text-xs h-7 px-3"
              >
                Weekly
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button
                variant={chartType === "bar" ? "default" : "outline"}
                size="icon"
                onClick={() => setChartType("bar")}
                className="h-7 w-7"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={chartType === "area" ? "default" : "outline"}
                size="icon"
                onClick={() => setChartType("area")}
                className="h-7 w-7"
              >
                <AreaChartIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" interval={chartView === "daily" ? 4 : 0} angle={chartView === "weekly" ? -30 : 0} textAnchor={chartView === "weekly" ? "end" : "middle"} />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`} />
                    <Tooltip formatter={chartTooltipFormatter} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="paystack" name="Paystack Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="walletIn" name="Wallet Credits" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="walletOut" name="Wallet Debits" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradPaystack" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradCredits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradDebits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" interval={chartView === "daily" ? 4 : 0} angle={chartView === "weekly" ? -30 : 0} textAnchor={chartView === "weekly" ? "end" : "middle"} />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`} />
                    <Tooltip formatter={chartTooltipFormatter} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Area type="monotone" dataKey="paystack" name="Paystack Revenue" stroke="hsl(var(--primary))" fill="url(#gradPaystack)" strokeWidth={2} />
                    <Area type="monotone" dataKey="walletIn" name="Wallet Credits" stroke="hsl(142 71% 45%)" fill="url(#gradCredits)" strokeWidth={2} />
                    <Area type="monotone" dataKey="walletOut" name="Wallet Debits" stroke="hsl(var(--destructive))" fill="url(#gradDebits)" strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or reference..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); resetPages(); }}
                className="pl-10"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-[150px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setActivePreset(null); }} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-[150px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd MMM yyyy") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setActivePreset(null); }} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {hasDateFilter && (
              <Button variant="ghost" size="icon" onClick={clearDates} className="shrink-0">
                <X className="h-4 w-4" />
              </Button>
            )}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPages(); }}>
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
          <div className="flex gap-2 flex-wrap">
            {presets.map((p) => (
              <Button
                key={p.key}
                variant={activePreset === p.key ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(p.key)}
                className="text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="paystack" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList>
              <TabsTrigger value="paystack" className="gap-2"><CreditCard className="h-4 w-4" /> Paystack Payments</TabsTrigger>
              <TabsTrigger value="wallet" className="gap-2"><Wallet className="h-4 w-4" /> Wallet Transactions</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <AdminPaymentsExport
                data={filteredPayments}
                filenamePrefix="paystack-payments"
                title="Paystack Payments Report"
                disabled={loadingPayments}
                summaryItems={[
                  { label: "Total Revenue", value: formatNaira(totalPaystackRevenue) },
                  { label: "Successful", value: String(payments.filter((p: any) => p.status === "success").length) },
                ]}
                columns={[
                  { header: "Date", accessor: (r: any) => format(new Date(r.created_at), "dd MMM yyyy, HH:mm") },
                  { header: "User", accessor: (r: any) => r.profiles?.full_name || "—" },
                  { header: "Email", accessor: (r: any) => r.profiles?.email || "" },
                  { header: "Type", accessor: (r: any) => r.payment_method === "wallet_topup" ? "Wallet Top-up" : r.payment_method || "Card" },
                  { header: "Amount", accessor: (r: any) => formatNaira(Number(r.amount)) },
                  { header: "Reference", accessor: (r: any) => r.provider_reference || "—" },
                  { header: "Status", accessor: (r: any) => r.status },
                ]}
              />
              <AdminPaymentsExport
                data={filteredWalletTxns}
                filenamePrefix="wallet-transactions"
                title="Wallet Transactions Report"
                disabled={loadingWallet}
                summaryItems={[
                  { label: "Total Credits", value: formatNaira(totalWalletCredits) },
                  { label: "Total Debits", value: formatNaira(totalWalletDebits) },
                ]}
                columns={[
                  { header: "Date", accessor: (r: any) => format(new Date(r.created_at), "dd MMM yyyy, HH:mm") },
                  { header: "User", accessor: (r: any) => r.profile?.full_name || "—" },
                  { header: "Email", accessor: (r: any) => r.profile?.email || "" },
                  { header: "Type", accessor: (r: any) => r.type === "credit" ? "Credit" : "Debit" },
                  { header: "Amount", accessor: (r: any) => formatNaira(Number(r.amount)) },
                  { header: "Description", accessor: (r: any) => r.description || "—" },
                  { header: "Reference", accessor: (r: any) => r.reference || "—" },
                ]}
              />
            </div>
          </div>

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
                    ) : paginatedPayments.map((p: any) => (
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
              {filteredPayments.length > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {(paystackPage - 1) * pageSize + 1}–{Math.min(paystackPage * pageSize, filteredPayments.length)} of {filteredPayments.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={paystackPage <= 1} onClick={() => setPaystackPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(paystackTotalPages, 5) }, (_, i) => {
                      const start = Math.max(1, Math.min(paystackPage - 2, paystackTotalPages - 4));
                      const page = start + i;
                      if (page > paystackTotalPages) return null;
                      return (
                        <Button key={page} variant={page === paystackPage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPaystackPage(page)}>
                          {page}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={paystackPage >= paystackTotalPages} onClick={() => setPaystackPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
                    ) : paginatedWalletTxns.map((t: any) => (
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
              {filteredWalletTxns.length > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {(walletPage - 1) * pageSize + 1}–{Math.min(walletPage * pageSize, filteredWalletTxns.length)} of {filteredWalletTxns.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={walletPage <= 1} onClick={() => setWalletPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(walletTotalPages, 5) }, (_, i) => {
                      const start = Math.max(1, Math.min(walletPage - 2, walletTotalPages - 4));
                      const page = start + i;
                      if (page > walletTotalPages) return null;
                      return (
                        <Button key={page} variant={page === walletPage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setWalletPage(page)}>
                          {page}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={walletPage >= walletTotalPages} onClick={() => setWalletPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminPayments;
