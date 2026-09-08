import { useCallback, useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, ExternalLink, ChevronLeft, ChevronRight, UserCog } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const PAGE_SIZE = 25;

interface Order {
  id: string;
  location_name: string;
  location_type: string;
  status: string;
  estimated_total: number | null;
  final_total: number | null;
  created_at: string;
  user_id: string;
  agent_id: string | null;
  buyer_email?: string;
  buyer_name?: string;
  agent_email?: string;
  agent_name?: string;
  rider_email?: string;
  rider_name?: string;
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Debounce the search box, and jump back to the first page on a new query.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_orders", {
        p_search: debouncedSearch || null,
        p_status: statusFilter,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      const rows = (data ?? []) as unknown as (Order & { total_count: number })[];
      setOrders(rows.map(({ total_count, ...o }) => o));
      setTotal(rows.length > 0 ? Number(rows[0].total_count) : 0);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Re-assign an order to another agent ──────────────────────────────────
  // For when the store/zone agent never picks the order up. Status is left as
  // is: a pending order stays pending so the new agent still accepts it.
  const [agents, setAgents] = useState<
    { user_id: string; full_name: string | null; email: string | null }[]
  >([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<Order | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);

  const openReassign = async (order: Order) => {
    setReassignTarget(order);
    setSelectedAgentId("");
    if (agents.length > 0) return;
    setAgentsLoading(true);
    const { data, error } = await supabase.rpc("admin_list_agents" as any);
    setAgentsLoading(false);
    if (error) {
      toast.error("Could not load the agent list");
      return;
    }
    setAgents((data ?? []) as unknown as typeof agents);
  };

  const confirmReassign = async () => {
    if (!reassignTarget || !selectedAgentId) return;
    setReassigning(true);
    const { data, error } = await supabase.rpc("admin_reassign_order" as any, {
      p_order_id: reassignTarget.id,
      p_agent_id: selectedAgentId,
    });
    setReassigning(false);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || "Could not reassign this order");
      return;
    }
    toast.success("Order reassigned");
    setReassignTarget(null);
    fetchOrders();
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
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

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);
  const hasNext = (page + 1) * PAGE_SIZE < total;

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
              {total} order{total !== 1 ? "s" : ""} found
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
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(0);
                }}
              >
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
            ) : orders.length === 0 ? (
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
                      <TableHead>Rider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
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
                          {order.agent_name || order.agent_email ? (
                            <div>
                              <p className="text-sm">{order.agent_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{order.agent_email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.rider_name || order.rider_email ? (
                            <div>
                              <p className="text-sm">{order.rider_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{order.rider_email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No rider</span>
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
                          <div className="flex items-center justify-end gap-1">
                            {order.status !== "delivered" && order.status !== "cancelled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openReassign(order)}
                              >
                                <UserCog className="h-4 w-4 mr-1" />
                                Reassign
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/admin/orders/${order.id}`}>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {total > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {from}–{to} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0 || loading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNext || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!reassignTarget}
        onOpenChange={(open) => !open && setReassignTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign order</DialogTitle>
            <DialogDescription>
              {reassignTarget && (
                <>
                  Order {reassignTarget.id.slice(0, 8)} &middot;{" "}
                  {reassignTarget.location_name}
                  <br />
                  Currently:{" "}
                  {reassignTarget.agent_name ||
                    reassignTarget.agent_email ||
                    "Unassigned"}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={agentsLoading ? "Loading agents…" : "Choose an agent"}
                />
              </SelectTrigger>
              <SelectContent>
                {agents
                  .filter((a) => a.user_id !== reassignTarget?.agent_id)
                  .map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.full_name || a.email || a.user_id.slice(0, 8)}
                      {a.full_name && a.email ? ` — ${a.email}` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              A pending order stays pending, so the new agent still has to accept it.
              Any live auto-dispatch offer for this order is cancelled.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmReassign} disabled={!selectedAgentId || reassigning}>
              {reassigning ? "Reassigning…" : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
};

export default AdminOrders;
