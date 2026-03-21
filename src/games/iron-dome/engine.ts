import {
  GameState, GamePhase, GameMode, Threat, ThreatType, Interceptor,
  Explosion, Particle, City, FloatingText, StoreItem
} from './types';
import { CAMPAIGN_WAVES, getSurvivalWave, buildSpawnQueue, THREAT_CONFIGS } from './waves';
import { renderGame } from './renderer';

const GROUND_Y_RATIO = 0.85;
const INTERCEPTOR_SPEED = 6;
const EXPLOSION_EXPAND_RATE = 1.5;
const EXPLOSION_MAX_RADIUS = 25;
const MAGAZINE_SIZE = 20;
const RELOAD_TIME = 1500;
const FAST_RELOAD_TIME = 300;
const CLUSTER_SPLIT_TIME = 7000;

function createCities(w: number, h: number): City[] {
  const groundY = h * GROUND_Y_RATIO;
  const numCities = 4;
  const spacing = w / (numCities + 1);
  const cities: City[] = [];

  for (let i = 0; i < numCities; i++) {
    const cx = spacing * (i + 1) - 40;
    const cw = 80;
    const buildings: City['buildings'] = [];
    const numBuildings = 4 + Math.floor(Math.random() * 3);

    let bx = 0;
    for (let j = 0; j < numBuildings; j++) {
      const bw = 10 + Math.floor(Math.random() * 14);
      const bh = 20 + Math.floor(Math.random() * 40);
      const colors = ['#0a1520', '#101828', '#121f2e', '#0e1a28', '#0f1d2d'];
      const windows: City['buildings'][0]['windows'] = [];

      for (let wy = 4; wy < bh - 4; wy += 7) {
        for (let wx = 3; wx < bw - 4; wx += 6) {
          windows.push({ x: wx, y: wy, lit: Math.random() > 0.4 });
        }
      }

      buildings.push({
        x: bx,
        w: bw,
        h: bh,
        color: colors[Math.floor(Math.random() * colors.length)],
        windows,
      });
      bx += bw + 2;
    }

    cities.push({ x: cx, width: cw, alive: true, buildings });
  }

  return cities;
}

function createDefaultStoreItems(): StoreItem[] {
  return [
    { id: 'first-aid', name: 'First Aid', icon: '🩹', description: '+1 life', cost: 5, maxBuys: 2, bought: 0 },
    { id: 'air-support', name: 'Air Support', icon: '🚁', description: '+1 helicopter strike [A]', cost: 8, maxBuys: 5, bought: 0 },
    { id: 'fast-reload', name: 'Fast Reload', icon: '⚡', description: 'Missiles reload faster', cost: 10, maxBuys: 1, bought: 0 },
    { id: 'gps-jammer', name: 'GPS Jammer', icon: '📡', description: 'Diverts ~25% threats [G]', cost: 7, maxBuys: 3, bought: 0 },
    { id: 'iron-beam', name: 'Iron Beam', icon: '🔆', description: 'Laser auto-target [B]', cost: 15, maxBuys: 1, bought: 0 },
  ];
}

export function createInitialState(w: number, h: number): GameState {
  return {
    phase: 'menu',
    mode: 'campaign',
    wave: 1,
    score: 0,
    lives: 4,
    maxLives: 4,
    combo: 0,
    maxCombo: 0,
    comboMultiplier: 1,
    credits: 0,
    ammo: MAGAZINE_SIZE,
    maxAmmo: MAGAZINE_SIZE,
    reloading: false,
    reloadTimer: 0,
    fastReload: false,
    threats: [],
    interceptors: [],
    explosions: [],
    particles: [],
    floatingTexts: [],
    cities: createCities(w, h),
    storeItems: createDefaultStoreItems(),
    airSupportCharges: 0,
    gpsJammerCharges: 0,
    ironBeamActive: false,
    ironBeamCreditsPerShot: 5,
    spawnTimer: 0,
    spawnQueue: [],
    waveIntroTimer: 0,
    waveClearTimer: 0,
    totalIntercepted: 0,
    totalMissed: 0,
    totalFired: 0,
    nextId: 1,
  };
}

export function startWave(state: GameState, w: number, h: number): GameState {
  const config = state.mode === 'campaign'
    ? CAMPAIGN_WAVES[state.wave - 1]
    : getSurvivalWave(state.wave);

  return {
    ...state,
    phase: 'wave-intro',
    waveIntroTimer: 2000,
    spawnQueue: buildSpawnQueue(config),
    spawnTimer: 0,
    threats: [],
    interceptors: [],
    explosions: [],
    particles: [],
    floatingTexts: [],
  };
}

