import { useRef, useState } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { Plus, Minus, Maximize2 } from "lucide-react";

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

const ZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const btn = "w-8 h-8 rounded-md bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors";
  return (
    <div className="absolute bottom-2 right-2 z-10 flex flex-col gap-1">
      <button type="button" onClick={() => zoomIn()} className={btn} aria-label="Zoom in">
        <Plus className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => zoomOut()} className={btn} aria-label="Zoom out">
        <Minus className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => resetTransform()} className={btn} aria-label="Reset view">
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const WorldGuessMap = ({ mode, guess, actual, onPick }: Props) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "input" || !onPick || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;
    onPick({ lng: (xPct / 100) * 360 - 180, lat: 90 - (yPct / 100) * 180 });
  };

  const guessPct = guess ? toPercent(guess) : null;
  const actualPct = actual ? toPercent(actual) : null;

  return (
    <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden border border-border bg-slate-900">
      <TransformWrapper minScale={1} maxScale={12} initialScale={1} centerOnInit doubleClick={{ disabled: true }}>
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
          <div
            onClick={handleClick}
            className={`relative w-full h-full ${mode === "input" ? "cursor-crosshair" : ""}`}
          >
            {!imgFailed ? (
              <img
                ref={imgRef}
                src={WORLD_MAP_URL}
                alt="World map"
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: "linear-gradient(180deg, #0b3d5c 0%, #145a80 50%, #0b3d5c 100%)" }}
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
                  vectorEffect="non-scaling-stroke"
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
          </div>
        </TransformComponent>
      </TransformWrapper>

      {mode === "input" && <ZoomControls />}

      {mode === "input" && !guess && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
            Tap to guess · pinch/scroll to zoom · drag to pan
          </span>
        </div>
      )}
    </div>
  );
};

export default WorldGuessMap;
