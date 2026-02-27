import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHaptics } from "@/lib/native";
import { useAuth } from "@/contexts/AuthContext";
import AgentDashboardLayout from "@/components/dashboard/AgentDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Clock, ShoppingCart, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

interface AvailableOrder extends Order {
  order_items: OrderItem[];
  delivery_addresses: {
    address_line1: string;
    city: string;
    state: string;
  } | null;
}

const AvailableOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { impact, notification } = useHaptics();
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableOrders();
  }, []);

  const fetchAvailableOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(*),
          delivery_addresses(address_line1, city, state)
        `)
        .eq("status", "pending")
        .is("agent_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data as AvailableOrder[]) || []);
    } catch (error) {
      console.error("Error fetching available orders:", error);
      toast({
        title: "Error",
        description: "Failed to load available orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (orderId: string) => {
    setAccepting(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          agent_id: user?.id,
          status: "accepted"
        })
        .eq("id", orderId)
        .eq("status", "pending")
        .is("agent_id", null);

      if (error) throw error;

      toast({
        title: "Order Accepted!",
        description: "You can now start shopping for this order.",
      });

      // Remove from list
      setOrders(orders.filter((o) => o.id !== orderId));
    } catch (error) {
      console.error("Error accepting order:", error);
      toast({
        title: "Error",
        description: "Failed to accept order. It may have been taken by another agent.",
        variant: "destructive",
      });
      // Refresh list
      fetchAvailableOrders();
    } finally {
      setAccepting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const orderDate = new Date(date);
    const diffMs = now.getTime() - orderDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <AgentDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Available Orders
            </h1>
            <p className="text-muted-foreground">
              Accept orders to start earning.
            </p>
          </div>
          <Button variant="outline" onClick={fetchAvailableOrders} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-48 mb-4" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Available Orders</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                There are no pending orders at the moment. Check back soon or refresh to see new orders.
              </p>
              <Button variant="outline" onClick={fetchAvailableOrders} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-display">{order.location_name}</CardTitle>
                      <Badge variant="outline" className="mt-1">{order.location_type}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {order.estimated_total ? formatCurrency(order.estimated_total) : "TBD"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(order.created_at)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Delivery Address */}
                  {order.delivery_addresses && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {order.delivery_addresses.address_line1}, {order.delivery_addresses.city}
                      </span>
                    </div>
                  )}

                  {/* Items Preview */}
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {order.order_items.length} item{order.order_items.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-foreground truncate">
                      {order.order_items.slice(0, 2).map(i => i.name).join(", ")}
                      {order.order_items.length > 2 && ` +${order.order_items.length - 2} more`}
                    </span>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      "{order.notes}"
                    </p>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={() => acceptOrder(order.id)}
                    disabled={accepting === order.id}
                  >
                    {accepting === order.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 mr-2" />
                        Accept Order
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AgentDashboardLayout>
  );
};

export default AvailableOrders;
