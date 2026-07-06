import { GameState, Tower, TowerType, Enemy, Projectile, FloatingText } from "./types";
import { PATH_CELLS, isPathCell, isInGrid } from "./grid";
import { TOWER_STATS, ENEMY_STATS, getWave, SPAWN_INTERVAL, STARTING_DATA_BITS, STARTING_DATABASE_HP } from "./config";

export function createInitialState(): GameState {
  return {
    phase: "menu",
    towers: [],
    enemies: [],
    projectiles: [],
    floatingTexts: [],
    dataBits: STARTING_DATA_BITS,
    databaseHp: STARTING_DATABASE_HP,
    maxDatabaseHp: STARTING_DATABASE_HP,
    wave: 1,
    score: 0,
    best: 0,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    nextId: 1,
  };
}

export function canPlaceTower(state: GameState, row: number, col: number): boolean {
  if (!isInGrid(row, col) || isPathCell(row, col)) return false;
  return !state.towers.some((t) => t.row === row && t.col === col);
}

export function placeTower(state: GameState, row: number, col: number, type: TowerType): boolean {
  if (state.phase !== "playing" || !canPlaceTower(state, row, col)) return false;
  const cost = TOWER_STATS[type].cost;
  if (state.dataBits < cost) return false;
  state.dataBits -= cost;
  state.towers.push({ id: state.nextId++, type, row, col, level: 0, cooldown: 0 });
  return true;
}

export function upgradeTower(state: GameState, towerId: number): boolean {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return false;
  const cost = TOWER_STATS[tower.type].upgradeCost(tower.level);
  if (state.dataBits < cost || tower.level >= 4) return false;
  state.dataBits -= cost;
  tower.level += 1;
  return true;
}

export function sellTower(state: GameState, towerId: number): boolean {
  const idx = state.towers.findIndex((t) => t.id === towerId);
  if (idx === -1) return false;
  const tower = state.towers[idx];
  const refund = Math.round(TOWER_STATS[tower.type].cost * 0.6 * (1 + tower.level * 0.4));
  state.dataBits += refund;
  state.towers.splice(idx, 1);
  return true;
}

export function startWave(state: GameState): boolean {
  if (state.phase !== "playing" || state.waveActive) return false;
  state.spawnQueue = getWave(state.wave);
  state.spawnTimer = 0;
  state.waveActive = true;
  return true;
}

function addFloatingText(state: GameState, x: number, y: number, text: string, color: string) {
  state.floatingTexts.push({ x, y, text, color, life: 0.7, maxLife: 0.7 });
}

function enemyWorldPos(enemy: Enemy): { x: number; y: number } {
  const a = PATH_CELLS[enemy.pathIndex];
  const b = PATH_CELLS[Math.min(enemy.pathIndex + 1, PATH_CELLS.length - 1)];
  return {
    x: a.col + 0.5 + (b.col - a.col) * enemy.segmentT,
    y: a.row + 0.5 + (b.row - a.row) * enemy.segmentT,
  };
}

export function getEnemyWorldPos(enemy: Enemy) {
  return enemyWorldPos(enemy);
}

