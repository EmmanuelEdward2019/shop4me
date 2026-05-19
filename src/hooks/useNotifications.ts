/* eslint-disable @typescript-eslint/no-explicit-any */
// The `notifications` table isn't part of the generated Supabase Database
// type yet — until that's regenerated we cast through `as any` at the
// supabase client boundary. Treat everything inside this file as the
// adapter layer for the new table.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 30;

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [listResult, countResult] = await Promise.all([
      supabase
        .from("notifications" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE),
      supabase
        .from("notifications" as any)
        .select("id", { count: "exact", head: true })
        .eq("is_read", false),
    ]);
    if (!listResult.error) {
      setNotifications((listResult.data as unknown as AppNotification[]) ?? []);
    } else {
      console.error("Failed to load notifications:", listResult.error);
    }
    if (typeof countResult.count === "number") {
      setUnreadCount(countResult.count);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime: append new notifications as they arrive.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const row = payload.new as AppNotification;
          setNotifications((prev) => [row, ...prev].slice(0, PAGE_SIZE));
          if (!row.is_read) setUnreadCount((c) => c + 1);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    const { error } = await supabase
      .from("notifications" as any)
      .update({ is_read: true, read_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) console.error("Failed to mark notification read:", error);
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    const { error } = await supabase.rpc("mark_all_notifications_read" as any);
    if (error) console.error("Failed to mark all notifications read:", error);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};
