import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AgentStats {
  completedOrders: number;
  averageRating: number;
  reviewCount: number;
  loading: boolean;
}

export const useAgentStats = (agentId: string | null): AgentStats => {
  const [stats, setStats] = useState<AgentStats>({
    completedOrders: 0,
    averageRating: 0,
    reviewCount: 0,
    loading: true,
  });

  useEffect(() => {
    if (!agentId) {
      setStats((prev) => ({ ...prev, loading: false }));
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch completed orders count
        const { count: ordersCount, error: ordersError } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agentId)
          .eq("status", "delivered");

        if (ordersError) throw ordersError;

        // Fetch reviews and calculate average rating
        const { data: reviews, error: reviewsError } = await supabase
          .from("agent_reviews")
          .select("rating")
          .eq("agent_id", agentId);

        if (reviewsError) throw reviewsError;

        const reviewCount = reviews?.length || 0;
        const averageRating =
          reviewCount > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
            : 0;

        setStats({
          completedOrders: ordersCount || 0,
          averageRating,
          reviewCount,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching agent stats:", error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, [agentId]);

  return stats;
};
