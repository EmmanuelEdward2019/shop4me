import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@shared/hooks";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OrderWithMessages {
  id: string;
  location_name: string;
  status: string;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

const MessagesPage = () => {
  const { user } = useAuth();
  const { orders: rawOrders } = useOrders({
    client: supabase,
    userId: user?.id,
    role: "buyer",
  });
  const [orders, setOrders] = useState<OrderWithMessages[]>([]);
  const [loading, setLoading] = useState(true);

  // Enrich orders with last message and unread count
  const enrichOrders = useCallback(async () => {
    if (!user || rawOrders.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const ordersWithMessages = await Promise.all(
        rawOrders.map(async (order) => {
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

          const lastMessage = messages?.[0];

          return {
            id: order.id,
            location_name: order.location_name,
            status: order.status,
            created_at: order.created_at,
            last_message: lastMessage?.content || null,
            last_message_at: lastMessage?.created_at || null,
            unread_count: unreadCount || 0,
          };
        })
      );

      setOrders(ordersWithMessages.filter((o) => o.last_message !== null));
    } catch (error) {
      console.error("Error enriching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user, rawOrders]);

  useEffect(() => {
    enrichOrders();
  }, [enrichOrders]);

  // Realtime for new messages to refresh list
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-list-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => enrichOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enrichOrders]);

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
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Messages
          </h1>
          <p className="text-muted-foreground">
            Chat with your shopping agents
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
                Create an order to start chatting with an agent
              </p>
              <Link
                to="/dashboard/new-order"
                className="text-primary hover:underline"
              >
                Create your first order →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order.id} to={`/dashboard/orders/${order.id}?tab=chat`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">
                            {order.location_name}
                          </h3>
                          {order.unread_count > 0 && (
                            <Badge variant="default" className="text-xs">
                              {order.unread_count} new
                            </Badge>
                          )}
                        </div>
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
    </DashboardLayout>
  );
};

export default MessagesPage;
