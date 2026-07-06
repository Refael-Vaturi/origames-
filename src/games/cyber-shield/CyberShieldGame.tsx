import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Sparkles, ShieldCheck, Bug, KeyRound, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { playClick, playSuccess, playError } from "@/hooks/useSound";
import { useGameFirstVisit } from "@/hooks/useGameFirstVisit";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";
import { createInitialState, placeTower, sellTower, startWave, update, upgradeTower } from "./engine";
import { computeGridMetrics, render, screenToGrid } from "./renderer";
import { TOWER_STATS } from "./config";
import { GameState, Phase, TowerType } from "./types";
import { getSafeAreaInsetPx } from "@/lib/safeArea";

const BEST_KEY = "cyberShieldBest";

const TOWER_ICONS: Record<TowerType, typeof ShieldCheck> = {
  firewall: ShieldCheck,
  antivirus: Bug,
  decoy: KeyRound,
};

const CyberShieldGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitScore, userId } = useArcadeScore("cyber_shield");
  const { isFirstVisit, markSeen } = useGameFirstVisit("cyber-shield");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const prevPhaseRef = useRef<Phase>("menu");
  const hoverCellRef = useRef<{ row: number; col: number } | null>(null);
  const selectedTypeRef = useRef<TowerType | null>(null);
  const safeAreaRef = useRef({ top: 0, bottom: 0 });

  const [phase, setPhase] = useState<Phase>("menu");
  const [finalScore, setFinalScore] = useState(0);
  const [finalWave, setFinalWave] = useState(1);
  const [best, setBest] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedType, setSelectedType] = useState<TowerType | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null);
  const [ui, setUi] = useState({ dataBits: 0, wave: 1, waveActive: false });
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
    setSelectedType(null);
    setSelectedTowerId(null);
    selectedTypeRef.current = null;
    setUi({ dataBits: s.dataBits, wave: s.wave, waveActive: s.waveActive });
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
          setFinalScore(s.score);
          setFinalWave(s.wave);
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

        uiThrottle += dtMs;
        if (uiThrottle > 150) {
          uiThrottle = 0;
          setUi({ dataBits: s.dataBits, wave: s.wave, waveActive: s.waveActive });
        }
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      render(ctx, s, w, h, hoverCellRef.current, selectedTypeRef.current, safeAreaRef.current.top, safeAreaRef.current.bottom);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [best]);

  const pointerToGrid = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const m = computeGridMetrics(window.innerWidth, window.innerHeight, safeAreaRef.current.top, safeAreaRef.current.bottom);
    return screenToGrid(x, y, m);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    hoverCellRef.current = pointerToGrid(e.clientX, e.clientY);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (phase !== "playing") return;
    const cell = pointerToGrid(e.clientX, e.clientY);
    if (!cell) return;
    const s = stateRef.current;

    const existingTower = s.towers.find((t) => t.row === cell.row && t.col === cell.col);
    if (existingTower) {
      playClick();
      setSelectedTowerId(existingTower.id);
      setSelectedType(null);
      selectedTypeRef.current = null;
      return;
    }

    if (selectedType) {
      const ok = placeTower(s, cell.row, cell.col, selectedType);
      if (ok) {
        playSuccess();
        setUi({ dataBits: s.dataBits, wave: s.wave, waveActive: s.waveActive });
      } else {
        playError();
      }
      setSelectedType(null);
      selectedTypeRef.current = null;
    }
  };

  const pickTower = (type: TowerType) => {
    const cost = TOWER_STATS[type].cost;
    if (stateRef.current.dataBits < cost) {
      playError();
      return;
    }
    playClick();
    setSelectedTowerId(null);
    const next = selectedType === type ? null : type;
    setSelectedType(next);
    selectedTypeRef.current = next;
  };

  const selectedTower = stateRef.current.towers.find((t) => t.id === selectedTowerId) || null;

  const doUpgrade = () => {
    if (!selectedTower) return;
    const ok = upgradeTower(stateRef.current, selectedTower.id);
    if (ok) {
      playSuccess();
      setUi({ dataBits: stateRef.current.dataBits, wave: stateRef.current.wave, waveActive: stateRef.current.waveActive });
    } else {
      playError();
    }
  };

  const doSell = () => {
    if (!selectedTower) return;
    playClick();
    sellTower(stateRef.current, selectedTower.id);
    setUi({ dataBits: stateRef.current.dataBits, wave: stateRef.current.wave, waveActive: stateRef.current.waveActive });
    setSelectedTowerId(null);
  };

  const handleStartWave = () => {
    playClick();
    startWave(stateRef.current);
    setUi({ dataBits: stateRef.current.dataBits, wave: stateRef.current.wave, waveActive: stateRef.current.waveActive });
  };

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: "Sign in to submit your score" });
      navigate("/auth?redirect=/cyber-shield");
      return;
    }
    const r = await submitScore(finalScore, finalWave, {});
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
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => (hoverCellRef.current = null)}
      />

      <div className="absolute left-3 z-20" style={{ top: `calc(0.75rem + ${safeArea.top}px)` }}>
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }} className="text-white/80 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      {phase === "playing" && !ui.waveActive && !selectedTower && (
        <div className="absolute right-3 z-20" style={{ top: `calc(3.5rem + ${safeArea.top}px)` }}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button size="sm" className="bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-bold" onClick={handleStartWave}>
              <Play className="w-4 h-4 mr-1" /> Start Wave {ui.wave}
            </Button>
          </motion.div>
        </div>
      )}

      {phase === "playing" && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-3 pointer-events-none"
          style={{ paddingBottom: `calc(0.75rem + ${safeArea.bottom}px)` }}
        >
          {selectedTower && (
            <div className="pointer-events-auto bg-black/80 backdrop-blur rounded-2xl p-3 text-white text-sm w-full max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">{TOWER_STATS[selectedTower.type].name} · Lv{selectedTower.level + 1}</span>
                <button className="text-white/50 text-xs" onClick={() => setSelectedTowerId(null)}>
                  ✕
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-white/30 text-white"
                  disabled={selectedTower.level >= 4 || ui.dataBits < TOWER_STATS[selectedTower.type].upgradeCost(selectedTower.level)}
                  onClick={doUpgrade}
                >
                  Upgrade ({selectedTower.level >= 4 ? "MAX" : TOWER_STATS[selectedTower.type].upgradeCost(selectedTower.level)})
                </Button>
                <Button size="sm" variant="outline" className="flex-1 border-rose-400/40 text-rose-300" onClick={doSell}>
                  Sell
                </Button>
              </div>
            </div>
          )}

          <div className="pointer-events-auto flex gap-2 bg-black/60 backdrop-blur rounded-2xl p-2">
            {(Object.keys(TOWER_STATS) as TowerType[]).map((type) => {
              const Icon = TOWER_ICONS[type];
              const stats = TOWER_STATS[type];
              const active = selectedType === type;
              const affordable = ui.dataBits >= stats.cost;
              return (
                <button
                  key={type}
                  onClick={() => pickTower(type)}
                  disabled={!affordable}
                  className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center transition ${
                    active ? "ring-2 ring-white bg-white/20" : "bg-white/10"
                  } ${affordable ? "text-white active:bg-white/20" : "text-white/30"}`}
                >
                  <Icon className="w-5 h-5 mb-0.5" style={{ color: affordable ? stats.color : undefined }} />
                  <span className="text-[10px] font-bold">{stats.cost}</span>
                </button>
              );
            })}
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
              <div className="text-6xl">🔰</div>
              <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
                Cyber Shield
              </h1>
              {isFirstVisit ? (
                <p className="text-sm text-white/70">
                  Malware is streaming toward your <span className="text-fuchsia-300 font-semibold">database</span>. Tap a tower below,
                  then tap an open tile to place it. <span className="text-sky-300 font-semibold">Firewalls</span> slow packets in an
                  area, <span className="text-emerald-300 font-semibold">Antivirus</span> turrets shred Trojans, and{" "}
                  <span className="text-purple-300 font-semibold">Encryption Decoys</span> hit Ransomware hard. Tap a placed tower to
                  upgrade or sell it, then press Start Wave when you're ready.
                </p>
              ) : (
                <p className="text-xs text-white/50">Place towers, defend the database, survive every wave.</p>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-white/50">
                <Trophy className="w-4 h-4 text-amber-400" /> Best: {best}
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 hover:opacity-90 text-white font-bold shadow-[0_0_30px_rgba(56,189,248,0.35)]"
                  onClick={startGame}
                >
                  Start Defense
                </Button>
              </motion.div>
              <div className="pt-2">
                <ArcadeLeaderboard gameId="cyber_shield" currentUserId={userId} refreshKey={refreshKey} />
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
              <h2 className="text-2xl font-display font-bold">Database Breached</h2>
              <p className="text-xs text-white/50">Survived to wave {finalWave}</p>
              <div className="text-4xl font-black tabular-nums bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
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
                  <Button className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-bold" onClick={startGame}>
                    Retry
                  </Button>
                </motion.div>
              </div>
              <ArcadeLeaderboard gameId="cyber_shield" currentUserId={userId} refreshKey={refreshKey} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CyberShieldGame;
