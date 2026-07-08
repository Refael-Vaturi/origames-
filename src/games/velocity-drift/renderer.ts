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

export interface VelocityLabels {
  combo: string;
  offTrack: string;
}

const DEFAULT_LABELS: VelocityLabels = { combo: "combo", offTrack: "OFF TRACK" };

// Cyber Mint palette
const BG_TOP = "#0a1220";
const BG_BOTTOM = "#040910";
const NEON_MINT = "#10B981";
const NEON_CYAN = "#06B6D4";
const NEON_DANGER = "#f43f5e";
const NEON_AMBER = "#f59e0b";
const INK = "#F0FDF4";

function drawRoadPath(ctx: CanvasRenderingContext2D, cam: { scale: number; offsetX: number; offsetY: number }): Path2D {
  const path = new Path2D();
  const first = toScreen(WAYPOINTS[0].x, WAYPOINTS[0].y, cam);
  path.moveTo(first.x, first.y);
  for (let i = 1; i <= WAYPOINTS.length; i++) {
    const p = toScreen(WAYPOINTS[i % WAYPOINTS.length].x, WAYPOINTS[i % WAYPOINTS.length].y, cam);
    path.lineTo(p.x, p.y);
  }
  path.closePath();
  return path;
}

// Draw a top-down car (looking down at roof). Body is oriented along +X.
function drawCar(ctx: CanvasRenderingContext2D, scale: number, state: GameState, time: number) {
  const L = 22 * scale; // total length
  const W = 12 * scale; // total width
  const hl = L / 2;
  const hw = W / 2;

  const bodyColor = state.offTrack ? "#475569" : state.nitroActive ? "#06B6D4" : "#e11d48";
  const bodyDark = state.offTrack ? "#1e293b" : state.nitroActive ? "#0e7490" : "#7f1d1d";

  // Under-car shadow
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(1.5 * scale, 1.5 * scale, hl * 1.05, hw * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Wheels (4)
  ctx.fillStyle = "#0a0a0a";
  const wheelL = 5 * scale;
  const wheelW = 3 * scale;
  const wheelPositions = [
    { x: hl * 0.55, y: -hw - wheelW * 0.15 },
    { x: hl * 0.55, y: hw + wheelW * 0.15 - wheelW },
    { x: -hl * 0.75, y: -hw - wheelW * 0.15 },
    { x: -hl * 0.75, y: hw + wheelW * 0.15 - wheelW },
  ];
  for (const wp of wheelPositions) {
    ctx.fillRect(wp.x - wheelL / 2, wp.y, wheelL, wheelW);
  }

  // Body (rounded rectangle) with gradient
  const grad = ctx.createLinearGradient(0, -hw, 0, hw);
  grad.addColorStop(0, bodyColor);
  grad.addColorStop(0.5, bodyColor);
  grad.addColorStop(1, bodyDark);
  ctx.fillStyle = grad;
  const r = 4 * scale;
  roundRect(ctx, -hl, -hw, L, W, r);
  ctx.fill();

  // Rim highlight
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = Math.max(0.6, 0.8 * scale);
  roundRect(ctx, -hl, -hw, L, W, r);
  ctx.stroke();

  // Windshield (front cabin)
  ctx.fillStyle = "rgba(15,25,40,0.85)";
  roundRect(ctx, -hl * 0.15, -hw * 0.72, hl * 0.55, hw * 1.44, 2 * scale);
  ctx.fill();
  // Rear window
  ctx.fillStyle = "rgba(15,25,40,0.7)";
  roundRect(ctx, -hl * 0.7, -hw * 0.68, hl * 0.4, hw * 1.36, 2 * scale);
  ctx.fill();

  // Roof accent stripe
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(0.5, 0.6 * scale);
  ctx.beginPath();
  ctx.moveTo(-hl * 0.9, 0);
  ctx.lineTo(hl * 0.9, 0);
  ctx.stroke();

  // Headlights (front - +X direction)
  const hlFlicker = state.nitroActive ? 0.9 + Math.sin(time * 0.04) * 0.1 : 0.75;
  ctx.fillStyle = `rgba(255,244,214,${hlFlicker})`;
  ctx.beginPath();
  ctx.arc(hl - 1 * scale, -hw * 0.55, 1.6 * scale, 0, Math.PI * 2);
  ctx.arc(hl - 1 * scale, hw * 0.55, 1.6 * scale, 0, Math.PI * 2);
  ctx.fill();
  // Headlight forward glow
  const beam = ctx.createRadialGradient(hl + 4 * scale, 0, 0, hl + 4 * scale, 0, 24 * scale);
  beam.addColorStop(0, `rgba(255,240,200,${state.nitroActive ? 0.35 : 0.18})`);
  beam.addColorStop(1, "transparent");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.arc(hl + 4 * scale, 0, 24 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Taillights (rear - -X)
  ctx.fillStyle = "#fca5a5";
  ctx.fillRect(-hl - 0.5 * scale, -hw * 0.75, 1.5 * scale, 2 * scale);
  ctx.fillRect(-hl - 0.5 * scale, hw * 0.35, 1.5 * scale, 2 * scale);
  ctx.shadowColor = "#f43f5e";
  ctx.shadowBlur = 6 * scale;
  ctx.fillRect(-hl - 0.5 * scale, -hw * 0.75, 1.5 * scale, 2 * scale);
  ctx.fillRect(-hl - 0.5 * scale, hw * 0.35, 1.5 * scale, 2 * scale);
  ctx.shadowBlur = 0;

  // Nitro exhaust flame
  if (state.nitroActive) {
    const flameLen = (14 + Math.sin(time * 0.05) * 4) * scale;
    const flame = ctx.createLinearGradient(-hl, 0, -hl - flameLen, 0);
    flame.addColorStop(0, "rgba(6,182,212,0.9)");
    flame.addColorStop(0.5, "rgba(59,130,246,0.7)");
    flame.addColorStop(1, "transparent");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-hl, -hw * 0.4);
    ctx.lineTo(-hl - flameLen, 0);
    ctx.lineTo(-hl, hw * 0.4);
    ctx.closePath();
    ctx.fill();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  time: number,
  topInset = 0,
  bottomInset = 0,
  labels: VelocityLabels = DEFAULT_LABELS,
) {
  const cam = computeCamera(w, h);

  // Screen shake
  const shake = Math.min(1, state.shakeTimer * 6);
  const sx = (Math.random() - 0.5) * 8 * shake;
  const sy = (Math.random() - 0.5) * 8 * shake;
  ctx.save();
  ctx.translate(sx, sy);

  // === Background: night city gradient + radial city-glow ===
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, BG_TOP);
  bg.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Radial glow behind track
  const cx = w / 2;
  const cy = h / 2;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
  glow.addColorStop(0, "rgba(16,185,129,0.10)");
  glow.addColorStop(0.5, "rgba(6,182,212,0.05)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Cyber grid
  ctx.strokeStyle = "rgba(16,185,129,0.06)";
  ctx.lineWidth = 1;
  const gs = 44;
  for (let gx = 0; gx < w; gx += gs) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += gs) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // === Road ===
  const path = drawRoadPath(ctx, cam);

  // Outer neon glow halo
  ctx.save();
  ctx.strokeStyle = "rgba(16,185,129,0.18)";
  ctx.lineWidth = ROAD_WIDTH * cam.scale + 28;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = NEON_MINT;
  ctx.shadowBlur = 20;
  ctx.stroke(path);
  ctx.shadowBlur = 0;

  // Neon curbs (outer edge)
  ctx.strokeStyle = NEON_CYAN;
  ctx.lineWidth = ROAD_WIDTH * cam.scale + 6;
  ctx.stroke(path);

  // Asphalt (dark tarmac)
  const asphaltGrad = ctx.createLinearGradient(0, 0, 0, h);
  asphaltGrad.addColorStop(0, "#1a2130");
  asphaltGrad.addColorStop(1, "#0f1520");
  ctx.strokeStyle = asphaltGrad as unknown as string;
  // Fallback since strokeStyle gradient works:
  ctx.strokeStyle = "#1a2130";
  ctx.lineWidth = ROAD_WIDTH * cam.scale;
  ctx.stroke(path);

  // Subtle asphalt texture noise (thin darker overlay)
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = ROAD_WIDTH * cam.scale * 0.6;
  ctx.stroke(path);

  // Inner edge line (mint)
  ctx.strokeStyle = "rgba(16,185,129,0.55)";
  ctx.lineWidth = Math.max(1, 1.5 * cam.scale);
  ctx.stroke(path);

  // Center dashed lane markings — animated to feel like motion
  const dash = 14 * cam.scale;
  ctx.strokeStyle = "rgba(240,253,244,0.85)";
  ctx.lineWidth = Math.max(1.5, 2.5 * cam.scale);
  ctx.setLineDash([dash, dash * 1.2]);
  ctx.lineDashOffset = -(time * 0.06) % (dash * 2.2);
  ctx.stroke(path);
  ctx.setLineDash([]);
  ctx.restore();

  // Start/finish line - checkered
  const startA = toScreen(WAYPOINTS[0].x, WAYPOINTS[0].y, cam);
  ctx.save();
  const checkerW = 24 * cam.scale;
  const checkerH = 6 * cam.scale;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#F0FDF4" : "#0a0a0a";
    ctx.fillRect(startA.x - checkerW / 2 + (i * checkerW) / 8, startA.y - checkerH / 2, checkerW / 8, checkerH);
  }
  ctx.restore();

  // === Drift particles (smoke) ===
  for (const p of state.particles) {
    const sp = toScreen(p.x, p.y, cam);
    const t = p.life / p.maxLife;
    const alpha = Math.max(0, t) * 0.55;
    const size = p.size * cam.scale * (1 + (1 - t) * 1.2);
    // white smoke with slight color
    const smokeGrad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, size);
    smokeGrad.addColorStop(0, `rgba(230,240,255,${alpha})`);
    smokeGrad.addColorStop(1, "rgba(230,240,255,0)");
    ctx.fillStyle = smokeGrad;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Drift sparks (small amber flecks) when drifting hot
  if (state.driftHeat > 0.2) {
    for (let i = 0; i < 3; i++) {
      const carPos = toScreen(state.pos.x, state.pos.y, cam);
      const angle = state.heading + Math.PI + (Math.random() - 0.5) * 1.2;
      const dist = (10 + Math.random() * 14) * cam.scale;
      const sx2 = carPos.x + Math.cos(angle) * dist;
      const sy2 = carPos.y + Math.sin(angle) * dist;
      ctx.fillStyle = `rgba(245,158,11,${0.5 + state.driftHeat * 0.4})`;
      ctx.beginPath();
      ctx.arc(sx2, sy2, (1 + Math.random() * 1.5) * cam.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // === Car ===
  const carPos = toScreen(state.pos.x, state.pos.y, cam);
  ctx.save();
  ctx.translate(carPos.x, carPos.y);
  ctx.rotate(state.heading);
  drawCar(ctx, cam.scale, state, time);
  ctx.restore();

  // === HUD ===
  const hudTop = topInset + 20;

  // Score capsule (top center)
  ctx.save();
  const scoreText = `${Math.floor(state.score)}`;
  ctx.font = "700 26px 'Space Grotesk', system-ui, sans-serif";
  const scoreW = ctx.measureText(scoreText).width + 40;
  const capX = w / 2 - scoreW / 2;
  const capY = hudTop;
  ctx.fillStyle = "rgba(10,18,32,0.75)";
  roundRect(ctx, capX, capY, scoreW, 40, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(16,185,129,0.4)";
  ctx.lineWidth = 1;
  roundRect(ctx, capX, capY, scoreW, 40, 12);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(scoreText, w / 2, capY + 21);

  // Combo below score
  ctx.font = "600 11px 'DM Sans', system-ui, sans-serif";
  ctx.fillStyle = state.combo > 1.05 ? NEON_AMBER : "rgba(240,253,244,0.5)";
  ctx.fillText(`×${state.combo.toFixed(1)} ${labels.combo.toUpperCase()}`, w / 2, capY + 52);
  ctx.restore();

  // Timer (top right)
  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.font = "700 20px 'Space Grotesk', system-ui, sans-serif";
  const timeLeft = Math.max(0, state.timeLeft);
  ctx.fillStyle = timeLeft < 10 ? NEON_DANGER : INK;
  ctx.fillText(`${timeLeft.toFixed(1)}s`, w - 18, hudTop + 4);
  ctx.font = "500 10px 'DM Sans', system-ui, sans-serif";
  ctx.fillStyle = "rgba(240,253,244,0.5)";
  ctx.fillText("TIME", w - 18, hudTop + 28);
  ctx.restore();

  // Speedometer (bottom right)
  const spdCX = w - 60;
  const spdCY = h - 70 - bottomInset;
  const spdR = 42;
  ctx.save();
  // Background ring
  ctx.fillStyle = "rgba(10,18,32,0.8)";
  ctx.beginPath();
  ctx.arc(spdCX, spdCY, spdR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(16,185,129,0.3)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Speed arc (270deg span, starting at 135deg)
  const start = Math.PI * 0.75;
  const end = Math.PI * 2.25;
  const maxSpeed = 400;
  const spdT = Math.min(1, Math.abs(state.speed) / maxSpeed);
  ctx.strokeStyle = "rgba(240,253,244,0.1)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(spdCX, spdCY, spdR - 8, start, end);
  ctx.stroke();

  // Active speed arc
  const speedColor = spdT > 0.85 ? NEON_DANGER : spdT > 0.5 ? NEON_AMBER : NEON_MINT;
  ctx.strokeStyle = speedColor;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.shadowColor = speedColor;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(spdCX, spdCY, spdR - 8, start, start + (end - start) * spdT);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Speed number
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 22px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = INK;
  ctx.fillText(`${Math.round(Math.abs(state.speed))}`, spdCX, spdCY - 4);
  ctx.font = "600 8px 'DM Sans', system-ui, sans-serif";
  ctx.fillStyle = "rgba(240,253,244,0.5)";
  ctx.fillText("KM/H", spdCX, spdCY + 14);
  ctx.restore();

  // Nitro bar (bottom left)
  ctx.save();
  const nBarW = 120;
  const nBarH = 10;
  const nBarX = 18;
  const nBarY = h - 40 - bottomInset;
  ctx.font = "600 10px 'DM Sans', system-ui, sans-serif";
  ctx.fillStyle = "rgba(240,253,244,0.6)";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("NITRO", nBarX, nBarY - 4);
  // Bg
  ctx.fillStyle = "rgba(10,18,32,0.8)";
  roundRect(ctx, nBarX, nBarY, nBarW, nBarH, 5);
  ctx.fill();
  ctx.strokeStyle = "rgba(6,182,212,0.3)";
  ctx.lineWidth = 1;
  roundRect(ctx, nBarX, nBarY, nBarW, nBarH, 5);
  ctx.stroke();
  // Fill
  const fillW = Math.max(0, Math.min(1, state.nitro)) * (nBarW - 4);
  if (fillW > 0) {
    const nitGrad = ctx.createLinearGradient(nBarX, 0, nBarX + nBarW, 0);
    nitGrad.addColorStop(0, "#06B6D4");
    nitGrad.addColorStop(1, "#22d3ee");
    ctx.fillStyle = nitGrad;
    roundRect(ctx, nBarX + 2, nBarY + 2, fillW, nBarH - 4, 3);
    ctx.fill();
    if (state.nitro >= 1) {
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 10;
      roundRect(ctx, nBarX + 2, nBarY + 2, fillW, nBarH - 4, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  if (state.nitroActive) {
    ctx.fillStyle = NEON_CYAN;
    ctx.font = "700 10px 'Space Grotesk', system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("BOOST!", nBarX + nBarW, nBarY - 4);
  }
  ctx.restore();

  // Drift heat indicator (below nitro)
  if (state.driftHeat > 0.05 || state.isDrifting) {
    ctx.save();
    const dBarW = 120;
    const dBarH = 4;
    const dBarX = 18;
    const dBarY = h - 20 - bottomInset;
    ctx.fillStyle = "rgba(10,18,32,0.8)";
    roundRect(ctx, dBarX, dBarY, dBarW, dBarH, 2);
    ctx.fill();
    ctx.fillStyle = NEON_AMBER;
    ctx.shadowColor = NEON_AMBER;
    ctx.shadowBlur = 8;
    roundRect(ctx, dBarX, dBarY, dBarW * Math.min(1, state.driftHeat), dBarH, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Off-track warning
  if (state.offTrack) {
    ctx.save();
    const pulse = 0.7 + Math.sin(time * 0.02) * 0.3;
    ctx.textAlign = "center";
    ctx.font = "800 16px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = `rgba(244,63,94,${pulse})`;
    ctx.shadowColor = NEON_DANGER;
    ctx.shadowBlur = 14;
    ctx.fillText(`⚠ ${labels.offTrack}`, w / 2, h - 130 - bottomInset);
    ctx.restore();
  }

  ctx.restore(); // end shake
}
