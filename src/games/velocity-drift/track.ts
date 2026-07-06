import { Vec2 } from "./types";

// Closed-loop track defined in a fixed 1000x800 design space; scaled to fit
// the canvas at render/collision time via TRACK_SCALE helpers.
export const TRACK_SPACE = { w: 1000, h: 800 };
export const ROAD_WIDTH = 100;

export const WAYPOINTS: Vec2[] = [
  { x: 220, y: 140 },
  { x: 500, y: 90 },
  { x: 780, y: 140 },
  { x: 880, y: 300 },
  { x: 860, y: 460 },
  { x: 720, y: 560 },
  { x: 600, y: 500 },
  { x: 480, y: 560 },
  { x: 360, y: 660 },
  { x: 180, y: 620 },
  { x: 90, y: 460 },
  { x: 110, y: 260 },
];

export const START_INDEX = 0;

function segmentClosestPoint(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number; distSq: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + dx * t, y: a.y + dy * t };
  const distSq = (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
  return { point, t, distSq };
}

/** Distance from a point to the track centerline, plus cumulative distance
 *  along the loop at the closest point (used for progress/scoring). */
export function trackInfoAt(p: Vec2): { distanceToCenter: number; progress: number; segmentIndex: number } {
  let best = { distSq: Infinity, point: p, t: 0 };
  let bestIndex = 0;
  let bestCumulative = 0;
  let cumulative = 0;

  for (let i = 0; i < WAYPOINTS.length; i++) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[(i + 1) % WAYPOINTS.length];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const res = segmentClosestPoint(p, a, b);
    if (res.distSq < best.distSq) {
      best = res;
      bestIndex = i;
      bestCumulative = cumulative + res.t * segLen;
    }
    cumulative += segLen;
  }

  return {
    distanceToCenter: Math.sqrt(best.distSq),
    progress: bestCumulative,
    segmentIndex: bestIndex,
  };
}

export const TOTAL_TRACK_LENGTH = (() => {
  let total = 0;
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[(i + 1) % WAYPOINTS.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
})();

export function startPositionAndHeading(): { pos: Vec2; heading: number } {
  const a = WAYPOINTS[START_INDEX];
  const b = WAYPOINTS[(START_INDEX + 1) % WAYPOINTS.length];
  return { pos: { ...a }, heading: Math.atan2(b.y - a.y, b.x - a.x) };
}
