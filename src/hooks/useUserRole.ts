import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    } else {
      setRole(null);
      setLoading(false);
    }
  }, [user]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id);

      if (error) {
        console.error("Error fetching user role:", error);
        setRole("buyer");
        return;
      }

      if (!data || data.length === 0) {
        setRole("buyer");
        return;
      }

      // Multiple rows can exist (buyer + agent/rider); pick the most privileged
      const PRIORITY: Record<string, number> = { admin: 4, agent: 3, rider: 3, buyer: 1 };
      const topRole = [...data].sort(
        (a, b) => (PRIORITY[b.role] ?? 0) - (PRIORITY[a.role] ?? 0)
      )[0].role as AppRole;
      setRole(topRole);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole("buyer");
    } finally {
      setLoading(false);
    }
  };

  const isAgent = role === "agent" || role === "admin";
  const isAdmin = role === "admin";
  const isBuyer = role === "buyer";
  const isRider = role === "rider" || role === "admin";

  return { role, loading, isAgent, isAdmin, isBuyer, isRider };
};