export function update(state: GameState, dt: number): GameState {
  if (state.phase !== "playing") return state;
  dt = Math.min(dt, 0.05);

  // Spawning
  if (state.waveActive) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
      const type = state.spawnQueue.shift()!;
      const stats = ENEMY_STATS[type];
      state.enemies.push({
        id: state.nextId++,
        type,
        pathIndex: 0,
        segmentT: 0,
        hp: stats.hp,
        maxHp: stats.hp,
        slowTimer: 0,
      });
      state.spawnTimer = SPAWN_INTERVAL;
    }
  }

  // Move enemies
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const stats = ENEMY_STATS[enemy.type];
    const slowMult = enemy.slowTimer > 0 ? 1 - (TOWER_STATS.firewall.slow ?? 0) : 1;
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);

    const a = PATH_CELLS[enemy.pathIndex];
    const b = PATH_CELLS[Math.min(enemy.pathIndex + 1, PATH_CELLS.length - 1)];
    const segLen = Math.max(0.0001, Math.hypot(b.col - a.col, b.row - a.row));
    enemy.segmentT += (stats.speed * slowMult * dt) / segLen;

    while (enemy.segmentT >= 1 && enemy.pathIndex < PATH_CELLS.length - 1) {
      enemy.segmentT -= 1;
      enemy.pathIndex += 1;
    }

    if (enemy.pathIndex >= PATH_CELLS.length - 1 && enemy.segmentT >= 0) {
      // Reached the database
      state.databaseHp = Math.max(0, state.databaseHp - stats.damage);
      enemy.hp = 0;
      const pos = enemyWorldPos(enemy);
      addFloatingText(state, pos.x, pos.y, `-${stats.damage}`, "#ef4444");
    }
  }
  state.enemies = state.enemies.filter((e) => e.hp > 0);

  // Firewall AoE slow/chip damage (zone effect, no projectiles)
  for (const tower of state.towers) {
    if (tower.type !== "firewall") continue;
    const stats = TOWER_STATS.firewall;
    const range = stats.range(tower.level);
    tower.cooldown -= dt;
    const cx = tower.col + 0.5;
    const cy = tower.row + 0.5;
    let didTick = false;
    for (const enemy of state.enemies) {
      const pos = enemyWorldPos(enemy);
      if (Math.hypot(pos.x - cx, pos.y - cy) <= range) {
        enemy.slowTimer = 0.4;
        if (tower.cooldown <= 0) {
          enemy.hp -= stats.damage(tower.level);
          didTick = true;
        }
      }
    }
    if (didTick) tower.cooldown = stats.fireInterval(tower.level);
  }

  // Single-target towers: fire projectiles
  for (const tower of state.towers) {
    if (tower.type === "firewall") continue;
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;
    const stats = TOWER_STATS[tower.type];
    const range = stats.range(tower.level);
    const cx = tower.col + 0.5;
    const cy = tower.row + 0.5;

    let best: Enemy | null = null;
    let bestProgress = -1;
    for (const enemy of state.enemies) {
      const pos = enemyWorldPos(enemy);
      if (Math.hypot(pos.x - cx, pos.y - cy) > range) continue;
      const progress = enemy.pathIndex + enemy.segmentT;
      if (progress > bestProgress) {
        bestProgress = progress;
        best = enemy;
      }
    }
    if (best) {
      tower.cooldown = stats.fireInterval(tower.level);
      state.projectiles.push({
        id: state.nextId++,
        x: cx,
        y: cy,
        targetId: best.id,
        fromType: tower.type,
        speed: 9,
      });
    }
  }

  // Move projectiles / resolve hits
  const remainingProjectiles: Projectile[] = [];
  for (const proj of state.projectiles) {
    const target = state.enemies.find((e) => e.id === proj.targetId);
    if (!target) continue; // target died already
    const pos = enemyWorldPos(target);
    const dx = pos.x - proj.x;
    const dy = pos.y - proj.y;
    const dist = Math.hypot(dx, dy);
    const step = proj.speed * dt;
    if (dist <= step) {
      const stats = TOWER_STATS[proj.fromType];
      const towerForHit = state.towers.find((t) => t.type === proj.fromType);
      const level = towerForHit?.level ?? 0;
      let dmg = stats.damage(level);
      if (stats.bonusVs === target.type) dmg *= 2;
      target.hp -= dmg;
      addFloatingText(state, pos.x, pos.y, `-${Math.round(dmg)}`, stats.color);
      if (target.hp <= 0) {
        state.dataBits += ENEMY_STATS[target.type].reward;
        state.score += ENEMY_STATS[target.type].reward * 10;
      }
    } else {
      proj.x += (dx / dist) * step;
      proj.y += (dy / dist) * step;
      remainingProjectiles.push(proj);
    }
  }
  state.projectiles = remainingProjectiles;
  state.enemies = state.enemies.filter((e) => e.hp > 0);

  // Floating texts
  for (const ft of state.floatingTexts) ft.life -= dt;
  state.floatingTexts = state.floatingTexts.filter((f) => f.life > 0);

  // Wave complete?
  if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    const bonus = 20 + state.wave * 8;
    state.dataBits += bonus;
    state.score += bonus * 5;
    state.wave += 1;
  }

  if (state.databaseHp <= 0) {
    state.phase = "gameover";
    state.best = Math.max(state.best, state.score);
  }

  return state;
}
