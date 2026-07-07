import { motion } from "framer-motion";

/** A growing skyline with a coin bouncing across the rooftops — echoes merging into bigger businesses. */
export function MergeTycoonGlyph({ className }: { className?: string }) {
  const bars = [
    { x: 8, w: 16, h: 22, color: "#fde68a" },
    { x: 28, w: 16, h: 34, color: "#fbbf24" },
    { x: 48, w: 16, h: 46, color: "#fb923c" },
    { x: 68, w: 16, h: 58, color: "#f97316" },
  ];
  const base = 74;

  return (
    <svg viewBox="0 0 92 84" className={className} xmlns="http://www.w3.org/2000/svg">
      {bars.map((b, i) => (
        <motion.rect
          key={i}
          x={b.x}
          width={b.w}
          fill={b.color}
          rx="2"
          initial={{ height: 0, y: base }}
          animate={{ height: b.h, y: base - b.h }}
          transition={{ duration: 0.6, delay: i * 0.15, ease: "backOut" }}
        />
      ))}
      <line x1="4" y1={base} x2="88" y2={base} stroke="#78716c" strokeOpacity="0.4" />
      <motion.circle
        r="6"
        fill="#facc15"
        stroke="#78350f"
        strokeWidth="1"
        initial={{ cx: 16, cy: 10 }}
        animate={{ cx: [16, 36, 56, 76], cy: [10, 4, 10, -2] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}
