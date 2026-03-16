import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe, Users, Gamepad2, Hash, GraduationCap, Bell, Settings, UserCircle } from "lucide-react";
import logoImage from "@/assets/logo.png";

const HomeScreen = () => {
  const navigate = useNavigate();
  const { t, toggleLanguage } = useLanguage();

  const mainActions = [
    { key: "home.startGlobal", icon: Gamepad2, variant: "hero" as const, path: "/matchmaking" },
    { key: "home.playFriends", icon: Users, variant: "game" as const, path: "/create-room" },
    { key: "home.joinCode", icon: Hash, variant: "accent" as const, path: "/join" },
    { key: "home.tutorial", icon: GraduationCap, variant: "outline" as const, path: "/" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Header */}
      <motion.header
        className="flex items-center justify-between px-4 py-3"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center">
            <UserCircle className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-semibold text-foreground text-sm">Player123</p>
            <p className="text-xs text-muted-foreground">Level 1</p>
          </div>
        </div>

        <img src={logoImage} alt="Fake It Fast" className="h-10" />

        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            onClick={toggleLanguage}
          >
            <Globe className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-game-pink" />
          </button>
          <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-5 w-32 h-32 rounded-full bg-game-purple/10 blur-2xl" />
          <div className="absolute bottom-20 right-5 w-40 h-40 rounded-full bg-game-pink/10 blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full bg-game-cyan/5 blur-3xl" />
        </div>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col gap-4 w-full max-w-sm relative z-10"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {mainActions.map(({ key, icon: Icon, variant, path }) => (
            <motion.div
              key={key}
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
            >
              <Button
                variant={variant}
                size="xl"
                className="w-full"
                onClick={() => navigate(path)}
              >
                <Icon className="w-6 h-6" />
                {t(key)}
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* Secondary section */}
        <motion.div
          className="mt-8 grid grid-cols-2 gap-3 w-full max-w-sm relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <h3 className="font-display font-semibold text-sm text-foreground mb-1">{t("home.onlineFriends")}</h3>
            <p className="text-xs text-muted-foreground">3 {t("general.players")}</p>
            <div className="flex -space-x-2 mt-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-card"
                  style={{ background: `hsl(${120 + i * 80} 60% 60%)` }}
                />
              ))}
            </div>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <h3 className="font-display font-semibold text-sm text-foreground mb-1">{t("home.invites")}</h3>
            <p className="text-xs text-muted-foreground">2 pending</p>
            <div className="mt-2 flex gap-1">
              <span className="px-2 py-1 rounded-lg bg-game-yellow/20 text-xs font-body text-foreground">Room #42</span>
              <span className="px-2 py-1 rounded-lg bg-game-purple/20 text-xs font-body text-foreground">Room #7</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomeScreen;
