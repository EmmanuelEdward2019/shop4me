import { useState, useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "@shared/types";

interface UseUserRoleOptions {
  client: SupabaseClient;
  userId: string | undefined;
}

interface UseUserRoleReturn {
  role: AppRole | null;
  loading: boolean;
  isAgent: boolean;
  isAdmin: boolean;
  isBuyer: boolean;
  isRider: boolean;
}

export const useUserRole = ({
  client,
  userId,
}: UseUserRoleOptions): UseUserRoleReturn => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await client
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("useUserRole: error", error);
          setRole("buyer");
        } else {
          setRole((data?.role as AppRole) || "buyer");
        }
      } catch (err) {
        console.error("useUserRole: error", err);
        setRole("buyer");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [client, userId]);

  return {
    role,
    loading,
    isAgent: role === "agent" || role === "admin",
    isAdmin: role === "admin",
    isBuyer: role === "buyer",
    isRider: role === "rider" || role === "admin",
  };
};
