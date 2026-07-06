import { Fruit, GameState } from "./types";
import {
  DAMPING,
  DANGER_LINE_RATIO,
  DANGER_TIME_LIMIT,
  DROP_COOLDOWN,
  GRAVITY,
  RESTITUTION,
  SPAWN_POOL,
  TIERS,
  WALL_MARGIN,
} from "./config";

function randomSpawnTier(): number {
  return Math.floor(Math.random() * SPAWN_POOL);
}

export function createInitialState(): GameState {
  return {
    phase: "menu",
    fruits: [],
    floatingTexts: [],
    score: 0,
    best: 0,
    nextId: 1,
    dropX: 0,
    currentTier: randomSpawnTier(),
    queuedTier: randomSpawnTier(),
    dropCooldown: 0,
    dangerTimer: 0,
    gameOverFade: 0,
  };
}

export function setDropX(state: GameState, x: number, containerWidth: number) {
  const r = TIERS[state.currentTier].radius;
  state.dropX = Math.max(WALL_MARGIN + r, Math.min(containerWidth - WALL_MARGIN - r, x));
}

export function dropFruit(state: GameState): boolean {
  if (state.phase !== "playing" || state.dropCooldown > 0) return false;
  const tier = state.currentTier;
  state.fruits.push({
    id: state.nextId++,
    tier,
    x: state.dropX,
    y: TIERS[tier].radius + 2,
    vx: 0,
    vy: 0,
    justMerged: 0,
  });
  state.currentTier = state.queuedTier;
  state.queuedTier = randomSpawnTier();
  state.dropCooldown = DROP_COOLDOWN;
  return true;
}

function addFloatingText(state: GameState, x: number, y: number, text: string) {
  state.floatingTexts.push({ x, y, text, life: 0.8, maxLife: 0.8 });
}

export function update(state: GameState, dt: number, containerWidth: number, containerHeight: number) {
  if (state.phase !== "playing") return;
  dt = Math.min(dt, 0.032);
  state.dropCooldown = Math.max(0, state.dropCooldown - dt);

  const substeps = 4;
  const sdt = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    for (const f of state.fruits) {
      f.vy += GRAVITY * sdt;
      f.x += f.vx * sdt;
      f.y += f.vy * sdt;
      f.vx *= DAMPING;
      f.justMerged = Math.max(0, f.justMerged - sdt);

      const r = TIERS[f.tier].radius;
      if (f.x - r < WALL_MARGIN) {
        f.x = WALL_MARGIN + r;
        f.vx = Math.abs(f.vx) * RESTITUTION;
      }
      if (f.x + r > containerWidth - WALL_MARGIN) {
        f.x = containerWidth - WALL_MARGIN - r;
        f.vx = -Math.abs(f.vx) * RESTITUTION;
      }
      if (f.y + r > containerHeight) {
        f.y = containerHeight - r;
        f.vy = -Math.abs(f.vy) * RESTITUTION * 0.5;
      }
    }

    // Pairwise collision resolution
    const merges: { a: Fruit; b: Fruit }[] = [];
    const removed = new Set<number>();
    for (let i = 0; i < state.fruits.length; i++) {
      const a = state.fruits[i];
      if (removed.has(a.id)) continue;
      for (let j = i + 1; j < state.fruits.length; j++) {
        const b = state.fruits[j];
        if (removed.has(b.id)) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const ra = TIERS[a.tier].radius;
        const rb = TIERS[b.tier].radius;
        const minDist = ra + rb;
        if (dist < minDist) {
          if (a.tier === b.tier && a.tier < TIERS.length - 1 && a.justMerged <= 0 && b.justMerged <= 0) {
            merges.push({ a, b });
            removed.add(a.id);
            removed.add(b.id);
            continue;
          }
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const totalMass = ra + rb;
          const pushA = overlap * (rb / totalMass);
          const pushB = overlap * (ra / totalMass);
          a.x -= nx * pushA;
          a.y -= ny * pushA;
          b.x += nx * pushB;
          b.y += ny * pushB;

          const relVx = b.vx - a.vx;
          const relVy = b.vy - a.vy;
          const relDot = relVx * nx + relVy * ny;
          if (relDot < 0) {
            const impulse = -relDot * RESTITUTION;
            a.vx -= nx * impulse * 0.5;
            a.vy -= ny * impulse * 0.5;
            b.vx += nx * impulse * 0.5;
            b.vy += ny * impulse * 0.5;
          }
        }
      }
    }

    if (merges.length > 0) {
      state.fruits = state.fruits.filter((f) => !removed.has(f.id));
      for (const { a, b } of merges) {
        const newTier = a.tier + 1;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        state.fruits.push({
          id: state.nextId++,
          tier: newTier,
          x: mx,
          y: my,
          vx: 0,
          vy: -60,
          justMerged: 0.25,
        });
        state.score += TIERS[newTier].points;
        addFloatingText(state, mx, my - TIERS[newTier].radius - 6, `+${TIERS[newTier].points}`);
      }
    }
  }

  for (const ft of state.floatingTexts) {
    ft.life -= dt;
    ft.y -= dt * 20;
  }
  state.floatingTexts = state.floatingTexts.filter((f) => f.life > 0);

  // Danger line: sustained overflow near the top ends the game
  const dangerY = containerHeight * DANGER_LINE_RATIO;
  const overflowing = state.fruits.some((f) => f.justMerged <= 0 && f.y - TIERS[f.tier].radius < dangerY && Math.abs(f.vy) < 40);
  if (overflowing) {
    state.dangerTimer += dt;
    if (state.dangerTimer >= DANGER_TIME_LIMIT) {
      state.phase = "gameover";
      state.best = Math.max(state.best, state.score);
    }
  } else {
    state.dangerTimer = Math.max(0, state.dangerTimer - dt * 2);
  }
}
