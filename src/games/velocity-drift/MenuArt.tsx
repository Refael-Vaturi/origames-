import { motion } from "framer-motion";

/** Top-down car drifting through a neon curve with skid marks — real racing feel. */
export function VelocityDriftGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vd-road" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1a2130" />
        </linearGradient>
        <linearGradient id="vd-neon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="vd-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <filter id="vd-glow">
          <feGaussianBlur stdDeviation="1.5" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Curved neon road */}
      <path
        d="M0 78 C 30 78, 55 25, 95 25 S 135 55, 140 55"
        stroke="url(#vd-road)"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M0 78 C 30 78, 55 25, 95 25 S 135 55, 140 55"
        stroke="url(#vd-neon)"
        strokeWidth="22"
        strokeLinecap="round"
        fill="none"
        opacity="0.15"
        filter="url(#vd-glow)"
      />
      {/* Dashed centerline */}
      <path
        d="M0 78 C 30 78, 55 25, 95 25 S 135 55, 140 55"
        stroke="#F0FDF4"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="3 5"
        opacity="0.7"
      />
      {/* Skid marks */}
      <path
        d="M20 76 C 42 76, 58 34, 82 32"
        stroke="#0a0a0a"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <path
        d="M20 82 C 42 82, 58 40, 82 38"
        stroke="#0a0a0a"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />

      {/* Car drifting through the apex */}
      <motion.g
        animate={{ rotate: [-25, -12, 8, 20] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "70px 40px" }}
      >
        <g transform="translate(70 40)">
          {/* Shadow */}
          <ellipse cx="1" cy="2" rx="14" ry="7" fill="#000" opacity="0.4" />
          {/* Wheels */}
          <rect x="-9" y="-8" width="4" height="2.5" rx="0.5" fill="#0a0a0a" />
          <rect x="-9" y="5.5" width="4" height="2.5" rx="0.5" fill="#0a0a0a" />
          <rect x="6" y="-8" width="4" height="2.5" rx="0.5" fill="#0a0a0a" />
          <rect x="6" y="5.5" width="4" height="2.5" rx="0.5" fill="#0a0a0a" />
          {/* Body */}
          <rect x="-12" y="-6" width="24" height="12" rx="3" fill="url(#vd-body)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {/* Windshield */}
          <rect x="-1" y="-4.5" width="7" height="9" rx="1.2" fill="#0f1928" opacity="0.9" />
          {/* Rear window */}
          <rect x="-8" y="-4" width="5" height="8" rx="1" fill="#0f1928" opacity="0.75" />
          {/* Roof stripe */}
          <line x1="-11" y1="0" x2="11" y2="0" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.5" />
          {/* Headlights */}
          <circle cx="11" cy="-3.5" r="1.2" fill="#fff4d6" />
          <circle cx="11" cy="3.5" r="1.2" fill="#fff4d6" />
          {/* Taillights */}
          <rect x="-12.5" y="-4.5" width="1.2" height="1.8" fill="#f43f5e" />
          <rect x="-12.5" y="2.7" width="1.2" height="1.8" fill="#f43f5e" />
        </g>
      </motion.g>

      {/* Drift sparks */}
      <motion.g
        animate={{ opacity: [0, 1, 0.6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="58" cy="45" r="1.2" fill="#f59e0b" />
        <circle cx="52" cy="50" r="1" fill="#fbbf24" />
        <circle cx="48" cy="54" r="0.8" fill="#f59e0b" opacity="0.7" />
      </motion.g>
    </svg>
  );
}
