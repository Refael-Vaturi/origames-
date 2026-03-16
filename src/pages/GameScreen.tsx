import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Eye, MessageSquare, Send, Vote, Sparkles } from "lucide-react";

type GamePhase = "secret" | "hints" | "discussion" | "voting" | "reveal";

const mockPlayers = [
  { id: 1, name: "Player123", hint: "", voted: false },
  { id: 2, name: "CoolGamer", hint: "It's round and bouncy", voted: false },
  { id: 3, name: "QuickFox", hint: "You see it in sports", voted: false },
  { id: 4, name: "SlyWolf", hint: "Kids love it", voted: false },
  { id: 5, name: "BrightStar", hint: "It can be kicked", voted: false },
];

const GameScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [phase, setPhase] = useState<GamePhase>("secret");
  const [timer, setTimer] = useState(5);
  const [hint, setHint] = useState("");
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const totalRounds = 5;

  const phaseTimes: Record<GamePhase, number> = {
    secret: 5,
    hints: 30,
    discussion: 45,
    voting: 20,
    reveal: 6,
  };

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
  }, [phase]);

  const advancePhase = () => {
    const order: GamePhase[] = ["secret", "hints", "discussion", "voting", "reveal"];
    const idx = order.indexOf(phase);
    if (idx < order.length - 1) {
      setPhase(order[idx + 1]);
    }
  };

  const handleNextRound = () => {
    if (round < totalRounds) {
      setRound(round + 1);
      setPhase("secret");
      setHint("");
      setSelectedVote(null);
    } else {
      navigate("/results");
    }
  };

  const colors = ["hsl(267 84% 58%)", "hsl(340 82% 62%)", "hsl(174 72% 50%)", "hsl(38 100% 60%)", "hsl(142 70% 50%)"];

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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center">
                <Eye className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">
                {t("game.yourSecret")}
              </h2>
              <div className="bg-card rounded-3xl p-6 shadow-card mb-4">
                <p className="font-display text-3xl font-bold text-primary">🏀 Basketball</p>
              </div>
              <p className="text-sm text-muted-foreground font-body">
                {t("game.dontExpose")}
              </p>
            </motion.div>
          )}

          {/* HINTS PHASE */}
          {phase === "hints" && (
            <motion.div
              key="hints"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <h2 className="font-display text-lg font-bold text-foreground mb-4 text-center">
                {t("game.giveHint")}
              </h2>

              {/* Other players' hints */}
              <div className="space-y-2 mb-4">
                {mockPlayers.slice(1).map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.5 }}
                    className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-card"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-xs"
                      style={{ background: colors[(i + 1) % colors.length] }}
                    >
                      {p.name[0]}
                    </div>
                    <span className="text-sm font-body text-foreground">{p.hint || "..."}</span>
                  </motion.div>
                ))}
              </div>

              {/* Your hint input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder={t("game.giveHint")}
                  maxLength={50}
                  className="flex-1 h-12 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={() => advancePhase()}
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

              {/* All hints displayed */}
              <div className="space-y-2 mb-4">
                {mockPlayers.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-card">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-xs"
                      style={{ background: colors[i % colors.length] }}
                    >
                      {p.name[0]}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-display font-semibold text-foreground">{p.name}</span>
                      <p className="text-sm font-body text-muted-foreground">
                        {i === 0 ? (hint || "...") : p.hint}
                      </p>
                    </div>
                  </div>
                ))}
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
                {mockPlayers.slice(1).map((p, i) => (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedVote(p.id)}
                    className={`w-full flex items-center gap-3 rounded-2xl p-3 transition-all border-2 ${
                      selectedVote === p.id
                        ? "border-primary bg-primary/10 shadow-card"
                        : "border-transparent bg-card shadow-card"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold"
                      style={{ background: colors[(i + 1) % colors.length] }}
                    >
                      {p.name[0]}
                    </div>
                    <span className="font-display font-semibold text-sm text-foreground">{p.name}</span>
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
                  style={{ background: colors[2] }}
                >
                  Q
                </div>
                <p className="font-display text-lg font-bold text-foreground mb-1">
                  QuickFox {t("game.wasFake")}
                </p>
                <p className="text-sm text-muted-foreground font-body">
                  🎾 Tennis (≠ 🏀 Basketball)
                </p>
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
