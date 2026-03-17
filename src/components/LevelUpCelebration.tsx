import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Sparkles, Trophy } from "lucide-react";

interface LevelUpCelebrationProps {
  level: number;
}

const CONFETTI_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(340 80% 60%)",
  "hsl(50 95% 55%)",
  "hsl(200 80% 55%)",
  "hsl(280 70% 60%)",
];

function Confetti() {
  const pieces = Array.from({ length: 50 });
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 1.5 + Math.random() * 1.5;
        const size = 6 + Math.random() * 8;
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const rotation = Math.random() * 720 - 360;
        const xDrift = (Math.random() - 0.5) * 200;

        return (
          <motion.div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: `${left}%`,
              top: -20,
              width: size,
              height: size * (0.4 + Math.random() * 0.6),
              backgroundColor: color,
            }}
            initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
            animate={{
              y: window.innerHeight + 40,
              x: xDrift,
              rotate: rotation,
              opacity: [1, 1, 0.8, 0],
            }}
            transition={{
              duration,
              delay,
              ease: "easeIn",
            }}
          />
        );
      })}
    </div>
  );
}

const LevelUpCelebration = ({ level }: LevelUpCelebrationProps) => {
  const [prevLevel, setPrevLevel] = useState(level);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (level > prevLevel && prevLevel > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 4000);
      return () => clearTimeout(timer);
    }
    setPrevLevel(level);
  }, [level, prevLevel]);

  return (
    <AnimatePresence>
      {showCelebration && (
        <>
          <Confetti />
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-[99] bg-black/40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              className="bg-card rounded-3xl p-8 shadow-card text-center max-w-xs mx-4"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow ring */}
              <motion.div
                className="w-24 h-24 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center relative"
                animate={{
                  boxShadow: [
                    "0 0 0 0 hsla(var(--primary), 0.4)",
                    "0 0 0 20px hsla(var(--primary), 0)",
                    "0 0 0 0 hsla(var(--primary), 0.4)",
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Trophy className="w-12 h-12 text-primary-foreground" />
                <motion.div
                  className="absolute -top-2 -end-2"
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }}
                >
                  <Sparkles className="w-7 h-7 text-yellow-400" />
                </motion.div>
              </motion.div>

              <motion.h2
                className="font-display text-2xl font-bold text-foreground mb-1"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Level Up! 🎉
              </motion.h2>

              <motion.div
                className="flex items-center justify-center gap-2 mb-3"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="font-display text-4xl font-bold text-primary">
                  {level}
                </span>
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              </motion.div>

              <motion.p
                className="text-sm text-muted-foreground font-body"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Keep playing to unlock more! 🚀
              </motion.p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LevelUpCelebration;
