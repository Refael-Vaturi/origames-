import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Settings, LogIn, ShieldCheck, ChevronRight, Sparkles, Search } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import LanguageSelector from "@/components/LanguageSelector";
import BottomNav from "@/components/BottomNav";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import fakeItFastCard from "@/assets/fake-it-fast-card.png";
import ironDomeCard from "@/assets/iron-dome-card.png";
import logoImage from "@/assets/ori-games-logo.png";
import { useEffect, useState } from "react";

interface GameCard {
  id: string;
  name: string;
  image?: string;
  emoji: string;
  route: string;
  description: string;
  color: string;
  players: string;
  tag?: string;
}

const PortalScreen = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { isAdmin } = useIsAdmin();
  useOnlinePresence({ track: !!user });

  const games: GameCard[] = [
    {
      id: "fake-it-fast",
      name: "Fake It Fast",
      image: fakeItFastCard,
      emoji: "🕵️",
      route: "/fake-it-fast",
      description: t("portal.fakeItFastDesc"),
      color: "from-[hsl(267,84%,58%)] to-[hsl(340,82%,62%)]",
      players: "3+",
      tag: "Multiplayer",
    },
    {
      id: "iron-dome",
      name: "Iron Dome",
      image: ironDomeCard,
      emoji: "🛡️",
      route: "/iron-dome",
      description: t("portal.ironDomeDesc"),
      color: "from-[hsl(190,80%,30%)] to-[hsl(210,80%,20%)]",
      players: "1",
      tag: "Action",
    },
    {
      id: "clicker",
      name: "Clicker",
      emoji: "👆",
      route: "/clicker",
      description: "Tap fast, buy upgrades, climb.",
      color: "from-[hsl(38,100%,55%)] to-[hsl(340,82%,62%)]",
      players: "1",
      tag: "Arcade",
    },
    {
      id: "color-identify",
      name: "Identify the Color",
      emoji: "🎨",
      route: "/color-identify",
      description: "Spot the odd tile.",
      color: "from-[hsl(174,72%,45%)] to-[hsl(267,84%,58%)]",
      players: "1",
      tag: "Puzzle",
    },
    {
      id: "city-find",
      name: "CityFind",
      emoji: "🌍",
      route: "/city-find",
      description: "Guess cities from Street View.",
      color: "from-[hsl(142,70%,40%)] to-[hsl(190,80%,30%)]",
      players: "1",
      tag: "Geo",
    },
  ];

  const featured = [games[0], games[1], games[4]];
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % featured.length), 4200);
    return () => clearInterval(id);
  }, [featured.length]);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {/* Soft background gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, hsl(267 84% 58% / 0.12), transparent 50%), radial-gradient(circle at 90% 10%, hsl(340 82% 62% / 0.10), transparent 50%)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2">
        <button
          className="flex items-center gap-2.5 active:scale-95 transition-transform"
          onClick={() => (user ? navigate("/profile") : navigate("/auth"))}
        >
          <div className="w-10 h-10 rounded-2xl gradient-hero flex items-center justify-center shadow-button">
            <span className="text-primary-foreground font-display font-bold text-sm">
              {profile?.display_name?.[0]?.toUpperCase() || (user ? "P" : "G")}
            </span>
          </div>
          <div className="text-start leading-tight">
            <p className="text-[11px] text-muted-foreground font-body">
              {user ? `${t("portal.level") || "Level"} ${profile?.level || 1}` : "Welcome"}
            </p>
            <p className="font-display font-semibold text-foreground text-sm">
              {user ? profile?.display_name || "Player" : (
                <span className="flex items-center gap-1 text-primary">
                  <LogIn className="w-3.5 h-3.5" /> {t("welcome.login")}
                </span>
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <LanguageSelector />
          {isAdmin && (
            <button
              className="p-2 rounded-xl hover:bg-muted active:scale-95 transition text-primary"
              onClick={() => navigate("/admin")}
              title="Admin"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          )}
          <button
            className="p-2 rounded-xl hover:bg-muted active:scale-95 transition text-muted-foreground"
            onClick={() => navigate("/settings")}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Brand row */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center gap-2 px-4 pt-1"
      >
        <img src={logoImage} alt="Ori Games" className="w-7 h-7" />
        <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-primary to-[hsl(var(--game-pink))] bg-clip-text text-transparent">
          Ori Games
        </h1>
      </motion.div>

      <AnnouncementBanner />

      {/* Search-like pill (decorative trigger) */}
      <button
        onClick={() => {}}
        className="relative z-10 mx-4 mt-3 mb-1 h-11 rounded-2xl bg-card border border-border/70 flex items-center gap-2 px-4 text-muted-foreground text-sm active:scale-[0.98] transition-transform"
      >
        <Search className="w-4 h-4" />
        <span className="font-body">Browse games…</span>
      </button>

      <main className="relative z-10 flex-1 pb-32">
        {/* Hero featured carousel */}
        <section className="px-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-foreground text-base flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> Featured
            </h2>
            <div className="flex gap-1">
              {featured.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === heroIdx ? "w-5 bg-primary" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
          <motion.button
            key={featured[heroIdx].id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(featured[heroIdx].route)}
            className="relative w-full h-44 rounded-3xl overflow-hidden shadow-card block"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${featured[heroIdx].color}`} />
            {featured[heroIdx].image && (
              <img
                src={featured[heroIdx].image}
                alt={featured[heroIdx].name}
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-70"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-0 p-4 flex flex-col justify-between text-start">
              <span className="self-start px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-md text-primary-foreground text-[10px] font-display font-semibold">
                {featured[heroIdx].tag}
              </span>
              <div>
                <p className="font-display font-bold text-primary-foreground text-2xl drop-shadow">
                  {featured[heroIdx].name}
                </p>
                <p className="text-primary-foreground/85 text-xs font-body mt-1 max-w-[80%]">
                  {featured[heroIdx].description}
                </p>
                <span className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-full bg-white text-foreground text-xs font-display font-semibold">
                  Play now <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </motion.button>
        </section>

        {/* Horizontal quick-play rail */}
        <section className="pt-6">
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="font-display font-bold text-foreground text-base">Quick play</h2>
            <span className="text-xs text-muted-foreground">Solo · 1 min</span>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
            {games.filter((g) => g.players === "1").map((g) => (
              <motion.button
                key={g.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(g.route)}
                className="relative shrink-0 w-32 h-40 rounded-2xl overflow-hidden shadow-card snap-start"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${g.color}`} />
                {g.image && (
                  <img src={g.image} alt={g.name} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <div className="absolute inset-0 p-2.5 flex flex-col justify-between text-start">
                  <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-md flex items-center justify-center text-xl">
                    {g.emoji}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-primary-foreground text-sm leading-tight drop-shadow">
                      {g.name}
                    </p>
                    <p className="text-primary-foreground/75 text-[10px] font-body">{g.tag}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* All games grid */}
        <section className="pt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-foreground text-base">All games</h2>
            <span className="text-xs text-muted-foreground">{games.length} games</span>
          </div>
          <motion.div
            className="grid grid-cols-2 gap-3"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {games.map((game) => (
              <motion.button
                key={game.id}
                variants={{
                  hidden: { y: 16, opacity: 0 },
                  visible: { y: 0, opacity: 1 },
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(game.route)}
                className="relative rounded-2xl overflow-hidden shadow-card aspect-[4/5]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${game.color}`} />
                {game.image && (
                  <img
                    src={game.image}
                    alt={game.name}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-md text-primary-foreground text-[9px] font-display font-semibold">
                    {game.tag}
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl">
                    {game.emoji}
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-3 text-start">
                  <p className="font-display font-bold text-primary-foreground text-sm drop-shadow">
                    {game.name}
                  </p>
                  <p className="text-primary-foreground/75 text-[10px] font-body">
                    👥 {game.players}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="pt-8 pb-2 flex items-center justify-center gap-4 flex-wrap text-xs text-muted-foreground">
          <button onClick={() => navigate("/about")} className="hover:text-foreground">About</button>
          <span className="opacity-30">·</span>
          <button onClick={() => navigate("/contact")} className="hover:text-foreground">Contact</button>
          <span className="opacity-30">·</span>
          <button onClick={() => navigate("/privacy-policy")} className="hover:text-foreground">
            {t("portal.privacyPolicy") || "Privacy"}
          </button>
        </footer>
      </main>

      <BottomNav />
    </div>
  );
};

export default PortalScreen;
