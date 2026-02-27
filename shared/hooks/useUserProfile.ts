import { useState, useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@shared/types";

interface UseUserProfileOptions {
  client: SupabaseClient;
  userId: string | undefined;
}

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  getSurname: () => string;
  getInitials: () => string;
  updateProfile: (updates: Partial<Pick<UserProfile, "full_name" | "phone" | "avatar_url">>) => Promise<boolean>;
}

export const useUserProfile = ({
  client,
  userId,
}: UseUserProfileOptions): UseUserProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await client
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (fetchError) throw fetchError;
        setProfile(data as UserProfile);
      } catch (err: any) {
        console.error("useUserProfile: error", err);
        setError(err.message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [client, userId]);

  const getSurname = (): string => {
    if (!profile?.full_name) return "User";
    const parts = profile.full_name.trim().split(" ");
    return parts[parts.length - 1];
  };

  const getInitials = (): string => {
    if (profile?.full_name) {
      const parts = profile.full_name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return profile.full_name.slice(0, 2).toUpperCase();
    }
    return profile?.email?.slice(0, 2).toUpperCase() || "U";
  };

  const updateProfile = async (
    updates: Partial<Pick<UserProfile, "full_name" | "phone" | "avatar_url">>
  ): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { error: updateError } = await client
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);

      if (updateError) throw updateError;
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      return true;
    } catch (err: any) {
      console.error("useUserProfile: update error", err);
      setError(err.message);
      return false;
    }
  };

  return { profile, loading, error, getSurname, getInitials, updateProfile };
};
