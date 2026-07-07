import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Sparkles, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { playClick, playSuccess, playError } from "@/hooks/useSound";
import { useGameFirstVisit } from "@/hooks/useGameFirstVisit";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";
import { buyGenerator, createInitialState, tapCell, update } from "./engine";
import { computeGridMetrics, render, screenToGrid } from "./renderer";
import { buyCost } from "./config";
import { GameState, Phase } from "./types";
import { getSafeAreaInsetPx } from "@/lib/safeArea";

const BEST_KEY = "mergeTycoonBest";

const MergeTycoonGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { submitScore, userId } = useArcadeScore("merge_tycoon");
  const { isFirstVisit, markSeen } = useGameFirstVisit("merge-tycoon");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const prevPhaseRef = useRef<Phase>("menu");
  const safeAreaRef = useRef({ top: 0, bottom: 0 });

  const [phase, setPhase] = useState<Phase>("menu");
  const [finalScore, setFinalScore] = useState(0);
  const [best, setBest] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [safeArea, setSafeArea] = useState({ top: 0, bottom: 0 });
  const [ui, setUi] = useState({ currency: 0, purchaseCount: 0 });

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
    setUi({ currency: s.currency, purchaseCount: s.purchaseCount });
    setPhase("playing");
  }, [best, markSeen]);

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

    let uiThrottle = 0;
    const loop = (time: number) => {
      const dtMs = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = time;
      const s = stateRef.current;

      if (s.phase === "playing") {
        update(s, dtMs / 1000);
        const phaseAfter = s.phase as Phase;
        if (phaseAfter === "gameover" && prevPhaseRef.current === "playing") {
          const score = Math.floor(s.totalEarned);
          setFinalScore(score);
          if (score > best) {
            setBest(score);
            try {
              localStorage.setItem(BEST_KEY, String(score));
            } catch {
              /* ignore */
            }
          }
          setPhase("gameover");
        }
        prevPhaseRef.current = phaseAfter;

        uiThrottle += dtMs;
        if (uiThrottle > 150) {
          uiThrottle = 0;
          setUi({ currency: s.currency, purchaseCount: s.purchaseCount });
        }
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      render(ctx, s, w, h, safeAreaRef.current.top, safeAreaRef.current.bottom);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [best]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const m = computeGridMetrics(window.innerWidth, window.innerHeight, safeAreaRef.current.top, safeAreaRef.current.bottom);
    const cell = screenToGrid(x, y, m);
    tapCell(stateRef.current, cell.row, cell.col);
  };

  const handleBuy = () => {
    const ok = buyGenerator(stateRef.current);
    if (ok) {
      playSuccess();
      setUi({ currency: stateRef.current.currency, purchaseCount: stateRef.current.purchaseCount });
    } else {
      playError();
    }
  };

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: t("arcade.signInToSubmit") });
      navigate("/auth?redirect=/merge-tycoon");
      return;
    }
    const r = await submitScore(finalScore, 1, {});
    if (r.ok) {
      toast({ title: t("arcade.scoreSubmittedToast"), description: `$${finalScore} earned` });
      setRefreshKey((k) => k + 1);
    } else {
      toast({ title: t("arcade.failedToSubmit"), variant: "destructive" });
    }
  };

  const cost = buyCost(ui.purchaseCount);
  const canAfford = ui.currency >= cost;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      <canvas ref={canvasRef} className="absolute inset-0" onPointerDown={handlePointerDown} />

      <div className="absolute left-3 z-20" style={{ top: `calc(0.75rem + ${safeArea.top}px)` }}>
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }} className="text-white/80 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("arcade.back")}
        </Button>
      </div>

      {phase === "playing" && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 pointer-events-none"
          style={{ paddingBottom: `calc(0.75rem + ${safeArea.bottom}px)` }}
        >
          <motion.div whileTap={{ scale: 0.95 }} className="pointer-events-auto">
            <Button
              size="lg"
              disabled={!canAfford}
              onClick={handleBuy}
              className={`font-bold shadow-lg ${
                canAfford
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  : "bg-white/10 text-white/40"
              }`}
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> {t("mergeTycoon.buyStand")} (${cost})
            </Button>
          </motion.div>
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
              <div className="text-6xl">🏪</div>
              <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                Merge Tycoon
              </h1>
              {isFirstVisit ? (
                <p className="text-sm text-white/70">{t("mergeTycoon.intro")}</p>
              ) : (
                <p className="text-xs text-white/50">{t("mergeTycoon.tagline")}</p>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-white/50">
                <Trophy className="w-4 h-4 text-amber-400" /> {t("arcade.bestLabel")}: ${best}
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-bold shadow-[0_0_30px_rgba(251,146,60,0.35)]"
                  onClick={startGame}
                >
                  {t("mergeTycoon.start")}
                </Button>
              </motion.div>
              <div className="pt-2">
                <ArcadeLeaderboard gameId="merge_tycoon" currentUserId={userId} refreshKey={refreshKey} />
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
                📈
              </motion.div>
              <h2 className="text-2xl font-display font-bold">Time's Up</h2>
              <div className="text-4xl font-black tabular-nums bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                ${finalScore}
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
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold" onClick={startGame}>
                    {t("arcade.retry")}
                  </Button>
                </motion.div>
              </div>
              <ArcadeLeaderboard gameId="merge_tycoon" currentUserId={userId} refreshKey={refreshKey} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MergeTycoonGame;
