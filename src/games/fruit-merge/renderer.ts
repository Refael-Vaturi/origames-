import { GameState } from "./types";
import { DANGER_LINE_RATIO, TIERS } from "./config";

export const TOP_MARGIN = 112;

export function computeContainer(w: number, h: number, topInset = 0) {
  const top = TOP_MARGIN + topInset;
  return { width: w, height: h - top, top };
}

function drawFruit(ctx: CanvasRenderingContext2D, x: number, y: number, tier: number, scale = 1) {
  const info = TIERS[tier];
  const r = info.radius * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = info.color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const shine = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 0, -r * 0.35, -r * 0.35, r * 0.9);
  shine.addColorStop(0, "rgba(255,255,255,0.5)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  if (r > 16) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.05, Math.max(1.5, r * 0.07), 0, Math.PI * 2);
    ctx.arc(r * 0.28, -r * 0.05, Math.max(1.5, r * 0.07), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.22, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, topInset = 0) {
  const container = computeContainer(w, h, topInset);

  ctx.fillStyle = "#fff7ed";
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(0, container.top);

  // Danger line
  const dangerY = container.height * DANGER_LINE_RATIO;
  ctx.strokeStyle = state.dangerTimer > 0 ? "rgba(239,68,68,0.7)" : "rgba(251,146,60,0.35)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, dangerY);
  ctx.lineTo(container.width, dangerY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Container walls
  ctx.strokeStyle = "rgba(120,53,15,0.25)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, -20, container.width - 4, container.height + 20);

  for (const f of state.fruits) {
    const scale = f.justMerged > 0 ? 1 + (f.justMerged / 0.25) * 0.15 : 1;
    drawFruit(ctx, f.x, f.y, f.tier, scale);
  }

  ctx.textAlign = "center";
  for (const ft of state.floatingTexts) {
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.fillStyle = "#78350f";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Next-fruit preview + HUD (drawn in screen space, above the container).
  // Score/best sit top-center so they never collide with the Back button
  // (top-left) or the "next" queue preview (top-right).
  ctx.textAlign = "center";
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "#78350f";
  ctx.fillText(`${state.score}`, w / 2, topInset + 26);
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(120,53,15,0.6)";
  ctx.fillText(`BEST ${state.best}`, w / 2, topInset + 41);

  const previewY = topInset + 68;
  drawFruit(ctx, w / 2, previewY, state.currentTier);
  ctx.textAlign = "left";
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(120,53,15,0.55)";
  ctx.fillText("NEXT", w - 74, topInset + 30);
  drawFruit(ctx, w - 40, topInset + 50, state.queuedTier, 0.55);
}
