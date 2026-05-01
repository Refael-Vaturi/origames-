import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lightbulb, Send, Timer, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { playClick, playSuccess, playError, playPop } from "@/hooks/useSound";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { CITIES, CityData, matchesCity, suggestCities } from "./cities";
import { toast } from "@/hooks/use-toast";

const ROUNDS = 5;
const TIME_PER_ROUND = 45;
const HINT_COST = 50;

type Phase = "intro" | "playing" | "reveal" | "game-over";

const pickCities = (count: number): CityData[] => {
  const arr = [...CITIES].sort(() => Math.random() - 0.5);
  return arr.slice(0, count);
};

const CityFindGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitScore, userId } = useArcadeScore("city_find");

  const [phase, setPhase] = useState<Phase>("intro");
  const [cities, setCities] = useState<CityData[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [lastResult, setLastResult] = useState<{ correct: boolean; gain: number; city: CityData } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCity = cities[roundIdx];
  const suggestions = useMemo(() => suggestCities(guess), [guess]);

  const startGame = () => {
    playPop();
    setCities(pickCities(ROUNDS));
    setRoundIdx(0);
    setImgIdx(0);
    setGuess("");
    setScore(0);
    setHintsUsed(0);
    setTimeLeft(TIME_PER_ROUND);
    setLastResult(null);
    setSubmitted(false);
    setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      submitGuess(true);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  const submitGuess = (timedOut = false) => {
    if (phase !== "playing" || !currentCity) return;
    const isCorrect = !timedOut && matchesCity(guess, currentCity);
    let gain = 0;
    if (isCorrect) {
      const base = 500;
      const timeBonus = Math.round(300 * (timeLeft / TIME_PER_ROUND));
      const hintPenalty = hintsUsed * HINT_COST;
      gain = Math.max(0, base + timeBonus - hintPenalty);
      playSuccess();
    } else {
      playError();
    }
    setScore((s) => s + gain);
    setLastResult({ correct: isCorrect, gain, city: currentCity });
    setPhase("reveal");
  };

  const nextRound = () => {
    playClick();
    if (roundIdx + 1 >= cities.length) {
      setPhase("game-over");
      return;
    }
    setRoundIdx((r) => r + 1);
    setImgIdx(0);
    setGuess("");
    setHintsUsed(0);
    setTimeLeft(TIME_PER_ROUND);
    setLastResult(null);
    setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const useHint = () => {
    if (hintsUsed >= 2) return;
    setHintsUsed((h) => h + 1);
    playPop();
  };

  useEffect(() => {
    if (phase !== "game-over" || submitted) return;
    if (!user) {
      toast({ title: "Sign in to save your score" });
      return;
    }
    submitScore(score, ROUNDS, { rounds: ROUNDS }).then((r) => {
      if (r.ok) {
        setSubmitted(true);
        setRefreshKey((k) => k + 1);
        toast({ title: "Score saved!" });
      }
    });
  }, [phase, submitted, user, score, submitScore]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="font-display font-bold text-lg">CityFind</h1>
        <div className="text-sm font-bold text-primary tabular-nums">{score}</div>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 p-4 max-w-6xl mx-auto w-full flex-1">
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-card rounded-2xl p-6 shadow-card text-center max-w-md mx-auto mt-8"
              >
                <h2 className="font-display text-2xl font-bold mb-2">Guess the City</h2>
                <p className="text-muted-foreground mb-4">
                  You'll see photos from {ROUNDS} cities around the world. Type your guess in English or Hebrew.
                  Faster guesses earn more points!
                </p>
                <Button onClick={startGame} size="lg" className="w-full">Start</Button>
              </motion.div>
            )}

            {phase === "playing" && currentCity && (
              <motion.div
                key={`play-${roundIdx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Round {roundIdx + 1} / {ROUNDS}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Timer className="w-4 h-4" /> {timeLeft}s
                  </span>
                </div>

                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-muted shadow-card">
                  <img
                    src={currentCity.images[imgIdx % currentCity.images.length]}
                    alt="Mystery city"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // try next image if one fails
                      if (imgIdx + 1 < currentCity.images.length) setImgIdx((i) => i + 1);
                      else (e.target as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                  {currentCity.images.length > 1 && (
                    <button
                      onClick={() => setImgIdx((i) => (i + 1) % currentCity.images.length)}
                      className="absolute bottom-2 right-2 bg-card/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow"
                    >
                      <ImageIcon className="w-3 h-3" /> Next photo
                    </button>
                  )}
                </div>

                {hintsUsed >= 1 && (
                  <div className="bg-accent/10 border border-accent/30 rounded-xl px-3 py-2 text-sm">
                    <strong>Continent hint:</strong> {countryToContinent(currentCity.country_en)}
                  </div>
                )}
                {hintsUsed >= 2 && (
                  <div className="bg-accent/10 border border-accent/30 rounded-xl px-3 py-2 text-sm">
                    <strong>Country:</strong> {currentCity.flag} {currentCity.country_en}
                  </div>
                )}

                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                      placeholder="Type a city name (English or Hebrew)…"
                      dir="auto"
                      className="flex-1"
                    />
                    <Button onClick={() => submitGuess()} disabled={!guess.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {suggestions.length > 0 && guess.length >= 1 && (
                    <div className="absolute z-10 left-0 right-12 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                      {suggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setGuess(c.name_en); setTimeout(() => submitGuess(), 0); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <span>{c.flag}</span>
                          <span className="font-medium">{c.name_en}</span>
                          <span className="text-muted-foreground text-xs">· {c.name_he}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={useHint}
                    disabled={hintsUsed >= 2}
                  >
                    <Lightbulb className="w-3.5 h-3.5 mr-1" />
                    Hint ({hintsUsed}/2) · -{HINT_COST}
                  </Button>
                </div>
              </motion.div>
            )}

            {phase === "reveal" && lastResult && (
              <motion.div
                key="reveal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card rounded-2xl p-6 shadow-card text-center max-w-md mx-auto mt-4"
              >
                <div className="text-5xl mb-2">{lastResult.city.flag}</div>
                <h3 className="font-display text-2xl font-bold">
                  {lastResult.city.name_en}
                </h3>
                <p className="text-muted-foreground text-sm">{lastResult.city.country_en}</p>
                <div
                  className={`mt-4 text-3xl font-bold ${
                    lastResult.correct ? "text-game-green" : "text-destructive"
                  }`}
                >
                  {lastResult.correct ? `+${lastResult.gain}` : "Wrong!"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Total: {score}
                </p>
                <Button onClick={nextRound} size="lg" className="mt-4 w-full">
                  {roundIdx + 1 >= cities.length ? "See Results" : "Next Round →"}
                </Button>
              </motion.div>
            )}

            {phase === "game-over" && (
              <motion.div
                key="over"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card rounded-2xl p-6 shadow-card text-center max-w-md mx-auto mt-4"
              >
                <h2 className="font-display text-3xl font-bold mb-2">Game Over</h2>
                <p className="text-5xl font-display font-bold bg-gradient-to-r from-primary to-game-pink bg-clip-text text-transparent my-4">
                  {score}
                </p>
                <p className="text-sm text-muted-foreground mb-4">out of {ROUNDS * 800} max</p>
                <div className="flex gap-2">
                  <Button onClick={startGame} className="flex-1">Play Again</Button>
                  <Button variant="outline" onClick={() => navigate("/")} className="flex-1">Home</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside>
          <ArcadeLeaderboard gameId="city_find" currentUserId={userId} refreshKey={refreshKey} />
        </aside>
      </div>
    </div>
  );
};

const countryToContinent = (country: string): string => {
  const map: Record<string, string> = {
    Israel: "Asia",
    France: "Europe",
    "United Kingdom": "Europe",
    USA: "North America",
    Japan: "Asia",
    Italy: "Europe",
    Spain: "Europe",
    Netherlands: "Europe",
    "Czech Republic": "Europe",
    Turkey: "Europe / Asia",
    Australia: "Oceania",
    Brazil: "South America",
  };
  return map[country] || "Earth";
};

export default CityFindGame;
