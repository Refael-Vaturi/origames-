import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Sparkles, ChevronLeft, ChevronRight, Wind, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { playClick } from "@/hooks/useSound";
import { useGameFirstVisit } from "@/hooks/useGameFirstVisit";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";
import { createInitialState, update } from "./engine";
import { render } from "./renderer";
import { GameState, InputState, Phase } from "./types";
import { getSafeAreaInsetPx } from "@/lib/safeArea";

const BEST_KEY = "velocityDriftBest";

const VelocityDriftGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitScore, userId } = useArcadeScore("velocity_drift");
  const { isFirstVisit, markSeen } = useGameFirstVisit("velocity-drift");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>({ steer: 0, drift: false, nitro: false });
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const prevPhaseRef = useRef<Phase>("menu");
  const safeAreaRef = useRef({ top: 0, bottom: 0 });

  const [phase, setPhase] = useState<Phase>("menu");
  const [finalScore, setFinalScore] = useState(0);
  const [best, setBest] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [safeArea, setSafeArea] = useState({ top: 0, bottom: 0 });

  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
      if (saved > 0) setBest(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const startGame = useCallback(() => {
    playClick();
    markSeen();
    const s = createInitialState();
    s.best = best;
    s.phase = "playing";
    stateRef.current = s;
    prevPhaseRef.current = "playing";
    setPhase("playing");
  }, [best, markSeen]);

  // Keyboard input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inp.steer = -1;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inp.steer = 1;
      else if (e.key === " " || e.key === "ArrowDown" || e.key === "s" || e.key === "S") inp.drift = true;
      else if (e.key === "Shift") inp.nitro = true;
      else return;
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (inp.steer === -1) inp.steer = 0;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (inp.steer === 1) inp.steer = 0;
      } else if (e.key === " " || e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        inp.drift = false;
      } else if (e.key === "Shift") {
        inp.nitro = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

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

      const insets = { top: getSafeAreaInsetPx("top"), bottom: getSafeAreaInsetPx("bottom") };
      safeAreaRef.current = insets;
      setSafeArea(insets);
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
      const dtMs = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = time;
      const s = stateRef.current;

      if (s.phase === "playing") {
        update(s, dtMs / 1000, inputRef.current);
        const phaseAfter = s.phase as Phase;
        if (phaseAfter === "gameover" && prevPhaseRef.current === "playing") {
          setFinalScore(s.score);
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
      if (s.shakeTimer > 0) {
        ctx.translate((Math.random() - 0.5) * 6 * s.shakeTimer * 4, (Math.random() - 0.5) * 6 * s.shakeTimer * 4);
      }
      render(ctx, s, w, h, time, safeAreaRef.current.top);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [best]);

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: "Sign in to submit your score" });
      navigate("/auth?redirect=/velocity-drift");
      return;
    }
    const r = await submitScore(finalScore, 1, {});
    if (r.ok) {
      toast({ title: "Score submitted!", description: `${finalScore} points` });
      setRefreshKey((k) => k + 1);
    } else {
      toast({ title: "Failed to submit", variant: "destructive" });
    }
  };

  // Touch controls
  const setSteer = (v: -1 | 0 | 1) => {
    inputRef.current.steer = v;
  };
  const setDrift = (v: boolean) => {
    inputRef.current.drift = v;
  };
  const setNitro = (v: boolean) => {
    inputRef.current.nitro = v;
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div className="absolute left-3 z-20" style={{ top: `calc(0.75rem + ${safeArea.top}px)` }}>
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }} className="text-white/80 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      {phase === "playing" && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 pointer-events-none"
          style={{ paddingBottom: `calc(1rem + ${safeArea.bottom}px)` }}
        >
          <div className="flex gap-2 pointer-events-auto">
            <button
              onPointerDown={() => setSteer(-1)}
              onPointerUp={() => setSteer(0)}
              onPointerLeave={() => setSteer(0)}
              className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-white active:bg-white/20"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onPointerDown={() => setSteer(1)}
              onPointerUp={() => setSteer(0)}
              onPointerLeave={() => setSteer(0)}
              className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-white active:bg-white/20"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <button
              onPointerDown={() => setNitro(true)}
              onPointerUp={() => setNitro(false)}
              onPointerLeave={() => setNitro(false)}
              className="w-16 h-16 rounded-2xl bg-cyan-500/20 backdrop-blur flex items-center justify-center text-cyan-300 active:bg-cyan-500/30"
            >
              <Zap className="w-7 h-7" />
            </button>
            <button
              onPointerDown={() => setDrift(true)}
              onPointerUp={() => setDrift(false)}
              onPointerLeave={() => setDrift(false)}
              className="w-20 h-16 rounded-2xl bg-rose-500/20 backdrop-blur flex items-center justify-center text-rose-300 active:bg-rose-500/30"
            >
              <Wind className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {phase === "menu" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <div className="max-w-sm w-full text-center text-white space-y-5">
              <div className="text-6xl">🏎️</div>
              <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-rose-400 to-cyan-400 bg-clip-text text-transparent">
                Velocity Drift
              </h1>
              {isFirstVisit ? (
                <p className="text-sm text-white/70">
                  Steer with <span className="text-rose-300 font-semibold">◀ ▶</span> (or A/D). Hold{" "}
                  <span className="text-rose-300 font-semibold">Drift</span> (Space/S, or the wind button) while
                  turning to slide through corners — chaining a clean drift builds your combo and fills the{" "}
                  <span className="text-cyan-300 font-semibold">Nitro</span> bar. Hold Shift (or the bolt button) to
                  burn nitro for a speed burst. Sliding off the road resets your combo.
                </p>
              ) : (
                <p className="text-xs text-white/50">Drift through corners, chain combos, burn nitro.</p>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-white/50">
                <Trophy className="w-4 h-4 text-amber-400" /> Best: {best}
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-rose-500 to-cyan-500 hover:opacity-90 text-white font-bold shadow-[0_0_30px_rgba(244,63,94,0.35)]"
                  onClick={startGame}
                >
                  Start Run
                </Button>
              </motion.div>
              <div className="pt-2">
                <ArcadeLeaderboard gameId="velocity_drift" currentUserId={userId} refreshKey={refreshKey} />
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
                🏁
              </motion.div>
              <h2 className="text-2xl font-display font-bold">Time's Up</h2>
              <div className="text-4xl font-black tabular-nums bg-gradient-to-r from-rose-400 to-cyan-400 bg-clip-text text-transparent">
                {finalScore}
              </div>
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
                  <Button className="w-full bg-gradient-to-r from-rose-500 to-cyan-500 text-white font-bold" onClick={startGame}>
                    Retry
                  </Button>
                </motion.div>
              </div>
              <ArcadeLeaderboard gameId="velocity_drift" currentUserId={userId} refreshKey={refreshKey} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VelocityDriftGame;
