import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentDashboardLayout from "@/components/dashboard/AgentDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, MapPin, Clock, ShoppingCart, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

interface AgentOrder extends Order {
  order_items: OrderItem[];
  delivery_addresses: {
    address_line1: string;
    city: string;
    state: string;
  } | null;
}

const AgentMyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<AgentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    if (user) {
      fetchMyOrders();
    }
  }, [user]);

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(*),
          delivery_addresses(address_line1, city, state)
        `)
        .eq("agent_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data as AgentOrder[]) || []);
    } catch (error) {
      console.error("Error fetching my orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeStatuses = ["accepted", "shopping", "items_confirmed", "payment_pending", "paid", "in_transit"];
  const completedStatuses = ["delivered", "cancelled"];

  const activeOrders = orders.filter((o) => activeStatuses.includes(o.status));
  const completedOrders = orders.filter((o) => completedStatuses.includes(o.status));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "shopping":
        return "bg-purple-100 text-purple-800";
      case "in_transit":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const OrderCard = ({ order }: { order: AgentOrder }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">{order.location_name}</h3>
            <Badge variant="outline" className="mt-1 text-xs">{order.location_type}</Badge>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(order.status)}>
              {order.status.replace("_", " ")}
            </Badge>
            <p className="text-sm font-medium text-foreground mt-1">
              {order.estimated_total ? formatCurrency(order.estimated_total) : "TBD"}
            </p>
          </div>
        </div>

        {order.delivery_addresses && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{order.delivery_addresses.address_line1}, {order.delivery_addresses.city}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <ShoppingCart className="w-4 h-4" />
          <span>{order.order_items.length} items</span>
          <span>•</span>
          <Clock className="w-4 h-4" />
          <span>
            {new Date(order.created_at).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to={`/agent/orders/${order.id}`}>
            View Details
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <AgentDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            My Orders
          </h1>
          <p className="text-muted-foreground">
            Manage and track your accepted orders.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-48 mb-4" />
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-10 w-full mt-4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Active Orders</h3>
                  <p className="text-muted-foreground text-center max-w-sm mb-4">
                    Accept orders from the available orders page to start earning.
                  </p>
                  <Button asChild>
                    <Link to="/agent/available-orders">Browse Available Orders</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-48 mb-4" />
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-10 w-full mt-4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : completedOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Completed Orders</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    Your completed orders will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AgentDashboardLayout>
  );
};

export default AgentMyOrders;
