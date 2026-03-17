import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, ArrowLeft, Users, Loader2 } from "lucide-react";
import { playSuccess } from "@/hooks/useSound";

interface Player {
  id: string;
  user_id: string;
  is_guest: boolean;
  guest_name: string | null;
  guest_avatar: string | null;
  display_name?: string;
}

interface ScoreRow {
  player_id: string;
  points: number;
  reason: string;
}

const COLORS = [
  "hsl(267 84% 58%)",
  "hsl(340 82% 62%)",
  "hsl(174 72% 50%)",
  "hsl(38 100% 60%)",
  "hsl(142 70% 50%)",
  "hsl(200 80% 55%)",
  "hsl(30 90% 55%)",
  "hsl(280 70% 60%)",
];

const ResultsScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();

  const roomId = searchParams.get("room");

  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const getPlayerName = useCallback(
    (player: Player) => {
      if (player.is_guest) return player.guest_name || t("join.guestDefault");
      return player.display_name || "Player";
    },
    [t],
  );

  const getPlayerInitial = useCallback(
    (player: Player) => {
      if (player.guest_avatar) return player.guest_avatar;
      return getPlayerName(player)[0];
    },
    [getPlayerName],
  );

  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    const load = async () => {
      // Fetch players
      const { data: playersData } = await supabase.from("room_players").select("*").eq("room_id", roomId);
      if (!playersData) {
        setLoading(false);
        return;
      }

      const authIds = playersData.filter((p) => !p.is_guest).map((p) => p.user_id);
      const { data: profiles } = authIds.length
        ? await supabase.from("profiles").select("user_id, display_name").in("user_id", authIds)
        : { data: [] as { user_id: string; display_name: string }[] };

      const enriched: Player[] = playersData.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        is_guest: p.is_guest,
        guest_name: p.guest_name,
        guest_avatar: p.guest_avatar,
        display_name: profiles?.find((pr) => pr.user_id === p.user_id)?.display_name,
      }));
      setPlayers(enriched);

      // Fetch scores
      const { data: scoresData } = await supabase
        .from("game_scores")
        .select("player_id, points, reason")
        .eq("room_id", roomId);

      if (scoresData) setScores(scoresData as ScoreRow[]);
      setLoading(false);
      playSuccess();
    };

    load();
  }, [roomId, user, navigate]);

  // Aggregate scores per player
  const leaderboard = useMemo(() => {
    const totals: Record<string, { total: number; caught: number; survived: number }> = {};

    players.forEach((p) => {
      totals[p.id] = { total: 0, caught: 0, survived: 0 };
    });

    scores.forEach((s) => {
      if (!totals[s.player_id]) totals[s.player_id] = { total: 0, caught: 0, survived: 0 };
      totals[s.player_id].total += s.points;
      if (s.reason === "correct_vote") totals[s.player_id].caught += 1;
      if (s.reason === "survived") totals[s.player_id].survived += 1;
    });

    return players
      .map((p) => ({
        player: p,
        ...(totals[p.id] || { total: 0, caught: 0, survived: 0 }),
      }))
      .sort((a, b) => b.total - a.total);
  }, [players, scores]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="bg-card rounded-3xl p-6 shadow-card">
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              className="w-16 h-16 mx-auto mb-3 rounded-full bg-accent flex items-center justify-center"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Trophy className="w-8 h-8 text-accent-foreground" />
            </motion.div>
            <h1 className="font-display text-2xl font-bold text-foreground">{t("game.results")}</h1>
          </div>

          {/* Leaderboard */}
          <div className="space-y-3 mb-6">
            {leaderboard.map((entry, i) => (
              <motion.div
                key={entry.player.id}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.15 }}
                className={`flex items-center gap-3 rounded-2xl p-3 ${
                  i === 0 ? "bg-primary/10 border-2 border-primary" : "bg-background"
                }`}
              >
                <span className="font-display font-bold text-lg w-6 text-center text-foreground">{i + 1}</span>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold"
                  style={{ background: COLORS[i % COLORS.length] }}
                >
                  {getPlayerInitial(entry.player)}
                </div>
                <div className="flex-1">
                  <span className="font-display font-semibold text-sm text-foreground">
                    {getPlayerName(entry.player)}
                  </span>
                  <div className="flex gap-2 text-xs text-muted-foreground font-body">
                    <span>🎯 {entry.caught}</span>
                    <span>🥷 {entry.survived}</span>
                  </div>
                </div>
                <span className="font-display font-bold text-primary">{entry.total}</span>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => navigate(`/lobby?code=${searchParams.get("code") || ""}`)}
            >
              <ArrowLeft className="w-5 h-5" />
              {t("game.backToLobby")}
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => navigate("/home")}>
              <Users className="w-5 h-5" />
              {t("game.inviteFriends")}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResultsScreen;
