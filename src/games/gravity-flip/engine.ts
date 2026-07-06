import { GameState, ObstacleType, Snapshot, Particle } from "./types";

export const PLAYER_HALF_WIDTH = 22; // px, world-x collision half-width
export const PLAYER_RADIUS_Y = 0.05; // normalized corridor-height radius
export const SPIKE_HEIGHT = 0.24; // normalized height a spike pokes into the corridor

const FLIP_KICK = 1.9;
const GRAVITY_ACCEL = 2.7;
const MAX_FALL_SPEED = 3.6;
const BASE_SPEED = 250;
const MAX_SPEED = 640;
const SPEED_RAMP = 0.02;
const AHEAD_BUFFER = 1400; // spawn chunks this far beyond the current screen edge
const CULL_MARGIN = 4200; // keep obstacles this far behind distance (covers max rewind)
const REWIND_SECONDS = 3;
const HISTORY_MAX_AGE = 3.6;
const SHARD_COLLECT_RADIUS = 0.3;
const INVULN_AFTER_REWIND = 1.1;

interface ChunkObstacleDef {
  type: ObstacleType;
  offset: number;
  width: number;
  extent?: number;
}

interface ChunkTemplate {
  minDistance: number;
  length: number;
  obstacles: ChunkObstacleDef[];
  shardOffset?: number;
}

const CHUNKS: ChunkTemplate[] = [
  // Tier 1 — single hazards, generous recovery room
  { minDistance: 0, length: 750, obstacles: [{ type: "spike_floor", offset: 320, width: 70 }] },
  { minDistance: 0, length: 750, obstacles: [{ type: "spike_ceiling", offset: 320, width: 70 }] },
  { minDistance: 0, length: 950, obstacles: [
    { type: "spike_floor", offset: 260, width: 70 },
    { type: "spike_ceiling", offset: 620, width: 70 },
  ] },
  // Tier 2 — walls that force a committed flip
  { minDistance: 2400, length: 850, obstacles: [{ type: "wall_low", offset: 320, width: 110, extent: 0.62 }] },
  { minDistance: 2400, length: 850, obstacles: [{ type: "wall_high", offset: 320, width: 110, extent: 0.62 }] },
  { minDistance: 3200, length: 1000, obstacles: [
    { type: "wall_low", offset: 260, width: 110, extent: 0.6 },
    { type: "spike_floor", offset: 620, width: 70 },
  ] },
  { minDistance: 3600, length: 1050, obstacles: [
    { type: "wall_low", offset: 260, width: 100, extent: 0.6 },
    { type: "wall_high", offset: 620, width: 100, extent: 0.6 },
  ] },
  // Tier 3 — antigrav drift sections and dense chains
  { minDistance: 6000, length: 1200, obstacles: [
    { type: "antigrav_zone", offset: 150, width: 550 },
    { type: "spike_floor", offset: 480, width: 60 },
  ] },
  { minDistance: 6500, length: 1300, obstacles: [
    { type: "spike_ceiling", offset: 200, width: 60 },
    { type: "wall_low", offset: 520, width: 100, extent: 0.6 },
    { type: "spike_floor", offset: 860, width: 60 },
  ] },
];

let idCounter = 1;
const nextId = () => idCounter++;

export function createInitialState(): GameState {
  lastChunk = null;
  return {
    phase: "menu",
    distance: 0,
    speed: BASE_SPEED,
    y: 1,
    velocityY: 0,
    gravityDir: 1,
    inAntigrav: false,
    obstacles: [],
    shards: [],
    particles: [],
    nextChunkX: 900,
    rewindCharges: 0,
    invulnTimer: 0,
    history: [],
    score: 0,
    best: 0,
    time: 0,
    flipFlash: 0,
    shakeTimer: 0,
    deathCause: null,
    collectedThisFrame: [],
  };
}

function pickChunk(distance: number, last: ChunkTemplate | null): ChunkTemplate {
  const eligible = CHUNKS.filter((c) => c.minDistance <= distance);
  const pool = eligible.length > 1 ? eligible.filter((c) => c !== last) : eligible;
  const list = pool.length > 0 ? pool : eligible;
  return list[Math.floor(Math.random() * list.length)];
}

let lastChunk: ChunkTemplate | null = null;

function spawnChunkIfNeeded(state: GameState) {
  const aheadTarget = state.distance + AHEAD_BUFFER;
  while (state.nextChunkX < aheadTarget) {
    const chunk = pickChunk(state.distance, lastChunk);
    lastChunk = chunk;
    const base = state.nextChunkX;
    for (const o of chunk.obstacles) {
      state.obstacles.push({
        id: nextId(),
        type: o.type,
        worldX: base + o.offset,
        width: o.width,
        extent: o.extent,
        passed: false,
      });
    }
    if (chunk.shardOffset !== undefined || Math.random() < 0.4) {
      const shardOffset = chunk.shardOffset ?? chunk.length * 0.5;
      state.shards.push({
        id: nextId(),
        worldX: base + shardOffset,
        worldY: 0.5,
        collected: false,
      });
    }
    state.nextChunkX = base + chunk.length + 250;
  }
}

function pushHistory(state: GameState) {
  const snap: Snapshot = {
    t: state.time,
    distance: state.distance,
    y: state.y,
    velocityY: state.velocityY,
    gravityDir: state.gravityDir,
  };
  state.history.push(snap);
  while (state.history.length > 0 && state.time - state.history[0].t > HISTORY_MAX_AGE) {
    state.history.shift();
  }
}

