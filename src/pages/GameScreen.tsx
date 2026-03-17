import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import RoomChat from "@/components/RoomChat";
import { Eye, EyeOff, MessageSquare, Send, Vote, Sparkles, Loader2 } from "lucide-react";
import { playWhoosh, playClick, playSuccess, playError, playTick, playReveal, playVote, playPop } from "@/hooks/useSound";

type Phase =
  | "loading"
  | "secret"
  | "hint"
  | "waiting_hints"
  | "hint_reveal"
  | "discussion"
  | "voting"
  | "waiting_votes"
  | "reveal";

interface Player {
  id: string;
  user_id: string;
  is_guest: boolean;
  guest_name: string | null;
  guest_avatar: string | null;
  display_name?: string;
}

interface GameRound {
  id: string;
  room_id: string;
  round_number: number;
  word_en: string;
  word_he: string;
  fake_player_id: string;
}

interface GameHint {
  id: string;
  round_id: string;
  player_id: string;
  hint_round: number;
  hint_text: string;
}

interface GameVote {
  id: string;
  round_id: string;
  voter_id: string;
  voted_player_id: string;
}

interface GameScore {
  id: string;
  room_id: string;
  round_id: string;
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

const GameScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const roomId = searchParams.get("room");

  // Core state
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [hints, setHints] = useState<GameHint[]>([]);
  const [votes, setVotes] = useState<GameVote[]>([]);
  const [scores, setScores] = useState<GameScore[]>([]);

  // UI state
  const [phase, setPhase] = useState<Phase>("loading");
  const [hintInput, setHintInput] = useState("");
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [currentHintRound, setCurrentHintRound] = useState(1);
  const [myHintSubmitted, setMyHintSubmitted] = useState(false);
  const [myVoteSubmitted, setMyVoteSubmitted] = useState(false);

  // Derived
  const iAmFake = currentRound?.fake_player_id === myPlayerId;
  const word = currentRound ? (language === "he" ? currentRound.word_he : currentRound.word_en) : "";
  const totalPlayers = players.length;
  const totalRounds = room?.rounds || 5;

  // Guest session
  const guestSession = useMemo(() => {
    if (user) return null;
    if (!room) return null;
    try {
      const stored = localStorage.getItem(`guest_room_${room.code}`);
      if (stored) return JSON.parse(stored);
    } catch {
      /* empty */
    }
    return null;
  }, [user, room]);

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

  // ─── Init: fetch room + players + find my ID ───
  useEffect(() => {
    if (!roomId) {
      navigate("/home");
      return;
    }

    const init = async () => {
      const { data: roomData } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (!roomData) {
        navigate("/home");
        return;
      }
      setRoom(roomData);

      const { data: playersData } = await supabase.from("room_players").select("*").eq("room_id", roomId);
      if (!playersData) return;

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

      // Find my player ID
      if (user) {
        const me = enriched.find((p) => p.user_id === user.id);
        if (me) setMyPlayerId(me.id);
      } else {
        const stored = localStorage.getItem(`guest_room_${roomData.code}`);
        if (stored) {
          try {
            const gs = JSON.parse(stored);
            setMyPlayerId(gs.playerId);
          } catch {
            /* empty */
          }
        }
      }
    };

    init();
  }, [roomId, user, navigate]);

  // ─── Start round when ready ───
  useEffect(() => {
    if (!room || !myPlayerId || players.length < 2 || currentRound) return;

    const startRound = async () => {
      const { data, error } = await supabase.functions.invoke("start-round", {
        body: { room_id: roomId, round_number: roundNumber },
      });
      if (!error && data && !data.error) {
        setCurrentRound(data as GameRound);
        setPhase("secret");
        setTimer(5);
      }
    };

    startRound();
  }, [room, myPlayerId, players, currentRound, roomId, roundNumber]);

