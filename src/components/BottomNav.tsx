import { motion } from "framer-motion";
import { Home, Gamepad2, Users, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { id: "home", icon: Home, label: "Home", route: "/" },
  { id: "play", icon: Gamepad2, label: "Play", route: "/fake-it-fast" },
  { id: "friends", icon: Users, label: "Friends", route: "/friends" },
  { id: "profile", icon: UserCircle, label: "Me", route: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.15 }}
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,420px)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto rounded-3xl bg-card/80 backdrop-blur-xl border border-border/60 shadow-card flex items-center justify-around px-2 py-2">
        {items.map(({ id, icon: Icon, label, route }) => {
          const active = route === "/" ? location.pathname === "/" : location.pathname.startsWith(route);
          const handle = () => {
            if ((id === "friends" || id === "profile") && !user) {
              navigate("/auth");
              return;
            }
            navigate(route);
          };
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.9 }}
              onClick={handle}
              className="relative flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl min-w-[58px]"
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-2xl gradient-hero opacity-15"
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                />
              )}
              <Icon
                className={`w-5 h-5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-display mt-0.5 transition-colors ${
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomNav;
