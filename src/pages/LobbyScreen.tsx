import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Share2, Send, Crown, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RoomPlayer {
  id: string;
  user_id: string;
  is_ready: boolean;
  profile?: { display_name: string };
}

const LobbyScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<{ name: string; text: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState(searchParams.get("code") || "");
  const [hostId, setHostId] = useState<string | null>(null);

  const roomLink = `${window.location.origin}/join?code=${roomCode}`;
  const colors = ["hsl(267 84% 58%)", "hsl(340 82% 62%)", "hsl(174 72% 50%)", "hsl(38 100% 60%)"];

  // Load room and subscribe to players
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;
    setRoomCode(code);

    const loadRoom = async () => {
      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single();
      
      if (!room) {
        toast({ title: "Room not found", variant: "destructive" });
        navigate("/home");
        return;
      }

      setRoomId(room.id);
      setHostId(room.host_id);

      // Join room if not already in
      if (user) {
        await supabase.from("room_players").upsert({
          room_id: room.id,
          user_id: user.id,
          is_ready: false,
        }, { onConflict: "room_id,user_id" });
      }

      // Fetch current players
      await fetchPlayers(room.id);
    };

    loadRoom();
  }, [searchParams, user]);

  // Subscribe to realtime player changes
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => fetchPlayers(roomId)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const fetchPlayers = async (rId: string) => {
    const { data } = await supabase
      .from("room_players")
      .select("id, user_id, is_ready")
      .eq("room_id", rId);
    
    if (data) {
      // Fetch profiles for each player
      const playerIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", playerIds);

      const enriched = data.map(p => ({
        ...p,
        profile: profiles?.find(pr => pr.user_id === p.user_id),
      }));
      setPlayers(enriched);
    }
  };

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
      // User cancelled
    }
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      setMessages((prev) => [...prev, { name: profile?.display_name || "Player", text: chatInput.trim() }]);
      setChatInput("");
    }
  };

  const handleReady = async () => {
    const newReady = !isReady;
    setIsReady(newReady);
    if (user && roomId) {
      await supabase
        .from("room_players")
        .update({ is_ready: newReady })
        .eq("room_id", roomId)
        .eq("user_id", user.id);
    }
    toast({ title: newReady ? `✅ ${t("lobby.ready")}` : t("lobby.notReady") });
  };

  const allReady = players.length >= 2 && players.every(p => p.is_ready);

  const handleStartGame = async () => {
    if (!allReady) {
      toast({ title: t("lobby.notAllReady"), variant: "destructive" });
      return;
    }
    if (roomId) {
      await supabase.from("rooms").update({ status: "playing" }).eq("id", roomId);
    }
    navigate("/game");
  };

  const isHost = user?.id === hostId;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header
        className="px-4 py-3 flex items-center justify-between border-b border-border"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">{t("lobby.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted rounded-xl px-3 py-2 font-display text-sm font-semibold tracking-wider text-foreground">
            {roomCode}
          </div>
          <button onClick={handleCopy} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
            {copied ? <Check className="w-4 h-4 text-game-green" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={handleShare} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
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
            {t("general.players")} ({players.length})
          </h2>
          {players.length === 0 && (
            <p className="text-sm text-muted-foreground font-body text-center py-4">
              {t("lobby.waiting")}
            </p>
          )}
          {players.map((player, i) => (
            <motion.div
              key={player.id}
              variants={{ hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1 } }}
              className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-card"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold"
                style={{ background: colors[i % colors.length] }}
              >
                {(player.profile?.display_name || "P")[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm text-foreground">
                    {player.profile?.display_name || "Player"}
                  </span>
                  {player.user_id === hostId && <Crown className="w-4 h-4 text-game-yellow" />}
                </div>
                <span className={`text-xs font-body ${player.is_ready ? "text-game-green" : "text-muted-foreground"}`}>
                  {player.is_ready ? t("lobby.ready") : t("lobby.notReady")}
                </span>
              </div>
              <div className={`w-3 h-3 rounded-full ${player.is_ready ? "bg-game-green" : "bg-muted"}`} />
            </motion.div>
          ))}
        </motion.div>

        {/* Chat */}
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

        <motion.p
          className="text-center text-sm text-muted-foreground font-body animate-pulse"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {t("lobby.waiting")}
        </motion.p>
      </div>

      {/* Bottom */}
      <div className="border-t border-border px-4 py-3 space-y-3">
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

        <div className="flex gap-3">
          <Button
            variant={isReady ? "secondary" : "game"}
            size="lg"
            className="flex-1"
            onClick={handleReady}
          >
            {isReady ? t("lobby.notReady") : t("lobby.ready")}
          </Button>
          {isHost && (
            <Button variant="hero" size="lg" className="flex-1" onClick={handleStartGame}>
              {t("lobby.startGame")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
