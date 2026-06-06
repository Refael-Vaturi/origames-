import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Globe2, MapPin, Lock, Check, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CONTINENTS, Capital, Continent, WORLD_CAPITALS, capitalsByContinent,
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

export default function WorldModeScreen({ onBack, onStartDefense }: Props) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<WorldProgress>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{"completed_capitals":[],"total_score":0}'); }
    catch { return { completed_capitals: [], total_score: 0 }; }
  });
  const [view, setView] = useState<"continents" | "countries">("continents");
  const [continent, setContinent] = useState<Continent | null>(null);
  const [selected, setSelected] = useState<Capital | null>(null);

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

  const continentProgress = (c: Continent) => {
    const all = capitalsByContinent(c);
    const done = all.filter((x) => progress.completed_capitals.includes(x.country)).length;
    return { done, total: all.length };
  };

  const totalDone = progress.completed_capitals.length;
  const totalAll = WORLD_CAPITALS.length;

  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 overflow-y-auto">
      <div className="sticky top-0 z-10 backdrop-blur bg-slate-950/80 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => {
          if (view === "countries") { setView("continents"); setContinent(null); }
          else onBack();
        }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2 text-white">
          <Globe2 className="w-5 h-5 text-cyan-400" />
          <span className="font-bold">World Mode</span>
        </div>
        <div className="flex items-center gap-1 text-amber-400 text-sm font-mono">
          <Trophy className="w-4 h-4" /> {totalDone}/{totalAll}
        </div>
      </div>

      <div className="px-4 py-3">
        <Progress value={(totalDone / totalAll) * 100} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        {view === "continents" && (
          <motion.div
            key="continents"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {CONTINENTS.map((c) => {
              const { done, total } = continentProgress(c);
              const pct = (done / total) * 100;
              const complete = done === total;
              return (
                <Card
                  key={c}
                  className={`p-4 cursor-pointer bg-slate-900/70 border-slate-700 hover:border-cyan-500 transition ${complete ? "ring-2 ring-amber-400" : ""}`}
                  onClick={() => { setContinent(c); setView("countries"); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Globe2 className="w-5 h-5 text-cyan-400" />
                      <span className="font-bold text-white">{c}</span>
                    </div>
                    {complete && <Trophy className="w-5 h-5 text-amber-400" />}
                  </div>
                  <Progress value={pct} className="h-2 mb-2" />
                  <div className="text-xs text-slate-300">{done} / {total} capitals defended</div>
                </Card>
              );
            })}
          </motion.div>
        )}

        {view === "countries" && continent && (
          <motion.div
            key="countries"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4"
          >
            <h2 className="text-lg font-bold text-white mb-3">{continent}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {capitalsByContinent(continent).map((cap) => {
                const done = progress.completed_capitals.includes(cap.country);
                return (
                  <button
                    key={cap.country}
                    onClick={() => setSelected(cap)}
                    className={`text-left p-2 rounded-lg border transition ${
                      done
                        ? "bg-emerald-950/50 border-emerald-600"
                        : "bg-slate-900/70 border-slate-700 hover:border-cyan-500"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{cap.flag}</span>
                      {done ? <Check className="w-4 h-4 text-emerald-400" /> : <MapPin className="w-3 h-3 text-slate-400" />}
                    </div>
                    <div className="text-xs font-semibold text-white mt-1 truncate">{cap.country}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cap.capital}</div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {progress.completed_capitals.includes(selected.country) && (
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm mb-3">
                  <Check className="w-4 h-4" /> Already defended — replay for practice
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
