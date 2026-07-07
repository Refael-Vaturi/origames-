import { motion } from "framer-motion";

const TILES = [
  { letter: "W", color: "#10b981", delay: 0 },
  { letter: "O", color: "#fbbf24", delay: 0.15 },
  { letter: "R", color: "#10b981", delay: 0.3 },
  { letter: "D", color: "#64748b", delay: 0.45 },
];

/** Wordle-style tiles flipping to reveal their color, one after another. */
export function WordLadderGlyph({ className }: { className?: string }) {
  return (
    <div className={`flex gap-2 justify-center ${className ?? ""}`}>
      {TILES.map((t, i) => (
        <motion.div
          key={i}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-md flex items-center justify-center font-display font-bold text-lg text-white"
          style={{ perspective: 400 }}
          initial={{ rotateX: 0, backgroundColor: "#334155" }}
          animate={{ rotateX: [0, 90, 0], backgroundColor: ["#334155", "#334155", t.color] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: t.delay, repeatDelay: 1.4, times: [0, 0.5, 1] }}
        >
          {t.letter}
        </motion.div>
      ))}
    </div>
  );
}
