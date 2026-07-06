import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Gamepad2, Users, UserCircle, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { playClick, playPop } from "@/hooks/useSound";
import {
  CityFindIcon,
  ClickerIcon,
  ColorIdentifyIcon,
  CyberShieldIcon,
  FakeItFastIcon,
  FruitMergeIcon,
  GravityFlipIcon,
  IronDomeIcon,
  MergeTycoonIcon,
  RhythmBladeIcon,
  VelocityDriftIcon,
  WobbleRaceIcon,
} from "@/components/game-icons";
import type { ComponentType } from "react";

type Item = { id: string; icon: typeof Home; label: string; route?: string };

const items: Item[] = [
  { id: "home", icon: Home, label: "nav.home", route: "/" },
  { id: "play", icon: Gamepad2, label: "nav.play" },
  { id: "friends", icon: Users, label: "nav.friends", route: "/friends" },
  { id: "profile", icon: UserCircle, label: "nav.me", route: "/profile" },
];

const gameOptions: {
  id: string;
  name: string;
  route: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
  tag: string;
}[] = [
  { id: "fake-it-fast", name: "Fake It Fast", route: "/fake-it-fast", accent: "#a855f7", tag: "Multiplayer", icon: FakeItFastIcon },
  { id: "iron-dome", name: "Iron Dome", route: "/iron-dome", accent: "#22d3ee", tag: "Action", icon: IronDomeIcon },
  { id: "clicker", name: "Clicker", route: "/clicker", accent: "#fbbf24", tag: "Arcade", icon: ClickerIcon },
  { id: "color-identify", name: "Identify Color", route: "/color-identify", accent: "#2dd4bf", tag: "Puzzle", icon: ColorIdentifyIcon },
  { id: "city-find", name: "CityFind", route: "/city-find", accent: "#4ade80", tag: "Geo", icon: CityFindIcon },
  { id: "gravity-flip", name: "Gravity Flip", route: "/gravity-flip", accent: "#22d3ee", tag: "Reflex", icon: GravityFlipIcon },
  { id: "rhythm-blade", name: "Rhythm Blade", route: "/rhythm-blade", accent: "#c084fc", tag: "Music", icon: RhythmBladeIcon },
  { id: "velocity-drift", name: "Velocity Drift", route: "/velocity-drift", accent: "#f43f5e", tag: "Racing", icon: VelocityDriftIcon },
  { id: "cyber-shield", name: "Cyber Shield", route: "/cyber-shield", accent: "#38bdf8", tag: "Strategy", icon: CyberShieldIcon },
  { id: "fruit-merge", name: "Fruit Merge", route: "/fruit-merge", accent: "#fb7185", tag: "Merge", icon: FruitMergeIcon },
  { id: "merge-tycoon", name: "Merge Tycoon", route: "/merge-tycoon", accent: "#fb923c", tag: "Idle", icon: MergeTycoonIcon },
  { id: "wobble-race", name: "Wobble Race", route: "/wobble-race", accent: "#fde047", tag: "Party", icon: WobbleRaceIcon },
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
                    whileTap={{ scale: 0.96 }}
                    onClick={() => { playClick(); setPlayOpen(false); navigate(g.route); }}
                    className="relative aspect-[4/5] rounded-xl overflow-hidden border border-border bg-card flex flex-col justify-between p-3 text-start"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: g.accent }} />
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center p-2">
                        <g.icon className="w-full h-full" />
                      </div>
                      <span className="text-[9px] font-display font-semibold uppercase tracking-wide text-muted-foreground pt-1">
                        {g.tag}
                      </span>
                    </div>
                    <p className="font-display font-bold text-foreground text-sm">{g.name}</p>
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
