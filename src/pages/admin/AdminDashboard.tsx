import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, UserCheck, Wallet, TrendingUp, Clock, ArrowRight } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalAgents: number;
  pendingOrders: number;
  totalRevenue: number;
  activeOrders: number;
  pendingWithdrawals: number;
  pendingWithdrawalAmount: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrders: 0,
    totalAgents: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
    pendingWithdrawals: 0,
    pendingWithdrawalAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all stats in parallel
      const [
        usersResult,
        ordersResult,
        agentsResult,
        pendingOrdersResult,
        paymentsResult,
        activeOrdersResult,
        recentOrdersResult,
        pendingWithdrawalsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "agent"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payments").select("amount").eq("status", "success"),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["accepted", "shopping", "in_transit"]),
        // Recent orders via the admin RPC. A direct PostgREST embed
        // (profiles!orders_user_id_fkey) fails — there is no FK between orders
        // and profiles (both reference auth.users) — and a direct orders query
        // is RLS-restricted for admins anyway. The SECURITY DEFINER RPC returns
        // the buyer name/email via a manual join and bypasses RLS.
        supabase.rpc("admin_list_orders", { p_search: null, p_status: null, p_limit: 5, p_offset: 0 }),
        supabase.from("rider_withdrawals").select("amount").eq("status", "pending"),
      ]);

      const totalRevenue = paymentsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const pendingWithdrawalRows = (pendingWithdrawalsResult.data ?? []) as Array<{ amount: number }>;
      const pendingWithdrawalAmount = pendingWithdrawalRows.reduce((sum, w) => sum + Number(w.amount || 0), 0);

      setStats({
        totalUsers: usersResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalAgents: agentsResult.count || 0,
        pendingOrders: pendingOrdersResult.count || 0,
        totalRevenue,
        activeOrders: activeOrdersResult.count || 0,
        pendingWithdrawals: pendingWithdrawalRows.length,
        pendingWithdrawalAmount,
      });

      // Map the RPC's flat buyer_name/buyer_email into the { profiles: {...} }
      // shape the list below already renders.
      setRecentOrders(
        (recentOrdersResult.data ?? []).map((o: any) => ({
          ...o,
          profiles: { full_name: o.buyer_name, email: o.buyer_email },
        }))
      );
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Total Orders", value: stats.totalOrders, icon: Package, color: "text-green-500" },
    { title: "Active Agents", value: stats.totalAgents, icon: UserCheck, color: "text-purple-500" },
    { title: "Pending Orders", value: stats.pendingOrders, icon: Clock, color: "text-orange-500" },
    { title: "Active Orders", value: stats.activeOrders, icon: TrendingUp, color: "text-cyan-500" },
    { title: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: Wallet, color: "text-emerald-500" },
  ];

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Overview</h1>
          <p className="text-muted-foreground">Monitor platform activity and manage users.</p>
        </div>

        {/* Pending Rider Payouts callout */}
        {!loading && stats.pendingWithdrawals > 0 && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-900 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    {stats.pendingWithdrawals} pending rider payout{stats.pendingWithdrawals === 1 ? "" : "s"}
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Total {formatCurrency(stats.pendingWithdrawalAmount)} waiting to be transferred.
                  </p>
                </div>
              </div>
              <Link
                to="/admin/riders?tab=withdrawals"
                className="inline-flex items-center gap-1 text-sm font-medium text-amber-900 dark:text-amber-200 hover:underline whitespace-nowrap"
              >
                Process payouts
                <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium">{order.location_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.profiles?.full_name || order.profiles?.email || "Unknown User"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === "delivered"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : order.status === "cancelled"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : order.status === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}
                      >
                        {order.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminDashboard;
