import {
  GameState, GamePhase, GameMode, Threat, ThreatType, MissileColor, Interceptor,
  Explosion, Particle, City, FloatingText, StoreItem
} from './types';
import { CAMPAIGN_WAVES, getCampaignWave, getSurvivalWave, buildSpawnQueue, THREAT_CONFIGS } from './waves';
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
    { id: 'first-aid', name: 'First Aid', icon: '🩹', description: '+1 חיים', cost: 3, maxBuys: 3, bought: 0 },
    { id: 'extra-ammo', name: 'Extra Ammo', icon: '🎯', description: '+5 תחמושת מקסימלית', cost: 4, maxBuys: 3, bought: 0 },
    { id: 'fast-reload', name: 'Fast Reload', icon: '⚡', description: 'טעינה מהירה לצמיתות', cost: 8, maxBuys: 1, bought: 0 },
    { id: 'shield-charge', name: 'Shield', icon: '🟣', description: 'מגן 10 שניות בתחילת הגל', cost: 6, maxBuys: 2, bought: 0 },
    { id: 'auto-fire-charge', name: 'Auto Fire', icon: '🔵', description: 'ירי אוטומטי 5 שניות בתחילת הגל', cost: 7, maxBuys: 2, bought: 0 },
    { id: 'triple-dome', name: 'Triple Dome', icon: '🟢', description: '3 כיפות ברזל 15 שניות בתחילת הגל', cost: 10, maxBuys: 2, bought: 0 },
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
    tripleInterceptorTimer: 0,
    autoDefenseTimer: 0,
    shieldTimer: 0,
    empTimer: 0,
    helicopterTimer: 0,
    helicopterX: 0,
    autoFireTimer: 0,
    soundEvents: [],
    screenShake: 0,
    waveExtraShots: 0,
    waveTripleDome: false,
    waveFastReload: false,
    waveAutoDefenseStart: 0,
    wavePerksDisplay: [],
    waveTotalThreats: 0,
    waveDestroyedThreats: 0,
    survivalTimer: 0,
    survivalDifficultyTimer: 0,
    coloredMissileHits: 0,
    heliAirstrikeReady: false,
    heliAirstrikeTimer: 0,
    heliAirstrikeX: 0,
  };
}

export function startWave(state: GameState, w: number, h: number, skillFactor: number = 1.0): GameState {
  let config = state.mode === 'campaign'
    ? getCampaignWave(state.wave)
    : getSurvivalWave(state.wave);

  // Adaptive difficulty: scale based on player skill
  if (skillFactor !== 1.0) {
    config = {
      ...config,
      missiles: Math.round(config.missiles * skillFactor),
      uavs: Math.round(config.uavs * skillFactor),
      clusters: Math.round(config.clusters * skillFactor),
      heavies: Math.round(config.heavies * skillFactor),
      speed: config.speed * (0.7 + skillFactor * 0.3),
      spawnInterval: Math.round(config.spawnInterval / (0.7 + skillFactor * 0.3)),
    };
  }

  // Calculate wave-based passive perks
  const wave = state.wave;
  const perks: string[] = [];
  let extraShots = 0;
  let tripleDome = false;
  let waveFastReload = false;
  let autoDefenseStart = 0;

  if (wave >= 3) {
    extraShots = 1;
    perks.push('🔫 יריות כפולות');
  }
  if (wave >= 4) {
    waveFastReload = true;
    perks.push('⚡ טעינה מהירה');
  }
  if (wave >= 5) {
    tripleDome = true;
    perks.push('🛡️ 3 כיפות ברזל');
  }
  if (wave >= 7) {
    extraShots = 2;
    perks[0] = '🔫 יריות משולשות';
  }
  if (wave >= 8) {
    autoDefenseStart = 3000;
    perks.push('🟡 מגן אוטומטי 3 שניות');
  }
  if (wave >= 9) {
    autoDefenseStart = 5000;
    perks[perks.length - 1] = '🟡 מגן אוטומטי 5 שניות';
  }

  const spawnQueue = buildSpawnQueue(config);

  // Calculate store-bought bonuses for wave start
  const shieldCharges = state.storeItems.find(i => i.id === 'shield-charge')?.bought || 0;
  const autoFireCharges = state.storeItems.find(i => i.id === 'auto-fire-charge')?.bought || 0;
  const tripleDomeCharges = state.storeItems.find(i => i.id === 'triple-dome')?.bought || 0;

  const storeShieldTime = shieldCharges * 5000;
  const storeAutoFireTime = autoFireCharges * 5000;
  const storeTripleDomeTime = tripleDomeCharges * 15000;

  return {
    ...state,
    phase: 'wave-intro',
    waveIntroTimer: 2000,
    spawnQueue,
    spawnTimer: 0,
    threats: [],
    interceptors: [],
    explosions: [],
    particles: [],
    floatingTexts: [],
    waveExtraShots: extraShots,
    waveTripleDome: tripleDome,
    waveFastReload: waveFastReload,
    waveAutoDefenseStart: autoDefenseStart,
    wavePerksDisplay: perks,
    waveTotalThreats: spawnQueue.length,
    waveDestroyedThreats: 0,
    tripleInterceptorTimer: tripleDome ? 999999 : storeTripleDomeTime,
    autoDefenseTimer: Math.max(autoDefenseStart, storeShieldTime > 0 ? storeShieldTime : 0),
    shieldTimer: storeShieldTime,
    autoFireTimer: storeAutoFireTime,
    fastReload: waveFastReload || state.fastReload,
  };
}

