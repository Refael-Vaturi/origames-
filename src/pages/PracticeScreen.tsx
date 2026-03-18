import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot, Send, Eye, EyeOff, Vote, Sparkles, Crown, Shield, Skull } from "lucide-react";
import { playClick, playSuccess, playError, playWhoosh, playTick, playReveal, playVote, playPop, playDrumroll, playCaught, playEscaped } from "@/hooks/useSound";

const WORDS = [
  { en: "Basketball", he: "כדורסל" }, { en: "Pizza", he: "פיצה" }, { en: "Dog", he: "כלב" },
  { en: "Guitar", he: "גיטרה" }, { en: "Beach", he: "חוף" }, { en: "Coffee", he: "קפה" },
  { en: "Airplane", he: "מטוס" }, { en: "Moon", he: "ירח" }, { en: "Doctor", he: "רופא" },
  { en: "Chocolate", he: "שוקולד" }, { en: "Rain", he: "גשם" }, { en: "Lion", he: "אריה" },
  { en: "Bicycle", he: "אופניים" }, { en: "Apple", he: "תפוח" }, { en: "Camera", he: "מצלמה" },
  { en: "Elephant", he: "פיל" }, { en: "Ice Cream", he: "גלידה" }, { en: "Volcano", he: "הר געש" },
  { en: "Robot", he: "רובוט" }, { en: "Pirate", he: "פיראט" },
];

const SIMILAR_WORDS: Record<string, { en: string; he: string }> = {
  "Basketball": { en: "Volleyball", he: "כדורעף" }, "Pizza": { en: "Pasta", he: "פסטה" },
  "Dog": { en: "Cat", he: "חתול" }, "Guitar": { en: "Piano", he: "פסנתר" },
  "Beach": { en: "Pool", he: "בריכה" }, "Coffee": { en: "Tea", he: "תה" },
  "Airplane": { en: "Helicopter", he: "מסוק" }, "Moon": { en: "Sun", he: "שמש" },
  "Doctor": { en: "Nurse", he: "אחות" }, "Chocolate": { en: "Candy", he: "סוכריה" },
  "Rain": { en: "Snow", he: "שלג" }, "Lion": { en: "Tiger", he: "נמר" },
  "Bicycle": { en: "Scooter", he: "קורקינט" }, "Apple": { en: "Orange", he: "תפוז" },
  "Camera": { en: "Phone", he: "טלפון" }, "Elephant": { en: "Giraffe", he: "ג'ירפה" },
  "Ice Cream": { en: "Cake", he: "עוגה" }, "Volcano": { en: "Mountain", he: "הר" },
  "Robot": { en: "Computer", he: "מחשב" }, "Pirate": { en: "Knight", he: "אביר" },
};

// Hint banks per word for bots (easy/medium/hard)
const BOT_HINTS: Record<string, string[][]> = {
  "Basketball": [["bounce", "court", "hoop"], ["dribble", "NBA", "slam dunk"], ["three-pointer", "foul line"]],
  "Pizza": [["cheese", "oven", "slice"], ["pepperoni", "delivery", "dough"], ["margherita", "crust"]],
  "Dog": [["bark", "tail", "fetch"], ["leash", "puppy", "collar"], ["loyal", "paw", "breed"]],
  "Guitar": [["strings", "music", "strum"], ["acoustic", "pick", "chord"], ["solo", "fret", "amp"]],
  "Beach": [["sand", "waves", "sun"], ["surfing", "towel", "shell"], ["tide", "coast", "palm"]],
  "Coffee": [["morning", "cup", "hot"], ["espresso", "beans", "brew"], ["caffeine", "roast", "latte"]],
  "Airplane": [["fly", "wings", "sky"], ["pilot", "runway", "boarding"], ["turbulence", "altitude"]],
  "Moon": [["night", "stars", "glow"], ["crescent", "orbit", "tide"], ["lunar", "eclipse", "crater"]],
  "Doctor": [["hospital", "health", "medicine"], ["stethoscope", "diagnosis"], ["prescription", "clinic"]],
  "Chocolate": [["sweet", "cocoa", "brown"], ["truffle", "milk", "dark"], ["ganache", "Belgium"]],
  "Rain": [["wet", "clouds", "umbrella"], ["storm", "drops", "puddle"], ["drizzle", "thunder"]],
  "Lion": [["mane", "roar", "jungle"], ["pride", "king", "safari"], ["predator", "savanna"]],
  "Bicycle": [["pedal", "wheels", "ride"], ["chain", "helmet", "gear"], ["handlebar", "spoke"]],
  "Apple": [["fruit", "red", "tree"], ["seed", "bite", "juice"], ["orchard", "cider", "crisp"]],
  "Camera": [["photo", "lens", "click"], ["flash", "focus", "zoom"], ["shutter", "exposure"]],
  "Elephant": [["trunk", "big", "grey"], ["tusks", "Africa", "memory"], ["herd", "savanna"]],
  "Ice Cream": [["cold", "cone", "sweet"], ["vanilla", "scoop", "sundae"], ["gelato", "sprinkles"]],
  "Volcano": [["lava", "eruption", "hot"], ["magma", "ash", "crater"], ["dormant", "tectonic"]],
  "Robot": [["metal", "machine", "program"], ["AI", "circuit", "servo"], ["android", "automate"]],
  "Pirate": [["ship", "treasure", "sea"], ["skull", "sword", "island"], ["captain", "plunder"]],
};

