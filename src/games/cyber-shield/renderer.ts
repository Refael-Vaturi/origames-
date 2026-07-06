import { GameState, TowerType } from "./types";
import { GRID_COLS, GRID_ROWS, PATH_CELLS, isPathCell } from "./grid";
import { TOWER_STATS, ENEMY_STATS } from "./config";
import { getEnemyWorldPos } from "./engine";

export interface GridMetrics {
  cell: number;
  offsetX: number;
  offsetY: number;
}

// Reserve space at the top (HUD) and bottom (tower toolbar) so the grid
// fills the remaining area instead of being squeezed to a tiny box on
// tall portrait phone screens. topInset/bottomInset add the device's
// safe-area insets (notch/status bar, home indicator) on top of that.
export const TOP_MARGIN = 90;
export const BOTTOM_MARGIN = 130;

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
  return {
    row: Math.floor((y - m.offsetY) / m.cell),
    col: Math.floor((x - m.offsetX) / m.cell),
  };
}

function cellCenter(row: number, col: number, m: GridMetrics) {
  return { x: m.offsetX + (col + 0.5) * m.cell, y: m.offsetY + (row + 0.5) * m.cell };
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  hoverCell: { row: number; col: number } | null,
  selectedType: TowerType | null,
  topInset = 0,
  bottomInset = 0,
) {
  const m = computeGridMetrics(w, h, topInset, bottomInset);

  ctx.fillStyle = "#0a0f1a";
  ctx.fillRect(0, 0, w, h);

  // Grid cells
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const x = m.offsetX + c * m.cell;
      const y = m.offsetY + r * m.cell;
      const path = isPathCell(r, c);
      ctx.fillStyle = path ? "#1e293b" : (r + c) % 2 === 0 ? "#0f1729" : "#111c33";
      ctx.fillRect(x, y, m.cell, m.cell);
      ctx.strokeStyle = "rgba(148,163,184,0.08)";
      ctx.strokeRect(x, y, m.cell, m.cell);
    }
  }

  // Path direction line
  ctx.strokeStyle = "rgba(56,189,248,0.25)";
  ctx.lineWidth = Math.max(2, m.cell * 0.08);
  ctx.beginPath();
  PATH_CELLS.forEach((p, i) => {
    const c = cellCenter(p.row, p.col, m);
    if (i === 0) ctx.moveTo(c.x, c.y);
    else ctx.lineTo(c.x, c.y);
  });
  ctx.stroke();

  // Database (end of path)
  const dbCell = PATH_CELLS[PATH_CELLS.length - 1];
  const dbPos = cellCenter(dbCell.row, dbCell.col, m);
  ctx.fillStyle = "#a855f7";
  ctx.beginPath();
  ctx.arc(dbPos.x, dbPos.y, m.cell * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(m.cell * 0.35)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DB", dbPos.x, dbPos.y);
  ctx.textBaseline = "alphabetic";

  // Hover preview
  if (hoverCell && selectedType) {
    const valid = !isPathCell(hoverCell.row, hoverCell.col) && !state.towers.some((t) => t.row === hoverCell.row && t.col === hoverCell.col);
    const x = m.offsetX + hoverCell.col * m.cell;
    const y = m.offsetY + hoverCell.row * m.cell;
    ctx.fillStyle = valid ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
    ctx.fillRect(x, y, m.cell, m.cell);
    if (valid) {
      const stats = TOWER_STATS[selectedType];
      const center = cellCenter(hoverCell.row, hoverCell.col, m);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(center.x, center.y, stats.range(0) * m.cell, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Towers
  for (const tower of state.towers) {
    const stats = TOWER_STATS[tower.type];
    const pos = cellCenter(tower.row, tower.col, m);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, stats.range(tower.level) * m.cell, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = stats.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, m.cell * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#0a0f1a";
    ctx.font = `bold ${Math.round(m.cell * 0.28)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tower.type[0].toUpperCase(), pos.x, pos.y);
    ctx.textBaseline = "alphabetic";

    if (tower.level > 0) {
      ctx.fillStyle = "#facc15";
      ctx.font = `bold ${Math.round(m.cell * 0.18)}px sans-serif`;
      ctx.fillText(`+${tower.level}`, pos.x, pos.y + m.cell * 0.42);
    }
  }

  // Enemies
  for (const enemy of state.enemies) {
    const worldPos = getEnemyWorldPos(enemy);
    const stats = ENEMY_STATS[enemy.type];
    const x = m.offsetX + worldPos.x * m.cell;
    const y = m.offsetY + worldPos.y * m.cell;

    ctx.fillStyle = enemy.slowTimer > 0 ? "rgba(56,189,248,0.9)" : stats.color;
    ctx.beginPath();
    ctx.arc(x, y, m.cell * 0.24, 0, Math.PI * 2);
    ctx.fill();

    const barW = m.cell * 0.6;
    const barX = x - barW / 2;
    const barY = y - m.cell * 0.42;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(barX, barY, barW, 4);
    ctx.fillStyle = enemy.hp / enemy.maxHp > 0.3 ? "#22c55e" : "#ef4444";
    ctx.fillRect(barX, barY, barW * Math.max(0, enemy.hp / enemy.maxHp), 4);
  }

  // Projectiles
  for (const proj of state.projectiles) {
    const x = m.offsetX + proj.x * m.cell;
    const y = m.offsetY + proj.y * m.cell;
    ctx.fillStyle = TOWER_STATS[proj.fromType].color;
    ctx.beginPath();
    ctx.arc(x, y, m.cell * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floating texts
  ctx.textAlign = "center";
  for (const ft of state.floatingTexts) {
    const x = m.offsetX + ft.x * m.cell;
    const y = m.offsetY + ft.y * m.cell - (1 - ft.life / ft.maxLife) * 24;
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${Math.round(m.cell * 0.24)}px sans-serif`;
    ctx.fillText(ft.text, x, y);
    ctx.globalAlpha = 1;
  }

  // HUD
  const hudY = topInset + 22;
  ctx.textAlign = "left";
  ctx.font = "bold 15px monospace";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`💾 ${state.databaseHp}/${state.maxDatabaseHp}`, 12, hudY);

  ctx.textAlign = "right";
  ctx.fillStyle = "#facc15";
  ctx.fillText(`⚡ ${state.dataBits}`, w - 12, hudY);

  ctx.textAlign = "center";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(`Wave ${state.wave}`, w / 2, hudY);
}
