import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, MessageSquare, Send, Vote, Sparkles } from "lucide-react";

type GamePhase = "secret" | "hint1" | "hint2" | "hint3" | "discussion" | "voting" | "reveal";

// Each word has its own set of specific hints
interface WordEntry {
  word: string;
  hints: string[];
}

const wordsEn: WordEntry[] = [
  { word: "Basketball", hints: ["You dribble it", "Orange and round", "Slam dunk", "Court sport", "Hoops"] },
  { word: "Pizza", hints: ["Cheesy slices", "Italian origin", "Comes in a box", "Pepperoni on top", "Baked in an oven"] },
  { word: "Dog", hints: ["Man's best friend", "It barks", "Wags its tail", "Loves walks", "Fetches sticks"] },
  { word: "Guitar", hints: ["Has strings", "You strum it", "Rock instrument", "Has a neck", "Acoustic or electric"] },
  { word: "Beach", hints: ["Sandy ground", "Waves crash here", "Sunscreen needed", "Seashells around", "Surfing spot"] },
  { word: "Coffee", hints: ["Morning drink", "Caffeine boost", "Brewed hot", "Comes in beans", "Barista makes it"] },
  { word: "Airplane", hints: ["It flies high", "Has wings", "Runway needed", "Pilot controls it", "Turbulence possible"] },
  { word: "Moon", hints: ["Shines at night", "Has craters", "Orbits Earth", "Full or crescent", "Astronauts visited"] },
  { word: "Doctor", hints: ["Wears white coat", "Prescribes medicine", "Uses stethoscope", "Works in hospital", "Heals people"] },
  { word: "Chocolate", hints: ["Sweet treat", "Made from cocoa", "Melts in heat", "Dark or milk", "Valentine's gift"] },
  { word: "Rain", hints: ["Falls from clouds", "You need umbrella", "Makes puddles", "Waters plants", "Thunder follows"] },
  { word: "Lion", hints: ["King of jungle", "Has a mane", "Roars loudly", "Lives in pride", "African predator"] },
  { word: "Bicycle", hints: ["Two wheels", "You pedal it", "Has handlebars", "Chain driven", "Eco-friendly ride"] },
  { word: "Apple", hints: ["Red or green", "Grows on trees", "Has seeds inside", "Crunchy bite", "Keeps doctor away"] },
  { word: "Camera", hints: ["Takes pictures", "Has a lens", "Flash of light", "Say cheese", "Memory captured"] },
  { word: "Elephant", hints: ["Largest land animal", "Has a trunk", "Big floppy ears", "Never forgets", "Gray and wrinkly"] },
  { word: "Ice Cream", hints: ["Cold dessert", "Comes in cone", "Many flavors", "Melts fast", "Summer favorite"] },
  { word: "Volcano", hints: ["Erupts with lava", "Mountain shaped", "Very dangerous", "Smoke rises", "Hot inside"] },
];