  // ─── Realtime: listen for new rounds ───
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game-rounds-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_rounds", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const round = payload.new as GameRound;
          if (round.round_number === roundNumber && !currentRound) {
            setCurrentRound(round);
            setPhase("secret");
            setTimer(5);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_scores", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const score = payload.new as GameScore;
          setScores((prev) => (prev.some((s) => s.id === score.id) ? prev : [...prev, score]));
        },
      )
      .subscribe();

    // Fetch existing scores for this room
    supabase
      .from("game_scores")
      .select("*")
      .eq("room_id", roomId)
      .then(({ data }) => {
        if (data) setScores(data as unknown as GameScore[]);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, roundNumber, currentRound]);

  // ─── Realtime: listen for hints & votes of current round ───
  useEffect(() => {
    if (!currentRound) return;

    // Fetch existing data first
    const fetchExisting = async () => {
      const [hintsRes, votesRes] = await Promise.all([
        supabase.from("game_hints").select("*").eq("round_id", currentRound.id),
        supabase.from("game_votes").select("*").eq("round_id", currentRound.id),
      ]);
      if (hintsRes.data) setHints(hintsRes.data as unknown as GameHint[]);
      if (votesRes.data) setVotes(votesRes.data as unknown as GameVote[]);
    };
    fetchExisting();

    const channel = supabase
      .channel(`round-data-${currentRound.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_hints", filter: `round_id=eq.${currentRound.id}` },
        (payload) => {
          const hint = payload.new as GameHint;
          setHints((prev) => (prev.some((h) => h.id === hint.id) ? prev : [...prev, hint]));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_votes", filter: `round_id=eq.${currentRound.id}` },
        (payload) => {
          const vote = payload.new as GameVote;
          setVotes((prev) => (prev.some((v) => v.id === vote.id) ? prev : [...prev, vote]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRound?.id]);

  // ─── Timer for secret / discussion / hint_reveal ───
  useEffect(() => {
    if (phase !== "secret" && phase !== "discussion" && phase !== "hint_reveal") return;
    if (timer <= 0) {
      if (phase === "secret") {
        playWhoosh();
        setPhase("hint");
        setCurrentHintRound(1);
        setMyHintSubmitted(false);
        setHintInput("");
      } else if (phase === "discussion") {
        playWhoosh();
        setPhase("voting");
        setMyVoteSubmitted(false);
      } else if (phase === "hint_reveal") {
        if (currentHintRound < 3) {
          setCurrentHintRound((prev) => prev + 1);
          setMyHintSubmitted(false);
          setHintInput("");
          setPhase("hint");
        } else {
          setPhase("discussion");
          setTimer(room?.discussion_time || 45);
        }
      }
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 4 && prev > 0) playTick();
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timer, currentHintRound, room]);

  // ─── Check: all hints submitted? ───
  useEffect(() => {
    if (phase !== "waiting_hints" || !currentRound) return;
    const count = hints.filter((h) => h.round_id === currentRound.id && h.hint_round === currentHintRound).length;
    if (count >= totalPlayers) {
      setPhase("hint_reveal");
      setTimer(4);
    }
  }, [phase, hints, currentRound, currentHintRound, totalPlayers]);

  // ─── Check: all votes submitted? ───
  useEffect(() => {
    if (phase !== "waiting_votes" || !currentRound) return;
    const count = votes.filter((v) => v.round_id === currentRound.id).length;
    if (count >= totalPlayers) {
      setPhase("reveal");
    }
  }, [phase, votes, currentRound, totalPlayers]);

  // ─── Submit hint ───
  const handleSubmitHint = async () => {
    if (!hintInput.trim() || !currentRound || !myPlayerId) return;

    setMyHintSubmitted(true);
    setPhase("waiting_hints");

    const body: Record<string, unknown> = {
      action: "submit-hint",
      round_id: currentRound.id,
      hint_round: currentHintRound,
      hint_text: hintInput.trim(),
    };

    if (!user && guestSession) {
      body.guest_player_id = guestSession.playerId;
      body.guest_token = guestSession.token;
    }

    const { error } = await supabase.functions.invoke("game-action", { body });
    if (error) {
      console.error("Failed to submit hint:", error);
      setMyHintSubmitted(false);
      setPhase("hint");
    }
  };

  // ─── Submit vote ───
  const handleSubmitVote = async () => {
    if (!selectedVote || !currentRound || !myPlayerId) return;

    setMyVoteSubmitted(true);
    setPhase("waiting_votes");

    const body: Record<string, unknown> = {
      action: "submit-vote",
      round_id: currentRound.id,
      voted_player_id: selectedVote,
    };

    if (!user && guestSession) {
      body.guest_player_id = guestSession.playerId;
      body.guest_token = guestSession.token;
    }

    const { error } = await supabase.functions.invoke("game-action", { body });
    if (error) {
      console.error("Failed to submit vote:", error);
      setMyVoteSubmitted(false);
      setPhase("voting");
    }
  };

  // ─── Next round ───
  const handleNextRound = async () => {
    const next = roundNumber + 1;
    if (next > totalRounds) {
      navigate(`/results?room=${roomId}`);
      return;
    }

    setRoundNumber(next);
    setCurrentRound(null);
    setHints([]);
    setVotes([]);
    setHintInput("");
    setSelectedVote(null);
    setMyHintSubmitted(false);
    setMyVoteSubmitted(false);
    setCurrentHintRound(1);
    setPhase("loading");

    const { data, error } = await supabase.functions.invoke("start-round", {
      body: { room_id: roomId, round_number: next },
    });
    if (data && !error && !data.error) {
      setCurrentRound(data as GameRound);
      setPhase("secret");
      setTimer(5);
    }
  };

  // ─── Computed data ───
  const currentRoundHints = useMemo(() => {
    if (!currentRound) return [];
    return hints.filter((h) => h.round_id === currentRound.id && h.hint_round === currentHintRound);
  }, [hints, currentRound, currentHintRound]);

  const allRoundHints = useMemo(() => {
    if (!currentRound) return {} as Record<string, GameHint[]>;
    const byPlayer: Record<string, GameHint[]> = {};
    hints
      .filter((h) => h.round_id === currentRound.id)
      .forEach((h) => {
        if (!byPlayer[h.player_id]) byPlayer[h.player_id] = [];
        byPlayer[h.player_id].push(h);
      });
    return byPlayer;
  }, [hints, currentRound]);

  const voteResults = useMemo(() => {
    if (!currentRound) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    votes
      .filter((v) => v.round_id === currentRound.id)
      .forEach((v) => {
        counts[v.voted_player_id] = (counts[v.voted_player_id] || 0) + 1;
      });
    return counts;
  }, [votes, currentRound]);

  const mostVotedPlayerId = useMemo(() => {
    const entries = Object.entries(voteResults);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [voteResults]);

  const caughtFake = mostVotedPlayerId === currentRound?.fake_player_id;

  // Cumulative scores per player
  const cumulativeScores = useMemo(() => {
    const totals: Record<string, number> = {};
    scores.forEach((s) => {
      totals[s.player_id] = (totals[s.player_id] || 0) + s.points;
    });
    return totals;
  }, [scores]);

  // Round-specific scores
  const roundScores = useMemo(() => {
    if (!currentRound) return {} as Record<string, number>;
    const totals: Record<string, number> = {};
    scores
      .filter((s) => s.round_id === currentRound.id)
      .forEach((s) => {
        totals[s.player_id] = (totals[s.player_id] || 0) + s.points;
      });
    return totals;
  }, [scores, currentRound]);

  const myScore = myPlayerId ? cumulativeScores[myPlayerId] || 0 : 0;

  const hintsSubmittedCount = currentRoundHints.length;
  const votesSubmittedCount = currentRound ? votes.filter((v) => v.round_id === currentRound.id).length : 0;

  // ─── Loading state ───
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-border">
        <span className="font-display font-semibold text-sm text-foreground">
          {t("game.round")} {roundNumber}/{totalRounds}
        </span>
        {(phase === "secret" || phase === "discussion" || phase === "hint_reveal") && (
          <div className="font-display text-lg font-bold text-primary">{timer}s</div>
        )}
        <span className="font-display font-semibold text-sm text-muted-foreground">
          {t("game.score")}: {myScore}
        </span>
      </header>

      {/* Phase content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          {/* SECRET PHASE */}
          {phase === "secret" && currentRound && (
            <motion.div
              key="secret"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-center w-full max-w-sm"
            >
              {iAmFake ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive flex items-center justify-center">
                    <EyeOff className="w-8 h-8 text-destructive-foreground" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("game.youAreFake")}</h2>
                  <div className="bg-card rounded-3xl p-6 shadow-card mb-4">
                    <p className="font-display text-2xl font-bold text-destructive">{t("game.noWordForYou")}</p>
                  </div>
                  <p className="text-sm text-muted-foreground font-body">{t("game.fakeInstruction")}</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center">
                    <Eye className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("game.yourSecret")}</h2>
                  <div className="bg-card rounded-3xl p-6 shadow-card mb-4">
                    <p className="font-display text-3xl font-bold text-primary">{word}</p>
                  </div>
                  <p className="text-sm text-muted-foreground font-body">{t("game.dontExpose")}</p>
                </>
              )}
            </motion.div>
          )}

          {/* HINT INPUT */}
          {phase === "hint" && (
            <motion.div
              key={`hint-${currentHintRound}`}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <h2 className="font-display text-lg font-bold text-foreground mb-1 text-center">
                {t("game.giveHint")} ({currentHintRound}/3)
              </h2>
              <p className="text-xs text-muted-foreground text-center mb-6 font-body">
                {iAmFake ? t("game.fakeHintTip") : t("game.hintTip")}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hintInput}
                  onChange={(e) => setHintInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitHint()}
                  placeholder={iAmFake ? t("game.fakeHintPlaceholder") : t("game.giveHint")}
                  maxLength={50}
                  className="flex-1 h-12 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={handleSubmitHint}
                  disabled={!hintInput.trim()}
                  className="h-12 w-12 rounded-2xl gradient-hero flex items-center justify-center text-primary-foreground disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* WAITING FOR HINTS */}
          {phase === "waiting_hints" && (
            <motion.div
              key="waiting-hints"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center w-full max-w-sm"
            >
              <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
              <h2 className="font-display text-lg font-bold text-foreground mb-2">
                {t("game.waitingForPlayers")}
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                {hintsSubmittedCount}/{totalPlayers}
              </p>
            </motion.div>
          )}

          {/* HINT REVEAL */}
          {phase === "hint_reveal" && (
            <motion.div
              key={`hint-reveal-${currentHintRound}`}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <h2 className="font-display text-lg font-bold text-foreground mb-4 text-center">
                {t("game.giveHint")} ({currentHintRound}/3) — {timer}s
              </h2>
              <div className="space-y-2">
                {players.map((player, i) => {
                  const playerHint = currentRoundHints.find((h) => h.player_id === player.id);
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-card"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-xs"
                        style={{ background: COLORS[i % COLORS.length] }}
                      >
                        {getPlayerInitial(player)}
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-display font-semibold text-muted-foreground">
                          {getPlayerName(player)}
                        </span>
                        <p className="text-sm font-body text-foreground">{playerHint?.hint_text || "..."}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* DISCUSSION */}
          {phase === "discussion" && (
            <motion.div
              key="discussion"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-accent-foreground" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground mb-4 text-center">
                {t("game.discuss")} — {timer}s
              </h2>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {players.map((player, i) => {
                  const playerHints = allRoundHints[player.id] || [];
                  return (
                    <div key={player.id} className="bg-card rounded-2xl p-3 shadow-card">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-xs"
                          style={{ background: COLORS[i % COLORS.length] }}
                        >
                          {getPlayerInitial(player)}
                        </div>
                        <span className="text-xs font-display font-semibold text-foreground">
                          {getPlayerName(player)}
                        </span>
                      </div>
                      <div className="ps-9 space-y-1">
                        {playerHints.length > 0 ? (
                          playerHints
                            .sort((a, b) => a.hint_round - b.hint_round)
                            .map((h) => (
                              <p key={h.id} className="text-sm font-body text-muted-foreground">
                                {h.hint_round}. {h.hint_text}
                              </p>
                            ))
                        ) : (
                          <p className="text-sm font-body text-muted-foreground">...</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Real-time chat */}
              {roomId && myPlayerId && (
                <div className="mt-4">
                  <RoomChat
                    roomId={roomId}
                    playerId={myPlayerId}
                    playerName={getPlayerName(players.find((p) => p.id === myPlayerId)!)}
                    maxHeight="150px"
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* VOTING */}
          {phase === "voting" && (
            <motion.div
              key="voting"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
                <Vote className="w-6 h-6 text-destructive" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground mb-4 text-center">
                {t("game.whoIsDifferent")}
              </h2>
              <div className="space-y-2 mb-4">
                {players
                  .filter((p) => p.id !== myPlayerId)
                  .map((player) => {
                    const idx = players.indexOf(player);
                    return (
                      <motion.button
                        key={player.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedVote(player.id)}
                        className={`w-full flex items-center gap-3 rounded-2xl p-3 transition-all border-2 ${
                          selectedVote === player.id
                            ? "border-primary bg-primary/10 shadow-card"
                            : "border-transparent bg-card shadow-card"
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold"
                          style={{ background: COLORS[idx % COLORS.length] }}
                        >
                          {getPlayerInitial(player)}
                        </div>
                        <span className="font-display font-semibold text-sm text-foreground">
                          {getPlayerName(player)}
                        </span>
                      </motion.button>
                    );
                  })}
              </div>
              <Button variant="hero" size="lg" className="w-full" onClick={handleSubmitVote} disabled={!selectedVote}>
                {t("game.vote")}
              </Button>
            </motion.div>
          )}

          {/* WAITING FOR VOTES */}
          {phase === "waiting_votes" && (
            <motion.div
              key="waiting-votes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center w-full max-w-sm"
            >
              <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
              <h2 className="font-display text-lg font-bold text-foreground mb-2">{t("game.waitingForVotes")}</h2>
              <p className="text-sm text-muted-foreground font-body">
                {votesSubmittedCount}/{totalPlayers}
              </p>
            </motion.div>
          )}

          {/* REVEAL */}
          {phase === "reveal" && currentRound && (
            <motion.div
              key="reveal"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center w-full max-w-sm"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-accent-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">{t("game.reveal")}</h2>
              <div className="bg-card rounded-3xl p-6 shadow-card mb-4">
                {(() => {
                  const fakePlayer = players.find((p) => p.id === currentRound.fake_player_id);
                  const fakeName = fakePlayer ? getPlayerName(fakePlayer) : "?";
                  const fakeIdx = fakePlayer ? players.indexOf(fakePlayer) : 0;
                  return (
                    <>
                      <div
                        className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-xl"
                        style={{ background: COLORS[fakeIdx % COLORS.length] }}
                      >
                        {fakePlayer ? getPlayerInitial(fakePlayer) : "?"}
                      </div>
                      <p className="font-display text-lg font-bold text-foreground mb-1">
                        {fakeName} {t("game.wasFake")}
                      </p>
                      <p className="text-sm text-muted-foreground font-body mb-2">
                        {t("game.theWordWas")}:{" "}
                        <span className="font-semibold text-primary">
                          {language === "he" ? currentRound.word_he : currentRound.word_en}
                        </span>
                      </p>
                      {caughtFake ? (
                        <p className="text-sm font-display font-bold text-game-green">
                          🎉 {t("game.youCaughtFake")}
                        </p>
                      ) : (
                        <p className="text-sm font-display font-bold text-destructive">
                          😈 {t("game.fakeSurvived")}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Score + Vote breakdown */}
              <div className="space-y-2 mb-4">
                {players
                  .slice()
                  .sort((a, b) => (cumulativeScores[b.id] || 0) - (cumulativeScores[a.id] || 0))
                  .map((p, i) => {
                    const rs = roundScores[p.id] || 0;
                    const total = cumulativeScores[p.id] || 0;
                    return (
                      <div key={p.id} className="flex items-center justify-between text-sm px-2 py-1 bg-background rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-xs text-muted-foreground w-4">{i + 1}</span>
                          <span className="font-body text-foreground">{getPlayerName(p)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {rs > 0 && (
                            <span className="text-xs font-display font-semibold text-game-green">+{rs}</span>
                          )}
                          <span className="font-display font-bold text-primary">{total}</span>
                          <span className="text-xs text-muted-foreground">
                            ({voteResults[p.id] || 0} {t("game.vote")})
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <Button variant="hero" size="lg" className="w-full" onClick={handleNextRound}>
                {roundNumber < totalRounds ? t("game.nextRound") : t("game.results")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GameScreen;
