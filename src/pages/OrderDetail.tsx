import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  XCircle,
  Truck,
  ShoppingCart,
  MessageSquare,
  Receipt,
} from "lucide-react";
import { OrderChat } from "@/components/chat/OrderChat";
import { useInvoice } from "@/hooks/useInvoice";
import { InvoiceView } from "@/components/invoice/InvoiceView";
import { usePayment } from "@/hooks/usePayment";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import AgentProfileCard from "@/components/order/AgentProfileCard";
import AgentReviewForm from "@/components/order/AgentReviewForm";
import DeliveryTimeEstimate from "@/components/order/DeliveryTimeEstimate";
import LiveTrackingCard from "@/components/order/LiveTrackingCard";
import OrderCountdownTimer from "@/components/order/OrderCountdownTimer";
import { getAreaCoordinates } from "@/lib/lagos-locations";

interface Order {
  id: string;
  location_name: string;
  location_type: string;
  status: string;
  notes: string | null;
  estimated_total: number | null;
  final_total: number | null;
  service_fee: number | null;
  delivery_fee: number | null;
  created_at: string;
  updated_at: string;
  agent_id: string | null;
  delivery_address_id: string | null;
}

interface DeliveryAddress {
  city: string;
  state: string;
}

interface OrderItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  estimated_price: number | null;
  actual_price: number | null;
  photo_url: string | null;
  status: string;
}

interface AgentInfo {
  full_name: string | null;
  photo_url: string | null;
  market_knowledge: string[] | null;
  experience_description: string | null;
}

