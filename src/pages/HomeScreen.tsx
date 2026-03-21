import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useReconnect } from "@/hooks/useReconnect";
import { Button } from "@/components/ui/button";
import { Users, Gamepad2, Hash, GraduationCap, Settings, UserCircle, RefreshCw, X, Bot, Globe, ArrowLeft } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import LanguageSelector from "@/components/LanguageSelector";
import logoImage from "@/assets/logo.png";
import { playClick, playWhoosh, playPop } from "@/hooks/useSound";
import { toast } from "@/hooks/use-toast";

const HomeScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { pendingInvites } = useNotifications();
  const { activeRoom, reconnect, dismiss } = useReconnect();
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);

  // First visit → redirect to tutorial
  useEffect(() => {
    const seen = localStorage.getItem("fif-tutorial-seen");
    if (!seen) {
      navigate("/fake-it-fast/tutorial?first=1", { replace: true });
    }
  }, [navigate]);

  const displayName = profile?.display_name || (user ? "Player" : "Guest");

  const handleGlobalGame = () => {
    if (!user) {
      toast({ title: t("auth.loginRequired"), variant: "destructive" });
      navigate("/auth?redirect=/");
      return;
    }
    playClick();
    setShowPlayerPicker(true);
  };

  const startMatchmaking = (playerCount?: number) => {
    setShowPlayerPicker(false);
    playWhoosh();
    const params = playerCount ? `?players=${playerCount}` : "";
    navigate(`/fake-it-fast/matchmaking${params}`);
  };

  const mainActions = [
    { key: "home.startGlobal", icon: Gamepad2, variant: "hero" as const, action: handleGlobalGame },
    { key: "home.practice", icon: Bot, variant: "game" as const, action: () => { playClick(); navigate("/fake-it-fast/practice"); } },
    { key: "home.playFriends", icon: Users, variant: "accent" as const, action: () => { playClick(); navigate("/fake-it-fast/create-room"); } },
    { key: "home.joinCode", icon: Hash, variant: "outline" as const, action: () => { playClick(); navigate("/fake-it-fast/join"); } },
    { key: "home.tutorial", icon: GraduationCap, variant: "outline" as const, action: () => { playClick(); navigate("/fake-it-fast/tutorial"); } },
  ];

  const playerOptions = [
    { count: undefined, label: t("matchmaking.anyPlayers") || "Any" },
    { count: 3, label: "3" },
    { count: 4, label: "4" },
    { count: 5, label: "5" },
    { count: 6, label: "6" },
    { count: 7, label: "7" },
    { count: 8, label: "8" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Header */}
      <motion.header
        className="flex items-center justify-between px-4 py-3"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-display font-semibold">{t("game.backHome")}</span>
          </button>
          <button
            className="flex items-center gap-3"
            onClick={() => user ? navigate("/profile") : navigate("/auth")}
          >
          <motion.div
            className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserCircle className="w-6 h-6 text-primary-foreground" />
          </motion.div>
          <div className="text-start">
            {user ? (
              <>
                <p className="font-display font-semibold text-foreground text-sm">{displayName}</p>
                <p className="text-xs text-muted-foreground">Level {profile?.level || 1}</p>
              </>
            ) : (
              <p className="font-display font-semibold text-primary text-sm">{t("welcome.login")}</p>
            )}
          </div>
        </button>
        </div>

        <motion.img
          src={logoImage}
          alt="Fake It Fast"
          className="h-10"
          animate={{ rotate: [0, -2, 2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="flex items-center gap-2">
          <LanguageSelector />
          {user && <NotificationBell />}
          <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground" onClick={() => navigate("/settings")}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* Reconnect Banner */}
      <AnimatePresence>
        {activeRoom && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mt-2 p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
              <div className="flex-1">
                <p className="font-display text-sm font-semibold text-foreground">
                  {activeRoom.status === "playing" ? "🎮 Game in progress!" : "🕐 Room still open!"}
                </p>
                <p className="text-xs text-muted-foreground">Code: {activeRoom.code}</p>
              </div>
              <Button size="sm" variant="game" onClick={reconnect}>
                Rejoin
              </Button>
              <button onClick={dismiss} className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-5 w-32 h-32 rounded-full bg-game-purple/10 blur-2xl"
            animate={{ scale: [1, 1.2, 1], x: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-5 w-40 h-40 rounded-full bg-game-pink/10 blur-2xl"
            animate={{ scale: [1.2, 1, 1.2], y: [0, -10, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full bg-game-cyan/5 blur-3xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </div>

        <motion.div
          className="flex flex-col gap-3 w-full max-w-sm relative z-10"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {mainActions.map(({ key, icon: Icon, variant, action }) => (
            <motion.div
              key={key}
              variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button variant={variant} size="xl" className="w-full" onClick={action}>
                <Icon className="w-6 h-6" />
                {t(key)}
              </Button>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-6 grid grid-cols-2 gap-3 w-full max-w-sm relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/friends")}
            className="bg-card rounded-2xl p-4 shadow-card text-start hover:bg-muted transition-colors"
          >
            <h3 className="font-display font-semibold text-sm text-foreground mb-1">{t("home.onlineFriends")}</h3>
            <p className="text-xs text-muted-foreground">{t("friends.title")}</p>
            <div className="flex -space-x-2 mt-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-card" style={{ background: `hsl(${120 + i * 80} 60% 60%)` }} />
              ))}
            </div>
          </motion.button>
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <h3 className="font-display font-semibold text-sm text-foreground mb-1">{t("notifications.pendingInvites")}</h3>
            <p className="text-xs text-muted-foreground">
              {pendingInvites.length > 0 ? `${pendingInvites.length} ${t("friends.pending")}` : t("notifications.noInvites")}
            </p>
            <div className="mt-2 flex gap-1 flex-wrap">
              {pendingInvites.slice(0, 3).map((inv) => {
                const code = (inv.data as Record<string, string>)?.roomCode;
                return code ? (
                  <button
                    key={inv.id}
                    onClick={() => navigate(`/join?code=${code}`)}
                    className="px-2 py-1 rounded-lg bg-primary/20 text-xs font-body text-foreground hover:bg-primary/30 transition-colors"
                  >
                    {code}
                  </button>
                ) : null;
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Player Count Picker Modal */}
      <AnimatePresence>
        {showPlayerPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => setShowPlayerPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-card rounded-3xl p-6 shadow-card w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <Globe className="w-10 h-10 text-primary mx-auto mb-3" />
                <h2 className="font-display text-xl font-bold text-foreground">
                  {t("matchmaking.howManyPlayers")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{t("matchmaking.pickOrAny")}</p>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {playerOptions.map(({ count, label }, i) => (
                  <motion.button
                    key={label}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05, type: "spring" }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { playPop(); startMatchmaking(count); }}
                    className={`p-3 rounded-2xl font-display font-bold text-lg transition-all ${
                      count === undefined
                        ? "col-span-4 gradient-hero text-primary-foreground shadow-button"
                        : "bg-muted text-foreground hover:bg-primary/20 hover:text-primary"
                    }`}
                  >
                    {count === undefined ? `🎲 ${label}` : label}
                  </motion.button>
                ))}
              </div>

              <Button variant="outline" size="lg" className="w-full" onClick={() => setShowPlayerPicker(false)}>
                {t("general.back")}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeScreen;
