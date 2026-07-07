import { motion } from "framer-motion";

/** A drift trail arcing toward the car — echoes the actual drift-scoring mechanic. */
export function VelocityDriftGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vd-trail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path
        d="M8 70 C 40 70, 55 20, 95 20 S 130 45, 132 45"
        stroke="url(#vd-trail)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <path d="M8 78 C 38 78, 50 30, 90 30" stroke="#f43f5e" strokeWidth="2" strokeOpacity="0.25" fill="none" strokeDasharray="1 6" strokeLinecap="round" />
      <motion.circle
        r="5"
        fill="#22d3ee"
        initial={{ cx: 8, cy: 70 }}
        animate={{
          cx: [8, 30, 60, 95, 132],
          cy: [70, 68, 30, 20, 45],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}