const wordsHe: WordEntry[] = [
  { word: "כדורסל", hints: ["מכדררים אותו", "כתום ועגול", "סלאם דאנק", "ספורט מגרש", "טבעת וקרש"] },
  { word: "פיצה", hints: ["פרוסות עם גבינה", "מקור איטלקי", "מגיעה בקופסה", "פפרוני למעלה", "נאפית בתנור"] },
  { word: "כלב", hints: ["החבר הכי טוב", "הוא נובח", "מכשכש בזנב", "אוהב טיולים", "מביא מקלות"] },
  { word: "גיטרה", hints: ["יש לה מיתרים", "מנגנים עליה", "כלי רוק", "יש לה צוואר", "אקוסטית או חשמלית"] },
  { word: "חוף", hints: ["קרקע חולית", "גלים מתנפצים", "צריך קרם הגנה", "צדפים מסביב", "מקום לגלוש"] },
  { word: "קפה", hints: ["משקה בוקר", "בוסט קפאין", "מחלחל חם", "מגיע בפולים", "בריסטה מכין"] },
  { word: "מטוס", hints: ["טס גבוה", "יש לו כנפיים", "צריך מסלול", "טייס שולט", "טורבולנציה אפשרית"] },
  { word: "ירח", hints: ["מאיר בלילה", "יש לו מכתשים", "סובב את כדור הארץ", "מלא או חרמש", "אסטרונאוטים ביקרו"] },
  { word: "רופא", hints: ["לובש חלוק לבן", "רושם תרופות", "משתמש בסטטוסקופ", "עובד בבית חולים", "מרפא אנשים"] },
  { word: "שוקולד", hints: ["חטיף מתוק", "עשוי מקקאו", "נמס בחום", "מריר או חלב", "מתנת ולנטיין"] },
  { word: "גשם", hints: ["יורד מעננים", "צריך מטריה", "יוצר שלוליות", "משקה צמחים", "רעם אחרי"] },
  { word: "אריה", hints: ["מלך הג'ונגל", "יש לו רעמה", "שואג בקול", "חי בלהקה", "טורף אפריקאי"] },
  { word: "אופניים", hints: ["שני גלגלים", "דוושים עליהם", "יש כידון", "שרשרת מניעה", "תחבורה ירוקה"] },
  { word: "תפוח", hints: ["אדום או ירוק", "גדל על עץ", "יש גרעינים בפנים", "ביס פריך", "מרחיק רופא"] },
  { word: "מצלמה", hints: ["מצלמת תמונות", "יש לה עדשה", "הבזק אור", "תגיד צ'יז", "זיכרון נלכד"] },
  { word: "פיל", hints: ["היונק הגדול ביבשה", "יש לו חדק", "אוזניים גדולות", "אף פעם לא שוכח", "אפור ומקומט"] },
  { word: "גלידה", hints: ["קינוח קר", "מגיעה בגביע", "הרבה טעמים", "נמסה מהר", "אהובה בקיץ"] },
  { word: "הר געש", hints: ["מתפרץ עם לבה", "צורת הר", "מאוד מסוכן", "עשן עולה", "חם בפנים"] },
];

