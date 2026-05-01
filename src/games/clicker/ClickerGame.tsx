import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Sparkles, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { playClick, playPop, playSuccess, playLevelUp } from "@/hooks/useSound";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";

interface FloatingNum {
  id: number;
  x: number;
  y: number;
  value: number;
  crit: boolean;
}

interface UpgradeDef {
  key: string;
  name: string;
  desc: string;
  baseCost: number;
  maxLevel: number;
  effect: string;
}

const UPGRADES: UpgradeDef[] = [
  { key: "power", name: "Power Tap", desc: "+1 click value per level", baseCost: 50, maxLevel: 50, effect: "+1/lvl" },
  { key: "crit", name: "Golden Touch", desc: "+1% critical chance per level (10x value)", baseCost: 500, maxLevel: 8, effect: "+1% crit" },
  { key: "auto1", name: "Auto Tap I", desc: "1 auto-click per second", baseCost: 250, maxLevel: 1, effect: "1/s" },
  { key: "auto2", name: "Auto Tap II", desc: "5 auto-clicks per second", baseCost: 5000, maxLevel: 1, effect: "5/s" },
  { key: "auto3", name: "Auto Tap III", desc: "20 auto-clicks per second", baseCost: 50000, maxLevel: 1, effect: "20/s" },
];

const STORAGE_KEY = "clicker_save_v1";
const formatNum = (n: number) => {
  if (n < 1000) return Math.floor(n).toString();
  if (n < 1e6) return (n / 1e3).toFixed(2) + "K";
  if (n < 1e9) return (n / 1e6).toFixed(2) + "M";
  if (n < 1e12) return (n / 1e9).toFixed(2) + "B";
  return (n / 1e12).toFixed(2) + "T";
};

const ClickerGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitScore, userId } = useArcadeScore("clicker");

  const [score, setScore] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [floats, setFloats] = useState<FloatingNum[]>([]);
  const [bestSubmitted, setBestSubmitted] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const floatId = useRef(0);
  const objectRef = useRef<HTMLButtonElement>(null);

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setScore(s.score || 0);
        setLifetime(s.lifetime || 0);
        setLevels(s.levels || {});
        setBestSubmitted(s.bestSubmitted || 0);
      }
    } catch {}
  }, []);

  // Persist
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ score, lifetime, levels, bestSubmitted })
      );
    }, 300);
    return () => clearTimeout(t);
  }, [score, lifetime, levels, bestSubmitted]);

  const clickValue = 1 + (levels.power || 0);
  const critChance = 0.02 + (levels.crit || 0) * 0.01;
  const autoRate =
    (levels.auto1 ? 1 : 0) + (levels.auto2 ? 5 : 0) + (levels.auto3 ? 20 : 0);

  const costFor = (key: string) => {
    const def = UPGRADES.find((u) => u.key === key)!;
    const lvl = levels[key] || 0;
    return Math.ceil(def.baseCost * Math.pow(1.15, lvl));
  };

  // Auto clicker loop
  useEffect(() => {
    if (autoRate <= 0) return;
    const interval = setInterval(() => {
      const gain = clickValue * (autoRate / 10);
      setScore((s) => s + gain);
      setLifetime((l) => l + gain);
    }, 100);
    return () => clearInterval(interval);
  }, [autoRate, clickValue]);

  const stage = lifetime >= 1e9 ? 4 : lifetime >= 1e7 ? 3 : lifetime >= 1e5 ? 2 : lifetime >= 1e3 ? 1 : 0;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const isCrit = Math.random() < critChance;
      const value = isCrit ? clickValue * 10 : clickValue;
      setScore((s) => s + value);
      setLifetime((l) => l + value);

      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
      const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
      const x = e.clientX - parent.left;
      const y = e.clientY - parent.top;

      const id = ++floatId.current;
      setFloats((f) => [...f, { id, x, y, value, crit: isCrit }]);
      setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 700);

      if (isCrit) playSuccess();
      else playPop();
    },
    [clickValue, critChance]
  );

  const buyUpgrade = (key: string) => {
    const def = UPGRADES.find((u) => u.key === key)!;
    const lvl = levels[key] || 0;
    if (lvl >= def.maxLevel) return;
    const cost = costFor(key);
    if (score < cost) {
      toast({ title: "Not enough points!", variant: "destructive" });
      return;
    }
    setScore((s) => s - cost);
    setLevels((l) => ({ ...l, [key]: lvl + 1 }));
    playLevelUp();
  };

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: "Sign in to submit your score" });
      navigate("/auth?redirect=/clicker");
      return;
    }
    const best = Math.floor(Math.max(lifetime, bestSubmitted));
    const r = await submitScore(best, stage + 1, { lifetime: best });
    if (r.ok) {
      setBestSubmitted(best);
      toast({ title: "Score submitted!", description: `${formatNum(best)} points` });
      setRefreshKey((k) => k + 1);
    } else {
      toast({ title: "Failed to submit", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="font-display font-bold text-lg">Clicker</h1>
        <Button variant="outline" size="sm" onClick={submitToLeaderboard}>
          Submit
        </Button>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] flex-1 gap-4 p-4 max-w-6xl mx-auto w-full">
        {/* Main play area */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="text-center"
            key={Math.floor(score / 10)}
            initial={{ scale: 1 }}
            animate={{ scale: 1 }}
          >
            <div className="text-5xl font-display font-bold bg-gradient-to-r from-primary to-game-pink bg-clip-text text-transparent tabular-nums">
              {formatNum(score)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Lifetime: {formatNum(lifetime)} · Stage {stage} · +{clickValue}/click
              {autoRate > 0 && ` · ${autoRate}/s auto`}
            </div>
          </motion.div>

          <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
            {/* Floating numbers */}
            <AnimatePresence>
              {floats.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 1, y: 0, scale: f.crit ? 1.5 : 1 }}
                  animate={{ opacity: 0, y: -80, scale: f.crit ? 2 : 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                  style={{ left: f.x, top: f.y }}
                  className={`absolute pointer-events-none font-bold text-lg ${
                    f.crit ? "text-accent text-2xl drop-shadow-[0_0_8px_hsl(var(--accent))]" : "text-primary"
                  }`}
                >
                  +{formatNum(f.value)}
                  {f.crit && "!"}
                </motion.div>
              ))}
            </AnimatePresence>

            <motion.button
              ref={objectRef}
              onClick={handleClick}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className={`relative rounded-full select-none cursor-pointer flex items-center justify-center
                ${stage === 0 ? "w-40 h-40 bg-gradient-to-br from-primary to-secondary shadow-[0_0_60px_hsl(var(--primary)/0.5)]" : ""}
                ${stage === 1 ? "w-48 h-48 bg-gradient-to-br from-accent to-game-yellow shadow-[0_0_80px_hsl(var(--accent)/0.6)]" : ""}
                ${stage === 2 ? "w-56 h-56 bg-gradient-to-br from-game-pink to-primary shadow-[0_0_100px_hsl(var(--game-pink)/0.7)]" : ""}
                ${stage === 3 ? "w-60 h-60 bg-gradient-to-br from-accent via-game-pink to-primary shadow-[0_0_120px_hsl(var(--accent)/0.8)] animate-pulse" : ""}
                ${stage === 4 ? "w-64 h-64 bg-gradient-to-br from-primary via-secondary to-accent shadow-[0_0_160px_hsl(var(--primary)/0.9)] animate-pulse" : ""}
              `}
              aria-label="Click to earn points"
            >
              <MousePointerClick className="w-16 h-16 text-white drop-shadow-lg" />
            </motion.button>
          </div>

          {/* Upgrades */}
          <div className="w-full max-w-md bg-card rounded-2xl p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-accent" />
              <h2 className="font-display font-semibold">Upgrades</h2>
            </div>
            <div className="space-y-2">
              {UPGRADES.map((u) => {
                const lvl = levels[u.key] || 0;
                const max = lvl >= u.maxLevel;
                const cost = costFor(u.key);
                const can = !max && score >= cost;
                return (
                  <button
                    key={u.key}
                    onClick={() => buyUpgrade(u.key)}
                    disabled={max || !can}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      max
                        ? "border-border/30 bg-muted/30 opacity-60"
                        : can
                        ? "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:scale-[1.01]"
                        : "border-border bg-muted/20 opacity-70"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {u.name}
                          <span className="text-xs text-muted-foreground">Lv {lvl}/{u.maxLevel}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{u.desc}</div>
                      </div>
                      <div className="text-right shrink-0">
                        {max ? (
                          <span className="text-xs font-bold text-game-green">MAX</span>
                        ) : (
                          <span className={`text-sm font-bold ${can ? "text-primary" : "text-muted-foreground"}`}>
                            {formatNum(cost)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <aside className="space-y-4">
          <ArcadeLeaderboard gameId="clicker" currentUserId={userId} refreshKey={refreshKey} />
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <h3 className="font-display font-semibold">Tip</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Tap the orb fast! Buy auto-clickers and watch your score climb. Submit your lifetime score
              to the global leaderboard.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ClickerGame;
