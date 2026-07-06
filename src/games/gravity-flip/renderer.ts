import { GameState } from "./types";
import { SPIKE_HEIGHT } from "./engine";

export const CEIL_Y_RATIO = 0.18;
export const FLOOR_Y_RATIO = 0.82;
export const PLAYER_SCREEN_X_RATIO = 0.26;

export function corridorY(h: number) {
  return { ceil: h * CEIL_Y_RATIO, floor: h * FLOOR_Y_RATIO };
}

function toScreenY(normY: number, ceil: number, floor: number) {
  return ceil + normY * (floor - ceil);
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, time: number) {
  const { ceil, floor } = corridorY(h);
  const corridorH = floor - ceil;
  const playerScreenX = w * PLAYER_SCREEN_X_RATIO;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0b0620");
  bg.addColorStop(0.5, "#150a35");
  bg.addColorStop(1, "#0b0620");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Starfield
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 60; i++) {
    const sx = (i * 137.5) % w;
    const sy = (i * 91.3) % h;
    const tw = 0.3 + 0.5 * Math.sin(time * 0.001 + i);
    ctx.globalAlpha = Math.max(0, tw);
    ctx.fillRect(sx, sy, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  // Antigrav tint
  if (state.inAntigrav) {
    ctx.fillStyle = "rgba(192,132,252,0.08)";
    ctx.fillRect(0, ceil, w, corridorH);
  }

  // Ceiling / floor surfaces
  const surfaceGrad = ctx.createLinearGradient(0, 0, 0, ceil);
  surfaceGrad.addColorStop(0, "#1e1440");
  surfaceGrad.addColorStop(1, "#2a1a5c");
  ctx.fillStyle = surfaceGrad;
  ctx.fillRect(0, 0, w, ceil);
  ctx.fillStyle = surfaceGrad;
  ctx.fillRect(0, floor, w, h - floor);

  ctx.strokeStyle = "rgba(168,85,247,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, ceil);
  ctx.lineTo(w, ceil);
  ctx.moveTo(0, floor);
  ctx.lineTo(w, floor);
  ctx.stroke();

  // Obstacles
  for (const o of state.obstacles) {
    const sx = playerScreenX + (o.worldX - state.distance);
    if (sx < -200 || sx > w + 200) continue;

    if (o.type === "spike_floor") {
      const spikeH = corridorH * SPIKE_HEIGHT;
      drawSpikeRow(ctx, sx, o.width, floor, -spikeH, "#f43f5e");
    } else if (o.type === "spike_ceiling") {
      const spikeH = corridorH * SPIKE_HEIGHT;
      drawSpikeRow(ctx, sx, o.width, ceil, spikeH, "#f43f5e");
    } else if (o.type === "wall_low") {
      const extent = (o.extent ?? 0.6) * corridorH;
      ctx.fillStyle = "rgba(56,189,248,0.85)";
      ctx.fillRect(sx, ceil, o.width, extent);
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, ceil, o.width, extent);
    } else if (o.type === "wall_high") {
      const extent = (o.extent ?? 0.6) * corridorH;
      ctx.fillStyle = "rgba(56,189,248,0.85)";
      ctx.fillRect(sx, floor - extent, o.width, extent);
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, floor - extent, o.width, extent);
    } else if (o.type === "antigrav_zone") {
      const pulse = 0.08 + 0.05 * Math.sin(time * 0.003);
      ctx.fillStyle = `rgba(192,132,252,${pulse})`;
      ctx.fillRect(sx, ceil, o.width, corridorH);
      ctx.strokeStyle = "rgba(192,132,252,0.4)";
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(sx, ceil, o.width, corridorH);
      ctx.setLineDash([]);
    }
  }

  // Shards
  for (const s of state.shards) {
    if (s.collected) continue;
    const sx = playerScreenX + (s.worldX - state.distance);
    if (sx < -50 || sx > w + 50) continue;
    const sy = toScreenY(s.worldY, ceil, floor);
    const pulse = 1 + 0.15 * Math.sin(time * 0.006);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(time * 0.002);
    ctx.scale(pulse, pulse);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
    grad.addColorStop(0, "#f5d0fe");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(-18, -18, 36, 36);
    ctx.fillStyle = "#c084fc";
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 9);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Particles
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Player
  const playerScreenY = toScreenY(state.y, ceil, floor);
  const playerColor = state.gravityDir === 1 ? "#22d3ee" : "#c084fc";
  const invuln = state.invulnTimer > 0 && Math.floor(time / 80) % 2 === 0;
  ctx.save();
  ctx.globalAlpha = invuln ? 0.35 : 1;
  ctx.translate(playerScreenX, playerScreenY);
  ctx.rotate(state.velocityY * 0.15);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
  glow.addColorStop(0, `${playerColor}55`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(-26, -26, 52, 52);
  ctx.fillStyle = playerColor;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(11, 0);
  ctx.lineTo(0, 14);
  ctx.lineTo(-11, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Flip flash
  if (state.flipFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.flipFlash * 0.15})`;
    ctx.fillRect(0, 0, w, h);
  }

  // HUD
  ctx.textAlign = "left";
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "#e9d5ff";
  ctx.fillText(`${state.score}`, 18, 36);
  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(233,213,255,0.6)";
  ctx.fillText(`BEST ${state.best}`, 18, 54);

  ctx.textAlign = "right";
  for (let i = 0; i < 3; i++) {
    const cx = w - 24 - i * 22;
    ctx.beginPath();
    ctx.arc(cx, 26, 7, 0, Math.PI * 2);
    ctx.fillStyle = i < state.rewindCharges ? "#c084fc" : "rgba(192,132,252,0.2)";
    ctx.fill();
    if (i < state.rewindCharges) {
      ctx.strokeStyle = "#f5d0fe";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.textAlign = "left";
}

function drawSpikeRow(ctx: CanvasRenderingContext2D, sx: number, width: number, baseY: number, dir: number, color: string) {
  const count = Math.max(1, Math.round(width / 26));
  const spikeW = width / count;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = sx + i * spikeW;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + spikeW / 2, baseY + dir);
    ctx.lineTo(x + spikeW, baseY);
    ctx.closePath();
    ctx.fill();
  }
}
