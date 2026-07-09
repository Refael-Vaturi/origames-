import { GameState, TowerType } from "./types";
import { GRID_COLS, GRID_ROWS, PATH_CELLS, isPathCell } from "./grid";
import { TOWER_STATS, ENEMY_STATS } from "./config";
import { getEnemyWorldPos } from "./engine";

export interface GridMetrics {
  cell: number;
  offsetX: number;
  offsetY: number;
}

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

const TOWER_ICONS: Record<TowerType, string> = { firewall: "🔥", antivirus: "🛡", decoy: "◇" };
const ENEMY_ICONS: Record<string, string> = { trojan: "T", virus: "V", ransomware: "R" };

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  hoverCell: { row: number; col: number } | null,
  selectedType: TowerType | null,
  topInset = 0,
  bottomInset = 0,
  waveLabel = "Wave",
) {
  const m = computeGridMetrics(w, h, topInset, bottomInset);
  const time = performance.now();

  // Deep-space background gradient
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
  bg.addColorStop(0, "#0f1a2e");
  bg.addColorStop(1, "#020617");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Scanline overlay
  ctx.fillStyle = "rgba(16,185,129,0.02)";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

  // Grid cells with hex-inspired texture
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const x = m.offsetX + c * m.cell;
      const y = m.offsetY + r * m.cell;
      const path = isPathCell(r, c);
      if (path) {
        // Path — glowing data-stream
        const g = ctx.createLinearGradient(x, y, x + m.cell, y + m.cell);
        g.addColorStop(0, "#0e2942");
        g.addColorStop(1, "#123255");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, m.cell, m.cell);
      } else {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#0b1526" : "#0e1a2e";
        ctx.fillRect(x, y, m.cell, m.cell);
      }
      ctx.strokeStyle = "rgba(16,185,129,0.08)";
      ctx.strokeRect(x, y, m.cell, m.cell);
    }
  }

  // Path glow line
  ctx.save();
  ctx.strokeStyle = "rgba(6,182,212,0.5)";
  ctx.lineWidth = Math.max(3, m.cell * 0.15);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "#06B6D4";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  PATH_CELLS.forEach((p, i) => {
    const c = cellCenter(p.row, p.col, m);
    if (i === 0) ctx.moveTo(c.x, c.y);
    else ctx.lineTo(c.x, c.y);
  });
  ctx.stroke();

  // Data-stream animated dashes on top
  ctx.strokeStyle = "rgba(240,253,244,0.7)";
  ctx.lineWidth = Math.max(1, m.cell * 0.06);
  ctx.setLineDash([m.cell * 0.4, m.cell * 0.6]);
  ctx.lineDashOffset = -(time * 0.04) % (m.cell * 2);
  ctx.shadowBlur = 0;
  ctx.beginPath();
  PATH_CELLS.forEach((p, i) => {
    const c = cellCenter(p.row, p.col, m);
    if (i === 0) ctx.moveTo(c.x, c.y);
    else ctx.lineTo(c.x, c.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Database (end of path) — shielded server
  const dbCell = PATH_CELLS[PATH_CELLS.length - 1];
  const dbPos = cellCenter(dbCell.row, dbCell.col, m);
  const dbR = m.cell * 0.42;
  const dbPulse = 1 + Math.sin(time * 0.003) * 0.06;
  ctx.save();
  // Shield ring around DB
  ctx.strokeStyle = `rgba(16,185,129,${0.4 + Math.sin(time * 0.005) * 0.2})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = "#10B981";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(dbPos.x, dbPos.y, dbR * 1.3 * dbPulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Server body
  const dbGrad = ctx.createLinearGradient(dbPos.x, dbPos.y - dbR, dbPos.x, dbPos.y + dbR);
  dbGrad.addColorStop(0, "#a855f7");
  dbGrad.addColorStop(1, "#6b21a8");
  ctx.fillStyle = dbGrad;
  ctx.beginPath();
  ctx.roundRect(dbPos.x - dbR, dbPos.y - dbR, dbR * 2, dbR * 2, dbR * 0.2);
  ctx.fill();
  // Server rack lines
  ctx.strokeStyle = "rgba(240,253,244,0.4)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(dbPos.x - dbR * 0.7, dbPos.y - dbR + (dbR * 2 * i) / 4);
    ctx.lineTo(dbPos.x + dbR * 0.7, dbPos.y - dbR + (dbR * 2 * i) / 4);
    ctx.stroke();
  }
  // Status light
  ctx.fillStyle = state.databaseHp / state.maxDatabaseHp > 0.3 ? "#10B981" : "#f43f5e";
  ctx.beginPath();
  ctx.arc(dbPos.x + dbR * 0.6, dbPos.y - dbR * 0.6, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hover preview
  if (hoverCell && selectedType) {
    const valid = !isPathCell(hoverCell.row, hoverCell.col) && !state.towers.some((t) => t.row === hoverCell.row && t.col === hoverCell.col);
    const x = m.offsetX + hoverCell.col * m.cell;
    const y = m.offsetY + hoverCell.row * m.cell;
    ctx.fillStyle = valid ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)";
    ctx.fillRect(x, y, m.cell, m.cell);
    if (valid) {
      const stats = TOWER_STATS[selectedType];
      const center = cellCenter(hoverCell.row, hoverCell.col, m);
      ctx.strokeStyle = "rgba(240,253,244,0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, stats.range(0) * m.cell, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Towers — real turret sprites
  for (const tower of state.towers) {
    const stats = TOWER_STATS[tower.type];
    const pos = cellCenter(tower.row, tower.col, m);
    const r = m.cell * 0.36;

    // Range field
    ctx.fillStyle = "rgba(16,185,129,0.04)";
    ctx.strokeStyle = "rgba(16,185,129,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, stats.range(tower.level) * m.cell, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Base plate (hex-ish)
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const baseR = r * 1.05;
    ctx.fillStyle = "#0f1e34";
    ctx.strokeStyle = stats.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const px = Math.cos(a) * baseR;
      const py = Math.sin(a) * baseR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Turret dome
    const domeGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 0.8);
    domeGrad.addColorStop(0, "#ffffff");
    domeGrad.addColorStop(0.3, stats.color);
    domeGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Barrel — points at nearest enemy
    let aimAngle = -Math.PI / 2;
    let closest = Infinity;
    for (const e of state.enemies) {
      const ep = getEnemyWorldPos(e);
      const ex = m.offsetX + ep.x * m.cell;
      const ey = m.offsetY + ep.y * m.cell;
      const d = (ex - pos.x) ** 2 + (ey - pos.y) ** 2;
      if (d < closest) {
        closest = d;
        aimAngle = Math.atan2(ey - pos.y, ex - pos.x);
      }
    }
    ctx.rotate(aimAngle);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, -r * 0.15, r * 1.05, r * 0.3);
    ctx.fillStyle = stats.color;
    ctx.fillRect(r * 0.85, -r * 0.08, r * 0.2, r * 0.16);
    ctx.restore();

    // Icon label
    ctx.fillStyle = "#F0FDF4";
    ctx.font = `800 ${Math.round(m.cell * 0.22)}px 'Space Grotesk', system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tower.type[0].toUpperCase(), pos.x, pos.y);
    ctx.textBaseline = "alphabetic";

    if (tower.level > 0) {
      ctx.fillStyle = "#facc15";
      ctx.font = `800 ${Math.round(m.cell * 0.18)}px 'Space Grotesk', system-ui`;
      ctx.fillText(`+${tower.level}`, pos.x, pos.y + m.cell * 0.42);
    }
  }

  // Enemies — data-packet sprites
  for (const enemy of state.enemies) {
    const worldPos = getEnemyWorldPos(enemy);
    const stats = ENEMY_STATS[enemy.type];
    const x = m.offsetX + worldPos.x * m.cell;
    const y = m.offsetY + worldPos.y * m.cell;
    const r = m.cell * 0.28;
    const slow = enemy.slowTimer > 0;
    const color = slow ? "#06B6D4" : stats.color;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 0.003 + enemy.id);

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    // Packet body — rotating diamond
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.8, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner core
    ctx.fillStyle = "rgba(15,23,42,0.7)";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Type letter
    ctx.rotate(-time * 0.003 - enemy.id);
    ctx.fillStyle = "#F0FDF4";
    ctx.font = `800 ${Math.round(r * 0.9)}px 'Space Grotesk', system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ENEMY_ICONS[enemy.type] ?? "?", 0, 1);
    ctx.textBaseline = "alphabetic";
    ctx.restore();

    // HP bar
    const barW = m.cell * 0.6;
    const barX = x - barW / 2;
    const barY = y - m.cell * 0.5;
    ctx.fillStyle = "rgba(2,6,23,0.7)";
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 5);
    ctx.fillStyle = enemy.hp / enemy.maxHp > 0.3 ? "#10B981" : "#f43f5e";
    ctx.fillRect(barX, barY, barW * Math.max(0, enemy.hp / enemy.maxHp), 3);
  }

  // Projectiles — glowing bolts with trails
  for (const proj of state.projectiles) {
    const x = m.offsetX + proj.x * m.cell;
    const y = m.offsetY + proj.y * m.cell;
    const color = TOWER_STATS[proj.fromType].color;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, m.cell * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#F0FDF4";
    ctx.beginPath();
    ctx.arc(x, y, m.cell * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floating texts
  ctx.textAlign = "center";
  for (const ft of state.floatingTexts) {
    const x = m.offsetX + ft.x * m.cell;
    const y = m.offsetY + ft.y * m.cell - (1 - ft.life / ft.maxLife) * 24;
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.fillStyle = ft.color;
    ctx.font = `700 ${Math.round(m.cell * 0.24)}px 'Space Grotesk', system-ui`;
    ctx.fillText(ft.text, x, y);
    ctx.globalAlpha = 1;
  }

  // HUD — tactical top bar
  const hudY = topInset + 22;
  // Integrity bar
  ctx.save();
  const barW = 100;
  const barH = 8;
  const bx = 12;
  const by = hudY - 4;
  ctx.fillStyle = "rgba(2,6,23,0.7)";
  ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
  const hpPct = state.databaseHp / state.maxDatabaseHp;
  const hpColor = hpPct > 0.5 ? "#10B981" : hpPct > 0.25 ? "#facc15" : "#f43f5e";
  ctx.fillStyle = hpColor;
  ctx.shadowColor = hpColor;
  ctx.shadowBlur = 8;
  ctx.fillRect(bx, by, barW * hpPct, barH);
  ctx.shadowBlur = 0;
  ctx.font = "600 9px 'Space Grotesk', system-ui";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(240,253,244,0.7)";
  ctx.fillText(`INTEGRITY ${state.databaseHp}/${state.maxDatabaseHp}`, bx, by + barH + 12);
  ctx.restore();

  ctx.textAlign = "right";
  ctx.font = "700 16px 'Space Grotesk', system-ui";
  ctx.fillStyle = "#facc15";
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 6;
  ctx.fillText(`⚡ ${state.dataBits}`, w - 12, hudY);
  ctx.shadowBlur = 0;

  ctx.textAlign = "center";
  ctx.font = "800 18px 'Space Grotesk', system-ui";
  ctx.fillStyle = "#F0FDF4";
  ctx.fillText(`${waveLabel.toUpperCase()} ${state.wave}`, w / 2, hudY + 2);
}
