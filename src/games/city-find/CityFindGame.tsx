import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lightbulb, Target, Timer, Users, Copy, Share2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { playClick, playSuccess, playError, playPop } from "@/hooks/useSound";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { CITIES, CityData, haversineKm, scoreForDistance } from "./cities";
import WorldGuessMap, { LatLng } from "./WorldGuessMap";
import { toast } from "@/hooks/use-toast";

const ROUNDS = 5;
const TIME_PER_ROUND = 45;
const HINT_COSTS = [400, 700]; // cost of hint 1, hint 2 — steep, since a perfect guess is worth up to 5000
const CORRECT_THRESHOLD_KM = 150; // "correct" badge / bonus if within this distance
const NO_GUESS_PENALTY_KM = 20000; // treated distance when time runs out with no pin placed
const GOOGLE_MAPS_API_KEY = "AIzaSyBNItXNypmi4rHtyK1PMdl5xiRoz9PrVgY";

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
  const { t, tf } = useLanguage();
  const { submitScore, userId } = useArcadeScore("city_find");
  const [searchParams, setSearchParams] = useSearchParams();
  const roomCode = searchParams.get("room");

  const [phase, setPhase] = useState<Phase>("intro");
  const [cities, setCities] = useState<CityData[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [guessPos, setGuessPos] = useState<LatLng | null>(null);
  const [score, setScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    gain: number;
    city: CityData;
    distanceKm: number;
    guess: LatLng | null;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const currentCity = cities[roundIdx];

  const startGame = () => {
    playPop();
    setCities(pickCities(ROUNDS, roomCode || undefined));
    setRoundIdx(0);
    setGuessPos(null);
    setScore(0);
    setHintsUsed(0);
    setTimeLeft(TIME_PER_ROUND);
    setLastResult(null);
    setSubmitted(false);
    setPhase("playing");
  };

  const createRoom = () => {
    const code = genRoomCode();
    setSearchParams({ room: code });
    playPop();
    toast({ title: tf("cityFind.roomCreated", { code }), description: t("cityFind.shareWithFriends") });
  };

  const shareRoom = async () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/city-find?room=${roomCode}`;
    const shareData = { title: "CityFind", text: `Join my CityFind room: ${roomCode}`, url };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: t("cityFind.linkCopied") });
    }
  };

  const copyCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    toast({ title: t("cityFind.codeCopied") });
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
    const distanceKm =
      !timedOut && guessPos ? haversineKm(guessPos.lat, guessPos.lng, currentCity.lat, currentCity.lng) : NO_GUESS_PENALTY_KM;
    const isCorrect = distanceKm <= CORRECT_THRESHOLD_KM;
    const base = scoreForDistance(distanceKm);
    const timeBonus = Math.round(200 * (timeLeft / TIME_PER_ROUND));
    const hintPenalty = HINT_COSTS.slice(0, hintsUsed).reduce((a, b) => a + b, 0);
    const gain = base > 0 ? Math.max(0, base + timeBonus - hintPenalty) : 0;

    if (isCorrect) {
      playSuccess();
      toast({ title: `🎯 ${t("cityFind.correct")}`, description: `+${gain} points` });
    } else {
      playError();
    }
    setScore((s) => s + gain);
    setLastResult({ correct: isCorrect, gain, city: currentCity, distanceKm, guess: timedOut ? null : guessPos });
    setPhase("reveal");
  };

  const nextRound = () => {
    playClick();
    if (roundIdx + 1 >= cities.length) {
      setPhase("game-over");
      return;
    }
    setRoundIdx((r) => r + 1);
    setGuessPos(null);
    setHintsUsed(0);
    setTimeLeft(TIME_PER_ROUND);
    setLastResult(null);
    setPhase("playing");
  };

  const useHint = () => {
    if (hintsUsed >= 2) return;
    setHintsUsed((h) => h + 1);
    playPop();
  };

  useEffect(() => {
    if (phase !== "game-over" || submitted) return;
    if (!user) {
      toast({ title: t("cityFind.signInSave") });
      return;
    }
    submitScore(score, ROUNDS, { rounds: ROUNDS, room: roomCode || null }).then((r) => {
      if (r.ok) {
        setSubmitted(true);
        setRefreshKey((k) => k + 1);
        toast({ title: t("cityFind.scoreSaved") });
      }
    });
  }, [phase, submitted, user, score, submitScore, roomCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("cityFind.back")}
        </Button>
        <h1 className="font-display font-bold text-lg">{t("cityFind.title")}</h1>
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
                <h2 className="font-display text-2xl font-bold mb-2">{t("cityFind.guessTheCity")}</h2>
                <p className="text-muted-foreground mb-4">
                  {tf("cityFind.intro", { rounds: ROUNDS })}
                </p>
                {roomCode ? (
                  <p className="text-xs text-primary mb-3">
                    {tf("cityFind.roomNotice", { room: roomCode })}
                  </p>
                ) : null}
                <Button onClick={startGame} size="lg" className="w-full mb-3">{t("general.start")}</Button>

                {!roomCode ? (
                  <Button onClick={createRoom} variant="outline" size="lg" className="w-full">
                    <Users className="w-4 h-4 mr-2" /> {t("cityFind.playWithFriends")}
                  </Button>
                ) : (
                  <Button onClick={shareRoom} variant="outline" size="lg" className="w-full">
                    <Share2 className="w-4 h-4 mr-2" /> {t("cityFind.shareRoomLink")}
                  </Button>
                )}

                {!roomCode && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">{t("cityFind.haveCode")}</p>
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
                  <span className="font-semibold">{tf("cityFind.round", { current: roundIdx + 1, total: ROUNDS })}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Timer className="w-4 h-4" /> {timeLeft}s
                  </span>
                </div>

                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-muted shadow-card">
                  <CityView city={currentCity} />
                </div>

                {hintsUsed >= 1 && (
                  <div className="bg-accent/10 border border-accent/30 rounded-xl px-3 py-2 text-sm">
                    <strong>{t("cityFind.continentHint")}</strong> {countryToContinent(currentCity.country_en)}
                  </div>
                )}
                {hintsUsed >= 2 && (
                  <div className="bg-accent/10 border border-accent/30 rounded-xl px-3 py-2 text-sm flex items-center gap-2">
                    <strong>{t("cityFind.countryHint")}</strong>
                    <span className="text-2xl leading-none">{currentCity.flag}</span>
                    <span className="text-xs text-muted-foreground">(guess the country from its flag)</span>
                  </div>
                )}

                <WorldGuessMap mode="input" guess={guessPos} onPick={setGuessPos} />

                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={useHint}
                    disabled={hintsUsed >= 2}
                    className="text-xs"
                  >
                    <Lightbulb className="w-3.5 h-3.5 mr-1" />
                    {t("cityFind.hint")} ({hintsUsed}/2) · -{HINT_COSTS[hintsUsed] ?? 0}
                  </Button>
                  <Button onClick={() => submitGuess()} disabled={!guessPos} className="flex-1">
                    <Target className="w-4 h-4 mr-2" /> Submit Guess
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
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`flex items-center justify-center gap-2 mb-3 ${
                    lastResult.correct ? "text-game-green" : "text-destructive"
                  }`}
                >
                  {lastResult.correct ? (
                    <CheckCircle2 className="w-10 h-10" />
                  ) : (
                    <span className="text-4xl">❌</span>
                  )}
                  <span className="font-display text-2xl font-bold">
                    {lastResult.correct ? t("cityFind.correct") : t("cityFind.wrong")}
                  </span>
                </motion.div>

                <div className="text-4xl mb-1">{lastResult.city.flag}</div>
                <h3 className="font-display text-xl font-bold">{lastResult.city.name_en}</h3>
                <p className="text-muted-foreground text-sm mb-2">{lastResult.city.country_en}</p>

                <p className="text-sm text-muted-foreground">
                  {lastResult.guess
                    ? `${Math.round(lastResult.distanceKm).toLocaleString()} km away`
                    : "No guess placed"}
                </p>

                <WorldGuessMap
                  mode="result"
                  guess={lastResult.guess}
                  actual={{ lat: lastResult.city.lat, lng: lastResult.city.lng }}
                />

                <div
                  className={`mt-4 text-3xl font-bold ${
                    lastResult.correct ? "text-game-green" : "text-muted-foreground"
                  }`}
                >
                  +{lastResult.gain}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {tf("cityFind.total", { score })}
                </p>
                <Button onClick={nextRound} size="lg" className="mt-4 w-full">
                  {roundIdx + 1 >= cities.length ? t("cityFind.seeResults") : t("cityFind.nextRound")}
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
                <h2 className="font-display text-3xl font-bold mb-2">{t("cityFind.gameOver")}</h2>
                <p className="text-5xl font-display font-bold bg-gradient-to-r from-primary to-game-pink bg-clip-text text-transparent my-4">
                  {score}
                </p>
                <p className="text-sm text-muted-foreground mb-4">{tf("cityFind.outOfMax", { max: ROUNDS * 800 })}</p>
                {roomCode && (
                  <Button onClick={shareRoom} variant="outline" className="w-full mb-2">
                    <Share2 className="w-4 h-4 mr-2" /> {t("cityFind.challengeFriends")}
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button onClick={startGame} className="flex-1">{t("cityFind.playAgain")}</Button>
                  <Button variant="outline" onClick={() => navigate("/")} className="flex-1">{t("general.home")}</Button>
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

// Google calls window.gm_authFailure when the API key is rejected (bad key,
// or — the common case here — an HTTP referrer restriction that doesn't
// include this domain). This is the only reliable signal for that failure:
// getPanorama() still reports a panorama as found, and the actual auth error
// only surfaces when StreetViewPanorama tries to render tiles, at which
// point Google draws its own "Oops!" overlay directly into our container
// instead of calling back into our code. Once it fires, every Street View
// attempt this session is treated as unavailable immediately.
declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}
let mapsAuthFailed = false;
const authFailureListeners = new Set<() => void>();
window.gm_authFailure = () => {
  mapsAuthFailed = true;
  authFailureListeners.forEach((fn) => fn());
  authFailureListeners.clear();
};

// Loads the Google Maps JS SDK exactly once, however many rounds/components need it.
let mapsLoadPromise: Promise<void> | null = null;
const loadGoogleMaps = (apiKey: string): Promise<void> => {
  if (window.google?.maps?.StreetViewPanorama) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      mapsLoadPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
};

// Real, explorable Street View panorama dropped near the city's coordinates.
// Navigation arrows (linksControl/clickToGo) let the player walk around; the
// address bar and road-name labels are disabled so nothing gives the city away.
const LiveStreetView = ({ city, onUnavailable }: { city: CityData; onUnavailable: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let settled = false;
    setReady(false);
    const coords = { lat: city.lat, lng: city.lng };

    // Google Maps can hang indefinitely (blocked request, bad API key/referrer
    // restriction, slow network) without ever calling onload/onerror or the
    // getPanorama callback. Without a timeout that leaves the player stuck on
    // a permanent spinner, so fall back to the photo slideshow if nothing
    // resolves in time.
    const timeout = setTimeout(() => {
      if (!settled && !cancelled) {
        settled = true;
        onUnavailable();
      }
    }, 8000);

    const finish = (fn: () => void) => {
      if (settled || cancelled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    };

    const authListener = () => finish(onUnavailable);
    authFailureListeners.add(authListener);

    if (mapsAuthFailed) {
      finish(onUnavailable);
    } else {
      loadGoogleMaps(GOOGLE_MAPS_API_KEY)
        .then(() => {
          if (cancelled || !containerRef.current || mapsAuthFailed) return;
          const service = new google.maps.StreetViewService();
          service.getPanorama(
            {
              location: coords,
              radius: 50000,
              source: google.maps.StreetViewSource.OUTDOOR,
            },
            (data, status) => {
              if (status !== google.maps.StreetViewStatus.OK || !data?.location?.latLng || !containerRef.current) {
                finish(onUnavailable);
                return;
              }
              const container = containerRef.current;
              new google.maps.StreetViewPanorama(container, {
                position: data.location.latLng,
                pov: { heading: Math.random() * 360, pitch: 0 },
                zoom: 0,
                addressControl: false,
                showRoadLabels: false,
                linksControl: true,
                panControl: true,
                zoomControl: true,
                fullscreenControl: false,
                motionTracking: false,
                motionTrackingControl: false,
                clickToGo: true,
              });

              // A rejected/restricted API key doesn't reject getPanorama() or
              // throw — Google silently renders its own "Oops! Something went
              // wrong" panel *inside our container* once it tries to fetch
              // panorama tiles. gm_authFailure isn't reliably called for this
              // in current library versions, so watch the DOM directly: if
              // that text shows up, treat it exactly like an unavailable
              // panorama instead of declaring success.
              const authErrorObserver = new MutationObserver(() => {
                if (container.textContent?.includes("Oops")) {
                  authErrorObserver.disconnect();
                  finish(onUnavailable);
                }
              });
              authErrorObserver.observe(container, { childList: true, subtree: true, characterData: true });

              setTimeout(() => {
                authErrorObserver.disconnect();
                finish(() => {
                  if (mapsAuthFailed || container.textContent?.includes("Oops")) onUnavailable();
                  else setReady(true);
                });
              }, 1200);
            }
          );
        })
        .catch(() => finish(onUnavailable));
    }

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      authFailureListeners.delete(authListener);
    };
  }, [city.id, onUnavailable]);

  return (
    <div className="relative w-full h-full bg-muted">
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Loading street view…
        </div>
      )}
    </div>
  );
};

// Curated-photo slideshow, used only when live Street View has no coverage
// near this city (or the Maps SDK fails to load).
const MysteryStreetView = ({ city }: { city: CityData }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [city.id]);

  useEffect(() => {
    if (!city.images || city.images.length <= 1) return;
    const images = city.images;
    const id = setInterval(() => setIdx((i) => (i + 1) % images.length), 3000);
    return () => clearInterval(id);
  }, [city.id, city.images]);

  if (!city.images || city.images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-4xl">
        🌍
      </div>
    );
  }

  return (
    <img
      key={`${city.id}-${idx}`}
      src={city.images[idx] || city.images[0]}
      alt="Mystery location"
      className="w-full h-full object-cover animate-fade-in"
    />
  );
};

const CityView = ({ city }: { city: CityData }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [city.id]);
  const onUnavailable = useCallback(() => setFailed(true), []);
  if (failed) return <MysteryStreetView city={city} />;
  return <LiveStreetView city={city} onUnavailable={onUnavailable} />;
};

const JoinRoomInput = ({ onJoin }: { onJoin: (code: string) => void }) => {
  const [code, setCode] = useState("");
  const { t } = useLanguage();
  return (
    <div className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder={t("cityFind.enterRoomCode")}
        maxLength={6}
        className="font-mono uppercase"
      />
      <Button onClick={() => code.trim() && onJoin(code.trim())} disabled={!code.trim()}>
        {t("general.join")}
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
