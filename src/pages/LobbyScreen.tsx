import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Share2, Send, Crown, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RoomPlayer {
  id: string;
  user_id: string;
  is_ready: boolean;
  is_guest: boolean;
  guest_name: string | null;
  guest_avatar: string | null;
  profile?: { display_name: string };
}

type GuestSession = {
  roomCode: string;
  playerId: string;
  token: string;
  name: string;
  avatar: string;
};

const avatarBackgrounds = ["gradient-hero", "gradient-secondary", "gradient-accent", "bg-muted"];

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
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);

  const roomLink = `${window.location.origin}/join?code=${roomCode}`;

  const fetchPlayers = async (rId: string, activeGuestSession: GuestSession | null) => {
    const { data } = await supabase
      .from("room_players")
      .select("id, user_id, is_ready, is_guest, guest_name, guest_avatar")
      .eq("room_id", rId);

    if (!data) return;

    const authenticatedUserIds = data.filter((p) => !p.is_guest).map((p) => p.user_id);
    const { data: profiles } = authenticatedUserIds.length
      ? await supabase.from("profiles").select("user_id, display_name").in("user_id", authenticatedUserIds)
      : { data: [] as { user_id: string; display_name: string }[] };

    const enriched = data.map((p) => ({
      ...p,
      profile: profiles?.find((pr) => pr.user_id === p.user_id),
    }));

    setPlayers(enriched as RoomPlayer[]);

    if (user) {
      const me = enriched.find((p) => p.user_id === user.id);
      setIsReady(Boolean(me?.is_ready));
      return;
    }

    if (activeGuestSession) {
      const me = enriched.find((p) => p.id === activeGuestSession.playerId);
      setIsReady(Boolean(me?.is_ready));
    }
  };

  useEffect(() => {
    const code = (searchParams.get("code") || "").toUpperCase();
    if (!code) {
      navigate("/join");
      return;
    }

    setRoomCode(code);

    if (!user) {
      const stored = localStorage.getItem(`guest_room_${code}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as GuestSession;
          if (parsed?.playerId && parsed?.token) {
            setGuestSession(parsed);
            return;
          }
        } catch {
          localStorage.removeItem(`guest_room_${code}`);
        }
      }

      toast({ title: t("join.authOrGuestRequired"), variant: "destructive" });
      navigate(`/join?code=${code}`);
      return;
    }

    setGuestSession(null);
  }, [searchParams, user, navigate, t]);

  useEffect(() => {
    if (!roomCode) return;
    if (!user && !guestSession) return;

    const loadRoom = async () => {
      const { data: room } = await supabase.from("rooms").select("*").eq("code", roomCode).single();

      if (!room) {
        toast({ title: "Room not found", variant: "destructive" });
        navigate("/home");
        return;
      }

      setRoomId(room.id);
      setHostId(room.host_id);

      if (user) {
        await supabase.from("room_players").upsert(
          {
            room_id: room.id,
            user_id: user.id,
            is_ready: false,
            is_guest: false,
            guest_name: null,
            guest_avatar: null,
          },
          { onConflict: "room_id,user_id" },
        );
      }

      await fetchPlayers(room.id, guestSession);

      if (room.status === "playing") {
        navigate("/game");
      }
    };

    void loadRoom();
  }, [roomCode, user, guestSession, navigate]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => {
          void fetchPlayers(roomId, guestSession);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          if ((payload.new as { status?: string })?.status === "playing") {
            navigate("/game");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, guestSession, navigate]);

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
      setMessages((prev) => [
        ...prev,
        { name: profile?.display_name || guestSession?.name || "Player", text: chatInput.trim() },
      ]);
      setChatInput("");
    }
  };

  const handleReady = async () => {
    if (!roomId) return;

    const newReady = !isReady;
    setIsReady(newReady);

    try {
      if (user) {
        await supabase
          .from("room_players")
          .update({ is_ready: newReady })
          .eq("room_id", roomId)
          .eq("user_id", user.id);
      } else if (guestSession) {
        const { error } = await supabase.functions.invoke("set-guest-ready", {
          body: {
            playerId: guestSession.playerId,
            token: guestSession.token,
            isReady: newReady,
          },
        });

        if (error) throw error;
      }

      toast({ title: newReady ? `✅ ${t("lobby.ready")}` : t("lobby.notReady") });
    } catch (e) {
      setIsReady(!newReady);
      toast({ title: t("auth.error"), description: String((e as { message?: string })?.message || e), variant: "destructive" });
    }
  };

  const allReady = players.length >= 2 && players.every((p) => p.is_ready);

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

  const readyCount = useMemo(() => players.filter((p) => p.is_ready).length, [players]);

  const getPlayerName = (player: RoomPlayer) => {
    if (player.is_guest) return player.guest_name || t("join.guestDefault");
    return player.profile?.display_name || "Player";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          <div className="bg-muted rounded-xl px-3 py-2 font-display text-sm font-semibold tracking-wider text-foreground">{roomCode}</div>
          <button onClick={handleCopy} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
            {copied ? <Check className="w-4 h-4 text-game-green" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={handleShare} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </motion.header>

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
            <p className="text-sm text-muted-foreground font-body text-center py-4">{t("lobby.waiting")}</p>
          )}
          {players.map((player, i) => {
            const playerName = getPlayerName(player);
            return (
              <motion.div
                key={player.id}
                variants={{ hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1 } }}
                className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-card"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold",
                    avatarBackgrounds[i % avatarBackgrounds.length],
                  )}
                >
                  {player.guest_avatar || playerName[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-sm text-foreground">{playerName}</span>
                    {!player.is_guest && player.user_id === hostId && <Crown className="w-4 h-4 text-game-yellow" />}
                  </div>
                  <span className={`text-xs font-body ${player.is_ready ? "text-game-green" : "text-muted-foreground"}`}>
                    {player.is_ready ? t("lobby.ready") : t("lobby.notReady")}
                  </span>
                </div>
                <div className={`w-3 h-3 rounded-full ${player.is_ready ? "bg-game-green" : "bg-muted"}`} />
              </motion.div>
            );
          })}
        </motion.div>

        {messages.length > 0 && (
          <div className="space-y-2 mb-4">
            <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("lobby.chat")}</h2>
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
          <button onClick={handleSendChat} className="h-11 w-11 rounded-2xl gradient-hero flex items-center justify-center text-primary-foreground">
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-3">
          <Button variant={isReady ? "secondary" : "game"} size="lg" className="flex-1" onClick={handleReady}>
            {isReady ? t("lobby.notReady") : t("lobby.ready")}
          </Button>
          {isHost && (
            <Button variant="hero" size="lg" className="flex-1" onClick={handleStartGame} disabled={!allReady}>
              {t("lobby.startGame")} {allReady ? "" : `(${readyCount}/${players.length})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