// Start survival mode - no waves, just continuous spawning with timer
export function startSurvival(state: GameState, w: number, h: number): GameState {
  const config = getSurvivalWave(1);
  const spawnQueue = buildSpawnQueue(config);
  return {
    ...state,
    phase: 'playing',
    mode: 'survival',
    wave: 1,
    spawnQueue,
    spawnTimer: 0,
    threats: [],
    interceptors: [],
    explosions: [],
    particles: [],
    floatingTexts: [],
    survivalTimer: 0,
    survivalDifficultyTimer: 0,
    waveExtraShots: 0,
    waveTripleDome: false,
    waveFastReload: false,
    waveAutoDefenseStart: 0,
    wavePerksDisplay: [],
    waveTotalThreats: spawnQueue.length,
    waveDestroyedThreats: 0,
    tripleInterceptorTimer: 0,
    autoDefenseTimer: 0,
    shieldTimer: 0,
    autoFireTimer: 0,
  };
}

function spawnThreat(state: GameState, type: ThreatType, w: number, h: number): Threat {
  const config = state.mode === 'campaign'
    ? getCampaignWave(state.wave)
    : getSurvivalWave(state.wave);

  const tc = THREAT_CONFIGS[type];
  const groundY = h * GROUND_Y_RATIO;
  const startX = 20 + Math.random() * (w - 40);
  const startY = -10;

  const aliveCities = state.cities.filter(c => c.alive);
  const targetCity = aliveCities.length > 0
    ? aliveCities[Math.floor(Math.random() * aliveCities.length)]
    : state.cities[Math.floor(Math.random() * state.cities.length)];

  const targetX = targetCity.x + targetCity.width / 2 + (Math.random() - 0.5) * 30;
  const targetY = groundY;

  const dx = targetX - startX;
  const dy = targetY - startY;
  const angle = Math.atan2(dy, dx);
  // Faster missiles as waves progress + faster base in survival
  const speedBonus = state.mode === 'survival' ? 0.1 * state.wave : 0.05 * state.wave;
  const speed = tc.speed * config.speed * (0.5 + Math.random() * 0.3) + speedBonus;

  const evasive = state.mode === 'survival' && state.wave > 3 && Math.random() < Math.min(0.4, state.wave * 0.03);

  // Determine missile color for missile type
  // Don't spawn colored missiles for perks that are already permanently active
  let missileColor: MissileColor | undefined;
  if (type === 'missile') {
    const roll = Math.random() * 100;
    // Filter out colors for already-active perks
    const hasTripleDome = state.waveTripleDome; // permanent from wave 5+
    
    if (roll < 2) {
      missileColor = 'white';   // EMP
    } else if (roll < 5) {
      missileColor = 'yellow';  // Auto dome
    } else if (roll < 9) {
      missileColor = 'purple';  // Shield
    } else if (roll < 13 && state.wave >= 10) {
      missileColor = 'pink';    // Helicopter - only from wave 10+
    } else if (roll < 20) {
      missileColor = 'blue';    // Auto-fire 5s
    } else if (roll < 30 && !hasTripleDome) {
      missileColor = 'green';   // Triple interceptors - skip if already permanent
    } else {
      missileColor = 'red';
    }
  }

  // Advanced waves: missiles get more HP and are bigger
  let hp = tc.hp;
  const wave = state.wave;
  if (type === 'missile' && (!missileColor || missileColor === 'red')) {
    if (wave >= 7) {
      if (Math.random() < 0.4) hp = 2;
    }
    if (wave >= 9) {
      if (Math.random() < 0.2) hp = 3;
    }
  }
  if (type === 'heavy') {
    hp = Math.min(tc.hp + Math.floor((wave - 1) / 3), 5);
  }

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
    hp,
    maxHp: hp,
    angle,
    trail: [],
    evasive,
    evasiveTimer: 0,
    clusterTimer: type === 'cluster' ? CLUSTER_SPLIT_TIME : 0,
    points: missileColor === 'yellow' ? 1000 : missileColor === 'white' ? 1500 : missileColor === 'purple' ? 800 : missileColor === 'blue' ? 750 : missileColor === 'green' ? 500 : missileColor === 'pink' ? 600 : hp > 1 ? tc.points * hp : tc.points,
    locked: false,
    missileColor,
  };
}

