import { motion } from "framer-motion";

/** A figure swinging on a rope between two posts across a canyon gap. */
export function RopeSwingGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* canyon */}
      <path d="M0 78 L28 78 L40 88 L80 88 L92 78 L120 78" stroke="#f43f5e" strokeOpacity="0.35" strokeWidth="2" fill="none" />
      {/* posts */}
      <rect x="20" y="14" width="5" height="20" fill="#7dd3fc" />
      <rect x="95" y="14" width="5" height="20" fill="#7dd3fc" />
      <motion.g
        style={{ transformOrigin: "22.5px 16px" }}
        animate={{ rotate: [-38, 38, -38] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <line x1="22.5" y1="16" x2="22.5" y2="56" stroke="#e2e8f0" strokeWidth="1.5" />
        <circle cx="22.5" cy="62" r="7" fill="#38bdf8" />
      </motion.g>
    </svg>
  );
}
