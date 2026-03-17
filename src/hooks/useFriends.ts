import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FriendProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  last_seen: string | null;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  friend: FriendProfile | null;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([]);
  const [pendingSent, setPendingSent] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`) as any;

    if (!data) {
      setLoading(false);
      return;
    }

    // Get all friend user IDs
    const friendUserIds = (data as any[]).map((f: any) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    // Fetch profiles
    let profiles: FriendProfile[] = [];
    if (friendUserIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, avatar_url, level, last_seen")
        .in("user_id", friendUserIds);
      profiles = (profileData as any[]) || [];
    }

    const enriched = (data as any[]).map((f: any) => {
      const friendUserId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const profile = profiles.find((p) => p.user_id === friendUserId) || null;
      return { ...f, friend: profile } as Friendship;
    });

    setFriends(enriched.filter((f) => f.status === "accepted"));
    setPendingReceived(enriched.filter((f) => f.status === "pending" && f.addressee_id === user.id));
    setPendingSent(enriched.filter((f) => f.status === "pending" && f.requester_id === user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFriendships();
  }, [fetchFriendships]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("friendships-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => {
          fetchFriendships();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchFriendships]);

  const sendRequest = async (addresseeUsername: string) => {
    if (!user) return { error: "Not logged in" };

    // Find user by username or display_name
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .or(`username.ilike.${addresseeUsername},display_name.ilike.${addresseeUsername}`)
      .limit(1);

    if (!profiles || profiles.length === 0) return { error: "User not found" };
    const target = profiles[0];
    if (target.user_id === user.id) return { error: "Cannot add yourself" };

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${target.user_id}),and(requester_id.eq.${target.user_id},addressee_id.eq.${user.id})`
      ) as any;

    if (existing && existing.length > 0) {
      return { error: "Request already exists" };
    }

    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: target.user_id,
    } as any);

    if (error) return { error: error.message };

    // Send notification to target user
    try {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      
      await supabase.functions.invoke("send-notification", {
        body: {
          target_user_id: target.user_id,
          type: "friend_request",
          title: `👋 ${myProfile?.display_name || "Someone"} sent you a friend request!`,
          body: null,
          data: { sender_id: user.id },
        },
      });
    } catch {}

    await fetchFriendships();
    return { error: null };
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase
      .from("friendships")
      .update({ status: "accepted" } as any)
      .eq("id", friendshipId);
    await fetchFriendships();
  };

  const rejectRequest = async (friendshipId: string) => {
    await supabase
      .from("friendships")
      .update({ status: "rejected" } as any)
      .eq("id", friendshipId);
    await fetchFriendships();
  };

  const removeFriend = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    await fetchFriendships();
  };

  // Update last_seen periodically
  useEffect(() => {
    if (!user) return;
    const update = () => {
      supabase.from("profiles").update({ last_seen: new Date().toISOString() } as any).eq("user_id", user.id).then(() => {});
    };
    update();
    const interval = setInterval(update, 60000); // every minute
    return () => clearInterval(interval);
  }, [user]);

  return {
    friends,
    pendingReceived,
    pendingSent,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    refresh: fetchFriendships,
  };
}

export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 3 * 60 * 1000; // 3 minutes
}
