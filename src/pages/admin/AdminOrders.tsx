import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  location_name: string;
  location_type: string;
  status: OrderStatus;
  estimated_total: number | null;
  final_total: number | null;
  created_at: string;
  user_id: string;
  agent_id: string | null;
  buyer_email?: string;
  buyer_name?: string;
  agent_email?: string;
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch all profiles to map user info
      const { data: profiles } = await supabase.from("profiles").select("*");

      const ordersWithUsers = (ordersData || []).map((order) => {
        const buyer = profiles?.find((p) => p.user_id === order.user_id);
        const agent = order.agent_id ? profiles?.find((p) => p.user_id === order.agent_id) : null;
        return {
          ...order,
          buyer_email: buyer?.email,
          buyer_name: buyer?.full_name,
          agent_email: agent?.email,
        };
      });

      setOrders(ordersWithUsers);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const getStatusBadgeColor = (status: OrderStatus) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "paid":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Order Management</h1>
          <p className="text-muted-foreground">View and manage all orders on the platform.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
            <CardDescription>
              {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by location, buyer, or order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Orders Table */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No orders found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.location_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {order.location_type}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{order.buyer_name || "No name"}</p>
                            <p className="text-xs text-muted-foreground">{order.buyer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.agent_email || (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeColor(
                              order.status
                            )}`}
                          >
                            {order.status.replace("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(order.final_total || order.estimated_total)}
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/admin/orders/${order.id}`}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminOrders;