const BOT_NAMES = ["🤖 Alex", "🤖 Sam", "🤖 Max", "🤖 Luna"];
const BOT_COLORS = ["hsl(267 84% 58%)", "hsl(340 82% 62%)", "hsl(174 72% 50%)", "hsl(38 100% 60%)"];

type Phase = "secret" | "hint" | "waiting" | "discussion" | "voting" | "reveal" | "results";

interface BotPlayer {
  id: string;
  name: string;
  color: string;
  isFake: boolean;
}

const PracticeScreen = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const playerLevel = profile?.level || 1;
  const difficulty = playerLevel <= 3 ? 0 : playerLevel <= 7 ? 1 : 2; // 0=easy, 1=medium, 2=hard

  const [botCount] = useState(3);
  const [phase, setPhase] = useState<Phase>("secret");
  const [word, setWord] = useState(WORDS[0]);
  const [fakeWord, setFakeWord] = useState(SIMILAR_WORDS["Basketball"]);
  const [playerIsFake, setPlayerIsFake] = useState(false);
  const [bots, setBots] = useState<BotPlayer[]>([]);
  const [hintInput, setHintInput] = useState("");
  const [allHints, setAllHints] = useState<{ name: string; hint: string; isFake: boolean }[]>([]);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [botVotes, setBotVotes] = useState<Record<string, string>>({});
  const [timer, setTimer] = useState(0);
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showSecret, setShowSecret] = useState(true);
  const timerRef = useRef<NodeJS.Timeout>();

  const initRound = useCallback(() => {
    const wordIndex = Math.floor(Math.random() * WORDS.length);
    const w = WORDS[wordIndex];
    const fw = SIMILAR_WORDS[w.en] || { en: "Unknown", he: "לא ידוע" };
    setWord(w);
    setFakeWord(fw);

    // Create bots
    const newBots: BotPlayer[] = Array.from({ length: botCount }, (_, i) => ({
      id: `bot-${i}`,
      name: BOT_NAMES[i],
      color: BOT_COLORS[i],
      isFake: false,
    }));

    // Pick random fake (could be player or a bot)
    const totalPlayers = botCount + 1;
    const fakeIndex = Math.floor(Math.random() * totalPlayers);
    if (fakeIndex === 0) {
      setPlayerIsFake(true);
      newBots.forEach(b => b.isFake = false);
    } else {
      setPlayerIsFake(false);
      newBots[fakeIndex - 1].isFake = true;
    }

    setBots(newBots);
    setPhase("secret");
    setShowSecret(true);
    setHintInput("");
    setAllHints([]);
    setVotedFor(null);
    setBotVotes({});
    setTimer(5);
    playWhoosh();
  }, [botCount]);

  useEffect(() => { initRound(); }, [initRound]);

  // Timer countdown
  useEffect(() => {
    if (timer <= 0) return;
    timerRef.current = setTimeout(() => {
      setTimer(t => t - 1);
      if (timer <= 4 && timer > 1) playTick();
    }, 1000);
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  // Auto-advance phases
  useEffect(() => {
    if (phase === "secret" && timer === 0) {
      setShowSecret(false);
      setPhase("hint");
      setTimer(20);
      playWhoosh();
    }
    if (phase === "hint" && timer === 0 && hintInput === "") {
      setHintInput("...");
      submitHint("...");
    }
    if (phase === "discussion" && timer === 0) {
      setPhase("voting");
      setTimer(15);
      playWhoosh();
    }
    if (phase === "voting" && timer === 0 && !votedFor) {
      // Auto-vote random
      const randomTarget = bots[Math.floor(Math.random() * bots.length)].name;
      handleVote(randomTarget);
    }
  }, [phase, timer]);

  const generateBotHints = useCallback(() => {
    const wordKey = word.en;
    const hints = BOT_HINTS[wordKey] || [["thing", "stuff", "yes"]];
    const difficultyHints = hints[Math.min(difficulty, hints.length - 1)];

    return bots.map(bot => {
      if (bot.isFake) {
        // Fake bot gives vague or slightly wrong hint
        const fakeHints = ["interesting", "colorful", "fun", "popular", "classic", "exciting", "cool", "nice"];
        const easyFake = fakeHints[Math.floor(Math.random() * fakeHints.length)];
        // Higher difficulty = better fake hints
        if (difficulty >= 2) {
          // Try to give a hint that could apply to the similar word
          const similarHints = BOT_HINTS[SIMILAR_WORDS[wordKey]?.en || ""] || [["thing"]];
          const pool = similarHints.flat();
          return { name: bot.name, hint: pool[Math.floor(Math.random() * pool.length)] || easyFake, isFake: true };
        }
        return { name: bot.name, hint: easyFake, isFake: true };
      }
      const hint = difficultyHints[Math.floor(Math.random() * difficultyHints.length)];
      return { name: bot.name, hint, isFake: false };
    });
  }, [bots, word, difficulty]);

  const submitHint = (hint: string) => {
    const playerHint = { name: profile?.display_name || "You", hint, isFake: playerIsFake };
    const botHints = generateBotHints();
    const combined = [playerHint, ...botHints].sort(() => Math.random() - 0.5);
    setAllHints(combined);
    setPhase("discussion");
    setTimer(15);
    playPop();
  };

  const handleSubmitHint = () => {
    if (!hintInput.trim()) return;
    playClick();
    submitHint(hintInput.trim());
  };

  const handleVote = (targetName: string) => {
    setVotedFor(targetName);
    playVote();

    // Bot votes
    const newBotVotes: Record<string, string> = {};
    const allNames = [profile?.display_name || "You", ...bots.map(b => b.name)];

    bots.forEach(bot => {
      // Bots vote based on difficulty
      if (difficulty === 0) {
        // Easy: random vote (often wrong)
        const target = allNames.filter(n => n !== bot.name)[Math.floor(Math.random() * (allNames.length - 1))];
        newBotVotes[bot.name] = target;
      } else {
        // Smarter: tend to vote for the actual fake
        const fakeName = playerIsFake
          ? (profile?.display_name || "You")
          : bots.find(b => b.isFake)?.name || allNames[0];
        newBotVotes[bot.name] = Math.random() < (difficulty === 2 ? 0.7 : 0.5) ? fakeName : allNames.filter(n => n !== bot.name)[Math.floor(Math.random() * (allNames.length - 1))];
      }
    });

    setBotVotes(newBotVotes);

    setTimeout(() => {
      setPhase("reveal");
      playDrumroll();
      setTimeout(() => playReveal(), 2500);
    }, 1500);
  };

  // Calculate results
  const getResults = () => {
    const allVotes = { ...botVotes, [profile?.display_name || "You"]: votedFor || "" };
    const voteCounts: Record<string, number> = {};
    Object.values(allVotes).forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });

    const mostVoted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const fakeName = playerIsFake
      ? (profile?.display_name || "You")
      : bots.find(b => b.isFake)?.name || "";

    const caught = mostVoted === fakeName;
    return { mostVoted, fakeName, caught };
  };

  const handleNextRound = () => {
    const { caught } = getResults();
    const newScores = { ...scores };
    const playerName = profile?.display_name || "You";

    if (caught) {
      if (!playerIsFake) {
        newScores[playerName] = (newScores[playerName] || 0) + 10;
      }
      playCaught();
    } else {
      if (playerIsFake) {
        newScores[playerName] = (newScores[playerName] || 0) + 15;
      }
      playEscaped();
    }

    setScores(newScores);

    if (round >= 3) {
      setPhase("results");
      playSuccess();
    } else {
      setRound(r => r + 1);
      initRound();
    }
  };

  const wordDisplay = language === "he" ? word.he : word.en;
  const fakeWordDisplay = language === "he" ? fakeWord.he : fakeWord.en;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-6">
      <motion.div
        className="w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="bg-card rounded-3xl p-6 shadow-card">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                {t("practice.title")}
              </h1>
              <p className="text-xs text-muted-foreground">{t("game.round")} {round}/3</p>
            </div>
            {timer > 0 && (
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm ${
                  timer <= 5 ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                }`}
                animate={timer <= 5 ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {timer}
              </motion.div>
            )}
          </div>

          {/* Bot avatars */}
          <div className="flex justify-center gap-2 mb-4">
            <motion.div
              className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center text-sm font-bold text-primary-foreground"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {(profile?.display_name || "Y")[0]}
            </motion.div>
            {bots.map((bot, i) => (
              <motion.div
                key={bot.id}
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm"
                style={{ background: bot.color }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: "spring" }}
              >
                🤖
              </motion.div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* SECRET PHASE */}
            {phase === "secret" && (
              <motion.div
                key="secret"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-4"
              >
                {playerIsFake ? (
                  <>
                    <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                      <Skull className="w-8 h-8 text-destructive mx-auto mb-2" />
                      <p className="font-display font-bold text-destructive">{t("game.youAreFake")}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t("game.fakeInstruction")}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted">
                      <p className="text-xs text-muted-foreground mb-1">{t("practice.yourFakeWord")}</p>
                      <p className="font-display text-2xl font-bold text-foreground">{fakeWordDisplay}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                      <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="font-display font-bold text-primary">{t("game.yourSecret")}</p>
                    </div>
                    <motion.div
                      className="p-4 rounded-2xl bg-muted"
                      animate={{ scale: showSecret ? [1, 1.05, 1] : 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <p className="font-display text-3xl font-bold text-foreground">{wordDisplay}</p>
                      <p className="text-xs text-muted-foreground mt-2">{t("game.dontExpose")}</p>
                    </motion.div>
                  </>
                )}
              </motion.div>
            )}

            {/* HINT PHASE */}
            {phase === "hint" && (
              <motion.div
                key="hint"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <p className="text-center font-display font-semibold text-foreground">
                  {playerIsFake ? t("game.fakeHintTip") : t("game.hintTip")}
                </p>
                <div className="flex gap-2">
                  <input
                    value={hintInput}
                    onChange={(e) => setHintInput(e.target.value)}
                    placeholder={playerIsFake ? t("game.fakeHintPlaceholder") : t("game.giveHint")}
                    className="flex-1 h-12 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitHint()}
                    autoFocus
                  />
                  <Button variant="hero" size="icon" onClick={handleSubmitHint}>
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* DISCUSSION */}
            {phase === "discussion" && (
              <motion.div
                key="discussion"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                <p className="text-center font-display font-semibold text-foreground mb-2">💬 {t("game.discuss")}</p>
                {allHints.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-muted"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {h.name[0] === "�" ? "🤖" : h.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground font-body">{h.name}</p>
                      <p className="font-display font-semibold text-foreground text-sm">"{h.hint}"</p>
                    </div>
                  </motion.div>
                ))}
                <Button variant="game" size="lg" className="w-full mt-2" onClick={() => { setPhase("voting"); setTimer(15); playWhoosh(); }}>
                  🗳️ {t("practice.readyToVote")}
                </Button>
              </motion.div>
            )}

            {/* VOTING */}
            {phase === "voting" && (
              <motion.div
                key="voting"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                <p className="text-center font-display font-semibold text-foreground mb-2">
                  {t("game.whoIsDifferent")}
                </p>
                {bots.map((bot, i) => (
                  <motion.button
                    key={bot.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleVote(bot.name)}
                    disabled={!!votedFor}
                    className={`w-full p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                      votedFor === bot.name
                        ? "border-primary bg-primary/10"
                        : "border-input bg-background hover:border-primary/50"
                    } disabled:opacity-70`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: bot.color }}>
                      🤖
                    </div>
                    <span className="font-display font-semibold text-foreground">{bot.name}</span>
                    {votedFor === bot.name && <Vote className="w-5 h-5 text-primary ms-auto" />}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* REVEAL */}
            {phase === "reveal" && (() => {
              const { mostVoted, fakeName, caught } = getResults();
              return (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <motion.div
                    className={`p-6 rounded-2xl ${caught ? "bg-green-500/10 border border-green-500/20" : "bg-destructive/10 border border-destructive/20"}`}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <p className="font-display text-xl font-bold mb-2">
                      {caught ? "✅ " + t("game.youCaughtFake") : "❌ " + t("game.fakeSurvived")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {fakeName} {t("game.wasFake")}
                    </p>
                    <p className="text-sm font-body mt-2">
                      {t("game.theWordWas")}: <span className="font-bold text-primary">{wordDisplay}</span>
                    </p>
                  </motion.div>

                  <Button variant="hero" size="lg" className="w-full" onClick={handleNextRound}>
                    {round >= 3 ? t("game.results") : t("game.nextRound")} →
                  </Button>
                </motion.div>
              );
            })()}

            {/* RESULTS */}
            {phase === "results" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
              >
                <Crown className="w-12 h-12 text-yellow-500 mx-auto" />
                <h2 className="font-display text-2xl font-bold text-foreground">{t("practice.complete")}</h2>
                <div className="p-4 rounded-2xl bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">{t("game.score")}</p>
                  <p className="font-display text-4xl font-bold text-primary">
                    {scores[profile?.display_name || "You"] || 0}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="game" size="lg" className="flex-1" onClick={() => { setRound(1); setScores({}); initRound(); }}>
                    🔄 {t("practice.playAgain")}
                  </Button>
                  <Button variant="outline" size="lg" className="flex-1" onClick={() => navigate("/")}>
                    🏠 {t("game.backHome")}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default PracticeScreen;