function spawnThreat(state: GameState, type: ThreatType, w: number, h: number): Threat {
  const config = state.mode === 'campaign'
    ? CAMPAIGN_WAVES[state.wave - 1]
    : getSurvivalWave(state.wave);

  const tc = THREAT_CONFIGS[type];
  const groundY = h * GROUND_Y_RATIO;
  const startX = 20 + Math.random() * (w - 40);
  const startY = -10;

  // Target a city
  const aliveCities = state.cities.filter(c => c.alive);
  const targetCity = aliveCities.length > 0
    ? aliveCities[Math.floor(Math.random() * aliveCities.length)]
    : state.cities[Math.floor(Math.random() * state.cities.length)];

  const targetX = targetCity.x + targetCity.width / 2 + (Math.random() - 0.5) * 30;
  const targetY = groundY;

  const dx = targetX - startX;
  const dy = targetY - startY;
  const angle = Math.atan2(dy, dx);
  const speed = tc.speed * config.speed * (0.5 + Math.random() * 0.3);

  const evasive = state.mode === 'survival' && state.wave > 3 && Math.random() < Math.min(0.4, state.wave * 0.03);

  return {
    id: state.nextId,
    type,
    x: startX,
    y: startY,
    startX,
    startY,
    targetX,
    targetY,
    speed,
    hp: tc.hp,
    maxHp: tc.hp,
    angle,
    trail: [],
    evasive,
    evasiveTimer: 0,
    clusterTimer: type === 'cluster' ? CLUSTER_SPLIT_TIME : 0,
    points: tc.points,
    locked: false,
  };
}

export function fireInterceptor(state: GameState, targetX: number, targetY: number, w: number, h: number): GameState {
  if (state.ammo <= 0 || state.reloading) return state;

  const groundY = h * GROUND_Y_RATIO;
  const launchX = w / 2;
  const launchY = groundY - 5;

  // Find nearest threat to click point and target it instead
  let finalTargetX = targetX;
  let finalTargetY = targetY;
  let lockedThreatId: number | undefined;

  if (state.threats.length > 0) {
    let nearestDist = Infinity;
    let nearestThreat: Threat | null = null;
    state.threats.forEach(t => {
      const dx = t.x - targetX;
      const dy = t.y - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist && dist < 200) { // Lock on if within 200px of click
        nearestDist = dist;
        nearestThreat = t;
      }
    });
    if (nearestThreat) {
      // Predict where the threat will be when interceptor arrives
      const thr = nearestThreat as Threat;
      const travelDist = Math.sqrt((thr.x - launchX) ** 2 + (thr.y - launchY) ** 2);
      const travelTime = travelDist / INTERCEPTOR_SPEED;
      finalTargetX = thr.x + Math.cos(thr.angle) * thr.speed * (travelTime * 0.6);
      finalTargetY = thr.y + Math.sin(thr.angle) * thr.speed * (travelTime * 0.6);
      lockedThreatId = thr.id;
    }
  }

  const dx = finalTargetX - launchX;
  const dy = finalTargetY - launchY;
  const angle = Math.atan2(dy, dx);

  const interceptor: Interceptor = {
    id: state.nextId,
    x: launchX,
    y: launchY,
    targetX: finalTargetX,
    targetY: finalTargetY,
    speed: INTERCEPTOR_SPEED,
    angle,
    trail: [],
    lockedThreatId,
  };

  const newAmmo = state.ammo - 1;
  const needReload = newAmmo <= 0;

  return {
    ...state,
    interceptors: [...state.interceptors, interceptor],
    ammo: newAmmo,
    reloading: needReload,
    reloadTimer: needReload ? (state.fastReload ? FAST_RELOAD_TIME : RELOAD_TIME) : 0,
    totalFired: state.totalFired + 1,
    nextId: state.nextId + 1,
  };
}

