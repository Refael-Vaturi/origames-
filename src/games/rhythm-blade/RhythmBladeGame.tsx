import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { playClick } from "@/hooks/useSound";
import { useGameFirstVisit } from "@/hooks/useGameFirstVisit";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";
import { RhythmAudio } from "./audioEngine";
import { createInitialState, handleBeat, resolveInput, tick } from "./engine";
import { render } from "./renderer";
import { Direction, GameState, Phase } from "./types";

const BEST_KEY = "rhythmBladeBest";
const SWIPE_MIN_PX = 24;

const RhythmBladeGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitScore, userId } = useArcadeScore("rhythm_blade");
  const { isFirstVisit, markSeen } = useGameFirstVisit("rhythm-blade");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<RhythmAudio | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const prevPhaseRef = useRef<Phase>("menu");
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const [phase, setPhase] = useState<Phase>("menu");
  const [finalScore, setFinalScore] = useState(0);
  const [finalCombo, setFinalCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
      if (saved > 0) setBest(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const handleDirection = useCallback((dir: Direction) => {
    const audio = audioRef.current;
    const s = stateRef.current;
    if (!audio || s.phase !== "playing") return;
    const result = resolveInput(s, dir, audio.now());
    if (result === "perfect" || result === "good") audio.playHitSound(result === "perfect");
  }, []);

  const startGame = useCallback(() => {
    playClick();
    markSeen();
    audioRef.current?.stop();
    const audio = new RhythmAudio();
    audioRef.current = audio;
    const s = createInitialState();
    s.phase = "playing";
    stateRef.current = s;
    prevPhaseRef.current = "playing";
    audio.onBeat = (time, beatIndex) => handleBeat(stateRef.current, time, beatIndex);
    audio.start();
    setPhase("playing");
  }, [markSeen]);

  // Keyboard input
  useEffect(() => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
    };
    const onKey = (e: KeyboardEvent) => {
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        handleDirection(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleDirection]);

  // Swipe input
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX && Math.abs(dy) < SWIPE_MIN_PX) return;
    const dir: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    handleDirection(dir);
  };

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = (time: number) => {
      const s = stateRef.current;
      const audio = audioRef.current;
      const audioNow = audio?.now() ?? 0;

      if (s.phase === "playing") {
        tick(s, audioNow);
        const phaseAfter = s.phase as Phase;
        if (phaseAfter === "gameover" && prevPhaseRef.current === "playing") {
          audio?.stop();
          setFinalScore(s.score);
          setFinalCombo(s.maxCombo);
          if (s.score > best) {
            setBest(s.score);
            try {
              localStorage.setItem(BEST_KEY, String(s.score));
            } catch {
              /* ignore */
            }
          }
          setPhase("gameover");
        }
        prevPhaseRef.current = phaseAfter;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      render(ctx, s, w, h, audioNow, time);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [best]);

  // Stop audio on unmount
  useEffect(() => () => audioRef.current?.stop(), []);

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: "Sign in to submit your score" });
      navigate("/auth?redirect=/rhythm-blade");
      return;
    }
    const r = await submitScore(finalScore, 1, { maxCombo: finalCombo });
    if (r.ok) {
      toast({ title: "Score submitted!", description: `${finalScore} points` });
      setRefreshKey((k) => k + 1);
    } else {
      toast({ title: "Failed to submit", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      <canvas ref={canvasRef} className="absolute inset-0" onPointerDown={onPointerDown} onPointerUp={onPointerUp} />

      <div className="absolute top-3 left-3 z-20">
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }} className="text-white/80 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      <AnimatePresence>
        {phase === "menu" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <div className="max-w-sm w-full text-center text-white space-y-5">
              <motion.div
                className="text-6xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                🎧
              </motion.div>
              <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Rhythm Blade
              </h1>
              {isFirstVisit ? (
                <p className="text-sm text-white/70">
                  Colored blocks fly toward the center on the beat. Press the matching{" "}
                  <span className="text-purple-300 font-semibold">arrow key</span> (or swipe) right as each one
                  reaches the ring. Chain 10 hits for <span className="text-yellow-300 font-semibold">Hyper Drive</span>{" "}
                  — triple points until you miss.
                </p>
              ) : (
                <p className="text-xs text-white/50">Slice blocks on the beat. Chain combos for Hyper Drive.</p>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-white/50">
                <Trophy className="w-4 h-4 text-amber-400" /> Best: {best}
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 text-white font-bold shadow-[0_0_30px_rgba(192,132,252,0.35)]"
                  onClick={startGame}
                >
                  Start
                </Button>
              </motion.div>
              <div className="pt-2">
                <ArcadeLeaderboard gameId="rhythm_blade" currentUserId={userId} refreshKey={refreshKey} />
              </div>
            </div>
          </motion.div>
        )}

        {phase === "gameover" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          >
            <div className="max-w-sm w-full text-center text-white space-y-4">
              <motion.div
                className="text-5xl"
                initial={{ scale: 0.5, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 12 }}
              >
                💔
              </motion.div>
              <h2 className="text-2xl font-display font-bold">Life's Empty</h2>
              <div className="text-4xl font-black tabular-nums bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {finalScore}
              </div>
              <div className="text-xs text-white/60">Max combo: {finalCombo}</div>
              {finalScore >= best && finalScore > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-1.5 text-amber-400 text-sm font-semibold"
                >
                  <Sparkles className="w-4 h-4" /> New Best!
                </motion.div>
              )}
              <div className="flex gap-2">
                <motion.div className="flex-1" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button variant="outline" className="w-full border-white/30 text-white" onClick={submitToLeaderboard}>
                    Submit Score
                  </Button>
                </motion.div>
                <motion.div className="flex-1" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold" onClick={startGame}>
                    Retry
                  </Button>
                </motion.div>
              </div>
              <ArcadeLeaderboard gameId="rhythm_blade" currentUserId={userId} refreshKey={refreshKey} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "playing" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-white/40 text-xs pointer-events-none">
          Arrow keys / WASD / swipe
        </div>
      )}
    </div>
  );
};

export default RhythmBladeGame;
