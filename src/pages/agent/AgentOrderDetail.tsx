import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentDashboardLayout from "@/components/dashboard/AgentDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  MapPin,
  Phone,
  User,
  ArrowLeft,
  CheckCircle,
  ShoppingCart,
  Truck,
  AlertCircle,
  MessageSquare,
  Receipt,
  Bell,
  PackageCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/hooks/useChat";
import { useInvoice } from "@/hooks/useInvoice";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { OrderChat } from "@/components/chat/OrderChat";
import { AgentInvoiceForm } from "@/components/chat/AgentInvoiceForm";
import { PostDeliveryInvoiceForm } from "@/components/invoice/PostDeliveryInvoiceForm";
import { InvoiceView } from "@/components/invoice/InvoiceView";
import LocationSharingToggle from "@/components/agent/LocationSharingToggle";
import DeliveryStatusUpdater from "@/components/agent/DeliveryStatusUpdater";
import OrderCountdownTimer, { calculateEstimatedMinutes } from "@/components/order/OrderCountdownTimer";
import type { Database } from "@/integrations/supabase/types";
import type { ShoppingListItem, ShoppingListMetadata, InvoiceMetadata } from "@/types/chat";

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
  const [activeTab, setActiveTab] = useState("details");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [riderAlertSent, setRiderAlertSent] = useState(false);
  const [riderAlertPacked, setRiderAlertPacked] = useState(false);
  
  const { messages, sendMessage, uploadPhoto } = useChat({ orderId: id });
  const { invoice, loading: invoiceLoading, creating: invoiceCreating, createInvoice } = useInvoice({ orderId: id || "" });
  const { fees: platformFees } = usePlatformSettings();

  useEffect(() => {
    if (id) {
      fetchOrder();
      checkRiderAlert();
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

  const checkRiderAlert = async () => {
    const { data } = await supabase
      .from("rider_alerts")
      .select("id, order_packed")
      .eq("order_id", id)
      .eq("agent_id", user?.id)
      .maybeSingle();
    
    if (data) {
      setRiderAlertSent(true);
      setRiderAlertPacked(data.order_packed || false);
    }
  };

  const notifyRider = async () => {
    if (!order || !user) return;
    try {
      const { error } = await supabase.from("rider_alerts").insert({
        order_id: order.id,
        agent_id: user.id,
        store_location_name: order.location_name,
        status: "pending",
      });
      if (error) throw error;
      setRiderAlertSent(true);
      toast({ title: "Rider Notified!", description: "Nearby riders have been alerted about this pickup." });
    } catch (error) {
      console.error("Error notifying rider:", error);
      toast({ title: "Error", description: "Failed to notify rider", variant: "destructive" });
    }
  };

  const markOrderPacked = async () => {
    if (!order || !user) return;
    try {
      const { error } = await supabase
        .from("rider_alerts")
        .update({ order_packed: true })
        .eq("order_id", order.id)
        .eq("agent_id", user.id);
      if (error) throw error;
      setRiderAlertPacked(true);
      toast({ title: "Order Packed!", description: "The rider has been notified that the order is ready for pickup." });
    } catch (error) {
      console.error("Error marking packed:", error);
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  // Get shopping list from chat messages or order items
  const getShoppingListFromOrder = (): ShoppingListItem[] => {
    // First check if there's a shopping list message
    const shoppingListMsg = messages.find(m => m.message_type === "shopping_list");
    if (shoppingListMsg?.metadata) {
      return (shoppingListMsg.metadata as ShoppingListMetadata).items;
    }
    // Fall back to order items
    return order?.order_items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      estimatedPrice: item.estimated_price || undefined,
      description: item.description || undefined,
    })) || [];
  };

  const handleSendInvoice = async (invoice: InvoiceMetadata) => {
    await sendMessage(
      `Invoice for ${order?.location_name}`,
      "invoice",
      invoice
    );
    
    // Update order items with actual prices
    for (const item of invoice.items) {
      await supabase
        .from("order_items")
        .update({ 
          actual_price: item.actualPrice, 
          status: item.status,
          photo_url: item.photoUrl || null
        })
        .eq("id", item.id);
    }
    
    // Update order totals
    await supabase
      .from("orders")
      .update({
        status: "items_confirmed",
        service_fee: invoice.serviceFee,
        delivery_fee: invoice.deliveryFee,
        final_total: invoice.finalTotal,
      })
      .eq("id", id);
    
    setShowInvoiceForm(false);
    toast({
      title: "Invoice Sent",
      description: "The customer will review and approve the invoice",
    });
    fetchOrder();
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };

      // Start timer when agent begins shopping
      if (newStatus === "shopping" && order) {
        const itemCount = order.order_items?.length || 0;
        const estimatedMinutes = calculateEstimatedMinutes(itemCount);
        updateData.timer_started_at = new Date().toISOString();
        updateData.estimated_minutes = estimatedMinutes;
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", id)
        .eq("agent_id", user?.id);

      if (error) throw error;

      setOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus.replace("_", " ")}`,
      });

      // Send delivery notification email to buyer
      if (newStatus === "delivered" && order) {
        supabase.functions
          .invoke("send-notification-email", {
            body: {
              type: "order_delivered",
              data: {
                email: "", // resolved server-side via buyer profile
                orderId: id,
                locationName: order.location_name,
              },
            },
          })
          .catch((err) => console.error("Delivery email failed:", err));
      }
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
          {(order as any).timer_started_at && order.status !== "delivered" && order.status !== "cancelled" && (
            <OrderCountdownTimer
              timerStartedAt={(order as any).timer_started_at}
              estimatedMinutes={(order as any).estimated_minutes}
              orderStatus={order.status}
              compact
            />
          )}
        </div>

        {/* Tabs for Details, Chat, Invoice */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">
              <Package className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="invoice" disabled={order.status === "pending" || order.status === "accepted"}>
              <Receipt className="w-4 h-4 mr-2" />
              Invoice
            </TabsTrigger>
            <TabsTrigger value="final-invoice" disabled={order.status !== "delivered"}>
              <Receipt className="w-4 h-4 mr-2" />
              Final Invoice
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-4">
            <Card className="h-[500px]">
              <OrderChat orderId={order.id} className="h-full" />
            </Card>
          </TabsContent>

          {/* Invoice Tab */}
          <TabsContent value="invoice" className="mt-4">
            {showInvoiceForm ? (
              <AgentInvoiceForm
                shoppingList={getShoppingListFromOrder()}
                onSubmit={handleSendInvoice}
                onUploadPhoto={uploadPhoto}
                disabled={updating}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  {order.status === "shopping" ? (
                    <>
                      <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Create Invoice</h3>
                      <p className="text-muted-foreground mb-4">
                        Enter actual prices for items and send invoice to customer
                      </p>
                      <Button onClick={() => setShowInvoiceForm(true)}>
                        <Receipt className="w-4 h-4 mr-2" />
                        Create Invoice
                      </Button>
                    </>
                  ) : order.final_total ? (
                    <div className="space-y-4">
                      <CheckCircle className="w-12 h-12 text-primary mx-auto" />
                      <h3 className="text-lg font-medium">Invoice Sent</h3>
                      <div className="max-w-sm mx-auto space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Items Total</span>
                          <span>{formatCurrency(order.order_items.reduce((sum, item) => sum + (item.actual_price || 0) * item.quantity, 0))}</span>
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
                    </div>
                  ) : (
                    <>
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Start shopping first to create an invoice
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Final Invoice Tab - Post Delivery */}
          <TabsContent value="final-invoice" className="mt-4">
            {invoice ? (
              <InvoiceView
                invoice={invoice}
                customerName={customerProfile?.full_name || undefined}
                locationName={order.location_name}
              />
            ) : (
              <PostDeliveryInvoiceForm
                orderItems={order.order_items.map(item => ({
                  id: item.id,
                  name: item.name,
                  quantity: item.quantity,
                  actual_price: item.actual_price,
                  estimated_price: item.estimated_price,
                }))}
                serviceFee={order.service_fee || platformFees.defaultServiceFee}
                deliveryFee={order.delivery_fee || platformFees.defaultDeliveryFee}
                onSubmit={async (data) => {
                  const newInvoice = await createInvoice({
                    buyerId: order.user_id,
                    ...data,
                  });
                  if (newInvoice) {
                    await sendMessage(
                      `Final Invoice ${newInvoice.invoice_number} for ${order.location_name} — Total: ₦${newInvoice.total.toLocaleString()}`,
                      "invoice",
                      {
                        items: newInvoice.items.map((item: any) => ({
                          id: item.name,
                          name: item.name,
                          quantity: item.quantity,
                          actualPrice: item.unit_price,
                          status: "found" as const,
                        })),
                        itemsTotal: newInvoice.subtotal,
                        serviceFee: newInvoice.service_fee,
                        deliveryFee: newInvoice.delivery_fee,
                        finalTotal: newInvoice.total,
                        notes: newInvoice.notes || undefined,
                      }
                    );
                  }
                }}
                disabled={invoiceCreating}
              />
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-4 space-y-6">
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

            {/* Countdown Timer */}
                {order.status !== "pending" && order.status !== "cancelled" && (
                  <OrderCountdownTimer
                    timerStartedAt={(order as any).timer_started_at}
                    estimatedMinutes={(order as any).estimated_minutes}
                    orderStatus={order.status}
                    itemCount={order.order_items?.length || 0}
                    className="mt-4"
                  />
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-6">
                  {order.status === "accepted" && (
                    <Button onClick={() => updateOrderStatus("shopping")} disabled={updating}>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Start Shopping
                    </Button>
                  )}
                  {order.status === "shopping" && (
                    <>
                      <Button onClick={() => setActiveTab("invoice")} disabled={updating}>
                        <Receipt className="w-4 h-4 mr-2" />
                        Create Invoice
                      </Button>
                      {!riderAlertSent ? (
                        <Button variant="outline" onClick={notifyRider}>
                          <Bell className="w-4 h-4 mr-2" />
                          Notify Rider
                        </Button>
                      ) : !riderAlertPacked ? (
                        <Button variant="outline" onClick={markOrderPacked} className="border-green-500 text-green-700 hover:bg-green-50">
                          <PackageCheck className="w-4 h-4 mr-2" />
                          Order Packed & Ready
                        </Button>
                      ) : (
                        <Badge variant="outline" className="h-10 px-4 flex items-center gap-2 bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-4 h-4" />
                          Rider Notified & Packed
                        </Badge>
                      )}
                    </>
                  )}
                  {/* Also show notify/packed for items_confirmed and payment_pending statuses */}
                  {(order.status === "items_confirmed" || order.status === "payment_pending" || order.status === "paid") && (
                    <>
                      {!riderAlertSent ? (
                        <Button variant="outline" onClick={notifyRider}>
                          <Bell className="w-4 h-4 mr-2" />
                          Notify Rider
                        </Button>
                      ) : !riderAlertPacked ? (
                        <Button variant="outline" onClick={markOrderPacked} className="border-green-500 text-green-700 hover:bg-green-50">
                          <PackageCheck className="w-4 h-4 mr-2" />
                          Order Packed & Ready
                        </Button>
                      ) : (
                        <Badge variant="outline" className="h-10 px-4 flex items-center gap-2 bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-4 h-4" />
                          Rider Notified & Packed
                        </Badge>
                      )}
                    </>
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

            {/* Location Sharing Toggle */}
            {user && (
              <LocationSharingToggle
                orderId={order.id}
                agentId={user.id}
                orderStatus={order.status}
              />
            )}

            {/* Delivery Status Updater - for in_transit orders */}
            {user && (
              <DeliveryStatusUpdater
                orderId={order.id}
                agentId={user.id}
                orderStatus={order.status}
              />
            )}

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
                      {item.actual_price && (
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
          </TabsContent>
        </Tabs>
      </div>
    </AgentDashboardLayout>
  );
};

export default AgentOrderDetail;
