import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentDashboardLayout from "@/components/dashboard/AgentDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  MapPin,
  Phone,
  User,
  ArrowLeft,
  CheckCircle,
  ShoppingCart,
  Truck,
  Camera,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrderDetail extends Order {
  order_items: OrderItem[];
  delivery_addresses: {
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    landmark: string | null;
  } | null;
}

interface CustomerProfile {
  full_name: string | null;
  phone: string | null;
}

const statusSteps: { status: OrderStatus; label: string; icon: any }[] = [
  { status: "accepted", label: "Accepted", icon: CheckCircle },
  { status: "shopping", label: "Shopping", icon: ShoppingCart },
  { status: "items_confirmed", label: "Items Confirmed", icon: Package },
  { status: "payment_pending", label: "Awaiting Payment", icon: AlertCircle },
  { status: "paid", label: "Paid", icon: CheckCircle },
  { status: "in_transit", label: "In Transit", icon: Truck },
  { status: "delivered", label: "Delivered", icon: CheckCircle },
];

const AgentOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(*),
          delivery_addresses(address_line1, address_line2, city, state, landmark)
        `)
        .eq("id", id)
        .eq("agent_id", user?.id)
        .single();

      if (error) throw error;
      setOrder(data as OrderDetail);
      
      // Fetch customer profile separately
      if (data?.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", data.user_id)
          .single();
        
        if (profileData) {
          setCustomerProfile(profileData);
        }
      }
      
      // Initialize item prices
      const prices: Record<string, string> = {};
      (data as OrderDetail).order_items.forEach((item) => {
        prices[item.id] = item.actual_price?.toString() || "";
      });
      setItemPrices(prices);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", id)
        .eq("agent_id", user?.id);

      if (error) throw error;

      setOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus.replace("_", " ")}`,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateItemPrice = async (itemId: string, actualPrice: number) => {
    try {
      const { error } = await supabase
        .from("order_items")
        .update({ actual_price: actualPrice, status: "found" })
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Price Updated",
        description: "Item price has been updated",
      });
      fetchOrder();
    } catch (error) {
      console.error("Error updating item price:", error);
      toast({
        title: "Error",
        description: "Failed to update item price",
        variant: "destructive",
      });
    }
  };

  const confirmAllItems = async () => {
    setUpdating(true);
    try {
      // Update all items with prices
      for (const [itemId, price] of Object.entries(itemPrices)) {
        if (price) {
          await supabase
            .from("order_items")
            .update({ actual_price: parseFloat(price), status: "found" })
            .eq("id", itemId);
        }
      }

      // Calculate totals and update order
      const totalItems = Object.values(itemPrices).reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
      const serviceFee = totalItems * 0.1; // 10% service fee
      const deliveryFee = 1500; // Fixed delivery fee
      const finalTotal = totalItems + serviceFee + deliveryFee;

      await supabase
        .from("orders")
        .update({
          status: "items_confirmed",
          service_fee: serviceFee,
          delivery_fee: deliveryFee,
          final_total: finalTotal,
        })
        .eq("id", id);

      toast({
        title: "Items Confirmed",
        description: "All items have been confirmed with their prices",
      });
      fetchOrder();
    } catch (error) {
      console.error("Error confirming items:", error);
      toast({
        title: "Error",
        description: "Failed to confirm items",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const getCurrentStatusIndex = () => {
    return statusSteps.findIndex((s) => s.status === order?.status);
  };

  const getNextStatus = (): OrderStatus | null => {
    const currentIndex = getCurrentStatusIndex();
    if (currentIndex === -1 || currentIndex >= statusSteps.length - 1) return null;
    
    // Skip payment_pending - that's updated by the buyer
    if (statusSteps[currentIndex + 1].status === "payment_pending") {
      return null; // Wait for buyer to pay
    }
    if (order?.status === "paid") {
      return "in_transit";
    }
    if (order?.status === "in_transit") {
      return "delivered";
    }
    if (order?.status === "accepted") {
      return "shopping";
    }
    return null;
  };

  if (loading) {
    return (
      <AgentDashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </AgentDashboardLayout>
    );
  }

  if (!order) {
    return (
      <AgentDashboardLayout>
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This order doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/agent/my-orders")}>
            Back to My Orders
          </Button>
        </div>
      </AgentDashboardLayout>
    );
  }

  return (
    <AgentDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-foreground">
              {order.location_name}
            </h1>
            <p className="text-muted-foreground">
              Order #{order.id.slice(0, 8)} • {order.location_type}
            </p>
          </div>
          <Badge className="text-sm capitalize">
            {order.status.replace("_", " ")}
          </Badge>
        </div>

        {/* Status Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {statusSteps.map((step, index) => {
                const currentIndex = getCurrentStatusIndex();
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const Icon = step.icon;

                return (
                  <div key={step.status} className="flex flex-col items-center min-w-[80px]">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs mt-2 text-center ${isCurrent ? "font-semibold" : ""}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6">
              {order.status === "accepted" && (
                <Button onClick={() => updateOrderStatus("shopping")} disabled={updating}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Start Shopping
                </Button>
              )}
              {order.status === "shopping" && (
                <Button onClick={confirmAllItems} disabled={updating}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm All Items
                </Button>
              )}
              {order.status === "paid" && (
                <Button onClick={() => updateOrderStatus("in_transit")} disabled={updating}>
                  <Truck className="w-4 h-4 mr-2" />
                  Start Delivery
                </Button>
              )}
              {order.status === "in_transit" && (
                <Button onClick={() => updateOrderStatus("delivered")} disabled={updating}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Delivered
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customerProfile?.full_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{customerProfile.full_name}</span>
              </div>
            )}
            {customerProfile?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${customerProfile.phone}`} className="text-primary hover:underline">
                  {customerProfile.phone}
                </a>
              </div>
            )}
            {order.delivery_addresses && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p>{order.delivery_addresses.address_line1}</p>
                  {order.delivery_addresses.address_line2 && (
                    <p>{order.delivery_addresses.address_line2}</p>
                  )}
                  <p>{order.delivery_addresses.city}, {order.delivery_addresses.state}</p>
                  {order.delivery_addresses.landmark && (
                    <p className="text-sm text-muted-foreground">
                      Landmark: {order.delivery_addresses.landmark}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shopping List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shopping List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge variant="outline">x{item.quantity}</Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                    {item.estimated_price && (
                      <p className="text-sm text-muted-foreground">
                        Est: {formatCurrency(item.estimated_price)}
                      </p>
                    )}
                  </div>
                  
                  {order.status === "shopping" && (
                    <div className="flex items-center gap-2">
                      <div className="w-32">
                        <Label className="text-xs">Actual Price</Label>
                        <Input
                          type="number"
                          placeholder="₦0.00"
                          value={itemPrices[item.id] || ""}
                          onChange={(e) =>
                            setItemPrices({ ...itemPrices, [item.id]: e.target.value })
                          }
                          className="h-8"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemPrice(item.id, parseFloat(itemPrices[item.id]))}
                        disabled={!itemPrices[item.id]}
                      >
                        Save
                      </Button>
                    </div>
                  )}

                  {order.status !== "shopping" && item.actual_price && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Actual</p>
                      <p className="font-semibold">{formatCurrency(item.actual_price)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        {order.final_total && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items Total</span>
                  <span>
                    {formatCurrency(
                      order.order_items.reduce((sum, item) => sum + (item.actual_price || 0), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span>{formatCurrency(order.service_fee || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{formatCurrency(order.delivery_fee || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(order.final_total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{order.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AgentDashboardLayout>
  );
};

export default AgentOrderDetail;
