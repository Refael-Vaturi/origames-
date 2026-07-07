import { GameState } from "./types";
import { GRID_COLS, GRID_ROWS, TIERS } from "./config";

export interface GridMetrics {
  cell: number;
  offsetX: number;
  offsetY: number;
}

export const TOP_MARGIN = 92;
export const BOTTOM_MARGIN = 110;

export function computeGridMetrics(w: number, h: number, topInset = 0, bottomInset = 0): GridMetrics {
  const topMargin = TOP_MARGIN + topInset;
  const bottomMargin = BOTTOM_MARGIN + bottomInset;
  const availH = Math.max(120, h - topMargin - bottomMargin);
  const cell = Math.min(w / GRID_COLS, availH / GRID_ROWS);
  const offsetX = (w - cell * GRID_COLS) / 2;
  const offsetY = topMargin + (availH - cell * GRID_ROWS) / 2;
  return { cell, offsetX, offsetY };
}

export function screenToGrid(x: number, y: number, m: GridMetrics): { row: number; col: number } {
  return { row: Math.floor((y - m.offsetY) / m.cell), col: Math.floor((x - m.offsetX) / m.cell) };
}

function cellCenter(row: number, col: number, m: GridMetrics) {
  return { x: m.offsetX + (col + 0.5) * m.cell, y: m.offsetY + (row + 0.5) * m.cell };
}

// Draws a small stylized building instead of a plain numbered circle — taller,
// more ornate buildings for higher tiers so the merge progression reads at a
// glance instead of relying on a number.
function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tier: number, color: string) {
  const floors = Math.min(3, 1 + Math.floor(tier / 2));
  const bodyW = size * 0.72;
  const bodyH = size * (0.34 + floors * 0.13);
  const roofH = size * 0.24;
  const top = y + size * 0.42 - bodyH - roofH;

  ctx.save();
  ctx.translate(x, 0);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, y + size * 0.44, bodyW * 0.55, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.beginPath();
  ctx.roundRect(-bodyW / 2, top + roofH, bodyW, bodyH, size * 0.04);
  ctx.fill();
  ctx.stroke();

  // Roof
  ctx.beginPath();
  ctx.moveTo(-bodyW / 2 - size * 0.05, top + roofH);
  ctx.lineTo(0, top);
  ctx.lineTo(bodyW / 2 + size * 0.05, top + roofH);
  ctx.closePath();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill();
  ctx.stroke();

  // Windows (rows = floors)
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const winSize = bodyW * 0.16;
  for (let f = 0; f < floors; f++) {
    const wy = top + roofH + bodyH * ((f + 0.5) / floors);
    ctx.beginPath();
    ctx.rect(-bodyW * 0.28 - winSize / 2, wy - winSize / 2, winSize, winSize);
    ctx.rect(bodyW * 0.28 - winSize / 2, wy - winSize / 2, winSize, winSize);
    ctx.fill();
  }

  // Door
  const doorW = bodyW * 0.22;
  const doorH = bodyH * 0.36;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.roundRect(-doorW / 2, top + roofH + bodyH - doorH, doorW, doorH, size * 0.02);
  ctx.fill();

  // Flag for high tiers
  if (tier >= 5) {
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(0, top - size * 0.16);
    ctx.stroke();
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(0, top - size * 0.16);
    ctx.lineTo(size * 0.13, top - size * 0.11);
    ctx.lineTo(0, top - size * 0.06);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  topInset = 0,
  bottomInset = 0,
  totalEarnedLabel = "Total earned",
) {
  const m = computeGridMetrics(w, h, topInset, bottomInset);

  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, w, h);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const x = m.offsetX + c * m.cell;
      const y = m.offsetY + r * m.cell;
      ctx.fillStyle = (r + c) % 2 === 0 ? "#111c33" : "#0f1729";
      ctx.fillRect(x, y, m.cell, m.cell);
      ctx.strokeStyle = "rgba(148,163,184,0.08)";
      ctx.strokeRect(x, y, m.cell, m.cell);
    }
  }

  for (const g of state.generators) {
    const info = TIERS[g.tier];
    const pos = cellCenter(g.row, g.col, m);
    const scale = g.pulse > 0 ? 1 + (g.pulse / 0.4) * 0.18 : 1;
    const size = m.cell * 0.82 * scale;

    if (state.selectedId === g.id) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, m.cell * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawBuilding(ctx, pos.x, pos.y, size, g.tier, info.color);

    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(m.cell * 0.16)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`Lv${g.tier + 1}`, pos.x, pos.y + m.cell * 0.44);
  }

  ctx.textAlign = "center";
  for (const ft of state.floatingTexts) {
    const pos = cellCenter(ft.y, ft.x, m);
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.fillStyle = "#fde68a";
    ctx.font = `bold ${Math.round(m.cell * 0.16)}px sans-serif`;
    ctx.fillText(ft.text, pos.x, pos.y - m.cell * 0.5 - (1 - ft.life / ft.maxLife) * 20);
    ctx.globalAlpha = 1;
  }

  // HUD
  const hudY = topInset + 26;
  ctx.textAlign = "center";
  ctx.font = "bold 22px monospace";
  ctx.fillStyle = "#facc15";
  ctx.fillText(`$${Math.floor(state.currency)}`, w / 2, hudY);

  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(248,250,252,0.55)";
  ctx.fillText(`${totalEarnedLabel} $${Math.floor(state.totalEarned)}`, w / 2, hudY + 18);

  ctx.textAlign = "right";
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = state.timeLeft <= 10 ? "#f87171" : "#e2e8f0";
  ctx.fillText(`${Math.max(0, state.timeLeft).toFixed(0)}s`, w - 16, topInset + 44);
}
