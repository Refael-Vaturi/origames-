import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hash } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type GuestSession = {
  roomCode: string;
  playerId: string;
  token: string;
  name: string;
  avatar: string;
};

const avatarOptions = ["🦊", "🐼", "🐯", "🐸", "🐙", "🦄"];

const JoinByCodeScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();

  const initialCode = (searchParams.get("code") || "").toUpperCase();

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [showGuestSetup, setShowGuestSetup] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestAvatar, setGuestAvatar] = useState(avatarOptions[0]);

  const autoJoinAttemptedRef = useRef(false);

  useEffect(() => {
    setCode(initialCode);
    autoJoinAttemptedRef.current = false;
  }, [initialCode]);

  const normalizedCode = code.trim().toUpperCase();

  const loadRoomByCode = async () => {
    if (normalizedCode.length < 4) {
      toast({ title: t("join.invalidCode"), variant: "destructive" });
      return null;
    }

    const { data: room } = await supabase
      .from("rooms")
      .select("id, code, status")
      .eq("code", normalizedCode)
      .single();

    if (!room) {
      toast({ title: t("join.notFound") || "Room not found", variant: "destructive" });
      return null;
    }

    return room;
  };

  const joinAsAuthenticatedUser = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const room = await loadRoomByCode();
      if (!room) return;

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

      navigate(`/lobby?code=${room.code}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || normalizedCode.length < 4 || autoJoinAttemptedRef.current || !initialCode) return;
    autoJoinAttemptedRef.current = true;
    void joinAsAuthenticatedUser();
  }, [user, normalizedCode, initialCode]);

  const handleJoin = async () => {
    if (!user) {
      if (normalizedCode.length < 4) {
        toast({ title: t("join.invalidCode"), variant: "destructive" });
        return;
      }
      setShowGuestSetup(true);
      return;
    }

    await joinAsAuthenticatedUser();
  };

  const handleGuestJoin = async () => {
    if (normalizedCode.length < 4) {
      toast({ title: t("join.invalidCode"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("join-room-guest", {
        body: {
          code: normalizedCode,
          name: guestName.trim() || t("join.guestDefault"),
          avatar: guestAvatar,
        },
      });

      if (error) throw error;
      if (!data?.playerId || !data?.token || !data?.roomCode) {
        throw new Error("Guest join failed");
      }

      const guestSession: GuestSession = {
        roomCode: data.roomCode,
        playerId: data.playerId,
        token: data.token,
        name: data.name,
        avatar: data.avatar,
      };

      localStorage.setItem(`guest_room_${data.roomCode}`, JSON.stringify(guestSession));
      navigate(`/lobby?code=${data.roomCode}`);
    } catch (e) {
      toast({ title: t("auth.error"), description: String((e as { message?: string })?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToAuth = (mode: "login" | "register") => {
    if (normalizedCode.length < 4) {
      toast({ title: t("join.invalidCode"), variant: "destructive" });
      return;
    }

    const redirect = `/join?code=${encodeURIComponent(normalizedCode)}`;
    navigate(`/auth?mode=${mode}&redirect=${encodeURIComponent(redirect)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="bg-card rounded-3xl p-8 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">{t("join.title")}</h1>
          </div>

          <div className="relative mb-4">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("join.placeholder")}
              maxLength={8}
              className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-input bg-background font-display text-xl tracking-widest text-center text-foreground placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-base focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {!user && (
            <div className="space-y-2 mb-4">
              <Button variant="outline" size="default" className="w-full" onClick={() => handleGoToAuth("login")}>
                {t("join.loginAndJoin")}
              </Button>
              <Button variant="outline" size="default" className="w-full" onClick={() => handleGoToAuth("register")}>
                {t("join.registerAndJoin")}
              </Button>
              <Button variant="secondary" size="default" className="w-full" onClick={() => setShowGuestSetup((prev) => !prev)}>
                {t("join.playGuest")}
              </Button>
            </div>
          )}

          {showGuestSetup && !user && (
            <div className="mb-4 rounded-2xl border border-border bg-background p-4 space-y-3">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t("join.guestName")}
                maxLength={20}
                className="w-full h-11 px-4 rounded-xl border border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <div className="grid grid-cols-6 gap-2">
                {avatarOptions.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setGuestAvatar(avatar)}
                    className={`h-10 rounded-xl border text-lg transition-colors ${
                      guestAvatar === avatar ? "border-primary bg-primary/10" : "border-input bg-muted"
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
              <Button variant="hero" size="default" className="w-full" onClick={handleGuestJoin} disabled={loading}>
                {loading ? "..." : t("join.continueAsGuest")}
              </Button>
            </div>
          )}

          <Button
            variant="hero"
            size="xl"
            className="w-full mb-4"
            onClick={handleJoin}
            disabled={code.trim().length < 4 || loading}
          >
            {loading ? "..." : user ? t("join.button") : t("join.autoFlow")}
          </Button>

          <p className="text-center text-sm text-muted-foreground font-body">{t("join.orLink")}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinByCodeScreen;
