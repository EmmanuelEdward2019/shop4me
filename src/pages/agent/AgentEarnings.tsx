import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentDashboardLayout from "@/components/dashboard/AgentDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, TrendingUp, Clock, CheckCircle, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Earning {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  order_id: string | null;
}

interface EarningsStats {
  totalEarned: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  completedOrders: number;
}

const AgentEarnings = () => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (user) {
      fetchEarnings();
    }
  }, [user]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agent_earnings")
        .select("*")
        .eq("agent_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const allEarnings = data || [];
      
      // Calculate stats
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      setStats({
        totalEarned: allEarnings
          .filter((e) => e.status === "paid")
          .reduce((sum, e) => sum + Number(e.amount), 0),
        pendingEarnings: allEarnings
          .filter((e) => e.status === "pending")
          .reduce((sum, e) => sum + Number(e.amount), 0),
        thisMonthEarnings: allEarnings
          .filter((e) => e.status === "paid" && new Date(e.paid_at || e.created_at) >= firstOfMonth)
          .reduce((sum, e) => sum + Number(e.amount), 0),
        completedOrders: allEarnings.filter((e) => e.type === "commission" && e.status === "paid").length,
      });

      setEarnings(allEarnings);
    } catch (error) {
      console.error("Error fetching earnings:", error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "commission":
        return "Order Commission";
      case "bonus":
        return "Bonus";
      case "tip":
        return "Customer Tip";
      default:
        return type;
    }
  };

  const filteredEarnings = earnings.filter((e) => {
    if (activeTab === "all") return true;
    return e.status === activeTab;
  });

  return (
    <AgentDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Earnings
          </h1>
          <p className="text-muted-foreground">
            Track your earnings and payment history.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Earned</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(stats?.totalEarned || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(stats?.pendingEarnings || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(stats?.thisMonthEarnings || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Orders Completed</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.completedOrders || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Earnings List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Earnings History</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    ))}
                  </div>
                ) : filteredEarnings.length === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Earnings Yet</h3>
                    <p className="text-muted-foreground">
                      Complete orders to start earning.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEarnings.map((earning) => (
                      <div
                        key={earning.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{getTypeLabel(earning.type)}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(earning.created_at).toLocaleDateString("en-NG", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-green-600">
                            +{formatCurrency(earning.amount)}
                          </span>
                          <Badge className={getStatusColor(earning.status)}>
                            {earning.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AgentDashboardLayout>
  );
};

export default AgentEarnings;
