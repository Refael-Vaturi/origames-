import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Users, Wifi, Loader2, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;
const POLL_INTERVAL = 3000;

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const MatchmakingScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedPlayers = searchParams.get("players") ? Number(searchParams.get("players")) : null;
  const [dots, setDots] = useState("");
  const [players, setPlayers] = useState<{ id: string; user_id: string; guest_name: string | null }[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);
  const [waitingLong, setWaitingLong] = useState(false);
  const cleanupRef = useRef(false);

  // Dots animation
  useEffect(() => {
    const iv = setInterval(() => setDots((p) => (p.length >= 3 ? "" : p + ".")), 500);
    const longTimer = setTimeout(() => setWaitingLong(true), 15000);
    return () => { clearInterval(iv); clearTimeout(longTimer); };
  }, []);

  // Find or create a public room, then join it
  useEffect(() => {
    if (!user) {
      toast({ title: t("auth.loginRequired"), variant: "destructive" });
      navigate("/auth");
      return;
    }

    let cancelled = false;

    const findOrCreate = async () => {
      // 1. Look for an existing public waiting room with space
      const { data: openRooms } = await supabase
        .from("rooms")
        .select("id, code, max_players")
        .eq("status", "waiting")
        .eq("is_private", false)
        .order("created_at", { ascending: true })
        .limit(10);

      let targetRoom: { id: string; code: string } | null = null;

      if (openRooms && openRooms.length > 0) {
        for (const room of openRooms) {
          const { count } = await supabase
            .from("room_players")
            .select("id", { count: "exact", head: true })
            .eq("room_id", room.id);
          if ((count ?? 0) < room.max_players) {
            targetRoom = room;
            break;
          }
        }
      }

      if (cancelled) return;

      // 2. If no open room, create one
      if (!targetRoom) {
        const maxP = requestedPlayers || MAX_PLAYERS;
        const code = generateCode();
        const { data: newRoom, error } = await supabase
          .from("rooms")
          .insert({
            code,
            host_id: user.id,
            is_private: false,
            max_players: maxP,
            name: "Global Game",
          })
          .select("id, code")
          .single();

        if (error || !newRoom) {
          toast({ title: "Failed to create room", variant: "destructive" });
          navigate("/");
          return;
        }
        targetRoom = newRoom;
      }

      if (cancelled) return;

      // 3. Join the room
      await supabase.from("room_players").upsert(
        { room_id: targetRoom.id, user_id: user.id, is_ready: true },
        { onConflict: "room_id,user_id" },
      );

      setRoomId(targetRoom.id);
      setRoomCode(targetRoom.code);
      setJoining(false);
    };

    void findOrCreate();
    return () => { cancelled = true; };
  }, [user, navigate, t]);

  // Subscribe to room_players + room status changes
  useEffect(() => {
    if (!roomId) return;

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("room_players")
        .select("id, user_id, guest_name")
        .eq("room_id", roomId);
      if (data) setPlayers(data);
    };

    void fetchPlayers();

    const channel = supabase
      .channel(`mm-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => void fetchPlayers(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          if ((payload.new as { status?: string })?.status === "playing") {
            navigate("/game?room=" + roomId);
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, navigate]);

  // Auto-start when enough players & all ready (host starts)
  useEffect(() => {
    if (!roomId || !roomCode || !user) return;

    const tryStart = async () => {
      // Check if I'm the host
      const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
      if (!room || room.host_id !== user.id) return; // Only host auto-starts

      if (players.length >= MIN_PLAYERS) {
        const { error } = await supabase.functions.invoke("start-round", {
          body: { room_id: roomId, round_number: 1 },
        });
        if (!error) {
          navigate("/game?room=" + roomId);
        }
      }
    };

    if (players.length >= MIN_PLAYERS) {
      // Small delay so latecomers can join
      const timer = setTimeout(() => void tryStart(), 3000);
      return () => clearTimeout(timer);
    }
  }, [players.length, roomId, roomCode, user, navigate]);

  const handleCancel = async () => {
    if (roomId && user) {
      await supabase.from("room_players").delete().eq("room_id", roomId).eq("user_id", user.id);
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        className="w-full max-w-sm text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="bg-card rounded-3xl p-8 shadow-card">
          <div className="flex items-start mb-6">
            <button
              onClick={handleCancel}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Searching animation */}
          <motion.div
            className="w-24 h-24 mx-auto mb-6 rounded-full gradient-hero flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Globe className="w-12 h-12 text-primary-foreground" />
          </motion.div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            {joining ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("matchmaking.searching")}
              </span>
            ) : (
              <>{t("matchmaking.searching")}{dots}</>
            )}
          </h1>
          <p className="text-sm text-muted-foreground font-body mb-6">
            {t("matchmaking.finding")}
          </p>

          {/* Players found indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold text-foreground">
              {players.length}/{MIN_PLAYERS}+ {t("general.players")}
            </span>
          </div>

          {/* Player dots - real players */}
          <div className="flex justify-center gap-3 mb-2 flex-wrap">
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm text-primary-foreground"
                style={{ background: `hsl(${200 + i * 40} 70% 55%)` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: i * 0.1 }}
              >
                <Wifi className="w-4 h-4" />
              </motion.div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, MIN_PLAYERS - players.length) }).map((_, i) => (
              <motion.div
                key={`empty-${i}`}
                className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-display font-bold text-sm animate-pulse"
              >
                ?
              </motion.div>
            ))}
          </div>

          {players.length >= MIN_PLAYERS && (
            <motion.p
              className="text-xs text-primary font-display font-semibold mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✨ {t("matchmaking.starting")}
            </motion.p>
          )}

          <AnimatePresence>
            {waitingLong && players.length < MIN_PLAYERS && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-2xl bg-accent/10 border border-accent/20 text-center"
              >
                <p className="text-sm font-display font-semibold text-foreground mb-1">
                  ⏳ {t("matchmaking.stillLooking")}
                </p>
                <p className="text-xs text-muted-foreground font-body mb-3">
                  {t("matchmaking.inviteFriends")}
                </p>
                {roomCode && (
                  <Button
                    variant="accent"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      const shareData = {
                        title: "Fake It Fast",
                        text: t("matchmaking.shareText"),
                        url: `${window.location.origin}/join?code=${roomCode}`,
                      };
                      if (navigator.share) {
                        await navigator.share(shareData).catch(() => {});
                      } else {
                        await navigator.clipboard.writeText(shareData.url);
                        toast({ title: t("matchmaking.linkCopied") });
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    {t("matchmaking.shareInvite")}
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="outline"
            size="lg"
            className="w-full mt-4"
            onClick={handleCancel}
          >
            {t("matchmaking.cancel")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default MatchmakingScreen;
