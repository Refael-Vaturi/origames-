import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { playClick } from "@/hooks/useSound";

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const GUEST_AVATARS = ["🎮", "🕹️", "🎯", "🎪", "🎭", "🎨", "🦊", "🐱", "🐶", "🦄", "🐸", "🐼"];

const CreateRoomScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [rounds, setRounds] = useState(5);
  const [responseTime, setResponseTime] = useState(30);
  const [discussionTime, setDiscussionTime] = useState(45);
  const [voteTime, setVoteTime] = useState(20);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);

  // Guest fields
  const [guestName, setGuestName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🎮");

  const handleCreate = async () => {
    playClick();
    setLoading(true);

    if (user) {
      // Authenticated user creates room
      const code = generateCode();
      const { data, error } = await supabase.from("rooms").insert({
        code,
        host_id: user.id,
        name: roomName || "Game Room",
        max_players: maxPlayers,
        rounds,
        response_time: responseTime,
        discussion_time: discussionTime,
        vote_time: voteTime,
        is_private: isPrivate,
      }).select().single();

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      await supabase.from("room_players").insert({
        room_id: data.id,
        user_id: user.id,
        is_ready: true,
      });

      setLoading(false);
      navigate(`/lobby?code=${code}`);
    } else {
      // Guest creates room via edge function
      const finalName = guestName.trim() || "Guest";
      try {
        const { data, error } = await supabase.functions.invoke("create-room-guest", {
          body: {
            name: finalName,
            avatar: selectedAvatar,
            roomName: roomName || "Game Room",
            rounds,
            responseTime,
            discussionTime,
            voteTime,
            maxPlayers,
            isPrivate,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Store guest session
        localStorage.setItem(`guest_room_${data.roomCode}`, JSON.stringify({
          roomCode: data.roomCode,
          playerId: data.playerId,
          token: data.token,
          name: finalName,
          avatar: selectedAvatar,
        }));

        setLoading(false);
        navigate(`/lobby?code=${data.roomCode}`);
      } catch (e) {
        toast({ title: "Error", description: String((e as any)?.message || e), variant: "destructive" });
        setLoading(false);
      }
    }
  };

  const SettingRow = ({ label, value, onChange, min, max }: {
    label: string; value: number; onChange: (v: number) => void; min: number; max: number;
  }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-body text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - (min === 1 ? 1 : 5)))}
          className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center font-display text-foreground hover:bg-primary/20 transition-colors"
        >
          −
        </button>
        <span className="w-10 text-center font-display font-semibold text-foreground">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + (min === 1 ? 1 : 5)))}
          className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center font-display text-foreground hover:bg-primary/20 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="bg-card rounded-3xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">{t("create.title")}</h1>
          </div>

          {/* Guest identity section */}
          {!user && (
            <div className="mb-4 p-4 bg-muted/50 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-display font-semibold text-foreground">{t("join.guestName")}</span>
              </div>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t("join.guestDefault")}
                maxLength={24}
                className="w-full h-10 px-4 rounded-xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors mb-3"
              />
              <div className="flex flex-wrap gap-2">
                {GUEST_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                      selectedAvatar === emoji
                        ? "bg-primary/20 border-2 border-primary scale-110"
                        : "bg-background border-2 border-transparent hover:bg-muted"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Room name */}
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder={t("create.roomName")}
            className="w-full h-12 px-4 rounded-2xl border-2 border-input bg-background font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors mb-4"
          />

          {/* Settings */}
          <div className="divide-y divide-border">
            <SettingRow label={t("create.rounds")} value={rounds} onChange={setRounds} min={1} max={15} />
            <SettingRow label={t("create.responseTime")} value={responseTime} onChange={setResponseTime} min={10} max={120} />
            <SettingRow label={t("create.discussionTime")} value={discussionTime} onChange={setDiscussionTime} min={15} max={120} />
            <SettingRow label={t("create.voteTime")} value={voteTime} onChange={setVoteTime} min={10} max={60} />
            <SettingRow label={t("create.maxPlayers")} value={maxPlayers} onChange={setMaxPlayers} min={3} max={12} />
          </div>

          {/* Private toggle */}
          <div className="flex items-center justify-between py-4 mt-2">
            <div className="flex items-center gap-2 text-sm font-body text-foreground">
              <Lock className="w-4 h-4 text-muted-foreground" />
              {t("create.private")}
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-12 h-7 rounded-full transition-colors ${isPrivate ? "bg-primary" : "bg-muted"} relative`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-card shadow transition-all ${isPrivate ? "left-6" : "left-1"}`}
              />
            </button>
          </div>

          <Button
            variant="game"
            size="xl"
            className="w-full mt-4"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "..." : t("create.button")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateRoomScreen;
