import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentDashboardLayout from "@/components/dashboard/AgentDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Clock, CheckCircle, Wallet, ArrowRight, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentStats {
  availableOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalEarnings: number;
  pendingEarnings: number;
}

interface RecentOrder {
  id: string;
  location_name: string;
  status: string;
  created_at: string;
  estimated_total: number | null;
}

const AgentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AgentStats | null>(null);
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
      // Fetch available orders count
      const { count: availableCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .is("agent_id", null);

      // Fetch agent's active orders
      const { data: myOrders } = await supabase
        .from("orders")
        .select("id, location_name, status, created_at, estimated_total")
        .eq("agent_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch agent earnings
      const { data: earnings } = await supabase
        .from("agent_earnings")
        .select("amount, status")
        .eq("agent_id", user?.id);

      const activeStatuses = ["accepted", "shopping", "items_confirmed", "payment_pending", "paid", "in_transit"];
      const allOrders = myOrders || [];
      const allEarnings = earnings || [];

      setStats({
        availableOrders: availableCount || 0,
        activeOrders: allOrders.filter((o) => activeStatuses.includes(o.status)).length,
        completedOrders: allOrders.filter((o) => o.status === "delivered").length,
        totalEarnings: allEarnings.filter((e) => e.status === "paid").reduce((sum, e) => sum + Number(e.amount), 0),
        pendingEarnings: allEarnings.filter((e) => e.status === "pending").reduce((sum, e) => sum + Number(e.amount), 0),
      });

      setRecentOrders(allOrders);
    } catch (error) {
      console.error("Error fetching agent dashboard data:", error);
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
    <AgentDashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {userName ? `Hey ${userName}!` : "Agent Dashboard"} 🛒
            </h1>
            <p className="text-muted-foreground">
              Accept orders and start earning today.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/agent/available-orders">
              <Package className="w-5 h-5 mr-2" />
              View Available Orders
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {loading ? (
            <>
              {[...Array(5)].map((_, i) => (
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
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="text-2xl font-bold text-primary">
                        {stats?.availableOrders || 0}
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
                      <p className="text-sm text-muted-foreground">Active</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.activeOrders || 0}
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
                      <p className="text-sm text-muted-foreground">Pending Earnings</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(stats?.pendingEarnings || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Earned</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(stats?.totalEarnings || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-green-600" />
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
            <CardTitle className="font-display">My Recent Orders</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/agent/my-orders">
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
                  <Link to="/agent/available-orders">Browse available orders</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/agent/orders/${order.id}`}
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
    </AgentDashboardLayout>
  );
};

export default AgentDashboard;
