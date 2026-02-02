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
        .eq("user_id", user?.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole("buyer"); // Default to buyer
      } else {
        setRole(data?.role || "buyer");
      }
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

  return { role, loading, isAgent, isAdmin, isBuyer };
};
