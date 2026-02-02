import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, email, phone, avatar_url")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Extract surname (last word of full name)
  const getSurname = (): string => {
    if (!profile?.full_name) {
      return user?.email?.split("@")[0] || "User";
    }
    const nameParts = profile.full_name.trim().split(" ");
    return nameParts[nameParts.length - 1];
  };

  // Get initials from full name or email
  const getInitials = (): string => {
    if (profile?.full_name) {
      const nameParts = profile.full_name.trim().split(" ");
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      }
      return profile.full_name.slice(0, 2).toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() || "U";
  };

  return { profile, loading, getSurname, getInitials };
};
