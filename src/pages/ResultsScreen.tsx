import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, ArrowLeft, Users } from "lucide-react";

const mockResults = [
  { id: 1, name: "CoolGamer", score: 450, caught: 2, survived: 1 },
  { id: 2, name: "Player123", score: 350, caught: 1, survived: 0 },
  { id: 3, name: "QuickFox", score: 300, caught: 0, survived: 2 },
  { id: 4, name: "SlyWolf", score: 250, caught: 1, survived: 1 },
  { id: 5, name: "BrightStar", score: 150, caught: 0, survived: 0 },
];

const colors = ["hsl(267 84% 58%)", "hsl(340 82% 62%)", "hsl(174 72% 50%)", "hsl(38 100% 60%)", "hsl(142 70% 50%)"];

const ResultsScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="bg-card rounded-3xl p-6 shadow-card">
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              className="w-16 h-16 mx-auto mb-3 rounded-full bg-game-yellow flex items-center justify-center"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Trophy className="w-8 h-8 text-accent-foreground" />
            </motion.div>
            <h1 className="font-display text-2xl font-bold text-foreground">{t("game.results")}</h1>
          </div>

          {/* Leaderboard */}
          <div className="space-y-3 mb-6">
            {mockResults.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.15 }}
                className={`flex items-center gap-3 rounded-2xl p-3 ${
                  i === 0 ? "bg-game-yellow/10 border-2 border-game-yellow" : "bg-background"
                }`}
              >
                <span className="font-display font-bold text-lg w-6 text-center text-foreground">
                  {i + 1}
                </span>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold"
                  style={{ background: colors[i % colors.length] }}
                >
                  {player.name[0]}
                </div>
                <div className="flex-1">
                  <span className="font-display font-semibold text-sm text-foreground">{player.name}</span>
                  <div className="flex gap-2 text-xs text-muted-foreground font-body">
                    <span>🎯 {player.caught}</span>
                    <span>🥷 {player.survived}</span>
                  </div>
                </div>
                <span className="font-display font-bold text-primary">{player.score}</span>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/game")}>
              <RotateCcw className="w-5 h-5" />
              {t("game.rematch")}
            </Button>
            <Button variant="game" size="lg" className="w-full" onClick={() => navigate("/lobby")}>
              <ArrowLeft className="w-5 h-5" />
              {t("game.backToLobby")}
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => navigate("/home")}>
              <Users className="w-5 h-5" />
              {t("game.inviteFriends")}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResultsScreen;
