import { motion } from "framer-motion";

/** A shield built from circuit traces, with a scanning sweep — echoes the tower-defense/database theme. */
export function CyberShieldGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M50 4 L92 20 V54 C92 82 74 98 50 106 C26 98 8 82 8 54 V20 Z"
        stroke="#38bdf8"
        strokeWidth="2.5"
        fill="rgba(56,189,248,0.05)"
      />
      {/* circuit traces */}
      <path d="M28 40 h16 v14 h20 M28 66 h12 M60 40 v-14 h14 M64 76 h14 v-14" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="28" cy="40" r="2.5" fill="#34d399" />
      <circle cx="64" cy="26" r="2.5" fill="#34d399" />
      <circle cx="78" cy="62" r="2.5" fill="#34d399" />
      <circle cx="40" cy="66" r="2.5" fill="#34d399" />
      {/* scan sweep */}
      <clipPath id="cs-clip">
        <path d="M50 4 L92 20 V54 C92 82 74 98 50 106 C26 98 8 82 8 54 V20 Z" />
      </clipPath>
      <g clipPath="url(#cs-clip)">
        <motion.rect
          x="0"
          width="100"
          height="14"
          fill="#38bdf8"
          opacity="0.18"
          animate={{ y: [-10, 110] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        />
      </g>
    </svg>
  );
}
