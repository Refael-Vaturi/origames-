import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Home, Crown, Target, Ghost, Loader2 } from "lucide-react";
import { playSuccess, playLevelUp } from "@/hooks/useSound";

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

const PODIUM_MEDALS = ["🥇", "🥈", "🥉"];

const ResultsScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();

  const roomId = searchParams.get("room");

  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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
      // Fetch room code for rematch
      const { data: roomData } = await supabase.from("rooms").select("code").eq("id", roomId).single();
      if (roomData) setRoomCode(roomData.code);

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

      // Play winner fanfare
      setTimeout(() => playLevelUp(), 600);
      setTimeout(() => setShowDetails(true), 1200);
    };

    load();
  }, [roomId, user, navigate]);

  // Aggregate scores per player
  const leaderboard = useMemo(() => {
    const totals: Record<string, { total: number; caught: number; survived: number; correct_votes: number }> = {};

    players.forEach((p) => {
      totals[p.id] = { total: 0, caught: 0, survived: 0, correct_votes: 0 };
    });

    scores.forEach((s) => {
      if (!totals[s.player_id]) totals[s.player_id] = { total: 0, caught: 0, survived: 0, correct_votes: 0 };
      totals[s.player_id].total += s.points;
      if (s.reason === "correct_vote") {
        totals[s.player_id].caught += 1;
        totals[s.player_id].correct_votes += 1;
      }
      if (s.reason === "survived") totals[s.player_id].survived += 1;
    });

    return players
      .map((p) => ({
        player: p,
        ...(totals[p.id] || { total: 0, caught: 0, survived: 0, correct_votes: 0 }),
      }))
      .sort((a, b) => b.total - a.total);
  }, [players, scores]);

  const handleRematch = async () => {
    if (!roomCode) return;
    // Reset room to waiting
    if (roomId) {
      await supabase.from("rooms").update({ status: "waiting" }).eq("id", roomId);
      // Reset all players ready status
      await supabase.from("room_players").update({ is_ready: false } as Record<string, unknown>).eq("room_id", roomId);
    }
    navigate(`/lobby?code=${roomCode}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const winner = leaderboard[0];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="bg-card rounded-3xl p-6 shadow-card">
          {/* Winner spotlight */}
          {winner && (
            <motion.div
              className="text-center mb-6"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                className="relative w-24 h-24 mx-auto mb-3"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-display font-bold border-4 border-primary shadow-lg"
                  style={{ background: COLORS[0] }}
                >
                  {getPlayerInitial(winner.player)}
                </div>
                <motion.div
                  className="absolute -top-3 -end-1"
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                >
                  <Crown className="w-8 h-8 text-primary fill-primary" />
                </motion.div>
              </motion.div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {getPlayerName(winner.player)}
              </h1>
              <p className="text-sm text-muted-foreground font-body mt-1">
                🏆 {winner.total} {t("game.score") || "pts"}
              </p>
            </motion.div>
          )}

          {/* Leaderboard */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2 mb-6"
              >
                {leaderboard.map((entry, i) => (
                  <motion.div
                    key={entry.player.id}
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.12 }}
                    className={`flex items-center gap-3 rounded-2xl p-3 ${
                      i === 0 ? "bg-primary/10 border-2 border-primary" : "bg-background"
                    }`}
                  >
                    <span className="font-display font-bold text-lg w-8 text-center">
                      {i < 3 ? PODIUM_MEDALS[i] : <span className="text-muted-foreground">{i + 1}</span>}
                    </span>
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
                      <div className="flex gap-3 text-xs text-muted-foreground font-body">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" /> {entry.correct_votes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Ghost className="w-3 h-3" /> {entry.survived}
                        </span>
                      </div>
                    </div>
                    <motion.span
                      className="font-display font-bold text-primary text-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.12, type: "spring" }}
                    >
                      {entry.total}
                    </motion.span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          {showDetails && (
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={handleRematch}
              >
                <RotateCcw className="w-5 h-5" />
                {t("game.rematch") || "Rematch!"}
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => navigate("/")}>
                <Home className="w-5 h-5" />
                {t("game.backHome") || "Back to Home"}
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResultsScreen;
