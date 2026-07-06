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

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  topInset = 0,
  bottomInset = 0,
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
    const radius = m.cell * 0.38 * scale;

    if (state.selectedId === g.id) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = info.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#0a0f1a";
    ctx.font = `bold ${Math.round(m.cell * 0.26)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${g.tier + 1}`, pos.x, pos.y);
    ctx.textBaseline = "alphabetic";
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
  ctx.fillText(`Total earned $${Math.floor(state.totalEarned)}`, w / 2, hudY + 18);

  ctx.textAlign = "right";
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = state.timeLeft <= 10 ? "#f87171" : "#e2e8f0";
  ctx.fillText(`${Math.max(0, state.timeLeft).toFixed(0)}s`, w - 16, topInset + 44);
}
