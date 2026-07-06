import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Clock, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { playClick, playWhoosh, playPop, playError, playSuccess } from "@/hooks/useSound";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";
import { createInitialState, update, addTrailParticle, spawnBurst } from "./engine";
import { render, corridorY, PLAYER_SCREEN_X_RATIO } from "./renderer";
import { GameState, Phase } from "./types";

const BEST_KEY = "gravityFlipBest";

const GravityFlipGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitScore, userId } = useArcadeScore("gravity_flip");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const flipQueuedRef = useRef(false);
  const prevPhaseRef = useRef<Phase>("menu");

  const [phase, setPhase] = useState<Phase>("menu");
  const [finalScore, setFinalScore] = useState(0);
  const [best, setBest] = useState(0);
  const [rewindSaved, setRewindSaved] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
      if (saved > 0) {
        setBest(saved);
        stateRef.current.best = saved;
      }
    } catch {}
  }, []);

  const requestFlip = useCallback(() => {
    if (stateRef.current.phase === "playing") {
      flipQueuedRef.current = true;
    }
  }, []);

  const startGame = useCallback(() => {
    playClick();
    const s = createInitialState();
    s.best = best;
    s.phase = "playing";
    stateRef.current = s;
    prevPhaseRef.current = "playing";
    setPhase("playing");
    setRewindSaved(false);
  }, [best]);

  // Input handling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        requestFlip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestFlip]);

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
      const dtMs = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = time;
      const w = window.innerWidth;
      const h = window.innerHeight;

      const s = stateRef.current;
      const wasPlaying = s.phase === "playing";
      const flip = wasPlaying && flipQueuedRef.current;
      flipQueuedRef.current = false;
      const wasCharges = s.rewindCharges;

      // Always step the engine (even outside "playing") so cosmetic effects
      // like the death particle burst and screen shake finish animating
      // instead of freezing behind the game-over screen.
      update(s, dtMs / 1000, flip);
      const phaseAfter = s.phase as Phase;

      if (wasPlaying) {
        if (flip) playWhoosh();

        if (s.collectedThisFrame.length > 0) {
          playPop();
          const { ceil, floor } = corridorY(h);
          for (const shard of s.collectedThisFrame) {
            const sx = w * PLAYER_SCREEN_X_RATIO + (shard.worldX - s.distance);
            const sy = ceil + shard.worldY * (floor - ceil);
            spawnBurst(s, sx, sy, "#c084fc", 16);
          }
        }

        // Trail particle
        if (Math.random() < 0.6) {
          const { ceil, floor } = corridorY(h);
          const px = w * PLAYER_SCREEN_X_RATIO;
          const py = ceil + s.y * (floor - ceil);
          addTrailParticle(s, px, py);
        }

        if (phaseAfter === "gameover" && prevPhaseRef.current === "playing") {
          const { ceil, floor } = corridorY(h);
          const px = w * PLAYER_SCREEN_X_RATIO;
          const py = ceil + s.y * (floor - ceil);
          spawnBurst(s, px, py, "#f43f5e", 26);
          playError();
          setFinalScore(s.score);
          if (s.score > best) {
            setBest(s.score);
            try { localStorage.setItem(BEST_KEY, String(s.score)); } catch {}
          }
          setPhase("gameover");
        } else if (phaseAfter === "playing" && wasCharges > s.rewindCharges && prevPhaseRef.current === "playing") {
          // A rewind happened this frame (charges dropped without going to gameover)
          playSuccess();
          setRewindSaved(true);
          setTimeout(() => setRewindSaved(false), 1200);
        }
      }
      prevPhaseRef.current = phaseAfter;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (s.shakeTimer > 0) {
        ctx.translate((Math.random() - 0.5) * 8 * s.shakeTimer * 5, (Math.random() - 0.5) * 8 * s.shakeTimer * 5);
      }
      render(ctx, s, w, h, time);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [best]);

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: "Sign in to submit your score" });
      navigate("/auth?redirect=/gravity-flip");
      return;
    }
    const r = await submitScore(finalScore, 1, { best });
    if (r.ok) {
      toast({ title: "Score submitted!", description: `${finalScore} points` });
      setRefreshKey((k) => k + 1);
    } else {
      toast({ title: "Failed to submit", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onPointerDown={() => {
          if (phase === "playing") requestFlip();
        }}
      />

      <div className="absolute top-3 left-3 z-20 pointer-events-auto">
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }} className="text-white/80 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      <AnimatePresence>
        {rewindSaved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-purple-600/80 text-white text-sm font-bold flex items-center gap-1.5 pointer-events-none"
          >
            <Clock className="w-4 h-4" /> Rewound 3 seconds!
          </motion.div>
        )}
      </AnimatePresence>

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
                animate={{ rotate: 180 }}
                transition={{ duration: 2.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              >
                🌀
              </motion.div>
              <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Gravity Flip
              </h1>
              <p className="text-sm text-white/70">
                Tap anywhere (or press Space) to flip gravity. Dodge spikes and walls, drift through
                antigrav zones, and grab <span className="text-purple-300 font-semibold">Chronos Shards</span> —
                each one lets you rewind 3 seconds after a fatal hit.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-white/50">
                <Trophy className="w-4 h-4 text-amber-400" /> Best: {best}
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-white font-bold shadow-[0_0_30px_rgba(34,211,238,0.35)]"
                  onClick={startGame}
                >
                  Start Run
                </Button>
              </motion.div>
              <div className="pt-2">
                <ArcadeLeaderboard gameId="gravity_flip" currentUserId={userId} refreshKey={refreshKey} />
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
                💥
              </motion.div>
              <h2 className="text-2xl font-display font-bold">Run Over</h2>
              <div className="text-4xl font-black tabular-nums bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
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
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold" onClick={startGame}>
                    Retry
                  </Button>
                </motion.div>
              </div>
              <ArcadeLeaderboard gameId="gravity_flip" currentUserId={userId} refreshKey={refreshKey} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "playing" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 text-white/40 text-xs pointer-events-none">
          <Zap className="w-3.5 h-3.5" /> Tap to flip gravity
        </div>
      )}
    </div>
  );
};

export default GravityFlipGame;
