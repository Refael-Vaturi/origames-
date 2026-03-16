import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Share2, Send, Crown, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [messages, setMessages] = useState<{ name: string; text: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const roomCode = "ABCD12";
  const roomLink = `${window.location.origin}/join?code=${roomCode}`;

  const colors = ["hsl(267 84% 58%)", "hsl(340 82% 62%)", "hsl(174 72% 50%)", "hsl(38 100% 60%)"];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      toast({ title: t("lobby.codeCopied") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("lobby.copyFailed"), variant: "destructive" });
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Fake It Fast",
          text: `Join my room! Code: ${roomCode}`,
          url: roomLink,
        });
      } else {
        await navigator.clipboard.writeText(roomLink);
        toast({ title: t("lobby.linkCopied") });
      }
    } catch {
      // User cancelled share
    }
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      setMessages((prev) => [...prev, { name: "Player123", text: chatInput.trim() }]);
      setChatInput("");
    }
  };

  const handleReady = () => {
    setIsReady(!isReady);
    toast({
      title: !isReady ? `✅ ${t("lobby.ready")}` : t("lobby.notReady"),
    });
  };

  const handleStartGame = () => {
    navigate("/game");
  };

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
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
          >
            {copied ? <Check className="w-4 h-4 text-game-green" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
          >
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

        {/* Chat messages */}
        {messages.length > 0 && (
          <div className="space-y-2 mb-4">
            <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("lobby.chat")}
            </h2>
            {messages.map((msg, i) => (
              <div key={i} className="bg-card rounded-2xl p-3 shadow-card">
                <span className="font-display font-semibold text-xs text-primary">{msg.name}</span>
                <p className="text-sm font-body text-foreground">{msg.text}</p>
              </div>
            ))}
          </div>
        )}

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
            onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
            placeholder={t("lobby.chatPlaceholder")}
            className="flex-1 h-11 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleSendChat}
            className="h-11 w-11 rounded-2xl gradient-hero flex items-center justify-center text-primary-foreground"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Ready / Start */}
        <div className="flex gap-3">
          <Button
            variant={isReady ? "secondary" : "game"}
            size="lg"
            className="flex-1"
            onClick={handleReady}
          >
            {isReady ? t("lobby.notReady") : t("lobby.ready")}
          </Button>
          <Button variant="hero" size="lg" className="flex-1" onClick={handleStartGame}>
            {t("lobby.startGame")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
