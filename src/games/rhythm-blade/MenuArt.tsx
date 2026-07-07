import { motion } from "framer-motion";

const DIRS = [
  { angle: -90, color: "#22d3ee" }, // up
  { angle: 0, color: "#a3e635" }, // right
  { angle: 90, color: "#f472b6" }, // down
  { angle: 180, color: "#facc15" }, // left
];

/** Illustrates the actual mechanic: colored blocks converging on a hit ring. */
export function RhythmBladeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="20" stroke="#c084fc" strokeWidth="2.5" opacity="0.6" />
      {DIRS.map((d, i) => {
        const rad = (d.angle * Math.PI) / 180;
        const startR = 52;
        const endR = 26;
        return (
          <motion.rect
            key={i}
            width="12"
            height="12"
            rx="3"
            fill={d.color}
            style={{ transformOrigin: "6px 6px" }}
            initial={false}
            animate={{
              x: [60 + Math.cos(rad) * startR - 6, 60 + Math.cos(rad) * endR - 6],
              y: [60 + Math.sin(rad) * startR - 6, 60 + Math.sin(rad) * endR - 6],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4, ease: "easeIn" }}
          />
        );
      })}
    </svg>
  );
}
