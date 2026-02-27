import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order, OrderStatus } from "@shared/types";

interface UseOrdersOptions {
  client: SupabaseClient;
  userId: string | undefined;
  /** "buyer" fetches user's orders, "agent" fetches assigned + pending */
  role?: "buyer" | "agent";
  /** Subscribe to realtime order status changes */
  realtime?: boolean;
}

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useOrders = ({
  client,
  userId,
  role = "buyer",
  realtime = true,
}: UseOrdersOptions): UseOrdersReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = client
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (role === "buyer") {
        query = query.eq("user_id", userId);
      } else if (role === "agent") {
        query = query.or(`agent_id.eq.${userId},and(status.eq.pending,agent_id.is.null)`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setOrders((data as Order[]) || []);
    } catch (err: any) {
      console.error("useOrders: fetch error", err);
      setError(err.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [client, userId, role]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscription for order status updates
  useEffect(() => {
    if (!userId || !realtime) return;

    const filter =
      role === "buyer" ? `user_id=eq.${userId}` : `agent_id=eq.${userId}`;

    const channel = client
      .channel(`orders-${role}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new as Order, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === (payload.new as Order).id ? (payload.new as Order) : o
              )
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) =>
              prev.filter((o) => o.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client, userId, role, realtime]);

  return { orders, loading, error, refetch: fetchOrders };
};
