import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Clock, CheckCircle, Plus, Wallet, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  walletBalance: number;
}

interface RecentOrder {
  id: string;
  location_name: string;
  status: string;
  created_at: string;
  estimated_total: number | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (data?.full_name) {
        // Extract surname (last word in full name)
        const nameParts = data.full_name.trim().split(" ");
        const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
        setUserName(surname);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, location_name, status, created_at, estimated_total")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user?.id)
        .maybeSingle();

      // Calculate stats
      const allOrders = orders || [];
      const pendingStatuses = ["pending", "accepted", "shopping", "items_confirmed", "payment_pending", "paid", "in_transit"];
      
      setStats({
        totalOrders: allOrders.length,
        pendingOrders: allOrders.filter((o) => pendingStatuses.includes(o.status)).length,
        completedOrders: allOrders.filter((o) => o.status === "delivered").length,
        walletBalance: wallet?.balance || 0,
      });

      setRecentOrders(orders || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Welcome back{userName ? `, ${userName}` : ""}! 👋
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your orders today.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/dashboard/new-order">
              <Plus className="w-5 h-5 mr-2" />
              New Order
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.totalOrders || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.pendingOrders || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.completedOrders || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Wallet Balance</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(stats?.walletBalance || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-secondary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Recent Orders</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/orders">
                View all
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No orders yet</p>
                <Button asChild>
                  <Link to="/dashboard/new-order">Create your first order</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/dashboard/orders/${order.id}`}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{order.location_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {order.estimated_total && (
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(order.estimated_total)}
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
