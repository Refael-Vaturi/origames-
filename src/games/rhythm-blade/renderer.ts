import { Direction, GameState } from "./types";
import { TRAVEL_TIME, screenXYForDirection } from "./engine";

const DIR_COLOR: Record<Direction, string> = {
  up: "#06B6D4",
  down: "#f472b6",
  left: "#facc15",
  right: "#10B981",
};

const DIR_ARROW: Record<Direction, string> = { up: "▲", down: "▼", left: "◀", right: "▶" };
const DIR_ANGLE: Record<Direction, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

export interface RhythmLabels {
  perfect: string;
  good: string;
  miss: string;
  combo: string;
  hyperDrive: string;
}

const DEFAULT_LABELS: RhythmLabels = { perfect: "PERFECT", good: "GOOD", miss: "MISS", combo: "combo", hyperDrive: "⚡ HYPER DRIVE x3 ⚡" };

function drawBlade(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number, hyper: boolean) {
  const angle = time * 0.002;
  const len = 44;
  const color = hyper ? "#facc15" : "#10B981";
  const accent = hyper ? "#fef3c7" : "#F0FDF4";

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Outer glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;

  // Blade body (double-edged)
  const grad = ctx.createLinearGradient(-len, 0, len, 0);
  grad.addColorStop(0, "rgba(255,255,255,0.1)");
  grad.addColorStop(0.5, accent);
  grad.addColorStop(1, "rgba(255,255,255,0.1)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.lineTo(-len * 0.85, -3);
  ctx.lineTo(len * 0.85, -3);
  ctx.lineTo(len, 0);
  ctx.lineTo(len * 0.85, 3);
  ctx.lineTo(-len * 0.85, 3);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;

  // Central hilt orb
  const orb = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
  orb.addColorStop(0, "#fff");
  orb.addColorStop(0.4, color);
  orb.addColorStop(1, "transparent");
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, audioNow: number, time: number, topInset = 0, labels: RhythmLabels = DEFAULT_LABELS) {
  const cx = w / 2;
  const cy = h / 2;

  // Background — dark cyber gradient
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
  bg.addColorStop(0, state.hyperDrive ? "#1a0f30" : "#0F172A");
  bg.addColorStop(1, "#020617");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Cyber grid
  ctx.strokeStyle = "rgba(16,185,129,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Beat pulse rings out from center
  const pulse = audioNow % 1;
  for (let i = 0; i < 3; i++) {
    const p = (pulse + i * 0.33) % 1;
    ctx.strokeStyle = state.hyperDrive ? `rgba(250,204,21,${(1 - p) * 0.4})` : `rgba(6,182,212,${(1 - p) * 0.35})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 50 + p * 220, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Hit zone ring — reactive
  const beatKick = 1 - Math.min(1, pulse * 4);
  const ringR = 44 + beatKick * 6;
  ctx.save();
  ctx.shadowColor = state.hyperDrive ? "#facc15" : "#10B981";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = state.hyperDrive ? "#facc15" : "#10B981";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();
  // Inner ring
  ctx.strokeStyle = "rgba(240,253,244,0.6)";
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR - 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Notes (glowing arrow-shaped orbs with trail)
  for (const block of state.blocks) {
    const timeToHit = block.hitTime - audioNow;
    let progress = 1 - timeToHit / TRAVEL_TIME;
    if (block.resolved && block.resolvedAt !== undefined) {
      progress = 1 - (block.hitTime - block.resolvedAt) / TRAVEL_TIME;
    }
    progress = Math.max(0, Math.min(1.15, progress));
    const { x, y } = screenXYForDirection(block.direction, w, h, progress);

    let alpha = 1;
    if (block.resolved) {
      const age = audioNow - (block.resolvedAt ?? audioNow);
      alpha = Math.max(0, 1 - age / 0.4);
    }
    if (alpha <= 0) continue;

    const color = block.resolved && block.result === "miss" ? "#64748b" : DIR_COLOR[block.direction];
    const angle = DIR_ANGLE[block.direction] + Math.PI; // arrow points toward center

    // Trail (line back toward spawn)
    if (!block.resolved) {
      const trailLen = 60;
      const tx = x + Math.cos(angle + Math.PI) * trailLen;
      const ty = y + Math.sin(angle + Math.PI) * trailLen;
      const trail = ctx.createLinearGradient(x, y, tx, ty);
      trail.addColorStop(0, color);
      trail.addColorStop(1, "transparent");
      ctx.strokeStyle = trail;
      ctx.lineWidth = 4;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;

    // Diamond-shaped arrow note
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(0, -12);
    ctx.lineTo(-10, 0);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Inner highlight
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-2, -6);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-2, 6);
    ctx.closePath();
    ctx.fill();

    // Arrow tip mark
    ctx.strokeStyle = "rgba(15,23,42,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, -4);
    ctx.lineTo(10, 0);
    ctx.lineTo(4, 4);
    ctx.stroke();

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // The blade at center
  drawBlade(ctx, cx, cy, time, state.hyperDrive);

  // Expanding hit rings on slice
  for (const f of state.fx) {
    const age = audioNow - f.time;
    if (age < 0 || age > 0.5) continue;
    const t = age / 0.5;
    const alpha = 1 - t;
    const r = 40 + t * 90;
    const color = f.result === "miss" ? "#f43f5e" : f.result === "perfect" ? "#facc15" : "#F0FDF4";
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Result label
    ctx.font = "800 18px 'Space Grotesk', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.fillText(labels[f.result], cx, cy - 70 - age * 40);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // HUD
  const hudTop = topInset + (state.hyperDrive ? 56 : 40);
  ctx.textAlign = "center";
  ctx.font = "700 26px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = "#F0FDF4";
  ctx.fillText(`${state.score}`, cx, hudTop);

  if (state.combo > 1) {
    ctx.font = "600 14px 'DM Sans', system-ui, sans-serif";
    ctx.fillStyle = state.hyperDrive ? "#facc15" : "#10B981";
    ctx.fillText(`×${state.combo} ${labels.combo.toUpperCase()}`, cx, hudTop + 22);
  }

  if (state.hyperDrive) {
    ctx.font = "800 14px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "#facc15";
    const bounce = 1 + Math.sin(time * 0.01) * 0.06;
    ctx.save();
    ctx.translate(cx, topInset + 28);
    ctx.scale(bounce, bounce);
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 12;
    ctx.fillText(labels.hyperDrive, 0, 0);
    ctx.restore();
  }

  // Lives (heart icons)
  ctx.textAlign = "right";
  for (let i = 0; i < state.maxLives; i++) {
    const hx = w - 18 - i * 20;
    const hy = topInset + 30;
    const alive = i < state.lives;
    ctx.fillStyle = alive ? "#f43f5e" : "rgba(244,63,94,0.2)";
    if (alive) { ctx.shadowColor = "#f43f5e"; ctx.shadowBlur = 8; }
    ctx.beginPath();
    ctx.moveTo(hx, hy + 3);
    ctx.bezierCurveTo(hx, hy - 3, hx - 8, hy - 3, hx - 8, hy + 3);
    ctx.bezierCurveTo(hx - 8, hy + 8, hx, hy + 12, hx, hy + 12);
    ctx.bezierCurveTo(hx, hy + 12, hx + 8, hy + 8, hx + 8, hy + 3);
    ctx.bezierCurveTo(hx + 8, hy - 3, hx, hy - 3, hx, hy + 3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
