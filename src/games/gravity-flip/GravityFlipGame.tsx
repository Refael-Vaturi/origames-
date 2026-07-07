import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Clock, Sparkles, Trophy } from "lucide-react";
import { GravityFlipGlyph } from "./MenuArt";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { playClick, playWhoosh, playPop, playError, playSuccess } from "@/hooks/useSound";
import { useGameFirstVisit } from "@/hooks/useGameFirstVisit";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";
import { createInitialState, update, addTrailParticle, spawnBurst } from "./engine";
import { render, corridorY, PLAYER_SCREEN_X_RATIO } from "./renderer";
import { GameState, Phase } from "./types";
import { getSafeAreaInsetPx } from "@/lib/safeArea";

const BEST_KEY = "gravityFlipBest";

const GravityFlipGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitScore, userId } = useArcadeScore("gravity_flip");
  const { isFirstVisit, markSeen } = useGameFirstVisit("gravity-flip");
  const { t } = useLanguage();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const flipQueuedRef = useRef(false);
  const prevPhaseRef = useRef<Phase>("menu");
  const safeAreaRef = useRef({ top: 0, bottom: 0 });
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const [phase, setPhase] = useState<Phase>("menu");
  const [finalScore, setFinalScore] = useState(0);
  const [best, setBest] = useState(0);
  const [rewindSaved, setRewindSaved] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [safeArea, setSafeArea] = useState({ top: 0, bottom: 0 });

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
    markSeen();
    const s = createInitialState();
    s.best = best;
    s.phase = "playing";
    stateRef.current = s;
    prevPhaseRef.current = "playing";
    setPhase("playing");
    setRewindSaved(false);
  }, [best, markSeen]);

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
      render(ctx, s, w, h, time, safeAreaRef.current.top, tRef.current("hud.best"));
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [best]);

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: t("arcade.signInToSubmit") });
      navigate("/auth?redirect=/gravity-flip");
      return;
    }
    const r = await submitScore(finalScore, 1, { best });
    if (r.ok) {
      toast({ title: t("arcade.scoreSubmittedToast"), description: `${finalScore} points` });
      setRefreshKey((k) => k + 1);
    } else {
      toast({ title: t("arcade.failedToSubmit"), variant: "destructive" });
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

      <div className="absolute left-3 z-20 pointer-events-auto" style={{ top: `calc(0.75rem + ${safeArea.top}px)` }}>
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }} className="text-white/80 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("arcade.back")}
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
            <Clock className="w-4 h-4" /> {t("gravityFlip.rewound")}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "menu" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 overflow-y-auto p-5"
            style={{ background: "radial-gradient(ellipse at 50% 30%, #1c0f3d 0%, #0b0620 65%)" }}
          >
            <div className="max-w-sm w-full mx-auto min-h-full flex flex-col justify-center text-white py-8">
              <div className="flex items-start justify-between gap-4">
                <div className="text-start">
                  <p className="text-[11px] tracking-[0.3em] uppercase text-cyan-300/70 font-display mb-1">Reflex Runner</p>
                  <h1 className="text-4xl font-display font-black leading-[0.95] text-white">
                    Gravity<br />Flip
                  </h1>
                  <div className="mt-2 h-1 w-14 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400" />
                </div>
                <GravityFlipGlyph className="w-24 h-20 shrink-0 mt-1" />
              </div>

              <p className="text-sm text-white/60 mt-5 max-w-[85%]">
                {isFirstVisit ? t("gravityFlip.intro") : t("gravityFlip.tagline")}
              </p>

              <div className="flex items-center gap-2 text-xs text-white/50 mt-4">
                <Trophy className="w-4 h-4 text-amber-400" /> {t("arcade.bestLabel")}: {best}
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="mt-6">
                <Button
                  size="lg"
                  className="w-full bg-cyan-400 hover:bg-cyan-300 text-[#0b0620] font-display font-bold text-base shadow-[0_0_40px_rgba(34,211,238,0.4)]"
                  onClick={startGame}
                >
                  {t("gravityFlip.start")}
                </Button>
              </motion.div>

              <div className="mt-6 border-t border-white/10 pt-4">
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
            className="absolute inset-0 z-30 overflow-y-auto p-5"
            style={{ background: "radial-gradient(ellipse at 50% 30%, #1c0f3d 0%, #0b0620 65%)" }}
          >
            <div className="max-w-sm w-full mx-auto min-h-full flex flex-col justify-center text-white py-8 text-center">
              <motion.div
                className="mx-auto"
                initial={{ scale: 0.5, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 12 }}
              >
                <GravityFlipGlyph className="w-20 h-16" />
              </motion.div>
              <h2 className="text-2xl font-display font-bold mt-2">{t("gravityFlip.gameOver")}</h2>
              <div className="text-5xl font-display font-black tabular-nums text-cyan-300 mt-1">
                {finalScore}
              </div>
              {finalScore >= best && finalScore > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-1.5 text-amber-400 text-sm font-semibold mt-2"
                >
                  <Sparkles className="w-4 h-4" /> {t("arcade.newBest")}
                </motion.div>
              )}
              <div className="flex gap-2 mt-5">
                <motion.div className="flex-1" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button variant="outline" className="w-full border-white/30 text-white" onClick={submitToLeaderboard}>
                    {t("arcade.submitScore")}
                  </Button>
                </motion.div>
                <motion.div className="flex-1" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button className="w-full bg-cyan-400 hover:bg-cyan-300 text-[#0b0620] font-bold" onClick={startGame}>
                    {t("arcade.retry")}
                  </Button>
                </motion.div>
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <ArcadeLeaderboard gameId="gravity_flip" currentUserId={userId} refreshKey={refreshKey} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "playing" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 text-white/40 text-xs pointer-events-none">
          <Zap className="w-3.5 h-3.5" /> {t("gravityFlip.tapToFlip")}
        </div>
      )}
    </div>
  );
};

export default GravityFlipGame;
