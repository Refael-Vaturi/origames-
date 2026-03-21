import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import RoomChat from "@/components/RoomChat";
import { Eye, EyeOff, MessageSquare, Send, Vote, Sparkles, Loader2, Shield, Skull } from "lucide-react";
import { playWhoosh, playClick, playSuccess, playError, playTick, playReveal, playVote, playPop, playDrumroll, playCaught, playEscaped } from "@/hooks/useSound";

type Phase =
  | "loading"
  | "secret"
  | "hint"
  | "waiting_hints"
  | "hint_reveal"
  | "discussion"
  | "voting"
  | "waiting_votes"
  | "suspense"
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

  // Suspense animation state
  const [suspenseHighlight, setSuspenseHighlight] = useState<string | null>(null);
  const [showRevealResult, setShowRevealResult] = useState(false);
  const suspenseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundStartingRef = useRef(false);
  const initialStartDoneRef = useRef(false);

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
      navigate("/");
      return;
    }

    const init = async () => {
      const { data: roomData } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (!roomData) {
        navigate("/");
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

  // ─── Start initial round only once ───
  useEffect(() => {
    if (!room || !myPlayerId || players.length < 2 || currentRound || initialStartDoneRef.current || roundStartingRef.current) return;

    const startRound = async () => {
      roundStartingRef.current = true;
      initialStartDoneRef.current = true;
      try {
        const { data, error } = await supabase.functions.invoke("start-round", {
          body: { room_id: roomId, round_number: roundNumber },
        });
        if (!error && data && !data.error) {
          setCurrentRound(data as GameRound);
          setPhase("secret");
          setTimer(5);
        }
      } finally {
        roundStartingRef.current = false;
      }
    };

    startRound();
  }, [room, myPlayerId, players.length, roomId, roundNumber]);

  // ─── Realtime: listen for rounds & scores (stable channel, no currentRound dep) ───
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game-data-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_rounds", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const round = payload.new as GameRound;
          // Only accept round if we don't have one yet
          setCurrentRound((prev) => {
            if (prev) return prev; // already have a round, ignore
            setPhase("secret");
            setTimer(5);
            return round;
          });
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
  }, [roomId]);

  // ─── Realtime: listen for hints & votes of current round ───
  useEffect(() => {
    if (!currentRound) return;

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

  // ─── Check: all hints submitted? (with timeout fallback) ───
  useEffect(() => {
    if (phase !== "waiting_hints" || !currentRound) return;
    const count = hints.filter((h) => h.round_id === currentRound.id && h.hint_round === currentHintRound).length;
    if (count >= totalPlayers) {
      playPop();
      setPhase("hint_reveal");
      setTimer(4);
    }
  }, [phase, hints, currentRound, currentHintRound, totalPlayers]);

  // Timeout fallback for waiting_hints
  useEffect(() => {
    if (phase !== "waiting_hints") return;
    const timeout = setTimeout(() => {
      playPop();
      setPhase("hint_reveal");
      setTimer(4);
    }, (room?.response_time || 30) * 1000);
    return () => clearTimeout(timeout);
  }, [phase, room]);

  // ─── Check: all votes submitted? (with timeout fallback) ───
  useEffect(() => {
    if (phase !== "waiting_votes" || !currentRound) return;
    const count = votes.filter((v) => v.round_id === currentRound.id).length;
    if (count >= totalPlayers) {
      startSuspensePhase();
    }
  }, [phase, votes, currentRound, totalPlayers]);

  // Timeout fallback for waiting_votes
  useEffect(() => {
    if (phase !== "waiting_votes") return;
    const timeout = setTimeout(() => {
      startSuspensePhase();
    }, (room?.vote_time || 20) * 1000 + 5000);
    return () => clearTimeout(timeout);
  }, [phase, room]);

  // ─── Suspense phase animation ───
  const startSuspensePhase = useCallback(() => {
    setPhase("suspense");
    setShowRevealResult(false);
    playDrumroll();

    // Cycle through players rapidly
    let i = 0;
    const cycleInterval = setInterval(() => {
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      setSuspenseHighlight(randomPlayer?.id || null);
      i++;
      if (i > 12) {
        clearInterval(cycleInterval);
      }
    }, 150);

    // After 2.5s of suspense, reveal
    suspenseTimerRef.current = setTimeout(() => {
      clearInterval(cycleInterval);
      setSuspenseHighlight(null);
      playReveal();
      setPhase("reveal");
      setShowRevealResult(false);
      // Stagger the reveal result
      setTimeout(() => {
        setShowRevealResult(true);
      }, 600);
    }, 2800);
  }, [players]);

  // Cleanup suspense timer
  useEffect(() => {
    return () => {
      if (suspenseTimerRef.current) clearTimeout(suspenseTimerRef.current);
    };
  }, []);

  // Play caught/escaped sound when reveal result shows
  useEffect(() => {
    if (phase === "reveal" && showRevealResult && currentRound) {
      const caught = mostVotedPlayerId === currentRound.fake_player_id;
      setTimeout(() => {
        if (caught) playCaught();
        else playEscaped();
      }, 300);
    }
  }, [phase, showRevealResult, currentRound]);

  // ─── Submit hint ───
  const handleSubmitHint = async () => {
    if (!hintInput.trim() || !currentRound || !myPlayerId) return;

    setMyHintSubmitted(true);
    setPhase("waiting_hints");
    playClick();

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
    playVote();

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
    if (roundStartingRef.current) return; // prevent double-click
    
    const next = roundNumber + 1;
    if (next > totalRounds) {
      navigate(`/results?room=${roomId}`);
      return;
    }

    roundStartingRef.current = true;
    setRoundNumber(next);
    setCurrentRound(null);
    setHints([]);
    setVotes([]);
    setHintInput("");
    setSelectedVote(null);
    setMyHintSubmitted(false);
    setMyVoteSubmitted(false);
    setCurrentHintRound(1);
    setShowRevealResult(false);
    setPhase("loading");

    try {
      const { data, error } = await supabase.functions.invoke("start-round", {
        body: { room_id: roomId, round_number: next },
      });
      if (data && !error && !data.error) {
        setCurrentRound(data as GameRound);
        setPhase("secret");
        setTimer(5);
      }
    } finally {
      roundStartingRef.current = false;
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-body">{t("game.loading") || "Loading..."}</p>
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
          <motion.div
            className="font-display text-lg font-bold text-primary"
            key={timer}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {timer}s
          </motion.div>
        )}
        <span className="font-display font-semibold text-sm text-muted-foreground">
          {t("game.score")}: {myScore}
        </span>
      </header>

      {/* My role indicator - always visible during gameplay */}
      {currentRound && phase !== "loading" && (
        <div className={`px-4 py-2 flex items-center justify-center gap-2 text-sm font-display font-semibold ${
          iAmFake
            ? "bg-destructive/10 text-destructive border-b border-destructive/20"
            : "bg-primary/10 text-primary border-b border-primary/20"
        }`}>
          {iAmFake ? (
            <>
              <Skull className="w-4 h-4" />
              <span>{t("game.youAreFake")} — {t("game.noWordForYou")}</span>
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              <span>{t("game.yourWord")}: <strong>{word}</strong></span>
            </>
          )}
        </div>
      )}

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
                  <motion.div
                    className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive flex items-center justify-center"
                    animate={{ rotate: [0, -5, 5, -5, 0] }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <EyeOff className="w-10 h-10 text-destructive-foreground" />
                  </motion.div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("game.youAreFake")}</h2>
                  <div className="bg-card rounded-3xl p-6 shadow-card mb-4">
                    <p className="font-display text-2xl font-bold text-destructive">{t("game.noWordForYou")}</p>
                  </div>
                  <p className="text-sm text-muted-foreground font-body">{t("game.fakeInstruction")}</p>
                </>
              ) : (
                <>
                  <motion.div
                    className="w-20 h-20 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <Eye className="w-10 h-10 text-primary-foreground" />
                  </motion.div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("game.yourSecret")}</h2>
                  <motion.div
                    className="bg-card rounded-3xl p-6 shadow-card mb-4"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <p className="font-display text-3xl font-bold text-primary">{word}</p>
                  </motion.div>
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
              <div className="flex justify-center gap-1 mb-2">
                {players.map((p, i) => {
                  const submitted = hints.some(
                    (h) => h.round_id === currentRound?.id && h.hint_round === currentHintRound && h.player_id === p.id
                  );
                  return (
                    <motion.div
                      key={p.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        submitted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                      animate={submitted ? { scale: [1, 1.2, 1] } : {}}
                    >
                      {getPlayerInitial(p)}
                    </motion.div>
                  );
                })}
              </div>
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
                        onClick={() => { setSelectedVote(player.id); playPop(); }}
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
              <div className="flex justify-center gap-1 mb-2">
                {players.map((p) => {
                  const voted = votes.some(
                    (v) => v.round_id === currentRound?.id && v.voter_id === p.id
                  );
                  return (
                    <motion.div
                      key={p.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        voted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                      animate={voted ? { scale: [1, 1.2, 1] } : {}}
                    >
                      {getPlayerInitial(p)}
                    </motion.div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground font-body">
                {votesSubmittedCount}/{totalPlayers}
              </p>
            </motion.div>
          )}

          {/* SUSPENSE PHASE */}
          {phase === "suspense" && (
            <motion.div
              key="suspense"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center w-full max-w-sm"
            >
              <motion.h2
                className="font-display text-2xl font-bold text-foreground mb-6"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                {t("game.whoIsIt") || "Who is the fake...?"}
              </motion.h2>
              <div className="grid grid-cols-2 gap-3">
                {players.map((player, i) => {
                  const isHighlighted = suspenseHighlight === player.id;
                  return (
                    <motion.div
                      key={player.id}
                      className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition-all ${
                        isHighlighted
                          ? "bg-destructive/20 ring-2 ring-destructive shadow-lg"
                          : "bg-card shadow-card"
                      }`}
                      animate={isHighlighted ? { scale: 1.08 } : { scale: 1 }}
                      transition={{ duration: 0.1 }}
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-xl"
                        style={{ background: COLORS[i % COLORS.length] }}
                      >
                        {getPlayerInitial(player)}
                      </div>
                      <span className="font-display font-semibold text-xs text-foreground">
                        {getPlayerName(player)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* REVEAL */}
          {phase === "reveal" && currentRound && (
            <motion.div
              key="reveal"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-center w-full max-w-sm"
            >
              {(() => {
                const fakePlayer = players.find((p) => p.id === currentRound.fake_player_id);
                const fakeName = fakePlayer ? getPlayerName(fakePlayer) : "?";
                const fakeIdx = fakePlayer ? players.indexOf(fakePlayer) : 0;
                const caught = mostVotedPlayerId === currentRound.fake_player_id;
                return (
                  <>
                    {/* Fake player card */}
                    <motion.div
                      className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl font-display font-bold border-4 ${
                        caught ? "border-primary" : "border-destructive"
                      }`}
                      style={{ background: COLORS[fakeIdx % COLORS.length] }}
                      initial={{ rotateY: 180 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    >
                      {fakePlayer ? getPlayerInitial(fakePlayer) : "?"}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <p className="font-display text-xl font-bold text-foreground mb-1">
                        {fakeName} {t("game.wasFake")}
                      </p>
                    </motion.div>

                    <AnimatePresence>
                      {showRevealResult && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {/* Result badge */}
                          <motion.div
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-display font-bold mb-4 ${
                              caught
                                ? "bg-primary/20 text-primary"
                                : "bg-destructive/20 text-destructive"
                            }`}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.4 }}
                          >
                            {caught ? (
                              <>
                                <Shield className="w-5 h-5" />
                                🎉 {t("game.youCaughtFake")}
                              </>
                            ) : (
                              <>
                                <Skull className="w-5 h-5" />
                                😈 {t("game.fakeSurvived")}
                              </>
                            )}
                          </motion.div>

                          {/* Word reveal */}
                          <motion.div
                            className="bg-card rounded-2xl p-4 shadow-card mb-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            <p className="text-xs text-muted-foreground font-body mb-1">
                              {t("game.theWordWas")}
                            </p>
                            <p className="font-display text-2xl font-bold text-primary">
                              {language === "he" ? currentRound.word_he : currentRound.word_en}
                            </p>
                          </motion.div>

                          {/* Score breakdown */}
                          <div className="space-y-1.5 mb-4">
                            {players
                              .slice()
                              .sort((a, b) => (cumulativeScores[b.id] || 0) - (cumulativeScores[a.id] || 0))
                              .map((p, i) => {
                                const rs = roundScores[p.id] || 0;
                                const total = cumulativeScores[p.id] || 0;
                                return (
                                  <motion.div
                                    key={p.id}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 + i * 0.1 }}
                                    className="flex items-center justify-between text-sm px-3 py-2 bg-background rounded-xl"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-display font-bold text-xs text-muted-foreground w-4">{i + 1}</span>
                                      <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-primary-foreground font-bold text-[10px]"
                                        style={{ background: COLORS[players.indexOf(p) % COLORS.length] }}
                                      >
                                        {getPlayerInitial(p)}
                                      </div>
                                      <span className="font-body text-foreground">{getPlayerName(p)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {rs > 0 && (
                                        <motion.span
                                          className="text-xs font-display font-bold text-primary"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ type: "spring", delay: 0.6 + i * 0.1 }}
                                        >
                                          +{rs}
                                        </motion.span>
                                      )}
                                      <span className="font-display font-bold text-foreground">{total}</span>
                                    </div>
                                  </motion.div>
                                );
                              })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {showRevealResult && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                      >
                        <Button variant="hero" size="lg" className="w-full" onClick={handleNextRound}>
                          {roundNumber < totalRounds ? t("game.nextRound") : t("game.results")}
                        </Button>
                      </motion.div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GameScreen;
