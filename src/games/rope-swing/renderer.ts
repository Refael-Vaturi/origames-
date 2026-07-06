import { GameState } from "./types";
import { COURSE_LENGTH, PLAYER_RADIUS } from "./config";

const CAMERA_X_RATIO = 0.36;
const BASELINE_Y_RATIO = 0.42;

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, time: number, topInset = 0) {
  const baselineY = h * BASELINE_Y_RATIO;
  const camX = state.playerX - w * CAMERA_X_RATIO;
  const toScreenX = (worldX: number) => worldX - camX;
  const toScreenY = (worldY: number) => baselineY + worldY;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#7dd3fc");
  bg.addColorStop(0.55, "#38bdf8");
  bg.addColorStop(1, "#075985");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Distant mountain silhouettes (parallax)
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 10; i++) {
    const mx = ((i * 260 - camX * 0.2) % (w + 500)) - 250;
    ctx.beginPath();
    ctx.moveTo(mx, h);
    ctx.lineTo(mx + 130, h - 160 - (i % 3) * 30);
    ctx.lineTo(mx + 260, h);
    ctx.closePath();
    ctx.fill();
  }

  // Anchors + ropes
  for (let i = 0; i < state.anchors.length; i++) {
    const a = state.anchors[i];
    const sx = toScreenX(a.x);
    if (sx < -60 || sx > w + 60) continue;
    const sy = toScreenY(a.y);
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy + 26);
    ctx.stroke();
    ctx.fillStyle = i <= state.anchorIndex ? "#facc15" : "#f8fafc";
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Current rope
  if (state.attached) {
    const anchor = state.anchors[state.anchorIndex];
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(toScreenX(anchor.x), toScreenY(anchor.y));
    ctx.lineTo(toScreenX(state.playerX), toScreenY(state.playerY));
    ctx.stroke();
  }

  // Trail
  for (const t of state.trail) {
    ctx.globalAlpha = Math.max(0, t.life / 0.4) * 0.4;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(toScreenX(t.x), toScreenY(t.y), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Finish marker
  const finishSx = toScreenX(COURSE_LENGTH);
  if (finishSx > -40 && finishSx < w + 40) {
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(finishSx, 0);
    ctx.lineTo(finishSx, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Player
  const px = toScreenX(state.playerX);
  const py = toScreenY(state.playerY);
  const spin = state.attached ? state.theta : time * 0.006;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(spin * 0.4);
  const grad = ctx.createRadialGradient(-4, -5, 1, 0, 0, PLAYER_RADIUS + 2);
  grad.addColorStop(0, "#fca5a5");
  grad.addColorStop(1, "#ef4444");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,10,10,0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // HUD
  const hudY = topInset + 26;
  ctx.textAlign = "center";
  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = "#fff";
  const pct = Math.min(100, Math.round((state.playerX / COURSE_LENGTH) * 100));
  ctx.fillText(`${pct}%`, w / 2, hudY);

  ctx.textAlign = "right";
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = state.timeLeft <= 10 ? "#fca5a5" : "#fff";
  ctx.fillText(`${Math.max(0, state.timeLeft).toFixed(0)}s`, w - 16, hudY);
}
