import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Sparkles } from "lucide-react";
import { FruitMergeGlyph } from "./MenuArt";
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
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

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

      render(ctx, s, w, h, safeAreaRef.current.top, tRef.current("hud.best"), tRef.current("hud.next"));
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
            className="absolute inset-0 z-30 overflow-y-auto p-5"
            style={{ background: "#fff7ed" }}
          >
            <div className="max-w-sm w-full mx-auto min-h-full flex flex-col justify-center py-8" style={{ color: "#78350f" }}>
              <FruitMergeGlyph className="w-28 h-20 mx-auto" />
              <h1 className="text-4xl font-display font-black text-center -mt-2" style={{ color: "#78350f" }}>
                Fruit Merge
              </h1>
              <p className="text-sm text-center mt-3 opacity-70">
                {isFirstVisit ? t("fruitMerge.intro") : t("fruitMerge.tagline")}
              </p>

              <div className="flex items-center justify-center gap-2 text-xs mt-4 opacity-60">
                <Trophy className="w-4 h-4 text-amber-600" /> {t("arcade.bestLabel")}: {best}
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="mt-6">
                <Button
                  size="lg"
                  className="w-full text-white font-display font-bold text-base"
                  style={{ background: "#16a34a", boxShadow: "0 0 30px rgba(22,163,74,0.3)" }}
                  onClick={startGame}
                >
                  {t("fruitMerge.start")}
                </Button>
              </motion.div>

              <div className="mt-6 border-t pt-4" style={{ borderColor: "rgba(120,53,15,0.15)" }}>
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
            className="absolute inset-0 z-30 overflow-y-auto p-5"
            style={{ background: "#fff7ed" }}
          >
            <div className="max-w-sm w-full mx-auto min-h-full flex flex-col justify-center py-8 text-center" style={{ color: "#78350f" }}>
              <motion.div
                className="mx-auto"
                initial={{ scale: 0.5, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 12 }}
              >
                <FruitMergeGlyph className="w-24 h-16" />
              </motion.div>
              <h2 className="text-2xl font-display font-bold">{t("fruitMerge.gameOver")}</h2>
              <div className="text-5xl font-display font-black tabular-nums mt-1" style={{ color: "#16a34a" }}>
                {finalScore}
              </div>
              {finalScore >= best && finalScore > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-1.5 text-amber-600 text-sm font-semibold mt-2"
                >
                  <Sparkles className="w-4 h-4" /> {t("arcade.newBest")}
                </motion.div>
              )}
              <div className="flex gap-2 mt-5">
                <motion.div className="flex-1" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    style={{ borderColor: "rgba(120,53,15,0.3)", color: "#78350f" }}
                    onClick={submitToLeaderboard}
                  >
                    {t("arcade.submitScore")}
                  </Button>
                </motion.div>
                <motion.div className="flex-1" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button className="w-full text-white font-bold" style={{ background: "#16a34a" }} onClick={startGame}>
                    {t("arcade.retry")}
                  </Button>
                </motion.div>
              </div>
              <div className="mt-5 border-t pt-4" style={{ borderColor: "rgba(120,53,15,0.15)" }}>
                <ArcadeLeaderboard gameId="fruit_merge" currentUserId={userId} refreshKey={refreshKey} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FruitMergeGame;
