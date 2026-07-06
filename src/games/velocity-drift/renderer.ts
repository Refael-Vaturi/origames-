import { GameState } from "./types";
import { ROAD_WIDTH, TRACK_SPACE, WAYPOINTS } from "./track";

export function computeCamera(w: number, h: number) {
  const scale = Math.min(w / TRACK_SPACE.w, h / TRACK_SPACE.h) * 0.92;
  const offsetX = (w - TRACK_SPACE.w * scale) / 2;
  const offsetY = (h - TRACK_SPACE.h * scale) / 2;
  return { scale, offsetX, offsetY };
}

function toScreen(x: number, y: number, cam: { scale: number; offsetX: number; offsetY: number }) {
  return { x: x * cam.scale + cam.offsetX, y: y * cam.scale + cam.offsetY };
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, time: number, topInset = 0) {
  const cam = computeCamera(w, h);

  ctx.fillStyle = "#0d1512";
  ctx.fillRect(0, 0, w, h);

  // Grass texture (subtle grid)
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 40) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }

  // Road (thick stroked closed loop)
  const path = new Path2D();
  const first = toScreen(WAYPOINTS[0].x, WAYPOINTS[0].y, cam);
  path.moveTo(first.x, first.y);
  for (let i = 1; i <= WAYPOINTS.length; i++) {
    const p = toScreen(WAYPOINTS[i % WAYPOINTS.length].x, WAYPOINTS[i % WAYPOINTS.length].y, cam);
    path.lineTo(p.x, p.y);
  }
  path.closePath();

  ctx.save();
  ctx.strokeStyle = "#2b2f36";
  ctx.lineWidth = ROAD_WIDTH * cam.scale + 10;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(path);

  ctx.strokeStyle = "#34383f";
  ctx.lineWidth = ROAD_WIDTH * cam.scale;
  ctx.stroke(path);

  // Center dashed line
  ctx.strokeStyle = "rgba(250,204,21,0.55)";
  ctx.lineWidth = Math.max(1.5, 3 * cam.scale);
  ctx.setLineDash([14 * cam.scale, 14 * cam.scale]);
  ctx.stroke(path);
  ctx.setLineDash([]);
  ctx.restore();

  // Start/finish marker
  const startA = toScreen(WAYPOINTS[0].x, WAYPOINTS[0].y, cam);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = Math.max(2, 4 * cam.scale);
  ctx.beginPath();
  ctx.moveTo(startA.x - 20 * cam.scale, startA.y);
  ctx.lineTo(startA.x + 20 * cam.scale, startA.y);
  ctx.stroke();
  ctx.restore();

  // Drift particles
  for (const p of state.particles) {
    const sp = toScreen(p.x, p.y, cam);
    const alpha = Math.max(0, p.life / p.maxLife) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, p.size * cam.scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Car
  const carPos = toScreen(state.pos.x, state.pos.y, cam);
  ctx.save();
  ctx.translate(carPos.x, carPos.y);
  ctx.rotate(state.heading);
  const carColor = state.offTrack ? "#64748b" : state.nitroActive ? "#22d3ee" : "#f43f5e";

  if (state.driftHeat > 0.05) {
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 26 * cam.scale);
    glow.addColorStop(0, `rgba(250,204,21,${state.driftHeat * 0.4})`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 26 * cam.scale, 0, Math.PI * 2);
    ctx.fill();
  }

  const carLen = 16 * cam.scale;
  const carWid = 9 * cam.scale;
  ctx.fillStyle = carColor;
  ctx.beginPath();
  ctx.moveTo(carLen, 0);
  ctx.lineTo(-carLen * 0.6, -carWid);
  ctx.lineTo(-carLen * 0.3, 0);
  ctx.lineTo(-carLen * 0.6, carWid);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // HUD
  const hudTop = topInset + 40;
  ctx.textAlign = "center";
  ctx.font = "bold 24px monospace";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(`${Math.floor(state.score)}`, w / 2, hudTop);

  ctx.font = "bold 13px monospace";
  ctx.fillStyle = state.combo > 1.05 ? "#facc15" : "rgba(248,250,252,0.5)";
  ctx.fillText(`x${state.combo.toFixed(1)} combo`, w / 2, hudTop + 20);

  ctx.textAlign = "right";
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(`${Math.max(0, state.timeLeft).toFixed(0)}s`, w - 18, hudTop - 6);

  // Nitro bar
  const barW = 90;
  const barX = w - 18 - barW;
  const barY = hudTop + 8;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(barX, barY, barW, 8);
  ctx.fillStyle = state.nitro >= 1 ? "#22d3ee" : "#0ea5e9";
  ctx.fillRect(barX, barY, barW * state.nitro, 8);

  if (state.offTrack) {
    ctx.textAlign = "center";
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "#f87171";
    ctx.fillText("OFF TRACK", w / 2, h - 24);
  }
}
