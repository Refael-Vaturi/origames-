import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OnlineUser {
  user_id: string;
  username: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url?: string | null;
  country?: string | null;
  country_code?: string | null;
  current_level?: number | null;
  connected_at: string;
}

const CHANNEL = "online-players";

let cachedGeo: { country?: string; country_code?: string } | null = null;
async function getGeo() {
  if (cachedGeo) return cachedGeo;
  try {
    const r = await fetch("https://ipapi.co/json/");
    if (!r.ok) return (cachedGeo = {});
    const j = await r.json();
    cachedGeo = { country: j.country_name, country_code: j.country_code };
    return cachedGeo;
  } catch {
    return (cachedGeo = {});
  }
}

export function useOnlinePresence(opts: { track?: boolean; currentLevel?: number } = {}) {
  const { track = true, currentLevel } = opts;
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key: user?.id ?? `anon-${Math.random().toString(36).slice(2)}` } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<OnlineUser>();
      const all: OnlineUser[] = [];
      for (const k of Object.keys(state)) {
        for (const p of state[k]) all.push(p);
      }
      setOnlineUsers(all);
    });

    let heartbeat: ReturnType<typeof setInterval> | null = null;

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      if (!track || !user) return;
      const geo = await getGeo();
      const payload: OnlineUser = {
        user_id: user.id,
        username: profile?.username ?? null,
        email: user.email ?? null,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        country: geo.country,
        country_code: geo.country_code,
        current_level: currentLevel ?? null,
        connected_at: new Date().toISOString(),
      };
      await channel.track(payload);
      heartbeat = setInterval(() => {
        void channel.track({ ...payload, last_ping: new Date().toISOString() });
      }, 30_000);
    });

    return () => {
      if (heartbeat) clearInterval(heartbeat);
      void channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user?.id, track, currentLevel, profile?.username, profile?.display_name, profile?.avatar_url]);

  return { onlineUsers };
}
