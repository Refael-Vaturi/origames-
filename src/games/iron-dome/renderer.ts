import { GameState, Threat, City, Interceptor, Explosion, Particle, FloatingText } from './types';
import { t as ironT } from './i18n';

const COLORS = {
  sky1: '#0a0e1a',
  sky2: '#0d1b2a',
  sky3: '#1b2838',
  ground: '#1a2a1a',
  groundLine: '#2a4a2a',
  cityDark: '#0a1520',
  cityMid: '#121f2e',
  cityLight: '#1a3040',
  windowLit: '#FFDD44',
  windowOff: '#0a1520',
  missile: '#FF4444',
  missileTrail: '#FF6644',
  uav: '#44AAFF',
  uavTrail: '#4488FF',
  cluster: '#FF8800',
  clusterTrail: '#FFAA44',
  heavy: '#FF2222',
  heavyTrail: '#FF4444',
  submunition: '#FFAA00',
  interceptor: '#44FF88',
  interceptorTrail: '#22CC66',
  explosionInner: '#FFFFFF',
  explosionMid: '#FFDD44',
  explosionOuter: '#FF6600',
  groundExplosion: '#FF4400',
  heart: '#FF4466',
  heartEmpty: '#334455',
  combo: '#FFDD44',
  score: '#CCDDEE',
  ammo: '#44AADD',
  credits: '#44DD88',
};

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, time: number, lang: string = 'en') {
  // Screen shake
  if (state.screenShake > 0) {
    const intensity = state.screenShake;
    const sx = (Math.random() - 0.5) * intensity * 2;
    const sy = (Math.random() - 0.5) * intensity * 2;
    ctx.save();
    ctx.translate(sx, sy);
  }

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.75);
  skyGrad.addColorStop(0, COLORS.sky1);
  skyGrad.addColorStop(0.5, COLORS.sky2);
  skyGrad.addColorStop(1, COLORS.sky3);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  const starSeed = 42;
  for (let i = 0; i < 80; i++) {
    const sx = ((starSeed * (i + 1) * 7919) % w);
    const sy = ((starSeed * (i + 1) * 6271) % (h * 0.6));
    const ss = 0.5 + ((i * 3) % 3) * 0.5;
    const twinkle = 0.3 + 0.7 * Math.sin(time * 0.001 + i * 0.5);
    ctx.globalAlpha = twinkle * 0.6;
    ctx.fillRect(sx, sy, ss, ss);
  }
  ctx.globalAlpha = 1;

  // Ground
  const groundY = h * 0.85;
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
  groundGrad.addColorStop(0, '#1a3020');
  groundGrad.addColorStop(0.3, '#152a18');
  groundGrad.addColorStop(1, '#0a1a0a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, w, h - groundY);

  // Ground line
  ctx.strokeStyle = '#2a5a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();

  // Cities
  renderCities(ctx, state.cities, groundY, time);

  // Auto-defense dome shield visual
  if (state.autoDefenseTimer > 0) {
    const domeCenterX = w / 2;
    const domeRadius = w * 0.45;
    const pulse = 0.15 + Math.sin(time * 0.005) * 0.08;
    
    // Dome semicircle
    ctx.save();
    ctx.beginPath();
    ctx.arc(domeCenterX, groundY, domeRadius, Math.PI, 0);
    ctx.closePath();
    
    // Gradient fill
    const domeGrad = ctx.createRadialGradient(domeCenterX, groundY, 0, domeCenterX, groundY, domeRadius);
    domeGrad.addColorStop(0, 'transparent');
    domeGrad.addColorStop(0.7, `rgba(255,255,68,${pulse * 0.05})`);
    domeGrad.addColorStop(0.9, `rgba(255,255,68,${pulse * 0.15})`);
    domeGrad.addColorStop(1, `rgba(255,255,68,${pulse * 0.3})`);
    ctx.fillStyle = domeGrad;
    ctx.fill();
    
    // Dome border with hexagonal pattern effect
    ctx.strokeStyle = `rgba(255,255,68,${pulse * 0.8})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(domeCenterX, groundY, domeRadius, Math.PI, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Inner energy ring
    ctx.strokeStyle = `rgba(255,200,44,${pulse * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(domeCenterX, groundY, domeRadius * 0.7, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
  }

  // Iron Dome launcher
  renderLauncher(ctx, w, groundY, time, state);

  // Threats
  state.threats.forEach(t => renderThreat(ctx, t, time));

  // Interceptors
  state.interceptors.forEach(i => renderInterceptor(ctx, i));

  // Explosions
  state.explosions.forEach(e => renderExplosion(ctx, e));

  // Particles
  state.particles.forEach(p => renderParticle(ctx, p));

  // Helicopter visual (pink missile helicopter)
  if (state.helicopterTimer > 0) {
    renderHelicopter(ctx, state.helicopterX, 40, time);
  }

  // Airstrike helicopter (summoned by player) - no searchlight, just fires
  if (state.heliAirstrikeTimer > 0) {
    renderAirstrikeHelicopter(ctx, state.heliAirstrikeX, 60, time);
  }

  // Floating texts
  state.floatingTexts.forEach(ft => renderFloatingText(ctx, ft));

  // HUD
  renderHUD(ctx, state, w, h, time, lang);

  // End screen shake
  if (state.screenShake > 0) {
    ctx.restore();
  }
}

function renderHelicopter(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save();
  ctx.translate(x, y);

  // Body
  ctx.fillStyle = '#4a6a4a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cockpit
  ctx.fillStyle = '#88CCFF';
  ctx.beginPath();
  ctx.ellipse(12, -2, 6, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.fillStyle = '#3a5a3a';
  ctx.fillRect(-28, -3, 14, 5);
  ctx.fillRect(-32, -8, 6, 12);

  // Main rotor (spinning)
  const rotorAngle = time * 0.03;
  ctx.strokeStyle = 'rgba(200,200,200,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-22 * Math.cos(rotorAngle), -10);
  ctx.lineTo(22 * Math.cos(rotorAngle), -10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-22 * Math.sin(rotorAngle), -10);
  ctx.lineTo(22 * Math.sin(rotorAngle), -10);
  ctx.stroke();

  // Rotor hub
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.arc(0, -10, 2, 0, Math.PI * 2);
  ctx.fill();

  // Searchlight beam
  ctx.fillStyle = 'rgba(255,255,200,0.05)';
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(-40, 200);
  ctx.lineTo(40, 200);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Airstrike helicopter - no searchlight, just shoots
function renderAirstrikeHelicopter(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#5a7a5a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#99DDFF';
  ctx.beginPath();
  ctx.ellipse(10, -2, 5, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a6a4a';
  ctx.fillRect(-24, -2, 12, 4);
  ctx.fillRect(-28, -7, 5, 10);
  const rotorAngle = time * 0.04;
  ctx.strokeStyle = 'rgba(200,200,200,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-20 * Math.cos(rotorAngle), -9);
  ctx.lineTo(20 * Math.cos(rotorAngle), -9);
  ctx.stroke();
  if (Math.sin(time * 0.015) > 0.7) {
    ctx.fillStyle = 'rgba(255,200,50,0.8)';
    ctx.beginPath();
    ctx.arc(0, 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderCities(ctx: CanvasRenderingContext2D, cities: City[], groundY: number, time: number) {
  cities.forEach(city => {
    if (!city.alive) {
      // Destroyed city - rubble
      ctx.fillStyle = '#1a1a1a';
      city.buildings.forEach(b => {
        const rubbleH = b.h * 0.2;
        ctx.fillRect(city.x + b.x, groundY - rubbleH, b.w, rubbleH);
      });
      // Smoke
      ctx.fillStyle = 'rgba(80,80,80,0.3)';
      const smokeY = groundY - 20 - Math.sin(time * 0.002) * 5;
      ctx.beginPath();
      ctx.arc(city.x + city.width / 2, smokeY, 15, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    city.buildings.forEach(b => {
      const bx = city.x + b.x;
      const by = groundY - b.h;

      // Building body
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, by, b.w, b.h);

      // Building edge highlight
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(bx, by, 1, b.h);

      // Windows
      b.windows.forEach(win => {
        ctx.fillStyle = win.lit
          ? (Math.random() > 0.998 ? COLORS.windowOff : COLORS.windowLit)
          : COLORS.windowOff;
        ctx.globalAlpha = win.lit ? 0.7 + Math.sin(time * 0.003 + win.x) * 0.1 : 0.3;
        ctx.fillRect(bx + win.x, by + win.y, 3, 3);
      });
      ctx.globalAlpha = 1;
    });

    if (city.landmarkShape) {
      drawLandmark(ctx, city.landmarkShape, city.x + city.width / 2, groundY, time, city.landmarkGlow ?? '#FFDD88');
    }
  });
}

function drawLandmark(ctx: CanvasRenderingContext2D, shape: string, cx: number, baseY: number, time: number, glow: string) {
  ctx.save();
  const blink = Math.sin(time * 0.004) > 0.6;

  switch (shape) {
    case 'eiffel': {
      const h = 130, wBase = 46;
      ctx.fillStyle = '#2e2b27';
      ctx.beginPath();
      ctx.moveTo(cx - wBase / 2, baseY);
      ctx.lineTo(cx - wBase / 4, baseY - h * 0.45);
      ctx.lineTo(cx - 5, baseY - h * 0.85);
      ctx.lineTo(cx - 3, baseY - h);
      ctx.lineTo(cx + 3, baseY - h);
      ctx.lineTo(cx + 5, baseY - h * 0.85);
      ctx.lineTo(cx + wBase / 4, baseY - h * 0.45);
      ctx.lineTo(cx + wBase / 2, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,150,0.25)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const yy = baseY - (h * 0.28) * i;
        const ww = wBase / 2 * (1 - i * 0.28);
        ctx.beginPath();
        ctx.moveTo(cx - ww, yy);
        ctx.lineTo(cx + ww, yy);
        ctx.stroke();
      }
      if (blink) {
        ctx.fillStyle = '#FF4444';
        ctx.beginPath();
        ctx.arc(cx, baseY - h - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'bigben': {
      const h = 110, w = 30;
      ctx.fillStyle = '#8a7550';
      ctx.fillRect(cx - w / 2, baseY - h, w, h);
      ctx.fillStyle = '#6a5a3c';
      ctx.beginPath();
      ctx.moveTo(cx - w / 2 - 2, baseY - h);
      ctx.lineTo(cx, baseY - h - 22);
      ctx.lineTo(cx + w / 2 + 2, baseY - h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2e8cc';
      ctx.beginPath();
      ctx.arc(cx, baseY - h + 20, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 8, baseY - h + 20);
      ctx.lineTo(cx + 8, baseY - h + 20);
      ctx.moveTo(cx, baseY - h + 12);
      ctx.lineTo(cx, baseY - h + 28);
      ctx.stroke();
      break;
    }
    case 'pyramid': {
      ctx.fillStyle = '#8a6a3a';
      ctx.beginPath();
      ctx.moveTo(cx + 24, baseY);
      ctx.lineTo(cx + 6, baseY - 55);
      ctx.lineTo(cx - 14, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c2a05a';
      ctx.beginPath();
      ctx.moveTo(cx - 32, baseY);
      ctx.lineTo(cx - 8, baseY - 78);
      ctx.lineTo(cx + 16, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 8, baseY - 78);
      ctx.lineTo(cx - 8, baseY);
      ctx.stroke();
      break;
    }
    case 'colosseum': {
      const w = 90, h = 46;
      ctx.fillStyle = '#c9b48c';
      ctx.beginPath();
      ctx.ellipse(cx, baseY - h * 0.4, w / 2, h * 0.55, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - w / 2, baseY - h * 0.4, w, h * 0.4);
      ctx.fillStyle = 'rgba(60,45,25,0.5)';
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * 11, baseY - h * 0.62, 4.5, Math.PI, 0);
        ctx.fill();
      }
      break;
    }
    case 'kremlin': {
      const w = 100, h = 40;
      ctx.fillStyle = '#7a2a2a';
      ctx.fillRect(cx - w / 2, baseY - h, w, h);
      ctx.fillStyle = '#5a1e1e';
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(cx + i * 32 - 3, baseY - h - 4, 6, 4);
      }
      const domeXs = [-34, 0, 34];
      domeXs.forEach(dx => {
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(cx + dx, baseY - h - 14, 9, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + dx - 3, baseY - h - 20);
        ctx.lineTo(cx + dx, baseY - h - 32);
        ctx.lineTo(cx + dx + 3, baseY - h - 20);
        ctx.closePath();
        ctx.fill();
      });
      break;
    }
    case 'tokyoTower': {
      const h = 120, wBase = 40;
      ctx.fillStyle = '#CC4433';
      ctx.beginPath();
      ctx.moveTo(cx - wBase / 2, baseY);
      ctx.lineTo(cx - 4, baseY - h * 0.9);
      ctx.lineTo(cx - 2, baseY - h);
      ctx.lineTo(cx + 2, baseY - h);
      ctx.lineTo(cx + 4, baseY - h * 0.9);
      ctx.lineTo(cx + wBase / 2, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 1; i <= 2; i++) {
        const yy = baseY - (h * 0.3) * i;
        const ww = (wBase / 2) * (1 - i * 0.32);
        ctx.fillRect(cx - ww, yy - 3, ww * 2, 3);
      }
      break;
    }
    case 'capitol': {
      const w = 90, h = 34;
      ctx.fillStyle = '#d8d8ce';
      ctx.fillRect(cx - w / 2, baseY - h, w, h);
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(cx + i * 11 - 2, baseY - h, 3, h);
      }
      ctx.beginPath();
      ctx.arc(cx, baseY - h, 20, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 3, baseY - h - 20);
      ctx.lineTo(cx, baseY - h - 34);
      ctx.lineTo(cx + 3, baseY - h - 20);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'brandenburg': {
      const h = 44, w = 84;
      ctx.fillStyle = '#a49a80';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(cx - w / 2 + i * (w / 6) + 4, baseY - h, 6, h);
      }
      ctx.fillRect(cx - w / 2, baseY - h - 8, w, 8);
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(cx - 12, baseY - h - 18, 24, 10);
      break;
    }
    case 'operahouse': {
      ctx.fillStyle = '#e8e4d8';
      [[-30, 34, 0.55], [-8, 44, 0.62], [16, 38, 0.5]].forEach(([dx, hh, sc]) => {
        ctx.beginPath();
        ctx.moveTo(cx + (dx as number) - 16, baseY);
        ctx.quadraticCurveTo(cx + (dx as number), baseY - (hh as number), cx + (dx as number) + 18 * (sc as number), baseY - (hh as number) * 0.3);
        ctx.quadraticCurveTo(cx + (dx as number) + 6, baseY - (hh as number) * 0.15, cx + (dx as number) - 16, baseY);
        ctx.closePath();
        ctx.fill();
      });
      break;
    }
    case 'forbiddencity': {
      const w = 100, h = 26;
      ctx.fillStyle = '#8a2222';
      ctx.fillRect(cx - w / 2, baseY - h, w, h);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(cx - w / 2 - 10, baseY - h);
      ctx.quadraticCurveTo(cx - w / 2 + 10, baseY - h - 22, cx, baseY - h - 16);
      ctx.quadraticCurveTo(cx + w / 2 - 10, baseY - h - 22, cx + w / 2 + 10, baseY - h);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'acropolis': {
      const w = 90, h = 32;
      ctx.fillStyle = '#ddd4c0';
      ctx.fillRect(cx - w / 2, baseY - 8, w, 8);
      ctx.fillRect(cx - w / 2 + 4, baseY - 16, w - 8, 8);
      for (let i = 0; i < 7; i++) {
        ctx.fillRect(cx - w / 2 + 8 + i * ((w - 16) / 6) - 2, baseY - h - 16, 3.5, h);
      }
      ctx.fillRect(cx - w / 2 + 4, baseY - h - 16, w - 8, 5);
      ctx.beginPath();
      ctx.moveTo(cx - w / 2 + 4, baseY - h - 16);
      ctx.lineTo(cx, baseY - h - 32);
      ctx.lineTo(cx + w / 2 - 4, baseY - h - 16);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'redfort': {
      const w = 96, h = 36;
      ctx.fillStyle = '#a5453a';
      ctx.fillRect(cx - w / 2, baseY - h, w, h);
      ctx.fillStyle = '#8a3a30';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(cx - w / 2 + i * (w / 8), baseY - h - 5, w / 16, 5);
      }
      [-28, 28].forEach(dx => {
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(cx + dx, baseY - h - 10, 7, Math.PI, 0);
        ctx.fill();
      });
      break;
    }
    case 'christredeemer': {
      ctx.fillStyle = 'rgba(90,110,90,0.4)';
      ctx.beginPath();
      ctx.arc(cx, baseY + 10, 44, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#cfcfc0';
      ctx.fillRect(cx - 4, baseY - 60, 8, 60);
      ctx.fillRect(cx - 30, baseY - 55, 60, 6);
      ctx.beginPath();
      ctx.arc(cx, baseY - 66, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'burjkhalifa': {
      const h = 155;
      const segs = 5;
      ctx.fillStyle = '#bcd4e6';
      for (let i = 0; i < segs; i++) {
        const segH = h / segs;
        const yTop = baseY - h + i * segH;
        const ww = 24 * (1 - i * 0.16);
        ctx.fillRect(cx - ww / 2, yTop, ww, segH + 1);
      }
      ctx.strokeStyle = '#eaf6ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, baseY - h);
      ctx.lineTo(cx, baseY - h - 14);
      ctx.stroke();
      break;
    }
    case 'domeofrock': {
      const w = 70, h = 26;
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(cx - w / 2, baseY - h, w, h);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(cx, baseY - h - 2, 16, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 2, baseY - h - 18);
      ctx.lineTo(cx, baseY - h - 26);
      ctx.lineTo(cx + 2, baseY - h - 18);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  // Faint colored glow behind every landmark so it reads distinctly from generic buildings
  ctx.globalCompositeOperation = 'destination-over';
  const g = ctx.createRadialGradient(cx, baseY - 60, 5, cx, baseY - 60, 90);
  g.addColorStop(0, `${glow}22`);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(cx - 100, baseY - 200, 200, 200);
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();
}

function renderLauncher(ctx: CanvasRenderingContext2D, w: number, groundY: number, time: number, state: GameState) {
  const baseY = groundY;
  const pulse = 0.5 + Math.sin(time * 0.008) * 0.3;

  const drawSingleLauncher = (cx: number, label: string, glowColor: string) => {
    ctx.fillStyle = '#2a3a2a';
    ctx.fillRect(cx - 20, baseY - 6, 40, 6);
    ctx.fillStyle = '#3a4a3a';
    ctx.fillRect(cx - 18, baseY - 8, 36, 3);

    ctx.strokeStyle = '#4a6a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, baseY - 6, 16, Math.PI, 0);
    ctx.stroke();

    const domeGlow = ctx.createRadialGradient(cx, baseY - 10, 2, cx, baseY - 10, 14);
    domeGlow.addColorStop(0, glowColor);
    domeGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = domeGlow;
    ctx.beginPath();
    ctx.arc(cx, baseY - 10, 14, 0, Math.PI * 2);
    ctx.fill();

    for (let i = -1; i <= 1; i++) {
      const tubeX = cx + i * 8;
      ctx.fillStyle = '#4a5a4a';
      ctx.fillRect(tubeX - 2, baseY - 22, 4, 16);
      ctx.fillStyle = '#5a6a5a';
      ctx.fillRect(tubeX - 1.5, baseY - 22, 3, 2);
    }

    ctx.fillStyle = `rgba(68,255,136,${pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx, baseY - 14, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(68,255,136,${0.5 + pulse * 0.3})`;
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, baseY + 8);
  };

  // Always draw center launcher
  drawSingleLauncher(w / 2, 'IRON DOME', 'rgba(68,255,136,0.15)');

  // Draw side launchers when green power-up is active
  if (state.tripleInterceptorTimer > 0) {
    drawSingleLauncher(w * 0.15, 'DOME L', 'rgba(68,255,136,0.25)');
    drawSingleLauncher(w * 0.85, 'DOME R', 'rgba(68,255,136,0.25)');
  }
}

function renderThreat(ctx: CanvasRenderingContext2D, threat: Threat, time: number) {
  const { type, x, y, trail, hp, maxHp, evasive } = threat;

  // Trail
  const trailColor = type === 'uav' ? COLORS.uavTrail
    : type === 'cluster' ? COLORS.clusterTrail
    : type === 'heavy' ? COLORS.heavyTrail
    : type === 'submunition' ? COLORS.submunition
    : threat.missileColor === 'green' ? '#44FF66'
    : threat.missileColor === 'yellow' ? '#FFFF44'
    : threat.missileColor === 'blue' ? '#4488FF'
    : threat.missileColor === 'purple' ? '#CC66FF'
    : threat.missileColor === 'white' ? '#FFFFFF'
    : threat.missileColor === 'pink' ? '#FF88AA'
    : COLORS.missileTrail;

  trail.forEach((p, i) => {
    const alpha = (i / trail.length) * 0.6;
    ctx.fillStyle = trailColor;
    ctx.globalAlpha = alpha;
    const s = 1 + (i / trail.length) * 2;
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  });
  ctx.globalAlpha = 1;

  // Exhaust flame
  const flameLen = 6 + Math.sin(time * 0.02) * 2;
  const flameGrad = ctx.createRadialGradient(x, y, 1, x, y, flameLen);
  flameGrad.addColorStop(0, '#FFFFFF');
  flameGrad.addColorStop(0.3, type === 'uav' ? '#88CCFF' : '#FFAA44');
  flameGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.arc(x, y, flameLen, 0, Math.PI * 2);
  ctx.fill();

  // Threat body
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(threat.angle);

  if (type === 'missile' || type === 'submunition') {
    // Armored missiles (hp > 1) are bigger and look different
    const isArmored = type === 'missile' && maxHp > 1;
    const size = type === 'submunition' ? 7 : isArmored ? 10 + maxHp * 3 : 10;
    const missileColor = threat.missileColor;
    const bodyColor = missileColor === 'green' ? '#22CC44'
      : missileColor === 'yellow' ? '#DDCC00'
      : missileColor === 'blue' ? '#2266DD'
      : missileColor === 'purple' ? '#9944CC'
      : missileColor === 'white' ? '#CCCCCC'
      : missileColor === 'pink' ? '#DD5588'
      : type === 'submunition' ? '#FFAA00'
      : isArmored ? (maxHp >= 3 ? '#881111' : '#AA3333') : '#CC3333';
    
    // Main body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size * 0.5);
    ctx.lineTo(-size * 0.7, 0);
    ctx.lineTo(-size, size * 0.5);
    ctx.closePath();
    ctx.fill();
    
    // Armored missiles: extra detail - plating/stripes
    if (isArmored) {
      // Metal plating stripes
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      for (let s2 = -size * 0.3; s2 <= size * 0.5; s2 += size * 0.25) {
        ctx.beginPath();
        ctx.moveTo(s2, -size * 0.4);
        ctx.lineTo(s2, size * 0.4);
        ctx.stroke();
      }
      // Warhead tip (darker)
      ctx.fillStyle = maxHp >= 3 ? '#440000' : '#662222';
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(size * 0.5, -size * 0.35);
      ctx.lineTo(size * 0.5, size * 0.35);
      ctx.closePath();
      ctx.fill();
      // Fins (bigger missiles have fins)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(-size * 0.8, -size * 0.5);
      ctx.lineTo(-size * 1.1, -size * 0.85);
      ctx.lineTo(-size * 0.6, -size * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-size * 0.8, size * 0.5);
      ctx.lineTo(-size * 1.1, size * 0.85);
      ctx.lineTo(-size * 0.6, size * 0.45);
      ctx.closePath();
      ctx.fill();
    }
    
    // Nose highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(size * 0.5, -size * 0.2);
    ctx.lineTo(size * 0.5, size * 0.2);
    ctx.closePath();
    ctx.fill();
    
    // HP bar for armored missiles
    if (isArmored && hp < maxHp) {
      ctx.fillStyle = '#FFAA00';
      ctx.fillRect(-size * 0.7, -size * 0.8, size * 1.4 * (hp / maxHp), 3);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-size * 0.7, -size * 0.8, size * 1.4, 3);
    }
    // HP indicator for full-health armored (show pips)
    if (isArmored && hp === maxHp) {
      for (let i = 0; i < maxHp; i++) {
        ctx.fillStyle = '#FF4444';
        ctx.beginPath();
        ctx.arc(-size * 0.5 + i * 6, -size * 0.75, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Glow for special missiles
    if (missileColor && missileColor !== 'red') {
      const glowColor = missileColor === 'green' ? 'rgba(0,255,0,0.3)'
        : missileColor === 'blue' ? 'rgba(68,136,255,0.4)'
        : missileColor === 'purple' ? 'rgba(180,68,255,0.4)'
        : missileColor === 'white' ? 'rgba(255,255,255,0.5)'
        : missileColor === 'pink' ? 'rgba(255,100,170,0.4)'
        : 'rgba(255,255,0,0.3)';
      const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.5);
      mg.addColorStop(0, glowColor);
      mg.addColorStop(1, 'transparent');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(0, 0, size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'uav') {
    ctx.fillStyle = '#3388CC';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, -9);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 9);
    ctx.closePath();
    ctx.fill();
    // Wings
    ctx.fillStyle = '#2266AA';
    ctx.fillRect(-4, -12, 8, 3);
    ctx.fillRect(-4, 9, 8, 3);
    // Blinking light
    if (Math.sin(time * 0.005) > 0) {
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'cluster') {
    ctx.fillStyle = '#CC6600';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FF8800';
    ctx.fillRect(-4, -3, 6, 6);
    // Stripe
    ctx.fillStyle = '#FFAA44';
    ctx.fillRect(-2, -4, 2, 8);
  } else if (type === 'heavy') {
    ctx.fillStyle = '#AA2222';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
    // Warhead
    ctx.fillStyle = '#881111';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(8, -4);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();
    // HP indicator
    if (hp < maxHp) {
      ctx.fillStyle = '#FFAA00';
      ctx.fillRect(-7, -11, 14 * (hp / maxHp), 3);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-7, -11, 14, 3);
    }
  }

  ctx.restore();

  // Evasive marker
  if (evasive) {
    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼', x, y - 10);
  }
}

function renderInterceptor(ctx: CanvasRenderingContext2D, int: Interceptor) {
  // Trail
  int.trail.forEach((p, i) => {
    const alpha = (i / int.trail.length) * 0.5;
    ctx.fillStyle = COLORS.interceptorTrail;
    ctx.globalAlpha = alpha;
    ctx.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
  });
  ctx.globalAlpha = 1;

  // Body
  ctx.save();
  ctx.translate(int.x, int.y);
  ctx.rotate(int.angle);
  ctx.fillStyle = COLORS.interceptor;
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(-3, -2);
  ctx.lineTo(-3, 2);
  ctx.closePath();
  ctx.fill();

  // Glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
  glow.addColorStop(0, 'rgba(68,255,136,0.3)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderExplosion(ctx: CanvasRenderingContext2D, exp: Explosion) {
  // Flash effect at start of explosion
  if (exp.radius < exp.maxRadius * 0.15) {
    const flashAlpha = 1 - (exp.radius / (exp.maxRadius * 0.15));
    ctx.globalAlpha = flashAlpha * 0.6;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.maxRadius * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = exp.alpha;

  if (exp.isGround) {
    const grad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.2, '#FFAA44');
    grad.addColorStop(0.5, '#FF4400');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const grad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
    grad.addColorStop(0, COLORS.explosionInner);
    grad.addColorStop(0.3, COLORS.explosionMid);
    grad.addColorStop(0.7, COLORS.explosionOuter);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function renderParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.globalAlpha = p.life / p.maxLife;
  ctx.fillStyle = p.color;
  ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  ctx.globalAlpha = 1;
}

function renderFloatingText(ctx: CanvasRenderingContext2D, ft: FloatingText) {
  ctx.globalAlpha = ft.alpha;
  ctx.fillStyle = ft.color;
  ctx.font = `bold ${ft.size}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.globalAlpha = 1;
}

function renderHUD(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, time: number, lang: string = 'en') {
  // Lives (hearts)
  const heartSize = 16;
  for (let i = 0; i < state.maxLives; i++) {
    const hx = 15 + i * (heartSize + 6);
    const hy = 20;
    ctx.fillStyle = i < state.lives ? COLORS.heart : COLORS.heartEmpty;
    ctx.font = `${heartSize}px serif`;
    ctx.fillText('♥', hx, hy + heartSize * 0.3);
  }

  // Wave + Progress counter at top center (campaign only, survival uses React timer)
  if (state.mode === 'campaign') {
    ctx.fillStyle = COLORS.score;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${ironT('wave', lang)} ${state.wave}`, w / 2, 20);
    
    // Big progress counter
    const destroyed = state.waveDestroyedThreats;
    const total = state.waveTotalThreats;
    const remaining = total - destroyed;
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = remaining <= 5 ? '#44FF88' : '#FFDD44';
    ctx.fillText(`🎯 ${destroyed} / ${total}`, w / 2, 44);
    
    // Progress bar under it
    const progBarW = 140;
    const progBarH = 4;
    const progX = w / 2 - progBarW / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(progX, 50, progBarW, progBarH);
    const progFill = total > 0 ? destroyed / total : 0;
    ctx.fillStyle = remaining <= 5 ? '#44FF88' : '#FFDD44';
    ctx.fillRect(progX, 50, progBarW * progFill, progBarH);
  }
  // Survival mode: no wave counter here, timer is rendered in React overlay

  // Score
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.score;
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`${ironT('score', lang)}: ${state.score}`, w - 15, 24);

  // Combo
  if (state.combo > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.combo;
    ctx.font = 'bold 14px monospace';
    const pulse = 1 + Math.sin(time * 0.01) * 0.05;
    ctx.save();
    ctx.translate(w - 15, 44);
    ctx.scale(pulse, pulse);
    ctx.fillText(`x${state.comboMultiplier} (${state.combo})`, 0, 0);
    ctx.restore();
  }

  // Ammo bar
  const ammoBarW = 120;
  const ammoBarH = 6;
  const ammoX = 15;
  const ammoY = h - 25;

  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(ammoX, ammoY, ammoBarW, ammoBarH);

  if (state.reloading) {
    const reloadProgress = 1 - (state.reloadTimer / (state.fastReload ? 300 : 1500));
    ctx.fillStyle = '#886644';
    ctx.fillRect(ammoX, ammoY, ammoBarW * reloadProgress, ammoBarH);
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(ironT('reloading', lang), ammoX, ammoY - 4);
  } else {
    ctx.fillStyle = COLORS.ammo;
    ctx.fillRect(ammoX, ammoY, ammoBarW * (state.ammo / state.maxAmmo), ammoBarH);
    ctx.fillStyle = COLORS.ammo;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${ironT('ammo', lang)}: ${state.ammo}/${state.maxAmmo}`, ammoX, ammoY - 4);
  }

  // Credits
  ctx.fillStyle = COLORS.credits;
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`💰 ${state.credits}`, w - 15, h - 15);

  // Ability indicators
  let abilityX = 15;
  const abilityY = h - 50;
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';

  if (state.gpsJammerCharges > 0) {
    ctx.fillStyle = '#AAFFAA';
    ctx.fillText(`${ironT('gpsJammer', lang)} x${state.gpsJammerCharges}`, abilityX, abilityY);
    abilityX += 150;
  }
  if (state.ironBeamActive) {
    ctx.fillStyle = '#FFDDAA';
    ctx.fillText(ironT('ironBeamOn', lang), abilityX, abilityY);
  }

  // Special power timers are now rendered in React overlay (IronDomeGame.tsx)
}
