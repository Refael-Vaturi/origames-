import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Sparkles, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { playClick, playWhoosh, playError, playSuccess } from "@/hooks/useSound";
import { useGameFirstVisit } from "@/hooks/useGameFirstVisit";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";
import { createInitialState, jump, update } from "./engine";
import { render } from "./renderer";
import { GameState, Phase } from "./types";
import { getSafeAreaInsetPx } from "@/lib/safeArea";

const BEST_KEY = "wobbleRaceBest";

const WobbleRaceGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { submitScore, userId } = useArcadeScore("wobble_race");
  const { isFirstVisit, markSeen } = useGameFirstVisit("wobble-race");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const prevPhaseRef = useRef<Phase>("menu");
  const safeAreaRef = useRef({ top: 0, bottom: 0 });
  const wasFallingRef = useRef(false);
  const wasKnockedRef = useRef(false);

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
    wasFallingRef.current = false;
    wasKnockedRef.current = false;
    setPhase("playing");
  }, [best, markSeen]);

  // Input: keyboard + tap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump(stateRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
        update(s, dtMs / 1000);

        if (s.falling && !wasFallingRef.current) playError();
        wasFallingRef.current = s.falling;
        if (s.knockTimer > 0 && !wasKnockedRef.current) playError();
        wasKnockedRef.current = s.knockTimer > 0;

        const phaseAfter = s.phase as Phase;
        if ((phaseAfter === "finished" || phaseAfter === "gameover") && prevPhaseRef.current === "playing") {
          setFinalScore(s.score);
          if (phaseAfter === "finished") playSuccess();
          if (s.score > best) {
            setBest(s.score);
            try {
              localStorage.setItem(BEST_KEY, String(s.score));
            } catch {
              /* ignore */
            }
          }
          setPhase(phaseAfter);
        }
        prevPhaseRef.current = phaseAfter;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.save();
      if (s.shakeTimer > 0) {
        ctx.translate((Math.random() - 0.5) * 8 * s.shakeTimer * 3, (Math.random() - 0.5) * 8 * s.shakeTimer * 3);
      }
      render(ctx, s, w, h, time, safeAreaRef.current.top);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [best]);

  const handleTap = () => {
    if (phase !== "playing") return;
    const before = stateRef.current.grounded;
    jump(stateRef.current);
    if (before) playWhoosh();
  };

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: t("arcade.signInToSubmit") });
      navigate("/auth?redirect=/wobble-race");
      return;
    }
    const r = await submitScore(finalScore, 1, {});
    if (r.ok) {
      toast({ title: t("arcade.scoreSubmittedToast"), description: `${finalScore} points` });
      setRefreshKey((k) => k + 1);
    } else {
      toast({ title: t("arcade.failedToSubmit"), variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      <canvas ref={canvasRef} className="absolute inset-0" onPointerDown={handleTap} />

      <div className="absolute left-3 z-20" style={{ top: `calc(0.75rem + ${safeArea.top}px)` }}>
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }} className="text-white/90 hover:text-white bg-black/20 hover:bg-black/30">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("arcade.back")}
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
              <div className="text-6xl">🟡</div>
              <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-yellow-400 to-sky-400 bg-clip-text text-transparent">
                Wobble Race
              </h1>
              {isFirstVisit ? (
                <p className="text-sm text-white/70">{t("wobbleRace.intro")}</p>
              ) : (
                <p className="text-xs text-white/50">{t("wobbleRace.tagline")}</p>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-white/50">
                <Trophy className="w-4 h-4 text-amber-400" /> {t("arcade.bestLabel")}: {best}
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-yellow-500 to-sky-500 hover:opacity-90 text-white font-bold shadow-[0_0_30px_rgba(250,204,21,0.35)]"
                  onClick={startGame}
                >
                  {t("wobbleRace.start")}
                </Button>
              </motion.div>
              <div className="pt-2">
                <ArcadeLeaderboard gameId="wobble_race" currentUserId={userId} refreshKey={refreshKey} />
              </div>
            </div>
          </motion.div>
        )}

        {(phase === "finished" || phase === "gameover") && (
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
                {phase === "finished" ? <Flag className="w-14 h-14 mx-auto text-sky-300" /> : "⏱️"}
              </motion.div>
              <h2 className="text-2xl font-display font-bold">{phase === "finished" ? t("wobbleRace.finished") : t("wobbleRace.timeUp")}</h2>
              <div className="text-4xl font-black tabular-nums bg-gradient-to-r from-yellow-400 to-sky-400 bg-clip-text text-transparent">
                {finalScore}
              </div>
              {finalScore >= best && finalScore > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-1.5 text-amber-400 text-sm font-semibold"
                >
                  <Sparkles className="w-4 h-4" /> {t("arcade.newBest")}
                </motion.div>
              )}
              <div className="flex gap-2">
                <motion.div className="flex-1" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button variant="outline" className="w-full border-white/30 text-white" onClick={submitToLeaderboard}>
                    {t("arcade.submitScore")}
                  </Button>
                </motion.div>
                <motion.div className="flex-1" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-sky-500 text-white font-bold" onClick={startGame}>
                    {t("arcade.retry")}
                  </Button>
                </motion.div>
              </div>
              <ArcadeLeaderboard gameId="wobble_race" currentUserId={userId} refreshKey={refreshKey} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WobbleRaceGame;
