import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends, isOnline } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, Check, X, Trash2, Search, Users, Clock, Send, Gamepad2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { playClick, playPop } from "@/hooks/useSound";
import type { Friendship } from "@/hooks/useFriends";

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const FriendsScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    friends,
    pendingReceived,
    pendingSent,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
  } = useFriends();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"friends" | "requests" | "add">("friends");
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground font-body mb-4">{t("friends.loginRequired")}</p>
        <Button variant="hero" onClick={() => navigate("/auth")}>
          {t("welcome.login")}
        </Button>
      </div>
    );
  }

  const handleSendRequest = async () => {
    if (!addInput.trim()) return;
    setSending(true);
    setAddError(null);
    setAddSuccess(false);
    const { error } = await sendRequest(addInput.trim());
    if (error) {
      setAddError(error);
    } else {
      setAddSuccess(true);
      setAddInput("");
      setTimeout(() => setAddSuccess(false), 3000);
    }
    setSending(false);
  };

  const handleInvite = async (friendUserId: string, friendName: string) => {
    if (!user) return;
    setInvitingId(friendUserId);
    playClick();

    try {
      // Check if user has an existing waiting room
      const { data: existingRooms } = await supabase
        .from("rooms")
        .select("id, code")
        .eq("host_id", user.id)
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(1);

      let roomCode: string;

      if (existingRooms && existingRooms.length > 0) {
        roomCode = existingRooms[0].code;
      } else {
        // Create a new room
        const code = generateCode();
        const { data: newRoom, error } = await supabase.from("rooms").insert({
          code,
          host_id: user.id,
          name: "Game Room",
          max_players: 8,
          rounds: 5,
          response_time: 30,
          discussion_time: 45,
          vote_time: 20,
          is_private: true,
        }).select().single();

        if (error || !newRoom) throw error || new Error("Failed to create room");

        // Join as host
        await supabase.from("room_players").insert({
          room_id: newRoom.id,
          user_id: user.id,
          is_ready: true,
        });

        roomCode = code;
      }

      const inviteLink = `${window.location.origin}/join?code=${roomCode}`;

      // Send in-app + push notification to the friend
      await supabase.functions.invoke("send-notification", {
        body: {
          target_user_id: friendUserId,
          type: "game_invite",
          title: `🎮 ${profile?.display_name || "A friend"} ${t("notifications.invitedYou")}`,
          body: `${t("notifications.joinWith")} ${roomCode}`,
          data: { roomCode },
        },
      });

      // Try Web Share API first
      if (navigator.share) {
        await navigator.share({
          title: "Fake It Fast",
          text: `${t("friends.inviteMessage")} ${friendName}! Code: ${roomCode}`,
          url: inviteLink,
        });
      } else {
        await navigator.clipboard.writeText(inviteLink);
        toast({ title: `${t("friends.inviteCopied")} ${friendName}! 🎮` });
      }

      playPop();
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: t("auth.error"), description: String(e?.message || e), variant: "destructive" });
      }
    } finally {
      setInvitingId(null);
    }
  };

  const filteredFriends = friends.filter((f) =>
    f.friend?.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const onlineFriends = filteredFriends.filter((f) => isOnline(f.friend?.last_seen || null));
  const offlineFriends = filteredFriends.filter((f) => !isOnline(f.friend?.last_seen || null));

  const tabs = [
    { key: "friends" as const, label: t("friends.list"), count: friends.length },
    { key: "requests" as const, label: t("friends.requests"), count: pendingReceived.length },
    { key: "add" as const, label: t("friends.add"), count: 0 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header
        className="flex items-center gap-3 px-4 py-3"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground flex-1">
          {t("friends.title")}
        </h1>
      </motion.header>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-4">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-xl font-display font-semibold text-sm transition-all ${
              tab === key
                ? "bg-primary text-primary-foreground shadow-button"
                : "bg-card text-muted-foreground shadow-card hover:bg-muted"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ms-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                tab === key ? "bg-primary-foreground/20" : "bg-primary/20 text-primary"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pb-6">
        <AnimatePresence mode="wait">
          {/* Friends List Tab */}
          {tab === "friends" && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("friends.search")}
                  className="w-full h-11 ps-10 pe-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground font-body text-sm">
                  {t("friends.loading")}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-body text-sm">{t("friends.empty")}</p>
                  <Button variant="game" size="sm" className="mt-4" onClick={() => setTab("add")}>
                    <UserPlus className="w-4 h-4" />
                    {t("friends.add")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Online friends */}
                  {onlineFriends.length > 0 && (
                    <>
                      <p className="text-xs font-display font-semibold text-primary uppercase tracking-wider px-1 mb-2">
                        {t("friends.online")} ({onlineFriends.length})
                      </p>
                      {onlineFriends.map((f) => (
                        <FriendCard
                          key={f.id}
                          friendship={f}
                          online
                          onRemove={() => removeFriend(f.id)}
                          onInvite={() => handleInvite(f.friend?.user_id || "", f.friend?.display_name || "Friend")}
                          inviting={invitingId === f.friend?.user_id}
                          t={t}
                        />
                      ))}
                    </>
                  )}
                  {/* Offline friends */}
                  {offlineFriends.length > 0 && (
                    <>
                      <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2 mt-4">
                        {t("friends.offline")} ({offlineFriends.length})
                      </p>
                      {offlineFriends.map((f) => (
                        <FriendCard
                          key={f.id}
                          friendship={f}
                          online={false}
                          onRemove={() => removeFriend(f.id)}
                          onInvite={() => handleInvite(f.friend?.user_id || "", f.friend?.display_name || "Friend")}
                          inviting={invitingId === f.friend?.user_id}
                          t={t}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Requests Tab */}
          {tab === "requests" && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {pendingReceived.length === 0 && pendingSent.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-body text-sm">{t("friends.noRequests")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingReceived.length > 0 && (
                    <>
                      <p className="text-xs font-display font-semibold text-primary uppercase tracking-wider px-1 mb-2">
                        {t("friends.received")} ({pendingReceived.length})
                      </p>
                      {pendingReceived.map((f) => (
                        <motion.div
                          key={f.id}
                          className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-card"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
                            {f.friend?.display_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1">
                            <p className="font-display font-semibold text-sm text-foreground">
                              {f.friend?.display_name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">Lv. {f.friend?.level || 1}</p>
                          </div>
                          <button
                            onClick={() => acceptRequest(f.id)}
                            className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => rejectRequest(f.id)}
                            className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </motion.div>
                      ))}
                    </>
                  )}

                  {pendingSent.length > 0 && (
                    <>
                      <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2 mt-4">
                        {t("friends.sent")} ({pendingSent.length})
                      </p>
                      {pendingSent.map((f) => (
                        <motion.div
                          key={f.id}
                          className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-card"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-display font-bold text-sm">
                            {f.friend?.display_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1">
                            <p className="font-display font-semibold text-sm text-foreground">
                              {f.friend?.display_name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">{t("friends.pending")}</p>
                          </div>
                          <button
                            onClick={() => removeFriend(f.id)}
                            className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Add Friend Tab */}
          {tab === "add" && (
            <motion.div
              key="add"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                  <UserPlus className="w-6 h-6 text-primary" />
                  <h2 className="font-display font-bold text-foreground">{t("friends.addTitle")}</h2>
                </div>

                <p className="text-sm text-muted-foreground font-body mb-4">
                  {t("friends.addDesc")}
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addInput}
                    onChange={(e) => { setAddInput(e.target.value); setAddError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
                    placeholder={t("friends.addPlaceholder")}
                    className="flex-1 h-11 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <Button
                    variant="hero"
                    size="default"
                    onClick={handleSendRequest}
                    disabled={sending || !addInput.trim()}
                  >
                    {sending ? "..." : t("friends.sendRequest")}
                  </Button>
                </div>

                {addError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-sm text-destructive font-body"
                  >
                    {addError}
                  </motion.p>
                )}
                {addSuccess && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-sm text-primary font-body"
                  >
                    {t("friends.requestSent")}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function FriendCard({
  friendship,
  online,
  onRemove,
  onInvite,
  inviting,
  t,
}: {
  friendship: Friendship;
  online: boolean;
  onRemove: () => void;
  onInvite: () => void;
  inviting: boolean;
  t: (key: string) => string;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setShowActions(!showActions)}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
          {friendship.friend?.display_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div
          className={`absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
            online ? "bg-green-500" : "bg-muted-foreground/40"
          }`}
        />
      </div>
      <div className="flex-1">
        <p className="font-display font-semibold text-sm text-foreground">
          {friendship.friend?.display_name || "Unknown"}
        </p>
        <p className="text-xs text-muted-foreground">
          Lv. {friendship.friend?.level || 1} · {online ? t("friends.online") : t("friends.offline")}
        </p>
      </div>

      {/* Invite button - always visible */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.stopPropagation(); onInvite(); }}
        disabled={inviting}
        className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        title={t("friends.invite")}
      >
        {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gamepad2 className="w-4 h-4" />}
      </motion.button>

      <AnimatePresence>
        {showActions && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default FriendsScreen;