export function fireInterceptor(state: GameState, targetX: number, targetY: number, w: number, h: number): GameState {
  if (state.ammo <= 0 || state.reloading) return state;

  const groundY = h * GROUND_Y_RATIO;
  const launchX = w / 2;
  const launchY = groundY - 5;

  let finalTargetX = targetX;
  let finalTargetY = targetY;
  let targetThreatId: number | undefined;

  if (state.threats.length > 0) {
    let nearestDist = Infinity;
    let nearestThreat: Threat | null = null;
    state.threats.forEach(t => {
      const dx = t.x - targetX;
      const dy = t.y - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist && dist < 200) {
        nearestDist = dist;
        nearestThreat = t;
      }
    });
    if (nearestThreat) {
      const thr = nearestThreat as Threat;
      const travelDist = Math.sqrt((thr.x - launchX) ** 2 + (thr.y - launchY) ** 2);
      const travelTime = travelDist / INTERCEPTOR_SPEED;
      finalTargetX = thr.x + Math.cos(thr.angle) * thr.speed * (travelTime * 0.6);
      finalTargetY = thr.y + Math.sin(thr.angle) * thr.speed * (travelTime * 0.6);
      targetThreatId = thr.id;
    }
  }

  const dxA = finalTargetX - launchX;
  const dyA = finalTargetY - launchY;
  const angle = Math.atan2(dyA, dxA);

  const interceptor: Interceptor = {
    id: state.nextId,
    x: launchX,
    y: launchY,
    targetX: finalTargetX,
    targetY: finalTargetY,
    speed: INTERCEPTOR_SPEED,
    angle,
    trail: [],
    targetThreatId,
  };

  const newAmmo = state.ammo - 1;
  const needReload = newAmmo <= 0;

  const interceptors = [interceptor];

  // Wave perk: extra shots
  if (state.waveExtraShots >= 1) {
    const spreadAngle = 0.15;
    const extraAngle1 = angle + spreadAngle;
    interceptors.push({
      id: state.nextId + 1,
      x: launchX,
      y: launchY,
      targetX: launchX + Math.cos(extraAngle1) * 400,
      targetY: launchY + Math.sin(extraAngle1) * 400,
      speed: INTERCEPTOR_SPEED,
      angle: extraAngle1,
      trail: [],
      targetThreatId,
    });
  }
  if (state.waveExtraShots >= 2) {
    const spreadAngle = -0.15;
    const extraAngle2 = angle + spreadAngle;
    interceptors.push({
      id: state.nextId + 2,
      x: launchX,
      y: launchY,
      targetX: launchX + Math.cos(extraAngle2) * 400,
      targetY: launchY + Math.sin(extraAngle2) * 400,
      speed: INTERCEPTOR_SPEED,
      angle: extraAngle2,
      trail: [],
      targetThreatId,
    });
  }

  // Triple dome mode
  if (state.tripleInterceptorTimer > 0) {
    const leftX = w * 0.15;
    const rightX = w * 0.85;
    [leftX, rightX].forEach((lx, idx) => {
      const dx2 = finalTargetX - lx;
      const dy2 = finalTargetY - launchY;
      const sideAngle = Math.atan2(dy2, dx2);
      interceptors.push({
        id: state.nextId + 3 + idx,
        x: lx,
        y: launchY,
        targetX: finalTargetX,
        targetY: finalTargetY,
        speed: INTERCEPTOR_SPEED,
        angle: sideAngle,
        trail: [],
        targetThreatId,
      });
    });
  }

  // Faster reload as waves progress
  const waveReloadBonus = Math.min(state.wave * 30, 600); // up to 600ms faster
  const baseReloadTime = state.fastReload ? FAST_RELOAD_TIME : Math.max(400, RELOAD_TIME - waveReloadBonus);

  return {
    ...state,
    interceptors: [...state.interceptors, ...interceptors],
    ammo: newAmmo,
    reloading: needReload,
    reloadTimer: needReload ? baseReloadTime : 0,
    totalFired: state.totalFired + 1,
    nextId: state.nextId + interceptors.length,
  };
}