export function spawnBurst(state: GameState, x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 160;
    const p: Particle = {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      color,
      size: 2 + Math.random() * 3,
    };
    state.particles.push(p);
  }
}

function currentGravityAccel(state: GameState) {
  return state.inAntigrav ? GRAVITY_ACCEL * 0.15 : GRAVITY_ACCEL;
}

function currentFlipKick(state: GameState) {
  return state.inAntigrav ? FLIP_KICK * 0.45 : FLIP_KICK;
}

function rewind(state: GameState) {
  const targetT = state.time - REWIND_SECONDS;
  let snap = state.history[0];
  for (const s of state.history) {
    if (s.t <= targetT) snap = s;
    else break;
  }
  state.rewindCharges -= 1;
  state.distance = snap.distance;
  state.y = snap.y;
  state.velocityY = snap.velocityY;
  state.gravityDir = snap.gravityDir;
  state.invulnTimer = INVULN_AFTER_REWIND;
  state.history = [];
  state.phase = "playing";
}

export function update(state: GameState, dtSec: number, flipRequested: boolean): GameState {
  state.collectedThisFrame = [];
  const dt = Math.min(dtSec, 0.05);

  // Cosmetic effects (screen shake, flip flash, particle burst from death)
  // keep animating even after the run ends, so they finish playing out behind
  // the game-over screen instead of freezing mid-effect.
  state.flipFlash = Math.max(0, state.flipFlash - dt * 4);
  state.shakeTimer = Math.max(0, state.shakeTimer - dt);
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  if (state.phase !== "playing") return state;

  state.time += dt;
  if (state.invulnTimer > 0) state.invulnTimer = Math.max(0, state.invulnTimer - dt);

  if (flipRequested) {
    state.gravityDir = state.gravityDir === 1 ? -1 : 1;
    state.velocityY = state.gravityDir * currentFlipKick(state);
    state.flipFlash = 1;
  }

  state.speed = Math.min(MAX_SPEED, BASE_SPEED + state.distance * SPEED_RAMP);
  state.distance += state.speed * dt;
  state.score = Math.floor(state.distance / 10);

  // Antigrav zone check
  const px = state.distance;
  state.inAntigrav = state.obstacles.some(
    (o) => o.type === "antigrav_zone" && px >= o.worldX && px <= o.worldX + o.width
  );

  state.velocityY += state.gravityDir * currentGravityAccel(state) * dt;
  state.velocityY = Math.max(-MAX_FALL_SPEED, Math.min(MAX_FALL_SPEED, state.velocityY));
  state.y += state.velocityY * dt;

  if (state.y >= 1) {
    state.y = 1;
    if (state.gravityDir === 1) state.velocityY = 0;
  }
  if (state.y <= 0) {
    state.y = 0;
    if (state.gravityDir === -1) state.velocityY = 0;
  }

  spawnChunkIfNeeded(state);
  pushHistory(state);

  // Shard collection
  for (const shard of state.shards) {
    if (shard.collected) continue;
    const xOverlap = px + PLAYER_HALF_WIDTH >= shard.worldX - 20 && px - PLAYER_HALF_WIDTH <= shard.worldX + 20;
    if (xOverlap && Math.abs(state.y - shard.worldY) < SHARD_COLLECT_RADIUS) {
      shard.collected = true;
      state.rewindCharges = Math.min(3, state.rewindCharges + 1);
      state.collectedThisFrame.push(shard);
    }
  }

  // Collision detection (skip while invulnerable, e.g. right after a rewind)
  if (state.invulnTimer <= 0) {
    for (const o of state.obstacles) {
      const xOverlap = px + PLAYER_HALF_WIDTH >= o.worldX && px - PLAYER_HALF_WIDTH <= o.worldX + o.width;
      if (!xOverlap) continue;
      let hit = false;
      if (o.type === "spike_floor" && state.y >= 1 - SPIKE_HEIGHT) hit = true;
      else if (o.type === "spike_ceiling" && state.y <= SPIKE_HEIGHT) hit = true;
      else if (o.type === "wall_low" && state.y <= (o.extent ?? 0.6)) hit = true;
      else if (o.type === "wall_high" && state.y >= 1 - (o.extent ?? 0.6)) hit = true;

      if (hit) {
        state.deathCause = o.type;
        if (state.rewindCharges > 0) {
          state.shakeTimer = 0.2;
          rewind(state);
        } else {
          state.phase = "gameover";
          state.best = Math.max(state.best, state.score);
          state.shakeTimer = 0.4;
        }
        break;
      }
    }
  }

  // Cull far-behind obstacles/shards
  state.obstacles = state.obstacles.filter((o) => o.worldX + o.width > state.distance - CULL_MARGIN);
  state.shards = state.shards.filter((s) => s.worldX > state.distance - CULL_MARGIN);

  return state;
}

export function addTrailParticle(state: GameState, screenX: number, screenY: number) {
  state.particles.push({
    x: screenX,
    y: screenY,
    vx: -state.speed * 0.3 + (Math.random() - 0.5) * 30,
    vy: (Math.random() - 0.5) * 30,
    life: 0.35,
    maxLife: 0.35,
    color: state.gravityDir === 1 ? "#22d3ee" : "#c084fc",
    size: 2 + Math.random() * 2,
  });
}