export function update(state: GameState, dt: number, w: number, h: number, time: number): GameState {
  if (state.phase === 'menu' || state.phase === 'game-over' || state.phase === 'victory' ||
      state.phase === 'paused' || state.phase === 'store' || state.phase === 'rules') {
    return state;
  }

  let s = { ...state };

  // Wave intro countdown
  if (s.phase === 'wave-intro') {
    s.waveIntroTimer -= dt;
    if (s.waveIntroTimer <= 0) {
      s.phase = 'playing';
    }
    return s;
  }

  // Wave clear delay
  if (s.phase === 'wave-clear') {
    s.waveClearTimer -= dt;
    if (s.waveClearTimer <= 0) {
      if (s.mode === 'campaign' && s.wave >= 10) {
        s.phase = 'victory';
      } else {
        s.phase = 'store';
      }
    }
    return s;
  }

  // Reload
  if (s.reloading) {
    s.reloadTimer -= dt;
    if (s.fastReload) {
      // Fast reload: one bullet at a time
      if (s.reloadTimer <= 0 && s.ammo < s.maxAmmo) {
        s.ammo += 1;
        s.reloadTimer = FAST_RELOAD_TIME;
        if (s.ammo >= s.maxAmmo) {
          s.reloading = false;
          s.reloadTimer = 0;
        }
      }
    } else {
      if (s.reloadTimer <= 0) {
        s.ammo = s.maxAmmo;
        s.reloading = false;
        s.reloadTimer = 0;
      }
    }
  }

  const groundY = h * GROUND_Y_RATIO;

  // Spawn threats
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0 && s.spawnQueue.length > 0) {
    const config = s.mode === 'campaign'
      ? CAMPAIGN_WAVES[s.wave - 1]
      : getSurvivalWave(s.wave);

    const type = s.spawnQueue[0];
    const threat = spawnThreat(s, type, w, h);
    s.threats = [...s.threats, threat];
    s.spawnQueue = s.spawnQueue.slice(1);
    s.spawnTimer = config.spawnInterval;
    s.nextId += 1;
  }

  // Update threats
  const newThreats: Threat[] = [];
  const submunitionsToSpawn: { x: number; y: number }[] = [];
  let livesLost = 0;
  let missed = 0;

  s.threats.forEach(t => {
    let threat = { ...t };

    // Evasive movement
    if (threat.evasive) {
      threat.evasiveTimer += dt;
      if (threat.evasiveTimer > 1000 + Math.random() * 2000) {
        threat.evasiveTimer = 0;
        const offset = (Math.random() - 0.5) * 0.3;
        threat.angle += offset;
      }
    }

    // Move
    threat.x += Math.cos(threat.angle) * threat.speed * (dt / 16);
    threat.y += Math.sin(threat.angle) * threat.speed * (dt / 16);

    // Trail
    threat.trail = [...threat.trail, { x: threat.x, y: threat.y }];
    if (threat.trail.length > 15) threat.trail = threat.trail.slice(-15);

    // Cluster split
    if (threat.type === 'cluster') {
      threat.clusterTimer -= dt;
      if (threat.clusterTimer <= 0) {
        for (let i = 0; i < 4; i++) {
          submunitionsToSpawn.push({ x: threat.x, y: threat.y });
        }
        return; // Remove cluster
      }
    }

    // Hit ground
    if (threat.y >= groundY) {
      // Check which city was hit
      const hitCity = s.cities.find(c =>
        c.alive && threat.x >= c.x && threat.x <= c.x + c.width
      );
      if (hitCity) {
        hitCity.alive = false;
      }
      livesLost++;
      missed++;

      // Ground explosion
      s.explosions = [...s.explosions, {
        x: threat.x, y: groundY, radius: 2, maxRadius: 35,
        alpha: 1, color: '#FF4400', isGround: true
      }];

      // Particles
      for (let i = 0; i < 15; i++) {
        s.particles = [...s.particles, {
          x: threat.x, y: groundY,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 5,
          life: 500 + Math.random() * 500,
          maxLife: 1000,
          color: ['#FF4400', '#FFAA00', '#FF6600'][Math.floor(Math.random() * 3)],
          size: 2 + Math.random() * 3,
        }];
      }

      // Reset combo
      s.combo = 0;
      s.comboMultiplier = 1;
      return; // Remove threat
    }

    // Off screen
    if (threat.x < -50 || threat.x > w + 50 || threat.y < -100) return;

    newThreats.push(threat);
  });

  s.threats = newThreats;
  s.lives = Math.max(0, s.lives - livesLost);
  s.totalMissed += missed;

  // Spawn submunitions
  submunitionsToSpawn.forEach(pos => {
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 4 + (Math.random() * Math.PI / 2);
      const sub: Threat = {
        id: s.nextId++,
        type: 'submunition',
        x: pos.x + (Math.random() - 0.5) * 10,
        y: pos.y,
        startX: pos.x,
        startY: pos.y,
        targetX: pos.x + (Math.random() - 0.5) * 100,
        targetY: groundY,
        speed: 1.5 + Math.random() * 0.5,
        hp: 1,
        maxHp: 1,
        angle,
        trail: [],
        evasive: false,
        evasiveTimer: 0,
        clusterTimer: 0,
        points: 75,
        locked: false,
      };
      // Fix angle to point toward target
      const dx = sub.targetX - sub.x;
      const dy = sub.targetY - sub.y;
      sub.angle = Math.atan2(dy, dx);
      s.threats.push(sub);
    }
  });

  // Update interceptors
  const newInterceptors: Interceptor[] = [];
  s.interceptors.forEach(int => {
    let i = { ...int };
    i.x += Math.cos(i.angle) * i.speed * (dt / 16);
    i.y += Math.sin(i.angle) * i.speed * (dt / 16);

    i.trail = [...i.trail, { x: i.x, y: i.y }];
    if (i.trail.length > 10) i.trail = i.trail.slice(-10);

    // Check if reached target
    const dx = i.targetX - i.x;
    const dy = i.targetY - i.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) {
      // Explode at target
      s.explosions = [...s.explosions, {
        x: i.x, y: i.y, radius: 2, maxRadius: EXPLOSION_MAX_RADIUS,
        alpha: 1, color: '#FFDD44', isGround: false
      }];
      return; // Remove interceptor
    }

    // Off screen
    if (i.y < -20 || i.y > h + 20 || i.x < -20 || i.x > w + 20) return;

    newInterceptors.push(i);
  });
  s.interceptors = newInterceptors;

  // Update explosions & check collisions with threats
  const newExplosions: Explosion[] = [];
  s.explosions.forEach(exp => {
    let e = { ...exp };
    e.radius += EXPLOSION_EXPAND_RATE * (dt / 16);
    e.alpha = Math.max(0, 1 - (e.radius / e.maxRadius));

    if (e.alpha <= 0) return; // Remove

    // Check collision with threats
    if (!e.isGround) {
      const threatsToRemove: number[] = [];
      s.threats.forEach(t => {
        const dx = t.x - e.x;
        const dy = t.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < e.radius + 8) {
          t.hp--;
          if (t.hp <= 0) {
            threatsToRemove.push(t.id);

            // Score
            const points = t.points * s.comboMultiplier;
            s.score += points;
            s.combo++;
            s.maxCombo = Math.max(s.maxCombo, s.combo);
            s.comboMultiplier = Math.min(5, Math.floor(s.combo / 5) + 1);
            s.totalIntercepted++;

            // Credits from combo milestones
            const comboCredits: Record<number, number> = { 5: 3, 10: 5, 15: 8, 20: 12, 30: 20 };
            if (comboCredits[s.combo]) {
              s.credits += comboCredits[s.combo];
              s.floatingTexts = [...s.floatingTexts, {
                x: t.x, y: t.y - 20, text: `+${comboCredits[s.combo]} 💰`,
                alpha: 1, vy: -1, color: '#44DD88', size: 14,
              }];
            }

            // Floating text
            s.floatingTexts = [...s.floatingTexts, {
              x: t.x, y: t.y, text: `+${points}`,
              alpha: 1, vy: -1.5, color: '#FFDD44', size: 12,
            }];

            // Particles
            for (let i = 0; i < 8; i++) {
              s.particles = [...s.particles, {
                x: t.x, y: t.y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 300 + Math.random() * 300,
                maxLife: 600,
                color: ['#FFDD44', '#FF6600', '#FFFFFF'][Math.floor(Math.random() * 3)],
                size: 1 + Math.random() * 2,
              }];
            }
          }
        }
      });

      s.threats = s.threats.filter(t => !threatsToRemove.includes(t.id));
    }

    newExplosions.push(e);
  });
  s.explosions = newExplosions;

  // Update particles
  s.particles = s.particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * (dt / 16),
      y: p.y + p.vy * (dt / 16),
      vy: p.vy + 0.1,
      life: p.life - dt,
    }))
    .filter(p => p.life > 0);

  // Update floating texts
  s.floatingTexts = s.floatingTexts
    .map(ft => ({
      ...ft,
      y: ft.y + ft.vy * (dt / 16),
      alpha: ft.alpha - 0.01 * (dt / 16),
    }))
    .filter(ft => ft.alpha > 0);

  // Iron Beam auto-targeting
  if (s.ironBeamActive && s.credits >= s.ironBeamCreditsPerShot && s.threats.length > 0) {
    // Target the lowest, non-locked, non-cluster, non-heavy threat
    const validTargets = s.threats.filter(t =>
      !t.locked && t.type !== 'cluster' && t.type !== 'heavy'
    );
    if (validTargets.length > 0) {
      const target = validTargets.sort((a, b) => b.y - a.y)[0];
      target.locked = true;

      // Instant kill
      s.threats = s.threats.filter(t => t.id !== target.id);
      s.credits -= s.ironBeamCreditsPerShot;
      s.score += target.points; // No combo for beam

      // Beam visual - use explosion
      s.explosions = [...s.explosions, {
        x: target.x, y: target.y, radius: 2, maxRadius: 15,
        alpha: 1, color: '#FFFF88', isGround: false
      }];

      s.floatingTexts = [...s.floatingTexts, {
        x: target.x, y: target.y, text: `+${target.points} ⚡`,
        alpha: 1, vy: -1.5, color: '#FFDDAA', size: 11,
      }];
    }
  }

  // Check game over
  if (s.lives <= 0) {
    s.phase = 'game-over';
    return s;
  }

  // Check wave complete
  if (s.phase === 'playing' && s.spawnQueue.length === 0 && s.threats.length === 0) {
    s.phase = 'wave-clear';
    s.waveClearTimer = 2000;
  }

  return s;
}