const statusSteps = [
  { key: "pending", label: "Order Placed", icon: ShoppingCart },
  { key: "accepted", label: "Agent Assigned", icon: CheckCircle },
  { key: "shopping", label: "Shopping", icon: Package },
  { key: "items_confirmed", label: "Items Confirmed", icon: CheckCircle },
  { key: "payment_pending", label: "Payment Pending", icon: Clock },
  { key: "paid", label: "Paid", icon: CheckCircle },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { verifyPayment } = usePayment();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "chat");
  const [hasReviewed, setHasReviewed] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);
  const { invoice } = useInvoice({ orderId: id || "" });

  // Handle payment callback
  useEffect(() => {
    const reference = searchParams.get("reference");
    if (reference) {
      verifyPayment(reference).then((result) => {
        if (result.success && result.status === "success") {
          toast({
            title: "Payment Successful",
            description: "Your order has been paid. The agent will proceed with shopping.",
          });
          fetchOrderDetails();
        }
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && id) {
      fetchOrderDetails();
      fetchUserEmail();
      checkExistingReview();
    }
  }, [user, id]);

  const checkExistingReview = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("agent_reviews")
      .select("id")
      .eq("order_id", id)
      .eq("buyer_id", user.id)
      .single();
    setHasReviewed(!!data);
  };

  const fetchUserEmail = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", user.id)
      .single();
    if (data) setUserEmail(data.email);
  };

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch agent info if order has an agent
      if (orderData.agent_id) {
        fetchAgentInfo(orderData.agent_id);
      }

      // Fetch delivery address if exists
      if (orderData.delivery_address_id) {
        const { data: addressData } = await supabase
          .from("delivery_addresses")
          .select("city, state")
          .eq("id", orderData.delivery_address_id)
          .single();
        if (addressData) {
          setDeliveryAddress(addressData);
        }
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentInfo = async (agentId: string) => {
    setAgentLoading(true);
    try {
      const { data, error } = await supabase
        .from("agent_applications")
        .select("full_name, photo_url, market_knowledge, experience_description")
        .eq("user_id", agentId)
        .eq("status", "approved")
        .single();

      if (error) throw error;
      setAgentInfo(data);
    } catch (error) {
      console.error("Error fetching agent info:", error);
    } finally {
      setAgentLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex((step) => step.key === status);
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case "purchased":
      case "approved":
        return "bg-primary/10 text-primary";
      case "found":
        return "bg-secondary/10 text-secondary-foreground";
      case "not_found":
      case "rejected":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">
            Order Not Found
          </h2>
          <p className="text-muted-foreground mb-4">
            This order doesn't exist or you don't have access to it.
          </p>
          <Button asChild>
            <Link to="/dashboard/orders">Back to Orders</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard/orders">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-foreground">
              {order.location_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Order #{order.id.slice(0, 8)} • {order.location_type}
            </p>
          </div>
          <Badge className="capitalize">
            {order.status.replace("_", " ")}
          </Badge>
          {(order as any).timer_started_at && order.status !== "delivered" && order.status !== "cancelled" && (
            <OrderCountdownTimer
              timerStartedAt={(order as any).timer_started_at}
              estimatedMinutes={(order as any).estimated_minutes}
              orderStatus={order.status}
              compact
            />
          )}
        </div>

        {/* Tabs for Details and Chat */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${invoice ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="details">
              <Package className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat with Agent
            </TabsTrigger>
            {invoice && (
              <TabsTrigger value="invoice">
                <Receipt className="w-4 h-4 mr-2" />
                Invoice
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <Card className="h-[500px]">
              <OrderChat
                orderId={order.id}
                orderTotal={order.final_total || undefined}
                userEmail={userEmail}
                className="h-full"
              />
            </Card>
          </TabsContent>

          {/* Final Invoice Tab */}
          {invoice && (
            <TabsContent value="invoice" className="mt-4">
              <InvoiceView
                invoice={invoice}
                customerName={undefined}
                locationName={order.location_name}
              />
            </TabsContent>
          )}

          <TabsContent value="details" className="mt-4 space-y-6">

        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isCancelled ? (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
                <XCircle className="w-6 h-6 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Order Cancelled</p>
                  <p className="text-sm text-muted-foreground">
                    This order has been cancelled
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex overflow-x-auto pb-4">
                {statusSteps.map((step, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.key} className="flex items-center">
                      <div className="flex flex-col items-center min-w-[100px]">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isCompleted
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        >
                          <StepIcon className="w-5 h-5" />
                        </div>
                        <p
                          className={`text-xs mt-2 text-center ${
                            isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div
                          className={`h-0.5 w-8 flex-shrink-0 ${
                            index < currentStatusIndex ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Countdown Timer */}
        {order.status !== "pending" && order.status !== "cancelled" && (
          <OrderCountdownTimer
            timerStartedAt={(order as any).timer_started_at}
            estimatedMinutes={(order as any).estimated_minutes}
            orderStatus={order.status}
            itemCount={items.length}
          />
        )}

        {/* Agent Profile Card */}
        {(order.agent_id || order.status !== "pending") && (
          <AgentProfileCard agentInfo={agentInfo} agentId={order.agent_id} loading={agentLoading} />
        )}

        {/* Delivery Time Estimate - show before delivery */}
        {!isCancelled && order.status !== "delivered" && items.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <DeliveryTimeEstimate
                locationType={order.location_type}
                itemCount={items.length}
              />
            </CardContent>
          </Card>
        )}

        {/* Review Form - show after delivery */}
        {order.status === "delivered" && order.agent_id && !hasReviewed && (
          <AgentReviewForm
            orderId={order.id}
            agentId={order.agent_id}
            buyerId={user?.id || ""}
            onReviewSubmitted={() => setHasReviewed(true)}
          />
        )}

        {/* Review Submitted Confirmation */}
        {order.status === "delivered" && hasReviewed && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Review Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    Thank you for rating your shopping experience!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Tracking */}
        {order.agent_id && (
          <LiveTrackingCard
            orderId={order.id}
            orderStatus={order.status}
            agentName={agentInfo?.full_name || undefined}
            deliveryLocation={
              deliveryAddress
                ? getAreaCoordinates(deliveryAddress.city)
                : undefined
            }
          />
        )}

        {/* Order Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{order.location_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {order.location_type}
                  </p>
                </div>
              </div>
              {order.notes && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Notes:</span> {order.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Date</span>
                <span className="text-foreground">
                  {new Date(order.created_at).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              {order.estimated_total && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Total</span>
                  <span className="text-foreground">
                    {formatCurrency(order.estimated_total)}
                  </span>
                </div>
              )}
              {order.service_fee && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span className="text-foreground">
                    {formatCurrency(order.service_fee)}
                  </span>
                </div>
              )}
              {order.delivery_fee && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="text-foreground">
                    {formatCurrency(order.delivery_fee)}
                  </span>
                </div>
              )}
              {order.final_total && (
                <>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Final Total</span>
                    <span className="text-primary">
                      {formatCurrency(order.final_total)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">
              Items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <Badge className={getItemStatusColor(item.status)}>
                        {item.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    {item.actual_price ? (
                      <p className="font-medium text-foreground">
                        {formatCurrency(item.actual_price * item.quantity)}
                      </p>
                    ) : item.estimated_price ? (
                      <p className="text-muted-foreground">
                        Est. {formatCurrency(item.estimated_price * item.quantity)}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Price TBD</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default OrderDetailPage;
