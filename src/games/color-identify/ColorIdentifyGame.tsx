import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Trophy, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { playClick, playPop, playError, playSuccess, playLevelUp } from "@/hooks/useSound";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";

type Phase = "intro" | "playing" | "tier-complete" | "game-over";

interface Tier {
  tier: number;
  gridSize: number; // NxN
  delta: number; // lightness delta 0..40 (lower = harder)
  timePerRound: number; // seconds
  rounds: number;
}

const TIERS: Tier[] = [
  { tier: 1, gridSize: 2, delta: 30, timePerRound: 8, rounds: 5 },
  { tier: 2, gridSize: 3, delta: 22, timePerRound: 7, rounds: 5 },
  { tier: 3, gridSize: 4, delta: 16, timePerRound: 6, rounds: 6 },
  { tier: 4, gridSize: 5, delta: 11, timePerRound: 5, rounds: 6 },
  { tier: 5, gridSize: 6, delta: 7, timePerRound: 5, rounds: 7 },
  { tier: 6, gridSize: 7, delta: 5, timePerRound: 4, rounds: 8 },
];

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const ColorIdentifyGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitScore, userId } = useArcadeScore("color_identify");

  const [phase, setPhase] = useState<Phase>("intro");
  const [tierIdx, setTierIdx] = useState(0);
  const [roundInTier, setRoundInTier] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Round state
  const [baseHue, setBaseHue] = useState(220);
  const [baseLight, setBaseLight] = useState(50);
  const [oddIndex, setOddIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const tier = TIERS[Math.min(tierIdx, TIERS.length - 1)];

  const newRound = useCallback(() => {
    const hue = randInt(0, 359);
    const light = randInt(35, 65);
    setBaseHue(hue);
    setBaseLight(light);
    setOddIndex(randInt(0, tier.gridSize * tier.gridSize - 1));
    setTimeLeft(tier.timePerRound);
    setFeedback(null);
  }, [tier]);

  const startGame = () => {
    playWhoosh();
    setScore(0);
    setLives(3);
    setStreak(0);
    setTierIdx(0);
    setRoundInTier(0);
    setSubmitted(false);
    setPhase("playing");
    newRound();
  };

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      handleAnswer(-1);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 0.1), 100);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  const handleAnswer = (idx: number) => {
    if (phase !== "playing" || feedback) return;
    const correct = idx === oddIndex;
    if (correct) {
      const timeBonus = Math.max(0, Math.round(timeLeft * 10));
      const streakBonus = streak * 5;
      const tierBonus = tier.tier * 10;
      const gain = 50 + timeBonus + streakBonus + tierBonus;
      setScore((s) => s + gain);
      setStreak((s) => s + 1);
      setFeedback("correct");
      playSuccess();
      toast({ title: `+${gain}`, description: streak >= 2 ? `${streak + 1}× streak!` : undefined });
    } else {
      setLives((l) => l - 1);
      setStreak(0);
      setFeedback("wrong");
      playError();
    }

    setTimeout(() => {
      // game over check
      if (!correct && lives - 1 <= 0) {
        setPhase("game-over");
        return;
      }
      const nextRound = roundInTier + 1;
      if (correct && nextRound >= tier.rounds) {
        setPhase("tier-complete");
        return;
      }
      setRoundInTier(nextRound);
      newRound();
    }, 600);
  };

  const nextTier = () => {
    playLevelUp();
    if (tierIdx + 1 >= TIERS.length) {
      // reached the end — keep playing on hardest tier
      setTierIdx(TIERS.length - 1);
    } else {
      setTierIdx((t) => t + 1);
    }
    setRoundInTier(0);
    setPhase("playing");
    setTimeout(newRound, 50);
  };

  const submitFinalScore = useCallback(async () => {
    if (submitted) return;
    if (!user) {
      toast({ title: "Sign in to submit your score" });
      return;
    }
    const r = await submitScore(score, tier.tier, { highest_tier: tier.tier });
    if (r.ok) {
      setSubmitted(true);
      toast({ title: "Score submitted!" });
      setRefreshKey((k) => k + 1);
    }
  }, [submitScore, score, tier.tier, user, submitted]);

  useEffect(() => {
    if (phase === "game-over") submitFinalScore();
  }, [phase, submitFinalScore]);

  const cells = useMemo(() => {
    return Array.from({ length: tier.gridSize * tier.gridSize }, (_, i) => i);
  }, [tier.gridSize]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="font-display font-bold text-lg">Identify the Color</h1>
        <div className="w-16" />
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 p-4 max-w-6xl mx-auto w-full flex-1">
        <div className="flex flex-col items-center gap-4">
          {/* HUD */}
          <div className="flex items-center justify-between w-full max-w-md bg-card rounded-2xl px-4 py-2 shadow-card">
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-5 h-5 ${i < lives ? "text-game-red fill-game-red" : "text-muted opacity-30"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="tabular-nums">{score}</span>
            </div>
            <div className="text-xs font-semibold text-primary">
              Tier {tier.tier} · {roundInTier + 1}/{tier.rounds}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center max-w-md mt-8 bg-card rounded-2xl p-6 shadow-card"
              >
                <h2 className="font-display text-2xl font-bold mb-2">Find the Different Color</h2>
                <p className="text-muted-foreground mb-4">
                  Spot the one tile that doesn't match. Tiers get harder, colors get closer. Three lives.
                </p>
                <Button onClick={startGame} size="lg" className="w-full">
                  Start
                </Button>
              </motion.div>
            )}

            {phase === "playing" && (
              <motion.div
                key="play"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 w-full"
              >
                <div className="w-full max-w-md flex items-center gap-2">
                  <Timer className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-game-pink"
                      animate={{ width: `${(timeLeft / tier.timePerRound) * 100}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  </div>
                </div>

                <div
                  className={`grid gap-2 w-full max-w-md aspect-square p-1 rounded-2xl transition-colors ${
                    feedback === "correct" ? "bg-game-green/30" : feedback === "wrong" ? "bg-destructive/30" : ""
                  }`}
                  style={{ gridTemplateColumns: `repeat(${tier.gridSize}, 1fr)` }}
                >
                  {cells.map((i) => {
                    const isOdd = i === oddIndex;
                    const light = isOdd
                      ? Math.max(10, Math.min(90, baseLight + tier.delta))
                      : baseLight;
                    return (
                      <motion.button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-lg shadow-sm transition-transform"
                        style={{ background: `hsl(${baseHue} 70% ${light}%)` }}
                        aria-label={`Tile ${i + 1}`}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}

            {phase === "tier-complete" && (
              <motion.div
                key="tier"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center bg-card rounded-2xl p-6 shadow-card mt-8"
              >
                <h2 className="font-display text-2xl font-bold mb-2">Tier {tier.tier} Complete!</h2>
                <p className="text-muted-foreground mb-4">Score: {score}</p>
                <Button onClick={nextTier} size="lg">Next Tier →</Button>
              </motion.div>
            )}

            {phase === "game-over" && (
              <motion.div
                key="over"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center bg-card rounded-2xl p-6 shadow-card mt-8 max-w-md w-full"
              >
                <h2 className="font-display text-3xl font-bold mb-2">Game Over</h2>
                <p className="text-5xl font-display font-bold bg-gradient-to-r from-primary to-game-pink bg-clip-text text-transparent my-4">
                  {score}
                </p>
                <p className="text-sm text-muted-foreground mb-4">Reached Tier {tier.tier}</p>
                <div className="flex gap-2">
                  <Button onClick={startGame} className="flex-1">Play Again</Button>
                  <Button variant="outline" onClick={() => navigate("/")} className="flex-1">Home</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside>
          <ArcadeLeaderboard gameId="color_identify" currentUserId={userId} refreshKey={refreshKey} />
        </aside>
      </div>
    </div>
  );
};

// local helper to avoid extra import
const playWhoosh = () => playPop();

export default ColorIdentifyGame;
