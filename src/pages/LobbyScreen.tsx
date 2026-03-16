import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Share2, Send, Crown } from "lucide-react";

const mockPlayers = [
  { id: 1, name: "Player123", ready: true, isHost: true },
  { id: 2, name: "CoolGamer", ready: true, isHost: false },
  { id: 3, name: "QuickFox", ready: false, isHost: false },
];

const LobbyScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [chatInput, setChatInput] = useState("");
  const [isReady, setIsReady] = useState(false);
  const roomCode = "ABCD12";

  const colors = ["hsl(267 84% 58%)", "hsl(340 82% 62%)", "hsl(174 72% 50%)", "hsl(38 100% 60%)"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header
        className="px-4 py-3 flex items-center justify-between border-b border-border"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">{t("lobby.title")}</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-muted rounded-xl px-3 py-2 font-display text-sm font-semibold tracking-wider text-foreground">
            {roomCode}
          </div>
          <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
            <Copy className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </motion.header>

      {/* Players */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <motion.div
          className="space-y-3 mb-6"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("general.players")} ({mockPlayers.length})
          </h2>
          {mockPlayers.map((player, i) => (
            <motion.div
              key={player.id}
              variants={{ hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1 } }}
              className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-card"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold"
                style={{ background: colors[i % colors.length] }}
              >
                {player.name[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm text-foreground">{player.name}</span>
                  {player.isHost && <Crown className="w-4 h-4 text-game-yellow" />}
                </div>
                <span className={`text-xs font-body ${player.ready ? "text-game-green" : "text-muted-foreground"}`}>
                  {player.ready ? t("lobby.ready") : t("lobby.notReady")}
                </span>
              </div>
              <div className={`w-3 h-3 rounded-full ${player.ready ? "bg-game-green" : "bg-muted"}`} />
            </motion.div>
          ))}
        </motion.div>

        {/* Waiting text */}
        <motion.p
          className="text-center text-sm text-muted-foreground font-body animate-pulse"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {t("lobby.waiting")}
        </motion.p>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border px-4 py-3 space-y-3">
        {/* Chat input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={t("lobby.chat")}
            className="flex-1 h-11 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <button className="h-11 w-11 rounded-2xl gradient-hero flex items-center justify-center text-primary-foreground">
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Ready / Start */}
        <div className="flex gap-3">
          <Button
            variant={isReady ? "secondary" : "game"}
            size="lg"
            className="flex-1"
            onClick={() => setIsReady(!isReady)}
          >
            {isReady ? t("lobby.notReady") : t("lobby.ready")}
          </Button>
          <Button variant="hero" size="lg" className="flex-1">
            {t("lobby.startGame")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
