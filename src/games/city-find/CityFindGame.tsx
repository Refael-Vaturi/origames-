import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lightbulb, Send, Timer, Image as ImageIcon, Users, Copy, Share2, CheckCircle2 } from "lucide-react";
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
const GOOGLE_MAPS_API_KEY = "AIzaSyBNItXNypmi4rHtyK1PMdl5xiRoz9PrVgY";

// Lat/Lng for each city (for Street View). Falls back to place name search.
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "tel-aviv": { lat: 32.0809, lng: 34.7806 },
  paris: { lat: 48.8584, lng: 2.2945 }, // Eiffel Tower
  london: { lat: 51.5007, lng: -0.1246 }, // Big Ben
  "new-york": { lat: 40.7580, lng: -73.9855 }, // Times Square
  tokyo: { lat: 35.6595, lng: 139.7004 }, // Shibuya
  rome: { lat: 41.8902, lng: 12.4922 }, // Colosseum
  barcelona: { lat: 41.4036, lng: 2.1744 }, // Sagrada Familia
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  prague: { lat: 50.0875, lng: 14.4213 }, // Old Town Square
  istanbul: { lat: 41.0086, lng: 28.9802 }, // Hagia Sophia
  sydney: { lat: -33.8568, lng: 151.2153 }, // Opera House
  rio: { lat: -22.9519, lng: -43.2105 }, // Christ the Redeemer
};

type Phase = "intro" | "playing" | "reveal" | "game-over";

// Seeded RNG (mulberry32) for shared multiplayer rooms
const hashSeed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pickCities = (count: number, seed?: string): CityData[] => {
  const rng = seed ? mulberry32(hashSeed(seed)) : Math.random;
  const arr = [...CITIES].sort(() => rng() - 0.5);
  return arr.slice(0, count);
};

const genRoomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
};

const CityFindGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitScore, userId } = useArcadeScore("city_find");
  const [searchParams, setSearchParams] = useSearchParams();
  const roomCode = searchParams.get("room");

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
    setCities(pickCities(ROUNDS, roomCode || undefined));
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

  const createRoom = () => {
    const code = genRoomCode();
    setSearchParams({ room: code });
    playPop();
    toast({ title: `Room created: ${code}`, description: "Share the link with friends!" });
  };

  const shareRoom = async () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/city-find?room=${roomCode}`;
    const shareData = { title: "CityFind", text: `Join my CityFind room: ${roomCode}`, url };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  const copyCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    toast({ title: "Code copied!" });
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
      toast({ title: "🎉 Correct!", description: `+${gain} points` });
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
    submitScore(score, ROUNDS, { rounds: ROUNDS, room: roomCode || null }).then((r) => {
      if (r.ok) {
        setSubmitted(true);
        setRefreshKey((k) => k + 1);
        toast({ title: "Score saved!" });
      }
    });
  }, [phase, submitted, user, score, submitScore, roomCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="font-display font-bold text-lg">CityFind</h1>
        <div className="text-sm font-bold text-primary tabular-nums">{score}</div>
      </header>

      {roomCode && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-3 text-sm">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-semibold">Room: <span className="font-mono">{roomCode}</span></span>
          <Button size="sm" variant="ghost" onClick={copyCode} className="h-7 px-2">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={shareRoom} className="h-7 px-2">
            <Share2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 p-4 max-w-6xl mx-auto w-full flex-1">
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-card rounded-2xl p-6 shadow-card text-center max-w-md mx-auto mt-8 w-full"
              >
                <h2 className="font-display text-2xl font-bold mb-2">Guess the City</h2>
                <p className="text-muted-foreground mb-4">
                  You'll see photos from {ROUNDS} cities around the world. Type your guess in English or Hebrew.
                  Faster guesses earn more points!
                </p>
                {roomCode ? (
                  <p className="text-xs text-primary mb-3">
                    You're in room <span className="font-mono font-bold">{roomCode}</span> — everyone gets the same cities!
                  </p>
                ) : null}
                <Button onClick={startGame} size="lg" className="w-full mb-3">Start</Button>

                {!roomCode ? (
                  <Button onClick={createRoom} variant="outline" size="lg" className="w-full">
                    <Users className="w-4 h-4 mr-2" /> Play with Friends
                  </Button>
                ) : (
                  <Button onClick={shareRoom} variant="outline" size="lg" className="w-full">
                    <Share2 className="w-4 h-4 mr-2" /> Share Room Link
                  </Button>
                )}

                {!roomCode && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Have a code?</p>
                    <JoinRoomInput onJoin={(code) => setSearchParams({ room: code })} />
                  </div>
                )}
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
                  <MysteryStreetView city={currentCity} />
                  {/* Block address/labels overlay from Google Street View */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/80 to-transparent" />
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
                className="bg-card rounded-2xl p-6 shadow-card text-center max-w-md mx-auto mt-4 w-full"
              >
                {lastResult.correct && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="flex items-center justify-center gap-2 mb-3 text-game-green"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                    <span className="font-display text-2xl font-bold">Correct!</span>
                  </motion.div>
                )}
                <div className="text-5xl mb-2">{lastResult.city.flag}</div>
                <h3 className="font-display text-2xl font-bold">
                  {lastResult.city.name_en}
                </h3>
                <p className="text-muted-foreground text-sm">{lastResult.city.country_en}</p>

                <div className="mt-4 rounded-xl overflow-hidden border border-border aspect-video relative">
                  <StreetViewOrMap city={lastResult.city} />
                </div>


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
                className="bg-card rounded-2xl p-6 shadow-card text-center max-w-md mx-auto mt-4 w-full"
              >
                <h2 className="font-display text-3xl font-bold mb-2">Game Over</h2>
                <p className="text-5xl font-display font-bold bg-gradient-to-r from-primary to-game-pink bg-clip-text text-transparent my-4">
                  {score}
                </p>
                <p className="text-sm text-muted-foreground mb-4">out of {ROUNDS * 800} max</p>
                {roomCode && (
                  <Button onClick={shareRoom} variant="outline" className="w-full mb-2">
                    <Share2 className="w-4 h-4 mr-2" /> Challenge More Friends
                  </Button>
                )}
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

const StreetViewOrMap = ({ city }: { city: CityData }) => {
  const [mode, setMode] = useState<"street" | "map">("street");
  const coords = CITY_COORDS[city.id];
  const placeQ = encodeURIComponent(`${city.name_en}, ${city.country_en}`);

  const streetSrc = coords
    ? `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_MAPS_API_KEY}&location=${coords.lat},${coords.lng}&heading=0&pitch=0&fov=90`
    : null;

  const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${placeQ}&zoom=12`;

  const showStreet = mode === "street" && streetSrc;

  return (
    <>
      <iframe
        key={mode}
        title={`${mode === "street" ? "Street View" : "Map"} of ${city.name_en}`}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={showStreet ? streetSrc! : mapSrc}
      />
      {streetSrc && (
        <div className="absolute top-2 right-2 bg-card/90 backdrop-blur rounded-lg p-0.5 flex gap-0.5 shadow-card text-xs">
          <button
            onClick={() => setMode("street")}
            className={`px-2 py-1 rounded-md font-semibold transition-colors ${mode === "street" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
          >
            🚶 Street
          </button>
          <button
            onClick={() => setMode("map")}
            className={`px-2 py-1 rounded-md font-semibold transition-colors ${mode === "map" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
          >
            🗺️ Map
          </button>
        </div>
      )}
    </>
  );
};

// Mystery Street View: rotates heading automatically, hides labels/addresses, falls back to image.
const MysteryStreetView = ({ city }: { city: CityData }) => {
  const coords = CITY_COORDS[city.id];
  const [heading, setHeading] = useState(() => Math.floor(Math.random() * 360));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setHeading(Math.floor(Math.random() * 360));
    setFailed(false);
  }, [city.id]);

  useEffect(() => {
    if (!coords || failed) return;
    const id = setInterval(() => setHeading((h) => (h + 6) % 360), 1500);
    return () => clearInterval(id);
  }, [coords, failed]);

  if (!coords || failed) {
    return (
      <img
        src={city.images[0]}
        alt="Mystery location"
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  const src = `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_MAPS_API_KEY}&location=${coords.lat},${coords.lng}&heading=${heading}&pitch=0&fov=85`;

  return (
    <iframe
      key={`mystery-${city.id}-${Math.floor(heading / 30)}`}
      title="Mystery location"
      width="100%"
      height="100%"
      style={{ border: 0 }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={src}
    />
  );
};




const JoinRoomInput = ({ onJoin }: { onJoin: (code: string) => void }) => {
  const [code, setCode] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter room code"
        maxLength={6}
        className="font-mono uppercase"
      />
      <Button onClick={() => code.trim() && onJoin(code.trim())} disabled={!code.trim()}>
        Join
      </Button>
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
