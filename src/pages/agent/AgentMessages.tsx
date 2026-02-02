import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentDashboardLayout from "@/components/dashboard/AgentDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, MapPin, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OrderWithMessages {
  id: string;
  location_name: string;
  status: string;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  buyer_email?: string;
}

const AgentMessagesPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithMessages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrdersWithMessages();
    }
  }, [user]);

  const fetchOrdersWithMessages = async () => {
    if (!user) return;

    try {
      // Fetch orders assigned to this agent
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, location_name, status, created_at, user_id")
        .eq("agent_id", user.id)
        .order("updated_at", { ascending: false });

      if (ordersError) throw ordersError;

      // For each order, get the latest message, unread count, and buyer info
      const ordersWithMessages = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: messages } = await supabase
            .from("chat_messages")
            .select("content, created_at, is_read, sender_id")
            .eq("order_id", order.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const { count: unreadCount } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("order_id", order.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);

          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", order.user_id)
            .single();

          const lastMessage = messages?.[0];

          return {
            ...order,
            last_message: lastMessage?.content || null,
            last_message_at: lastMessage?.created_at || null,
            unread_count: unreadCount || 0,
            buyer_email: profile?.full_name || profile?.email || "Customer",
          };
        })
      );

      // Filter to only show orders with messages
      const ordersWithChats = ordersWithMessages.filter(
        (o) => o.last_message !== null
      );

      setOrders(ordersWithChats);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-600";
      case "accepted":
      case "shopping":
        return "bg-primary/10 text-primary";
      case "delivered":
        return "bg-emerald-500/10 text-emerald-600";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <AgentDashboardLayout>
        <div className="space-y-4">
          <h1 className="text-2xl font-display font-bold">Messages</h1>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </AgentDashboardLayout>
    );
  }

  return (
    <AgentDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Messages
          </h1>
          <p className="text-muted-foreground">
            Chat with your customers
          </p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No messages yet
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Accept an order to start chatting with customers
              </p>
              <Link
                to="/agent/available-orders"
                className="text-primary hover:underline"
              >
                View available orders →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order.id} to={`/agent/orders/${order.id}?tab=chat`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">
                            {order.buyer_email}
                          </h3>
                          {order.unread_count > 0 && (
                            <Badge variant="default" className="text-xs">
                              {order.unread_count} new
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {order.location_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {order.last_message || "No messages yet"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace("_", " ")}
                          </Badge>
                          {order.last_message_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(order.last_message_at), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AgentDashboardLayout>
  );
};

export default AgentMessagesPage;
