import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown } from "lucide-react";
import { motion } from "framer-motion";

interface Entry {
  id: string;
  display_name: string;
  score: number;
  level: number;
  user_id: string;
}

interface Props {
  gameId: "clicker" | "color_identify" | "city_find" | "gravity_flip" | "rhythm_blade" | "velocity_drift" | "cyber_shield" | "fruit_merge";
  currentUserId?: string;
  refreshKey?: number;
  limit?: number;
}

const ArcadeLeaderboard = ({ gameId, currentUserId, refreshKey = 0, limit = 10 }: Props) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("arcade_scores")
        .select("id, display_name, score, level, user_id")
        .eq("game_id", gameId)
        .order("score", { ascending: false })
        .limit(limit * 3); // overfetch — we may filter deleted users out

      if (cancelled) return;
      const rows = (data as Entry[]) || [];

      // Filter out scores belonging to users whose profile no longer exists
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      let validIds = new Set(userIds);
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles_public")
          .select("user_id")
          .in("user_id", userIds);
        if (profs) validIds = new Set(profs.map((p: any) => p.user_id));
      }
      if (cancelled) return;
      setEntries(rows.filter((r) => validIds.has(r.user_id)).slice(0, limit));
      setLoading(false);
    };
    load();

    // Realtime: refresh on changes to scores (for this game) or to profiles
    const channel = supabase
      .channel(`arcade-lb-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "arcade_scores", filter: `game_id=eq.${gameId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();

    // Safety: poll every 30s
    const interval = setInterval(load, 30000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [gameId, refreshKey, limit]);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-accent" />
        <h3 className="font-display font-semibold text-foreground">Leaderboard</h3>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Be the first to set a score!</p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((e, i) => {
            const isMe = currentUserId === e.user_id;
            return (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm ${
                  isMe ? "bg-primary/10 ring-1 ring-primary/30" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 text-center font-bold text-muted-foreground">
                    {i < 3 ? <Crown className={`inline w-4 h-4 ${i === 0 ? "text-accent" : i === 1 ? "text-muted-foreground" : "text-game-red"}`} /> : i + 1}
                  </span>
                  <span className="truncate font-medium">{e.display_name}</span>
                </div>
                <span className="font-bold text-primary tabular-nums">{e.score.toLocaleString()}</span>
              </motion.li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default ArcadeLeaderboard;
