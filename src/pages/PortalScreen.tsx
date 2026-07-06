import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Settings, LogIn, ShieldCheck, ChevronRight, Sparkles, Search } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { playClick } from "@/hooks/useSound";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import LanguageSelector from "@/components/LanguageSelector";
import BottomNav from "@/components/BottomNav";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import logoImage from "@/assets/ori-games-logo.png";
import fakeItFastCard from "@/assets/logo-fake-it-fast.png";
import ironDomeCard from "@/assets/logo-iron-dome.png";
import {
  CityFindIcon,
  ClickerIcon,
  ColorIdentifyIcon,
  CyberShieldIcon,
  FakeItFastIcon,
  GravityFlipIcon,
  IronDomeIcon,
  RhythmBladeIcon,
  VelocityDriftIcon,
} from "@/components/game-icons";
import { useEffect, useState, type ComponentType } from "react";

interface GameCard {
  id: string;
  name: string;
  image?: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  route: string;
  description: string;
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
      icon: FakeItFastIcon,
      accent: "#a855f7",
      route: "/fake-it-fast",
      description: t("portal.fakeItFastDesc"),
      players: "3+",
      tag: "Multiplayer",
    },
    {
      id: "iron-dome",
      name: "Iron Dome",
      image: ironDomeCard,
      icon: IronDomeIcon,
      accent: "#22d3ee",
      route: "/iron-dome",
      description: t("portal.ironDomeDesc"),
      players: "1",
      tag: "Action",
    },
    {
      id: "clicker",
      name: "Clicker",
      icon: ClickerIcon,
      accent: "#fbbf24",
      route: "/clicker",
      description: "Tap fast, buy upgrades, climb.",
      players: "1",
      tag: "Arcade",
    },
    {
      id: "color-identify",
      name: "Identify the Color",
      icon: ColorIdentifyIcon,
      accent: "#2dd4bf",
      route: "/color-identify",
      description: "Spot the odd tile.",
      players: "1",
      tag: "Puzzle",
    },
    {
      id: "city-find",
      name: "CityFind",
      icon: CityFindIcon,
      accent: "#4ade80",
      route: "/city-find",
      description: "Guess cities from Street View.",
      players: "1",
      tag: "Geo",
    },
    {
      id: "gravity-flip",
      name: "Gravity Flip",
      icon: GravityFlipIcon,
      accent: "#22d3ee",
      route: "/gravity-flip",
      description: "Flip gravity, dodge spikes, rewind time.",
      players: "1",
      tag: "Reflex",
    },
    {
      id: "rhythm-blade",
      name: "Rhythm Blade",
      icon: RhythmBladeIcon,
      accent: "#c084fc",
      route: "/rhythm-blade",
      description: "Slice blocks on the beat, chain Hyper Drive combos.",
      players: "1",
      tag: "Music",
    },
    {
      id: "velocity-drift",
      name: "Velocity Drift",
      icon: VelocityDriftIcon,
      accent: "#f43f5e",
      route: "/velocity-drift",
      description: "Drift through corners, chain combos, burn nitro.",
      players: "1",
      tag: "Racing",
    },
    {
      id: "cyber-shield",
      name: "Cyber Shield",
      icon: CyberShieldIcon,
      accent: "#38bdf8",
      route: "/cyber-shield",
      description: "Place towers, defend the database, survive every wave.",
      players: "1",
      tag: "Strategy",
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
      {/* Faint accent wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 20% 0%, hsl(267 84% 58% / 0.05), transparent 45%)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2">
        <button
          className="flex items-center gap-2.5 active:scale-95 transition-transform"
          onClick={() => { playClick(); navigate(user ? "/profile" : "/auth"); }}
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
              onClick={() => { playClick(); navigate("/admin"); }}
              title="Admin"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          )}
          <button
            className="p-2 rounded-xl hover:bg-muted active:scale-95 transition text-muted-foreground"
            onClick={() => { playClick(); navigate("/settings"); }}
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
            onClick={() => { playClick(); navigate(featured[heroIdx].route); }}
            className="relative w-full h-44 rounded-2xl overflow-hidden border border-border block"
            style={{ background: `linear-gradient(135deg, ${featured[heroIdx].accent}26, transparent 60%), hsl(228 30% 11%)` }}
          >
            {featured[heroIdx].image && (
              <img
                src={featured[heroIdx].image}
                alt={featured[heroIdx].name}
                className="absolute inset-0 w-full h-full object-cover opacity-45"
                style={{ filter: "grayscale(1) contrast(1.15)", mixBlendMode: "luminosity" }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 p-4 flex flex-col justify-between text-start">
              <span
                className="self-start px-2.5 py-1 rounded-md text-[10px] font-display font-semibold uppercase tracking-wide"
                style={{ backgroundColor: `${featured[heroIdx].accent}30`, color: featured[heroIdx].accent }}
              >
                {featured[heroIdx].tag}
              </span>
              <div>
                <p className="font-display font-bold text-white text-2xl">
                  {featured[heroIdx].name}
                </p>
                <p className="text-white/75 text-xs font-body mt-1 max-w-[80%]">
                  {featured[heroIdx].description}
                </p>
                <span className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-lg bg-white text-[#111] text-xs font-display font-semibold">
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
                whileTap={{ scale: 0.96 }}
                onClick={() => { playClick(); navigate(g.route); }}
                className="relative shrink-0 w-32 h-40 rounded-xl overflow-hidden border border-border bg-card snap-start flex flex-col justify-between p-3 text-start"
              >
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: g.accent }} />
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center p-2">
                  <g.icon className="w-full h-full" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground text-sm leading-tight">
                    {g.name}
                  </p>
                  <p className="text-muted-foreground text-[10px] font-body uppercase tracking-wide mt-0.5">{g.tag}</p>
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
                onClick={() => { playClick(); navigate(game.route); }}
                className="relative rounded-xl overflow-hidden border border-border bg-card aspect-[4/5] flex flex-col justify-between p-3 text-start"
              >
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: game.accent }} />
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center p-2">
                    <game.icon className="w-full h-full" />
                  </div>
                  <span className="text-[9px] font-display font-semibold uppercase tracking-wide text-muted-foreground pt-1">
                    {game.tag}
                  </span>
                </div>
                <div>
                  <p className="font-display font-bold text-foreground text-sm">
                    {game.name}
                  </p>
                  <p className="text-muted-foreground text-[10px] font-body mt-0.5">
                    👥 {game.players}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="pt-8 pb-2 flex items-center justify-center gap-3 flex-wrap text-xs text-muted-foreground">
          <button onClick={() => navigate("/about")} className="hover:text-foreground">About</button>
          <span className="opacity-30">·</span>
          <button onClick={() => navigate("/contact")} className="hover:text-foreground">Contact</button>
          <span className="opacity-30">·</span>
          <button onClick={() => navigate("/privacy-policy")} className="hover:text-foreground">
            {t("portal.privacyPolicy") || "Privacy"}
          </button>
          <span className="opacity-30">·</span>
          <button onClick={() => navigate("/terms")} className="hover:text-foreground">Terms</button>
        </footer>
      </main>

      <BottomNav />
    </div>
  );
};

export default PortalScreen;
