import { Direction, GameState } from "./types";
import { TRAVEL_TIME, screenXYForDirection } from "./engine";

const DIR_COLOR: Record<Direction, string> = {
  up: "#22d3ee",
  down: "#f472b6",
  left: "#facc15",
  right: "#a3e635",
};

const DIR_ARROW: Record<Direction, string> = {
  up: "▲",
  down: "▼",
  left: "◀",
  right: "▶",
};

export interface RhythmLabels {
  perfect: string;
  good: string;
  miss: string;
  combo: string;
  hyperDrive: string;
}

const DEFAULT_LABELS: RhythmLabels = { perfect: "PERFECT", good: "GOOD", miss: "MISS", combo: "combo", hyperDrive: "⚡ HYPER DRIVE x3 ⚡" };

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, audioNow: number, time: number, topInset = 0, labels: RhythmLabels = DEFAULT_LABELS) {
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  bg.addColorStop(0, state.hyperDrive ? "#2a0845" : "#0f0620");
  bg.addColorStop(1, "#050208");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Beat pulse rings
  const pulse = (audioNow % 1) ;
  ctx.strokeStyle = state.hyperDrive ? "rgba(250,204,21,0.15)" : "rgba(168,85,247,0.12)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const p = (pulse + i * 0.5) % 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 40 + p * 160, 0, Math.PI * 2);
    ctx.globalAlpha = 1 - p;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Hit zone ring
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 34, 0, Math.PI * 2);
  ctx.strokeStyle = state.hyperDrive ? "#facc15" : "#a855f7";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Blocks
  for (const block of state.blocks) {
    const timeToHit = block.hitTime - audioNow;
    let progress = 1 - timeToHit / TRAVEL_TIME;
    if (block.resolved && block.resolvedAt !== undefined) {
      // freeze at time of resolution for the brief lingering fade
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

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    const color = block.resolved && block.result === "miss" ? "#64748b" : DIR_COLOR[block.direction];
    const size = 22;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, 6);
    ctx.fill();

    ctx.fillStyle = "#0b0620";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(DIR_ARROW[block.direction], 0, 1);

    if (block.resolved && block.result && block.result !== "miss") {
      ctx.fillStyle = block.result === "perfect" ? "#facc15" : "#e2e8f0";
      ctx.font = "bold 11px monospace";
      ctx.fillText(labels[block.result], 0, -20);
    }
    ctx.restore();
  }

  // Slice fx (brief flash text at hit zone)
  for (const f of state.fx) {
    const age = audioNow - f.time;
    if (age < 0 || age > 0.5) continue;
    const alpha = 1 - age / 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = f.result === "miss" ? "#f43f5e" : f.result === "perfect" ? "#facc15" : "#e2e8f0";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(labels[f.result], w / 2, h / 2 - 50 - age * 30);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // HUD — centered top so it never collides with the Back button (top-left)
  const hudTop = topInset + (state.hyperDrive ? 56 : 40);
  ctx.textAlign = "center";
  ctx.font = "bold 22px monospace";
  ctx.fillStyle = "#f5f3ff";
  ctx.fillText(`${state.score}`, w / 2, hudTop);

  if (state.combo > 1) {
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = state.hyperDrive ? "#facc15" : "#c4b5fd";
    ctx.fillText(`x${state.combo} ${labels.combo}`, w / 2, hudTop + 22);
  }

  if (state.hyperDrive) {
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#facc15";
    const bounce = 1 + Math.sin(time * 0.01) * 0.06;
    ctx.save();
    ctx.translate(w / 2, topInset + 28);
    ctx.scale(bounce, bounce);
    ctx.fillText(labels.hyperDrive, 0, 0);
    ctx.restore();
  }

  // Lives
  ctx.textAlign = "right";
  ctx.font = "20px sans-serif";
  let heartsStr = "";
  for (let i = 0; i < state.maxLives; i++) heartsStr += i < state.lives ? "♥" : "♡";
  ctx.fillStyle = "#f43f5e";
  ctx.fillText(heartsStr, w - 18, topInset + 34);
}
