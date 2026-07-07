import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { playClick, playPop, playSuccess } from "@/hooks/useSound";
import { useGameFirstVisit } from "@/hooks/useGameFirstVisit";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";
import { createInitialState, dropFruit, setDropX, update } from "./engine";
import { computeContainer, render } from "./renderer";
import { GameState, Phase } from "./types";
import { getSafeAreaInsetPx } from "@/lib/safeArea";

const BEST_KEY = "fruitMergeBest";

const FruitMergeGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { submitScore, userId } = useArcadeScore("fruit_merge");
  const { isFirstVisit, markSeen } = useGameFirstVisit("fruit-merge");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const prevPhaseRef = useRef<Phase>("menu");
  const safeAreaRef = useRef({ top: 0, bottom: 0 });
  const scoreAtLastMergeRef = useRef(0);

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
    const canvas = canvasRef.current;
    if (canvas) s.dropX = canvas.clientWidth / 2;
    stateRef.current = s;
    prevPhaseRef.current = "playing";
    scoreAtLastMergeRef.current = 0;
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

    const loop = (time: number) => {
      const dtMs = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = time;
      const s = stateRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (s.phase === "playing") {
        const container = computeContainer(w, h, safeAreaRef.current.top);
        update(s, dtMs / 1000, container.width, container.height);
        if (s.score > scoreAtLastMergeRef.current) {
          scoreAtLastMergeRef.current = s.score;
        }
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

      render(ctx, s, w, h, safeAreaRef.current.top);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [best]);

  const pointerX = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return clientX - rect.left;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (phase !== "playing") return;
    const w = window.innerWidth;
    const container = computeContainer(w, window.innerHeight, safeAreaRef.current.top);
    setDropX(stateRef.current, pointerX(e.clientX), container.width);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (phase !== "playing") return;
    const w = window.innerWidth;
    const container = computeContainer(w, window.innerHeight, safeAreaRef.current.top);
    setDropX(stateRef.current, pointerX(e.clientX), container.width);
    const ok = dropFruit(stateRef.current);
    if (ok) playPop();
  };

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: t("arcade.signInToSubmit") });
      navigate("/auth?redirect=/fruit-merge");
      return;
    }
    const r = await submitScore(finalScore, 1, {});
    if (r.ok) {
      playSuccess();
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
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      <div className="absolute left-3 z-20" style={{ top: `calc(0.75rem + ${safeArea.top}px)` }}>
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }} className="text-[#78350f]/70 hover:text-[#78350f] bg-white/40 hover:bg-white/60">
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
              <div className="text-6xl">🍉</div>
              <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-rose-400 to-lime-400 bg-clip-text text-transparent">
                Fruit Merge
              </h1>
              {isFirstVisit ? (
                <p className="text-sm text-white/70">{t("fruitMerge.intro")}</p>
              ) : (
                <p className="text-xs text-white/50">{t("fruitMerge.tagline")}</p>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-white/50">
                <Trophy className="w-4 h-4 text-amber-400" /> {t("arcade.bestLabel")}: {best}
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-rose-500 to-lime-500 hover:opacity-90 text-white font-bold shadow-[0_0_30px_rgba(244,63,94,0.35)]"
                  onClick={startGame}
                >
                  {t("fruitMerge.start")}
                </Button>
              </motion.div>
              <div className="pt-2">
                <ArcadeLeaderboard gameId="fruit_merge" currentUserId={userId} refreshKey={refreshKey} />
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
                🧺
              </motion.div>
              <h2 className="text-2xl font-display font-bold">Basket Full</h2>
              <div className="text-4xl font-black tabular-nums bg-gradient-to-r from-rose-400 to-lime-400 bg-clip-text text-transparent">
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
                  <Button className="w-full bg-gradient-to-r from-rose-500 to-lime-500 text-white font-bold" onClick={startGame}>
                    {t("arcade.retry")}
                  </Button>
                </motion.div>
              </div>
              <ArcadeLeaderboard gameId="fruit_merge" currentUserId={userId} refreshKey={refreshKey} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FruitMergeGame;