const GameScreen = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [phase, setPhase] = useState<GamePhase>("secret");
  const [timer, setTimer] = useState(5);
  const [hint, setHint] = useState("");
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [hintRound, setHintRound] = useState(1); // 1-3 within a round
  const [allHints, setAllHints] = useState<Record<number, string[]>>({}); // playerId -> hints[]
  const totalRounds = 5;

  const words = language === "he" ? wordsHe : wordsEn;

  // Pick a random word for this round
  const wordEntry = useMemo(() => {
    return words[Math.floor(Math.random() * words.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, language]);

  // Pick random faker each round (id 1-5, where 1 = "You")
  const fakePlayerId = useMemo(() => {
    return Math.floor(Math.random() * 5) + 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const iAmFake = fakePlayerId === 1;

  const playerNames = useMemo(() => {
    const you = language === "he" ? "אתה" : "You";
    return [you, "Player2", "Player3", "Player4", "Player5"];
  }, [language]);

  // Generate unique hints per player per hint round using the word's hint pool
  const botHints = useMemo(() => {
    const result: Record<number, string[]> = {};
    // Shuffle available hints for this word
    const available = [...wordEntry.hints].sort(() => Math.random() - 0.5);

    // We need 3 hint rounds × 4 bots = 12 hints max, but we have 5 per word
    // So we cycle through + add variations
    const extendedHints = [...available, ...available.map(h => h + "!"), ...available.map(h => "..." + h)];
    let hintIdx = 0;

    for (let pid = 2; pid <= 5; pid++) {
      result[pid] = [];
      for (let hr = 0; hr < 3; hr++) {
        if (pid === fakePlayerId) {
          // Fake player gives vague/generic hints
          const vagueEn = ["Hmm... it's common", "People like it", "I see it often", "It's a thing", "Everyone knows it", "Hard to describe"];
          const vagueHe = ["אממ... זה נפוץ", "אנשים אוהבים את זה", "אני רואה את זה הרבה", "זה דבר", "כולם מכירים", "קשה לתאר"];
          const vague = language === "he" ? vagueHe : vagueEn;
          result[pid].push(vague[Math.floor(Math.random() * vague.length)]);
        } else {
          result[pid].push(extendedHints[hintIdx % extendedHints.length]);
          hintIdx++;
        }
      }
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, language, fakePlayerId]);

  const phaseTimes: Record<GamePhase, number> = {
    secret: 5,
    hint1: 15,
    hint2: 15,
    hint3: 15,
    discussion: 45,
    voting: 20,
    reveal: 8,
  };

  const phaseOrder: GamePhase[] = ["secret", "hint1", "hint2", "hint3", "discussion", "voting", "reveal"];

  useEffect(() => {
    setTimer(phaseTimes[phase]);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          advancePhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const advancePhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      const nextPhase = phaseOrder[idx + 1];

      // Save player hint when moving from hint phase
      if (phase.startsWith("hint") && hint.trim()) {
        setAllHints((prev) => ({
          ...prev,
          1: [...(prev[1] || []), hint.trim()],
        }));
        setHint("");
      }

      if (nextPhase === "hint2") setHintRound(2);
      else if (nextPhase === "hint3") setHintRound(3);

      setPhase(nextPhase);
    }
  }, [phase, hint]);

  const handleSubmitHint = () => {
    if (hint.trim()) {
      advancePhase();
    }
  };

  const handleNextRound = () => {
    if (round < totalRounds) {
      setRound(round + 1);
      setPhase("secret");
      setHint("");
      setHintRound(1);
      setSelectedVote(null);
      setAllHints({});
    } else {
      navigate("/results");
    }
  };

  const colors = ["hsl(267 84% 58%)", "hsl(340 82% 62%)", "hsl(174 72% 50%)", "hsl(38 100% 60%)", "hsl(142 70% 50%)"];

  const currentHintRoundIdx = hintRound - 1;

  const getPhaseLabel = () => {
    if (phase.startsWith("hint")) {
      return `${t("game.giveHint")} (${hintRound}/3)`;
    }
    return "";
  };

  const fakePlayer = playerNames[fakePlayerId - 1];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-border">
        <span className="font-display font-semibold text-sm text-foreground">
          {t("game.round")} {round}/{totalRounds}
        </span>
        <div className="font-display text-lg font-bold text-primary">{timer}s</div>
        <span className="font-display font-semibold text-sm text-muted-foreground">
          {t("game.score")}: 0
        </span>
      </header>

      {/* Phase content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          {/* SECRET PHASE */}
          {phase === "secret" && (
            <motion.div
              key="secret"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-center w-full max-w-sm"
            >
              {iAmFake ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive flex items-center justify-center">
                    <EyeOff className="w-8 h-8 text-destructive-foreground" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">
                    {t("game.youAreFake")}
                  </h2>
                  <div className="bg-card rounded-3xl p-6 shadow-card mb-4">
                    <p className="font-display text-2xl font-bold text-destructive">
                      {t("game.noWordForYou")}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground font-body">
                    {t("game.fakeInstruction")}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center">
                    <Eye className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">
                    {t("game.yourSecret")}
                  </h2>
                  <div className="bg-card rounded-3xl p-6 shadow-card mb-4">
                    <p className="font-display text-3xl font-bold text-primary">{wordEntry.word}</p>
                  </div>
                  <p className="text-sm text-muted-foreground font-body">
                    {t("game.dontExpose")}
                  </p>
                </>
              )}
            </motion.div>
          )}

          {/* HINT PHASES (1-3) */}
          {phase.startsWith("hint") && (
            <motion.div
              key={`hints-${hintRound}`}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <h2 className="font-display text-lg font-bold text-foreground mb-1 text-center">
                {getPhaseLabel()}
              </h2>
              <p className="text-xs text-muted-foreground text-center mb-4 font-body">
                {iAmFake ? t("game.fakeHintTip") : t("game.hintTip")}
              </p>

              <div className="space-y-2 mb-4">
                {[2, 3, 4, 5].map((pid, i) => (
                  <motion.div
                    key={pid}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.3 }}
                    className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-card"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-xs"
                      style={{ background: colors[pid - 1] }}
                    >
                      {playerNames[pid - 1][0]}
                    </div>
                    <span className="text-sm font-body text-foreground">
                      {botHints[pid]?.[currentHintRoundIdx] || "..."}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder={iAmFake ? t("game.fakeHintPlaceholder") : t("game.giveHint")}
                  maxLength={50}
                  className="flex-1 h-12 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={handleSubmitHint}
                  className="h-12 w-12 rounded-2xl gradient-hero flex items-center justify-center text-primary-foreground"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* DISCUSSION PHASE */}
          {phase === "discussion" && (
            <motion.div
              key="discussion"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-game-cyan flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground mb-4 text-center">
                {t("game.discuss")}
              </h2>

              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {[1, 2, 3, 4, 5].map((pid) => {
                  const name = playerNames[pid - 1];
                  const hints = pid === 1 ? (allHints[1] || []) : (botHints[pid] || []);
                  return (
                    <div key={pid} className="bg-card rounded-2xl p-3 shadow-card">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-xs"
                          style={{ background: colors[(pid - 1) % colors.length] }}
                        >
                          {name[0]}
                        </div>
                        <span className="text-xs font-display font-semibold text-foreground">{name}</span>
                      </div>
                      <div className="ps-9 space-y-1">
                        {hints.length > 0 ? hints.map((h, i) => (
                          <p key={i} className="text-sm font-body text-muted-foreground">
                            {i + 1}. {h}
                          </p>
                        )) : (
                          <p className="text-sm font-body text-muted-foreground">...</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button variant="game" size="lg" className="w-full" onClick={() => advancePhase()}>
                {t("game.vote")} →
              </Button>
            </motion.div>
          )}

          {/* VOTING PHASE */}
          {phase === "voting" && (
            <motion.div
              key="voting"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-game-pink flex items-center justify-center">
                <Vote className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground mb-4 text-center">
                {t("game.whoIsDifferent")}
              </h2>

              <div className="space-y-2 mb-4">
                {[2, 3, 4, 5].map((pid) => (
                  <motion.button
                    key={pid}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedVote(pid)}
                    className={`w-full flex items-center gap-3 rounded-2xl p-3 transition-all border-2 ${
                      selectedVote === pid
                        ? "border-primary bg-primary/10 shadow-card"
                        : "border-transparent bg-card shadow-card"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold"
                      style={{ background: colors[(pid - 1) % colors.length] }}
                    >
                      {playerNames[pid - 1][0]}
                    </div>
                    <span className="font-display font-semibold text-sm text-foreground">{playerNames[pid - 1]}</span>
                  </motion.button>
                ))}
              </div>

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => advancePhase()}
                disabled={!selectedVote}
              >
                {t("game.vote")}
              </Button>
            </motion.div>
          )}

          {/* REVEAL PHASE */}
          {phase === "reveal" && (
            <motion.div
              key="reveal"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center w-full max-w-sm"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-game-yellow flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-accent-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                {t("game.reveal")}
              </h2>

              <div className="bg-card rounded-3xl p-6 shadow-card mb-4">
                <div
                  className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-xl"
                  style={{ background: colors[(fakePlayerId - 1) % colors.length] }}
                >
                  {fakePlayer[0]}
                </div>
                <p className="font-display text-lg font-bold text-foreground mb-1">
                  {fakePlayer} {t("game.wasFake")}
                </p>
                <p className="text-sm text-muted-foreground font-body mb-2">
                  {t("game.theWordWas")}: <span className="font-semibold text-primary">{wordEntry.word}</span>
                </p>
                {selectedVote === fakePlayerId ? (
                  <p className="text-sm font-display font-bold text-game-green">
                    🎉 {t("game.youCaughtFake")}
                  </p>
                ) : (
                  <p className="text-sm font-display font-bold text-game-pink">
                    😈 {t("game.fakeSurvived")}
                  </p>
                )}
              </div>

              <Button variant="hero" size="lg" className="w-full" onClick={handleNextRound}>
                {round < totalRounds ? t("game.nextRound") : t("game.results")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GameScreen;
