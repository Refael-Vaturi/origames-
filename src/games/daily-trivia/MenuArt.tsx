import { motion } from "framer-motion";

/** A quiz card flipping from a question mark to a check — echoes answering a question. */
export function DailyTriviaGlyph({ className }: { className?: string }) {
  return (
    <div className={`mx-auto ${className ?? ""}`} style={{ perspective: 500 }}>
      <motion.div
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-display font-bold text-white"
        animate={{ rotateY: [0, 180, 180, 360] }}
        transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.45, 0.8, 1], ease: "easeInOut" }}
        style={{ background: "linear-gradient(135deg, #a78bfa, #6366f1)", transformStyle: "preserve-3d" }}
      >
        <motion.span animate={{ opacity: [1, 1, 0, 0, 1] }} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.4, 0.45, 0.95, 1] }}>
          ?
        </motion.span>
      </motion.div>
    </div>
  );
}
