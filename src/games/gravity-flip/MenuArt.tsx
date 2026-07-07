import { motion } from "framer-motion";

/**
 * Illustrates the actual mechanic (flip between ceiling/floor spikes) instead
 * of a generic spinner emoji — the diamond genuinely travels top-to-bottom.
 */
export function GravityFlipGlyph({ className }: { className?: string }) {
  const spikes = (y: number, flip: boolean, color: string) =>
    Array.from({ length: 6 }, (_, i) => {
      const x = 6 + i * 18;
      const points = flip
        ? `${x},${y} ${x + 9},${y} ${x + 4.5},${y + 14}`
        : `${x},${y} ${x + 9},${y} ${x + 4.5},${y - 14}`;
      return <polygon key={i} points={points} fill={color} opacity={0.9} />;
    });

  return (
    <svg viewBox="0 0 120 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gf-diamond" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      {/* ceiling spikes */}
      <g>{spikes(0, false, "#22d3ee")}</g>
      {/* floor spikes */}
      <g>{spikes(96, true, "#a855f7")}</g>
      {/* flip path guide */}
      <line x1="60" y1="18" x2="60" y2="78" stroke="white" strokeOpacity="0.15" strokeDasharray="3 4" />
      {/* the flipping player */}
      <motion.rect
        x="53"
        y="41"
        width="14"
        height="14"
        rx="3"
        fill="url(#gf-diamond)"
        style={{ transformOrigin: "60px 48px" }}
        animate={{ y: [18, 66, 18], rotate: [0, 180, 360] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
      />
    </svg>
  );
}