export function update(state: GameState, dt: number, w: number, h: number, time: number): GameState {
  if (state.phase === 'menu' || state.phase === 'game-over' || state.phase === 'victory' ||
      state.phase === 'paused' || state.phase === 'store' || state.phase === 'rules') {
    return state;
  }

  let s = { ...state, soundEvents: [] as string[] };

  // Wave intro countdown (campaign only)
  if (s.phase === 'wave-intro') {
    s.waveIntroTimer -= dt;
    if (s.waveIntroTimer <= 0) {
      s.phase = 'playing';
    }
    return s;
  }

  // Wave clear delay (campaign only)
  if (s.phase === 'wave-clear') {
    s.waveClearTimer -= dt;
    if (s.waveClearTimer <= 0) {
      // Campaign is now infinite - always go to store
      s.phase = 'store';
    }
    return s;
  }

  // Survival mode: count timer and increase difficulty every 10 seconds
  if (s.mode === 'survival' && s.phase === 'playing') {
    s.survivalTimer += dt;
    s.survivalDifficultyTimer += dt;
    if (s.survivalDifficultyTimer >= 10000) {
      s.survivalDifficultyTimer -= 10000;
      s.wave += 1; // Increase difficulty level
      // Refill spawn queue with harder config
      const newConfig = getSurvivalWave(s.wave);
      const newQueue = buildSpawnQueue(newConfig);
      s.spawnQueue = [...s.spawnQueue, ...newQueue];
      s.waveTotalThreats += newQueue.length;
    }
  }

  // Reload - faster as waves progress
  if (s.reloading) {
    s.reloadTimer -= dt;
    if (s.fastReload) {
      const fastReloadSpeed = Math.max(100, FAST_RELOAD_TIME - s.wave * 10);
      if (s.reloadTimer <= 0 && s.ammo < s.maxAmmo) {
        s.ammo += 1;
        s.reloadTimer = fastReloadSpeed;
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
      ? getCampaignWave(s.wave)
      : getSurvivalWave(s.wave);

    const type = s.spawnQueue[0];
    const threat = spawnThreat(s, type, w, h);
    s.threats = [...s.threats, threat];
    s.spawnQueue = s.spawnQueue.slice(1);
    s.spawnTimer = config.spawnInterval;
    s.nextId += 1;
  }

  // In survival, keep spawning if queue is empty
  if (s.mode === 'survival' && s.spawnQueue.length === 0) {
    const newConfig = getSurvivalWave(s.wave);
    s.spawnQueue = buildSpawnQueue(newConfig);
    s.waveTotalThreats += s.spawnQueue.length;
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

    // Move - EMP slows threats
    const speedMult = s.empTimer > 0 ? 0.3 : 1;
    threat.x += Math.cos(threat.angle) * threat.speed * speedMult * (dt / 16);
    threat.y += Math.sin(threat.angle) * threat.speed * speedMult * (dt / 16);

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
        return;
      }
    }

    // Hit ground
    if (threat.y >= groundY) {
      const hitCity = s.cities.find(c =>
        c.alive && threat.x >= c.x && threat.x <= c.x + c.width
      );
      if (hitCity) {
        hitCity.alive = false;
      }
      if (s.shieldTimer > 0) {
        s.soundEvents.push('shield-block');
        s.floatingTexts = [...s.floatingTexts, {
          x: threat.x, y: groundY - 20, text: '🛡️ BLOCKED!',
          alpha: 1, vy: -1.5, color: '#CC88FF', size: 14,
        }];
      } else {
        livesLost++;
        s.screenShake = 15;
      }
      missed++;

      s.explosions = [...s.explosions, {
        x: threat.x, y: groundY, radius: 2, maxRadius: 35,
        alpha: 1, color: '#FF4400', isGround: true
      }];

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

      s.combo = 0;
      s.comboMultiplier = 1;
      return;
    }

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
      const dx = sub.targetX - sub.x;
      const dy = sub.targetY - sub.y;
      sub.angle = Math.atan2(dy, dx);
      s.threats.push(sub);
    }
  });

  // Update interceptors (homing toward locked threats)
  const newInterceptors: Interceptor[] = [];
  s.interceptors.forEach(int => {
    let i = { ...int };

    if (i.targetThreatId != null) {
      const target = s.threats.find(t => t.id === i.targetThreatId);
      if (target) {
        const dx = target.x - i.x;
        const dy = target.y - i.y;
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - i.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        i.angle += angleDiff * 0.15;
        i.targetX = target.x;
        i.targetY = target.y;
      }
    }

    i.x += Math.cos(i.angle) * i.speed * (dt / 16);
    i.y += Math.sin(i.angle) * i.speed * (dt / 16);

    i.trail = [...i.trail, { x: i.x, y: i.y }];
    if (i.trail.length > 10) i.trail = i.trail.slice(-10);

    const dx = i.targetX - i.x;
    const dy = i.targetY - i.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 15) {
      s.explosions = [...s.explosions, {
        x: i.x, y: i.y, radius: 2, maxRadius: EXPLOSION_MAX_RADIUS,
        alpha: 1, color: '#FFDD44', isGround: false
      }];
      return;
    }

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

    if (e.alpha <= 0) return;

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

            const points = t.points * s.comboMultiplier;
            s.score += points;
            s.combo++;
            s.maxCombo = Math.max(s.maxCombo, s.combo);
            s.comboMultiplier = Math.min(5, Math.floor(s.combo / 5) + 1);
            s.totalIntercepted++;
            s.waveDestroyedThreats++;
            const comboCredits: Record<number, number> = { 5: 3, 10: 5, 15: 8, 20: 12, 30: 20 };
            if (comboCredits[s.combo]) {
              s.credits += comboCredits[s.combo];
              s.floatingTexts = [...s.floatingTexts, {
                x: t.x, y: t.y - 20, text: `+${comboCredits[s.combo]} 💰`,
                alpha: 1, vy: -1, color: '#44DD88', size: 14,
              }];
            }

            s.floatingTexts = [...s.floatingTexts, {
              x: t.x, y: t.y, text: `+${points}`,
              alpha: 1, vy: -1.5, color: '#FFDD44', size: 12,
            }];

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

            // Track colored missile hits for helicopter summon
            if (t.missileColor && t.missileColor !== 'red') {
              s.coloredMissileHits++;
              if (s.coloredMissileHits >= 3 && !s.heliAirstrikeReady) {
                s.heliAirstrikeReady = true;
                s.coloredMissileHits = 0;
                s.soundEvents.push('powerup-pink');
              }
            }

            // Special missile color effects
            if (t.missileColor === 'green') {
              s.tripleInterceptorTimer = 10000;
              s.soundEvents.push('powerup-green');
              s.floatingTexts = [...s.floatingTexts, {
                x: t.x, y: t.y - 30, text: '🟢 x3 INTERCEPTORS 10s!',
                alpha: 1, vy: -1, color: '#44FF44', size: 16,
              }];
            } else if (t.missileColor === 'blue') {
              s.autoFireTimer = 5000;
              s.soundEvents.push('powerup-blue');
              s.floatingTexts = [...s.floatingTexts, {
                x: t.x, y: t.y - 30, text: '🔵 AUTO-FIRE 5s!',
                alpha: 1, vy: -1, color: '#4488FF', size: 16,
              }];
            } else if (t.missileColor === 'yellow') {
              s.autoDefenseTimer = 10000;
              s.soundEvents.push('powerup-yellow');
              s.floatingTexts = [...s.floatingTexts, {
                x: t.x, y: t.y - 30, text: '🟡 AUTO DOME 10s!',
                alpha: 1, vy: -1, color: '#FFFF44', size: 16,
              }];
            } else if (t.missileColor === 'purple') {
              s.shieldTimer = 10000;
              s.soundEvents.push('powerup-purple');
              s.floatingTexts = [...s.floatingTexts, {
                x: t.x, y: t.y - 30, text: '🟣 SHIELD 10s!',
                alpha: 1, vy: -1, color: '#CC88FF', size: 16,
              }];
            } else if (t.missileColor === 'white') {
              s.empTimer = 10000;
              s.soundEvents.push('powerup-white');
              s.floatingTexts = [...s.floatingTexts, {
                x: t.x, y: t.y - 30, text: '⚪ EMP SLOWDOWN 10s!',
                alpha: 1, vy: -1, color: '#FFFFFF', size: 16,
              }];
            } else if (t.missileColor === 'pink') {
              s.helicopterTimer = 10000;
              s.helicopterX = 0;
              s.soundEvents.push('powerup-pink');
              s.floatingTexts = [...s.floatingTexts, {
                x: t.x, y: t.y - 30, text: '🩷 HELICOPTER 10s!',
                alpha: 1, vy: -1, color: '#FF88AA', size: 16,
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
    const validTargets = s.threats.filter(t =>
      !t.locked && t.type !== 'cluster' && t.type !== 'heavy'
    );
    if (validTargets.length > 0) {
      const target = validTargets.sort((a, b) => b.y - a.y)[0];
      target.locked = true;

      s.threats = s.threats.filter(t => t.id !== target.id);
      s.credits -= s.ironBeamCreditsPerShot;
      s.score += target.points;

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

  // Update special timers
  if (s.tripleInterceptorTimer > 0 && !s.waveTripleDome) {
    s.tripleInterceptorTimer = Math.max(0, s.tripleInterceptorTimer - dt);
  }
  if (s.shieldTimer > 0) {
    s.shieldTimer = Math.max(0, s.shieldTimer - dt);
  }
  if (s.empTimer > 0) {
    s.empTimer = Math.max(0, s.empTimer - dt);
  }
  if (s.screenShake > 0) {
    s.screenShake = Math.max(0, s.screenShake - dt * 0.03);
  }
  if (s.autoDefenseTimer > 0) {
    s.autoDefenseTimer = Math.max(0, s.autoDefenseTimer - dt);
    const groundY2 = h * GROUND_Y_RATIO;
    const domeCenterX = w / 2;
    const domeRadius = w * 0.45;
    const threatsInDome: number[] = [];
    s.threats.forEach(t => {
      if (t.y < groundY2) {
        const dx = t.x - domeCenterX;
        const dy = t.y - groundY2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < domeRadius) {
          threatsInDome.push(t.id);
          s.score += t.points;
          s.totalIntercepted++;
          s.waveDestroyedThreats++;
          s.explosions = [...s.explosions, {
            x: t.x, y: t.y, radius: 2, maxRadius: 25,
            alpha: 1, color: '#FFFF44', isGround: false
          }];
          s.floatingTexts = [...s.floatingTexts, {
            x: t.x, y: t.y, text: `+${t.points} 🛡️`,
            alpha: 1, vy: -1.5, color: '#FFFF88', size: 12,
          }];
        }
      }
    });
    if (threatsInDome.length > 0) {
      s.threats = s.threats.filter(t => !threatsInDome.includes(t.id));
    }
  }

  // Helicopter - flies across top of screen, destroys threats directly below its searchlight
  if (s.helicopterTimer > 0) {
    s.helicopterTimer = Math.max(0, s.helicopterTimer - dt);
    s.helicopterX += (w / 10000) * dt;
    if (s.helicopterX > w) s.helicopterX = 0;

    // Only kill threats INSIDE the searchlight cone (below helicopter, within ±50px, and above ground)
    const heliY = 40;
    const searchWidth = 50;
    const threatsToKill: number[] = [];
    s.threats.forEach(t => {
      // Only kill threats within the light beam area (between heli and ground)
      if (t.y > heliY && t.y < groundY && Math.abs(t.x - s.helicopterX) < searchWidth) {
        threatsToKill.push(t.id);
        s.score += t.points;
        s.totalIntercepted++;
        s.waveDestroyedThreats++;
        s.explosions = [...s.explosions, {
          x: t.x, y: t.y, radius: 2, maxRadius: 20,
          alpha: 1, color: '#88CCFF', isGround: false
        }];
        s.floatingTexts = [...s.floatingTexts, {
          x: t.x, y: t.y, text: `+${t.points} 🚁`,
          alpha: 1, vy: -1.5, color: '#88CCFF', size: 12,
        }];
      }
    });
    if (threatsToKill.length > 0) {
      s.threats = s.threats.filter(t => !threatsToKill.includes(t.id));
    }
  }

  // Helicopter airstrike (summoned by player) - shoots at threats
  if (s.heliAirstrikeTimer > 0) {
    s.heliAirstrikeTimer = Math.max(0, s.heliAirstrikeTimer - dt);
    s.heliAirstrikeX += (w / 8000) * dt;
    if (s.heliAirstrikeX > w) s.heliAirstrikeX = 0;

    // Shoot at threats periodically
    const fireRate = 400;
    const shouldFire = Math.floor((s.heliAirstrikeTimer + dt) / fireRate) !== Math.floor(s.heliAirstrikeTimer / fireRate);
    if (shouldFire && s.threats.length > 0) {
      // Find closest threat to helicopter
      let closest: Threat | null = null;
      let closestDist = Infinity;
      s.threats.forEach(t => {
        const dist = Math.abs(t.x - s.heliAirstrikeX) + Math.abs(t.y - 60);
        if (dist < closestDist) {
          closestDist = dist;
          closest = t;
        }
      });
      if (closest) {
        const ct = closest as Threat;
        // Fire interceptor from helicopter position
        const angle = Math.atan2(ct.y - 60, ct.x - s.heliAirstrikeX);
        s.interceptors = [...s.interceptors, {
          id: s.nextId++,
          x: s.heliAirstrikeX,
          y: 60,
          targetX: ct.x,
          targetY: ct.y,
          speed: INTERCEPTOR_SPEED * 1.2,
          angle,
          trail: [],
          targetThreatId: ct.id,
        }];
      }
    }
  }

  // Auto-fire (blue): dome fires 3 interceptors every 500ms at lowest threats
  if (s.autoFireTimer > 0) {
    s.autoFireTimer = Math.max(0, s.autoFireTimer - dt);
    if (s.threats.length > 0) {
      const fireRate = 500;
      const shouldFire = Math.floor((s.autoFireTimer + dt) / fireRate) !== Math.floor(s.autoFireTimer / fireRate);
      if (shouldFire) {
        const groundY2 = h * GROUND_Y_RATIO;
        const launchX = w / 2;
        const launchY = groundY2 - 5;
        const sorted = [...s.threats].sort((a, b) => b.y - a.y);
        const targets = sorted.slice(0, 3);
        targets.forEach(target => {
          const dx2 = target.x - launchX;
          const dy2 = target.y - launchY;
          const angle = Math.atan2(dy2, dx2);
          s.interceptors = [...s.interceptors, {
            id: s.nextId++,
            x: launchX,
            y: launchY,
            targetX: target.x,
            targetY: target.y,
            speed: INTERCEPTOR_SPEED,
            angle,
            trail: [],
            targetThreatId: target.id,
          }];
        });
      }
    }
  }

  // Check game over
  if (s.lives <= 0) {
    s.phase = 'game-over';
    return s;
  }

  // Check wave complete (campaign only - survival never ends waves)
  if (s.mode === 'campaign' && s.phase === 'playing' && s.spawnQueue.length === 0 && s.threats.length === 0) {
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
      s.lives = Math.min(s.maxLives + 3, s.lives + 1);
      break;
    case 'extra-ammo':
      s.maxAmmo += 5;
      s.ammo = s.maxAmmo;
      break;
    case 'fast-reload':
      s.fastReload = true;
      break;
    case 'shield-charge':
      break;
    case 'auto-fire-charge':
      break;
    case 'triple-dome':
      break;
  }

  return s;
}

export function activateAirSupport(state: GameState): GameState {
  if (state.airSupportCharges <= 0) return state;

  let s = { ...state };
  s.airSupportCharges--;

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

// Activate helicopter airstrike (summoned by collecting 3 colored missiles)
export function activateHeliAirstrike(state: GameState, w: number): GameState {
  if (!state.heliAirstrikeReady) return state;
  return {
    ...state,
    heliAirstrikeReady: false,
    heliAirstrikeTimer: 10000,
    heliAirstrikeX: 0,
    coloredMissileHits: 0,
  };
}

export { renderGame };
