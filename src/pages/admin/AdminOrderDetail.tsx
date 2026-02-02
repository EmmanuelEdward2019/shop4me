import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package, MapPin, User, Calendar, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrderItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  estimated_price: number | null;
  actual_price: number | null;
  status: string;
}

interface Order {
  id: string;
  location_name: string;
  location_type: string;
  status: OrderStatus;
  estimated_total: number | null;
  final_total: number | null;
  service_fee: number | null;
  delivery_fee: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  agent_id: string | null;
  delivery_address_id: string | null;
}

const statusOptions: OrderStatus[] = [
  "pending",
  "accepted",
  "shopping",
  "items_confirmed",
  "payment_pending",
  "paid",
  "in_transit",
  "delivered",
  "cancelled",
];

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [buyer, setBuyer] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");

  useEffect(() => {
    if (id) fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);
      setNewStatus(orderData.status);

      // Fetch items, buyer, agent, address in parallel
      const [itemsResult, profilesResult, addressResult] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("profiles").select("*"),
        orderData.delivery_address_id
          ? supabase.from("delivery_addresses").select("*").eq("id", orderData.delivery_address_id).single()
          : Promise.resolve({ data: null }),
      ]);

      setItems(itemsResult.data || []);
      
      const profiles = profilesResult.data || [];
      setBuyer(profiles.find((p) => p.user_id === orderData.user_id));
      if (orderData.agent_id) {
        setAgent(profiles.find((p) => p.user_id === orderData.agent_id));
      }
      
      setAddress(addressResult.data);
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

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === order?.status) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus.replace("_", " ")}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "paid": return "bg-emerald-100 text-emerald-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminDashboardLayout>
    );
  }

  if (!order) {
    return (
      <AdminDashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Order not found</p>
          <Button variant="outline" onClick={() => navigate("/admin/orders")} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orders")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Order Details</h1>
              <p className="text-muted-foreground font-mono text-sm">{order.id}</p>
            </div>
          </div>
          <Badge className={getStatusColor(order.status)}>
            {order.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{order.location_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{order.location_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estimated Total</p>
                    <p className="font-medium">{formatCurrency(order.estimated_total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Final Total</p>
                    <p className="font-medium">{formatCurrency(order.final_total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Service Fee</p>
                    <p className="font-medium">{formatCurrency(order.service_fee)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Delivery Fee</p>
                    <p className="font-medium">{formatCurrency(order.delivery_fee)}</p>
                  </div>
                </div>
                {order.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-muted-foreground text-sm">Notes</p>
                    <p className="text-sm">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No items</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Est. Price</TableHead>
                        <TableHead>Actual Price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.estimated_price)}</TableCell>
                          <TableCell>{formatCurrency(item.actual_price)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  onClick={handleStatusUpdate}
                  disabled={updating || newStatus === order.status}
                >
                  {updating ? "Updating..." : "Update Status"}
                </Button>
              </CardContent>
            </Card>

            {/* Buyer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Buyer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {buyer ? (
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {buyer.full_name || "N/A"}</p>
                    <p><strong>Email:</strong> {buyer.email}</p>
                    <p><strong>Phone:</strong> {buyer.phone || "N/A"}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Buyer info not available</p>
                )}
              </CardContent>
            </Card>

            {/* Agent Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agent ? (
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {agent.full_name || "N/A"}</p>
                    <p><strong>Email:</strong> {agent.email}</p>
                    <p><strong>Phone:</strong> {agent.phone || "N/A"}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No agent assigned</p>
                )}
              </CardContent>
            </Card>

            {/* Delivery Address */}
            {address && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{address.label}</p>
                    <p>{address.address_line1}</p>
                    {address.address_line2 && <p>{address.address_line2}</p>}
                    <p>{address.city}, {address.state}</p>
                    {address.landmark && <p className="text-muted-foreground">Landmark: {address.landmark}</p>}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminOrderDetail;
