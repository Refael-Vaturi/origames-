import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const typed = data as unknown as Notification[];
      setNotifications(typed);
      setUnreadCount(typed.filter((n) => !n.is_read).length);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as unknown as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);

          // Browser notification
          if ("Notification" in window && window.Notification.permission === "granted") {
            new window.Notification(newNotif.title, {
              body: newNotif.body || undefined,
              icon: "/favicon.ico",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase
        .from("notifications")
        .update({ is_read: true } as Record<string, unknown>)
        .eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [user]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true } as Record<string, unknown>)
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  const deleteNotification = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from("notifications").delete().eq("id", id);
      setNotifications((prev) => {
        const notif = prev.find((n) => n.id === id);
        const updated = prev.filter((n) => n.id !== id);
        if (notif && !notif.is_read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return updated;
      });
    },
    [user]
  );

  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
    setUnreadCount(0);
  }, [user]);

  const requestPushPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const result = await window.Notification.requestPermission();
    return result === "granted";
  }, []);

  // Get pending game invites (unread game_invite notifications)
  const pendingInvites = notifications.filter(
    (n) => n.type === "game_invite" && !n.is_read
  );

  return {
    notifications,
    unreadCount,
    pendingInvites,
    markAsRead,
    markAllRead,
    deleteNotification,
    clearAll,
    requestPushPermission,
    refetch: fetchNotifications,
  };
}
