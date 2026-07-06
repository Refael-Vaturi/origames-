import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Gamepad2, Users, UserCircle, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { playClick, playPop } from "@/hooks/useSound";
import fakeItFastCard from "@/assets/fake-it-fast-card.png";
import ironDomeCard from "@/assets/iron-dome-card.png";

type Item = { id: string; icon: typeof Home; label: string; route?: string };

const items: Item[] = [
  { id: "home", icon: Home, label: "nav.home", route: "/" },
  { id: "play", icon: Gamepad2, label: "nav.play" },
  { id: "friends", icon: Users, label: "nav.friends", route: "/friends" },
  { id: "profile", icon: UserCircle, label: "nav.me", route: "/profile" },
];

const gameOptions = [
  { id: "fake-it-fast", name: "Fake It Fast", emoji: "🕵️", route: "/fake-it-fast", color: "from-[hsl(267,84%,58%)] to-[hsl(340,82%,62%)]", image: fakeItFastCard, tag: "Multiplayer" },
  { id: "iron-dome", name: "Iron Dome", emoji: "🛡️", route: "/iron-dome", color: "from-[hsl(190,80%,30%)] to-[hsl(210,80%,20%)]", image: ironDomeCard, tag: "Action" },
  { id: "clicker", name: "Clicker", emoji: "👆", route: "/clicker", color: "from-[hsl(38,100%,55%)] to-[hsl(340,82%,62%)]", tag: "Arcade" },
  { id: "color-identify", name: "Identify Color", emoji: "🎨", route: "/color-identify", color: "from-[hsl(174,72%,45%)] to-[hsl(267,84%,58%)]", tag: "Puzzle" },
  { id: "city-find", name: "CityFind", emoji: "🌍", route: "/city-find", color: "from-[hsl(142,70%,40%)] to-[hsl(190,80%,30%)]", tag: "Geo" },
  { id: "gravity-flip", name: "Gravity Flip", emoji: "🌀", route: "/gravity-flip", color: "from-[hsl(190,90%,50%)] to-[hsl(270,80%,60%)]", tag: "Reflex" },
  { id: "rhythm-blade", name: "Rhythm Blade", emoji: "🎧", route: "/rhythm-blade", color: "from-[hsl(280,80%,55%)] to-[hsl(330,80%,60%)]", tag: "Music" },
  { id: "velocity-drift", name: "Velocity Drift", emoji: "🏎️", route: "/velocity-drift", color: "from-[hsl(350,80%,55%)] to-[hsl(190,90%,50%)]", tag: "Racing" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [playOpen, setPlayOpen] = useState(false);

  return (
    <>
      <motion.nav
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.15 }}
        className="fixed bottom-3 inset-x-0 z-50 px-3 pointer-events-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto w-full max-w-[420px] pointer-events-auto rounded-3xl bg-card/85 backdrop-blur-xl border border-border/60 shadow-card flex items-center justify-around px-2 py-2">
          {items.map(({ id, icon: Icon, label, route }) => {
            const active = id === "play"
              ? playOpen
              : route === "/"
                ? location.pathname === "/"
                : !!route && location.pathname.startsWith(route);
            const handle = () => {
              if (id === "play") { playPop(); setPlayOpen(true); return; }
              playClick();
              if ((id === "friends" || id === "profile") && !user) { navigate("/auth"); return; }
              if (route) navigate(route);
            };
            return (
              <motion.button
                key={id}
                whileTap={{ scale: 0.9 }}
                onClick={handle}
                className="relative flex flex-col items-center justify-center px-2 py-1.5 rounded-2xl min-w-[52px] flex-1"
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-2xl gradient-hero opacity-15"
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  />
                )}
                <Icon className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[10px] font-display mt-0.5 transition-colors ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {t(label)}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.nav>

      {/* Play sheet */}
      <AnimatePresence>
        {playOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPlayOpen(false)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="fixed left-0 right-0 bottom-0 z-[61] bg-background rounded-t-3xl shadow-2xl border-t border-border max-h-[85vh] overflow-y-auto"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
            >
              <div className="sticky top-0 bg-background/90 backdrop-blur-md flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/50">
                <div className="flex-1">
                  <div className="w-12 h-1.5 rounded-full bg-border mx-auto mb-2" />
                  <h2 className="font-display text-lg font-bold text-foreground text-center">{t("nav.chooseGame")}</h2>
                </div>
                <button
                  onClick={() => { playClick(); setPlayOpen(false); }}
                  className="absolute end-4 top-4 p-1.5 rounded-full bg-muted text-muted-foreground active:scale-90 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                {gameOptions.map((g) => (
                  <motion.button
                    key={g.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { playClick(); setPlayOpen(false); navigate(g.route); }}
                    className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-card"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${g.color}`} />
                    {g.image && (
                      <img src={g.image} alt={g.name} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-2 start-2 px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-md text-primary-foreground text-[9px] font-display font-semibold">
                      {g.tag}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl">
                        {g.emoji}
                      </div>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 p-2.5 text-start">
                      <p className="font-display font-bold text-primary-foreground text-sm drop-shadow">{g.name}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default BottomNav;
