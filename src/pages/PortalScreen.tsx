import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserCircle, Settings, LogIn } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import fakeItFastCard from "@/assets/fake-it-fast-card.png";
import ironDomeCard from "@/assets/iron-dome-card.png";
import logoImage from "@/assets/ori-games-logo.png";

interface GameCard {
  id: string;
  name: string;
  image: string;
  route: string;
  description: string;
  color: string;
  players: string;
  comingSoon?: boolean;
}

const PortalScreen = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const games: GameCard[] = [
    {
      id: "fake-it-fast",
      name: "Fake It Fast",
      image: fakeItFastCard,
      route: "/fake-it-fast",
      description: t("portal.fakeItFastDesc"),
      color: "from-[hsl(267,84%,58%)] to-[hsl(340,82%,62%)]",
      players: "3+",
    },
    {
      id: "iron-dome",
      name: "Iron Dome",
      image: ironDomeCard,
      route: "/iron-dome",
      description: t("portal.ironDomeDesc"),
      color: "from-[hsl(190,80%,30%)] to-[hsl(210,80%,20%)]",
      players: "1",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 20 + Math.random() * 40,
              height: 20 + Math.random() * 40,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `hsl(${[267, 340, 174, 38, 142][i % 5]} 70% 60% / 0.12)`,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, 10, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header
        className="flex items-center justify-between px-4 py-3 relative z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <button
          className="flex items-center gap-3"
          onClick={() => (user ? navigate("/profile") : navigate("/auth"))}
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
                <p className="font-display font-semibold text-foreground text-sm">
                  {profile?.display_name || "Player"}
                </p>
                <p className="text-xs text-muted-foreground">{t("portal.level")} {profile?.level || 1}</p>
              </>
            ) : (
              <p className="font-display font-semibold text-primary text-sm flex items-center gap-1">
                <LogIn className="w-4 h-4" />
                {t("welcome.login")}
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <button
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            onClick={() => navigate("/settings")}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* Logo & Title */}
      <motion.div
        className="flex flex-col items-center pt-4 pb-6 relative z-10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <motion.img
          src={logoImage}
          alt="Ori Games"
          className="w-20 h-20 mb-2"
          animate={{ rotate: [0, -3, 3, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-primary to-[hsl(var(--game-pink))] bg-clip-text text-transparent">
          Ori Games
        </h1>
        <p className="text-muted-foreground font-body text-sm mt-1">
          {t("portal.subtitle") || "Pick a game and have fun! 🎮"}
        </p>
      </motion.div>

      {/* Games Grid */}
      <div className="flex-1 px-4 pb-8 relative z-10">
        <motion.div
          className="grid grid-cols-2 gap-4 max-w-lg mx-auto"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } },
          }}
        >
          {games.map((game) => (
            <motion.button
              key={game.id}
              variants={{
                hidden: { y: 30, opacity: 0, scale: 0.9 },
                visible: { y: 0, opacity: 1, scale: 1 },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (!game.comingSoon) navigate(game.route);
              }}
              className={`relative rounded-3xl overflow-hidden shadow-card aspect-square group ${
                game.comingSoon ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-90`} />

              {/* Game image */}
              <img
                src={game.image}
                alt={game.name}
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:opacity-80 transition-opacity"
              />

              {/* Game name at top */}
              <div className="absolute top-0 left-0 right-0 p-3 z-10">
                <p className="font-display font-bold text-primary-foreground text-sm drop-shadow-lg text-start">
                  {game.name}
                </p>
                <p className="text-primary-foreground/70 text-[10px] font-body drop-shadow text-start mt-0.5">
                  👥 {t("portal.players") || "Players"}: {game.players}
                </p>
              </div>

              {/* Center logo area */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-3xl">{game.id === 'iron-dome' ? '🛡️' : '🕵️'}</span>
                </motion.div>
              </div>

              {/* Description at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                <p className="text-primary-foreground/80 text-xs font-body drop-shadow text-start">
                  {game.description}
                </p>
              </div>

              {/* Coming soon badge */}
              {game.comingSoon && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
                    <span className="font-display font-bold text-primary-foreground text-lg px-4 py-2 rounded-full bg-black/30 backdrop-blur">
                      {t("portal.comingSoon")}
                    </span>
                </div>
              )}

              {/* Hover shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </motion.button>
          ))}

          {/* "More coming soon" placeholder */}
          <motion.div
            variants={{
              hidden: { y: 30, opacity: 0, scale: 0.9 },
              visible: { y: 0, opacity: 1, scale: 1 },
            }}
            className="rounded-3xl border-2 border-dashed border-border aspect-square flex flex-col items-center justify-center gap-2 text-muted-foreground"
          >
            <motion.span
              className="text-4xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🎲
            </motion.span>
            <p className="font-display font-semibold text-sm">{t("portal.comingSoon")}</p>
            <p className="text-xs">{t("portal.moreGames")}</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default PortalScreen;
