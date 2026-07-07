import { motion } from "framer-motion";

/** A wobbly blob hopping over a spinning bar — echoes the actual jump/dodge mechanic. */
export function WobbleRaceGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} xmlns="http://www.w3.org/2000/svg">
      <line x1="4" y1="68" x2="116" y2="68" stroke="#38bdf8" strokeOpacity="0.4" strokeDasharray="4 5" />
      {/* spinning bar obstacle */}
      <motion.g
        style={{ transformOrigin: "78px 50px" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      >
        <rect x="60" y="48" width="36" height="5" rx="2.5" fill="#38bdf8" />
      </motion.g>
      {/* hopping blob */}
      <motion.g
        animate={{ x: [0, 20, 40], y: [0, -26, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.ellipse
          cx="26"
          cy="60"
          rx="14"
          ry="14"
          fill="#facc15"
          animate={{ scaleX: [1, 0.85, 1.15, 1], scaleY: [1, 1.15, 0.85, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "26px 60px" }}
        />
        <circle cx="21" cy="56" r="2" fill="#78350f" />
        <circle cx="31" cy="56" r="2" fill="#78350f" />
      </motion.g>
    </svg>
  );
}
