import { GameState } from "./types";
import { COURSE_LENGTH, FLOOR_Y_RATIO, PLAYER_RADIUS } from "./config";

const CAMERA_X_RATIO = 0.32;

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, time: number, topInset = 0) {
  const floorY = h * FLOOR_Y_RATIO;
  const camX = state.playerX - w * CAMERA_X_RATIO;
  const toScreenX = (worldX: number) => worldX - camX;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#38bdf8");
  bg.addColorStop(1, "#0ea5e9");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Clouds (parallax)
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 8; i++) {
    const cx = ((i * 340 - camX * 0.3) % (w + 400)) - 200;
    const cy = 40 + (i % 3) * 30;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 40, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floor with gaps
  ctx.fillStyle = "#a3e635";
  let segStart = 0;
  const gaps = state.obstacles.filter((o) => o.type === "gap").sort((a, b) => a.x - b.x);
  for (const gap of gaps) {
    ctx.fillRect(toScreenX(segStart), floorY, toScreenX(gap.x) - toScreenX(segStart), h - floorY);
    segStart = gap.x + gap.width;
  }
  ctx.fillRect(toScreenX(segStart), floorY, toScreenX(COURSE_LENGTH + 200) - toScreenX(segStart), h - floorY);
  ctx.fillStyle = "#65a30d";
  ctx.fillRect(0, floorY, w, 6);

  // Finish line
  const finishSx = toScreenX(COURSE_LENGTH);
  if (finishSx > -40 && finishSx < w + 40) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#1e293b" : "#f8fafc";
      ctx.fillRect(finishSx, floorY - i * 18 - 18, 14, 18);
    }
  }

  // Spinners
  for (const o of state.obstacles) {
    if (o.type !== "spinner") continue;
    const sx = toScreenX(o.x);
    if (sx < -140 || sx > w + 140) continue;
    const pivotY = floorY - 70;
    const tipX = sx + Math.cos(o.angle) * o.armLength;
    const tipY = pivotY + Math.sin(o.angle) * o.armLength;
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(sx - Math.cos(o.angle) * o.armLength, pivotY - Math.sin(o.angle) * o.armLength);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = "#92400e";
    ctx.beginPath();
    ctx.arc(sx, pivotY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(tipX, tipY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Player (wobble blob)
  const px = w * CAMERA_X_RATIO;
  const py = floorY + state.playerY;
  const squish = state.grounded ? 1 + Math.sin(time * 0.012) * 0.06 : 1;
  const stretchY = state.velY < 0 ? 1.2 : state.velY > 400 ? 0.85 : 1;
  const flash = state.invuln > 0 && Math.floor(time / 90) % 2 === 0;

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(1 / stretchY * squish, stretchY * squish);
  ctx.globalAlpha = flash ? 0.4 : 1;
  const grad = ctx.createRadialGradient(-6, -8, 2, 0, 0, PLAYER_RADIUS + 4);
  grad.addColorStop(0, "#fde047");
  grad.addColorStop(1, "#f59e0b");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,53,15,0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.arc(-7, -3, 3, 0, Math.PI * 2);
  ctx.arc(7, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 6, 8, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.globalAlpha = 1;
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