export function nextWave(state: GameState, w: number, h: number): GameState {
  const newState = {
    ...state,
    wave: state.wave + 1,
    cities: state.cities.map(c => ({ ...c, alive: true })),
  };
  // Regenerate cities
  newState.cities = createCities(w, h);
  return startWave(newState, w, h);
}

export function buyStoreItem(state: GameState, itemId: string): GameState {
  const item = state.storeItems.find(i => i.id === itemId);
  if (!item || item.bought >= item.maxBuys || state.credits < item.cost) return state;

  let s = { ...state };
  s.credits -= item.cost;
  s.storeItems = s.storeItems.map(i =>
    i.id === itemId ? { ...i, bought: i.bought + 1 } : i
  );

  switch (itemId) {
    case 'first-aid':
      s.lives = Math.min(s.maxLives + 2, s.lives + 1);
      break;
    case 'air-support':
      s.airSupportCharges += 1;
      break;
    case 'fast-reload':
      s.fastReload = true;
      break;
    case 'gps-jammer':
      s.gpsJammerCharges += 1;
      break;
    case 'iron-beam':
      // Iron beam is available but starts OFF
      break;
  }

  return s;
}

export function activateAirSupport(state: GameState): GameState {
  if (state.airSupportCharges <= 0) return state;

  let s = { ...state };
  s.airSupportCharges--;

  // Destroy 3 random threats
  const destroyCount = Math.min(3, s.threats.length);
  const shuffled = [...s.threats].sort(() => Math.random() - 0.5);
  const toDestroy = shuffled.slice(0, destroyCount);

  toDestroy.forEach(t => {
    s.explosions = [...s.explosions, {
      x: t.x, y: t.y, radius: 2, maxRadius: 30,
      alpha: 1, color: '#88CCFF', isGround: false,
    }];
    s.score += t.points;
    s.floatingTexts = [...s.floatingTexts, {
      x: t.x, y: t.y, text: `+${t.points} 🚁`,
      alpha: 1, vy: -1.5, color: '#88CCFF', size: 12,
    }];
  });

  s.threats = s.threats.filter(t => !toDestroy.some(d => d.id === t.id));
  return s;
}

export function activateGPSJammer(state: GameState, w: number): GameState {
  if (state.gpsJammerCharges <= 0) return state;

  let s = { ...state };
  s.gpsJammerCharges--;

  // Divert ~25% of threats off screen
  s.threats = s.threats.map(t => {
    if (Math.random() < 0.25) {
      return {
        ...t,
        targetX: Math.random() > 0.5 ? -50 : w + 50,
        angle: Math.atan2(0, Math.random() > 0.5 ? -1 : 1),
      };
    }
    return t;
  });

  return s;
}

export { renderGame };
