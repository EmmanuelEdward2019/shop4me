import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, UserCheck, Wallet, TrendingUp, Clock } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalAgents: number;
  pendingOrders: number;
  totalRevenue: number;
  activeOrders: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrders: 0,
    totalAgents: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
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
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "agent"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payments").select("amount").eq("status", "success"),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["accepted", "shopping", "in_transit"]),
        supabase.from("orders").select("*, profiles!orders_user_id_fkey(full_name, email)").order("created_at", { ascending: false }).limit(5),
      ]);

      const totalRevenue = paymentsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalAgents: agentsResult.count || 0,
        pendingOrders: pendingOrdersResult.count || 0,
        totalRevenue,
        activeOrders: activeOrdersResult.count || 0,
      });

      setRecentOrders(recentOrdersResult.data || []);
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
