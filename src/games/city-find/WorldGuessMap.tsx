import { useRef, useState } from "react";

export interface LatLng {
  lat: number;
  lng: number;
}

// Equirectangular (plate carrée) projection: linear in both axes, so pixel
// position <-> lat/lng is a simple straight-line mapping.
const toPercent = ({ lat, lng }: LatLng) => ({
  xPct: ((lng + 180) / 360) * 100,
  yPct: ((90 - lat) / 180) * 100,
});

const WORLD_MAP_URL = "https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg";

interface Props {
  mode: "input" | "result";
  guess?: LatLng | null;
  actual?: LatLng;
  onPick?: (pos: LatLng) => void;
}

const WorldGuessMap = ({ mode, guess, actual, onPick }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "input" || !onPick || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    onPick({
      lng: (xPct / 100) * 360 - 180,
      lat: 90 - (yPct / 100) * 180,
    });
  };

  const guessPct = guess ? toPercent(guess) : null;
  const actualPct = actual ? toPercent(actual) : null;

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative w-full aspect-[2/1] rounded-xl overflow-hidden border border-border select-none ${
        mode === "input" ? "cursor-crosshair" : ""
      }`}
      style={
        imgFailed
          ? { background: "linear-gradient(180deg, #0b3d5c 0%, #145a80 50%, #0b3d5c 100%)" }
          : undefined
      }
    >
      {!imgFailed && (
        <img
          src={WORLD_MAP_URL}
          alt="World map"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      )}

      {guessPct && actualPct && mode === "result" && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          <line
            x1={`${guessPct.xPct}%`}
            y1={`${guessPct.yPct}%`}
            x2={`${actualPct.xPct}%`}
            y2={`${actualPct.yPct}%`}
            stroke="#facc15"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        </svg>
      )}

      {actualPct && mode === "result" && (
        <div
          className="absolute w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${actualPct.xPct}%`, top: `${actualPct.yPct}%` }}
        />
      )}

      {guessPct && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${guessPct.xPct}%`, top: `${guessPct.yPct}%` }}
        >
          <div className="text-2xl leading-none drop-shadow">📍</div>
        </div>
      )}

      {mode === "input" && !guess && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="bg-black/60 text-white text-xs sm:text-sm px-3 py-1.5 rounded-full">
            Tap the map to place your guess
          </span>
        </div>
      )}
    </div>
  );
};

export default WorldGuessMap;
