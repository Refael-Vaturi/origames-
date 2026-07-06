import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Globe2, Lock, Check, Trophy } from "lucide-react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CONTINENTS, Capital, Continent, WORLD_CAPITALS, capitalsByContinent, isUnlocked,
} from "./worldCapitals";

interface Props {
  onBack: () => void;
  onStartDefense: (capital: Capital) => void;
}

interface WorldProgress {
  completed_capitals: string[];
  total_score: number;
}

const LS_KEY = "ironDomeWorldProgress";

const CONTINENT_COORDS: Record<Continent, { lat: number; lng: number }> = {
  Africa: { lat: 2, lng: 20 },
  Asia: { lat: 34, lng: 100 },
  Europe: { lat: 54, lng: 15 },
  "North America": { lat: 45, lng: -100 },
  "South America": { lat: -15, lng: -60 },
  Oceania: { lat: -25, lng: 140 },
};

interface ContinentPoint {
  kind: "continent";
  continent: Continent;
  lat: number;
  lng: number;
  done: number;
  total: number;
}

interface CountryPoint {
  kind: "country";
  capital: Capital;
  lat: number;
  lng: number;
  completed: boolean;
  unlocked: boolean;
}

type GlobePoint = ContinentPoint | CountryPoint;

export default function WorldModeScreen({ onBack, onStartDefense }: Props) {
  const { user } = useAuth();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [progress, setProgress] = useState<WorldProgress>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{"completed_capitals":[],"total_score":0}'); }
    catch { return { completed_capitals: [], total_score: 0 }; }
  });
  const [view, setView] = useState<"continents" | "countries">("continents");
  const [continent, setContinent] = useState<Continent | null>(null);
  const [selected, setSelected] = useState<Capital | null>(null);

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Load from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase.from as any)("iron_dome_world_progress")
        .select("completed_capitals,total_score")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProgress({
          completed_capitals: data.completed_capitals ?? [],
          total_score: data.total_score ?? 0,
        });
      }
    })();
  }, [user]);

  // Camera flight
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    if (view === "continents") {
      g.pointOfView({ lat: 15, lng: 10, altitude: 2.4 }, 1000);
    } else if (continent) {
      const c = CONTINENT_COORDS[continent];
      g.pointOfView({ lat: c.lat, lng: c.lng, altitude: 0.9 }, 1200);
    }
  }, [view, continent]);

  const continentProgress = (c: Continent) => {
    const all = capitalsByContinent(c);
    const done = all.filter((x) => progress.completed_capitals.includes(x.country)).length;
    return { done, total: all.length };
  };

  const totalDone = progress.completed_capitals.length;
  const totalAll = WORLD_CAPITALS.length;

  const continentPoints: ContinentPoint[] = useMemo(() => CONTINENTS.map((c) => {
    const { done, total } = continentProgress(c);
    return { kind: "continent", continent: c, ...CONTINENT_COORDS[c], done, total };
  }), [progress]);

  const countryPoints: CountryPoint[] = useMemo(() => {
    if (!continent) return [];
    return capitalsByContinent(continent).map((capital) => ({
      kind: "country",
      capital,
      lat: capital.lat,
      lng: capital.lng,
      completed: progress.completed_capitals.includes(capital.country),
      unlocked: isUnlocked(capital, progress.completed_capitals),
    }));
  }, [continent, progress]);

  const points: GlobePoint[] = view === "continents" ? continentPoints : countryPoints;

  const pointColor = (p: object) => {
    const d = p as GlobePoint;
    if (d.kind === "continent") {
      if (d.done === d.total) return "#FFD700";
      if (d.done > 0) return "#22D3EE";
      return "#64748B";
    }
    if (d.completed) return "#22C55E";
    if (d.unlocked) return "#22D3EE";
    return "#475569";
  };

  const pointRadius = (p: object) => {
    const d = p as GlobePoint;
    if (d.kind === "continent") return 1.6;
    if (d.completed) return 0.55;
    if (d.unlocked) return 0.95;
    return 0.4;
  };

  const pointLabel = (p: object) => {
    const d = p as GlobePoint;
    if (d.kind === "continent") return `${d.continent}: ${d.done}/${d.total} defended`;
    const cap = d.capital;
    if (d.completed) return `✓ ${cap.flag} ${cap.country} — already defended`;
    if (d.unlocked) return `${cap.flag} ${cap.country} — tap to defend ${cap.capital}`;
    return `🔒 ${cap.flag} ${cap.country} — finish the previous country first`;
  };

  const handlePointClick = (p: object) => {
    const d = p as GlobePoint;
    if (d.kind === "continent") {
      setContinent(d.continent);
      setView("countries");
      return;
    }
    if (d.completed || d.unlocked) {
      setSelected(d.capital);
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-black overflow-hidden">
      <Globe
        ref={globeRef}
        width={dims.w}
        height={dims.h}
        backgroundColor="#00000000"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        showAtmosphere
        atmosphereColor="#22D3EE"
        atmosphereAltitude={0.18}
        pointsData={points as unknown as object[]}
        pointLat="lat"
        pointLng="lng"
        pointColor={pointColor}
        pointRadius={pointRadius}
        pointAltitude={0.015}
        pointLabel={pointLabel}
        pointsMerge={false}
        onPointClick={handlePointClick}
      />

      <div
        className="absolute top-0 left-0 right-0 z-10 backdrop-blur bg-slate-950/70 border-b border-slate-800 px-4 pb-3 flex items-center justify-between pointer-events-auto"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <Button variant="ghost" size="sm" onClick={() => {
          if (view === "countries") { setView("continents"); setContinent(null); }
          else onBack();
        }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2 text-white">
          <Globe2 className="w-5 h-5 text-cyan-400" />
          <span className="font-bold">{view === "countries" && continent ? continent : "World Mode"}</span>
        </div>
        <div className="flex items-center gap-1 text-amber-400 text-sm font-mono">
          <Trophy className="w-4 h-4" /> {totalDone}/{totalAll}
        </div>
      </div>

      <div
        className="absolute left-0 right-0 z-10 px-4 py-2 pointer-events-none"
        style={{ top: "calc(52px + env(safe-area-inset-top))" }}
      >
        <Progress value={(totalDone / totalAll) * 100} className="h-2" />
      </div>

      <div className="absolute bottom-3 left-0 right-0 z-10 flex items-center justify-center gap-4 text-[11px] text-slate-300 pointer-events-none">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] inline-block" /> Next up</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] inline-block" /> Defended</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#475569] inline-block" /> Locked</span>
      </div>

      {/* Capital detail / confirm */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-white"
            >
              <div className="text-6xl text-center mb-3">{selected.flag}</div>
              <div className="text-xl font-bold text-center">{selected.country}</div>
              <div className="text-sm text-slate-400 text-center mb-4">
                Defend the capital: <span className="text-cyan-400 font-semibold">{selected.capital}</span>
              </div>
              {progress.completed_capitals.includes(selected.country) ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm mb-3">
                  <Check className="w-4 h-4" /> Already defended — replay for practice
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-cyan-400 text-sm mb-3">
                  <Lock className="w-4 h-4" /> Defend this to unlock the next country
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500" onClick={() => {
                  onStartDefense(selected);
                  setSelected(null);
                }}>
                  Defend now
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Persist a capital as defended (local + DB). */
export async function markCapitalDefended(userId: string | null, country: string, scoreDelta: number) {
  // Local
  try {
    const raw = localStorage.getItem(LS_KEY);
    const cur: WorldProgress = raw ? JSON.parse(raw) : { completed_capitals: [], total_score: 0 };
    if (!cur.completed_capitals.includes(country)) cur.completed_capitals.push(country);
    cur.total_score += scoreDelta;
    localStorage.setItem(LS_KEY, JSON.stringify(cur));
  } catch { /* ignore */ }

  if (!userId) return;
  try {
    const { data: existing } = await (supabase.from as any)("iron_dome_world_progress")
      .select("completed_capitals,total_score")
      .eq("user_id", userId).maybeSingle();
    const completed = new Set<string>(existing?.completed_capitals ?? []);
    completed.add(country);
    await (supabase.from as any)("iron_dome_world_progress").upsert({
      user_id: userId,
      completed_capitals: Array.from(completed),
      total_score: (existing?.total_score ?? 0) + scoreDelta,
    }, { onConflict: "user_id" });
  } catch (e) {
    console.warn("[worldMode] sync failed", e);
  }
}
