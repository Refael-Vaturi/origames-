import { motion } from "framer-motion";

/** Two fruits colliding and merging into a bigger one — the actual core mechanic. */
export function FruitMergeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} xmlns="http://www.w3.org/2000/svg">
      <motion.circle
        cy="45"
        r="9"
        fill="#f43f5e"
        initial={{ cx: 30 }}
        animate={{ cx: [30, 52, 60], opacity: [1, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, times: [0, 0.55, 0.7], repeatDelay: 0.4 }}
      />
      <motion.circle
        cy="45"
        r="12"
        fill="#fb923c"
        initial={{ cx: 90 }}
        animate={{ cx: [90, 68, 60], opacity: [1, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, times: [0, 0.55, 0.7], repeatDelay: 0.4 }}
      />
      <motion.circle
        cx="60"
        cy="45"
        fill="#16a34a"
        initial={{ r: 0 }}
        animate={{ r: [0, 0, 20, 17], opacity: [0, 0, 1, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, times: [0, 0.65, 0.8, 1], repeatDelay: 0.4 }}
      />
    </svg>
  );
}
