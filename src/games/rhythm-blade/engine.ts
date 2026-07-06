import { Block, Direction, GameState, HitResult } from "./types";

export const TRAVEL_TIME = 1.6; // seconds a block takes to reach the hit zone
export const PERFECT_WINDOW = 0.12;
export const GOOD_WINDOW = 0.26;
export const HYPER_DRIVE_COMBO = 10;
export const MAX_LIVES = 5;
const START_BEATS_PER_BLOCK = 2;
const MIN_BEATS_PER_BLOCK = 1;
const HITS_PER_RAMP = 12;

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

let idCounter = 1;
const nextId = () => idCounter++;

export function createInitialState(): GameState {
  return {
    phase: "menu",
    blocks: [],
    fx: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    hyperDrive: false,
    lives: MAX_LIVES,
    maxLives: MAX_LIVES,
    beatIndex: 0,
    beatsPerBlock: START_BEATS_PER_BLOCK,
    hitsSinceRampUp: 0,
    nextId: 1,
  };
}

let lastDirection: Direction | null = null;

function pickDirection(): Direction {
  const pool = DIRECTIONS.filter((d) => d !== lastDirection);
  const dir = pool[Math.floor(Math.random() * pool.length)];
  lastDirection = dir;
  return dir;
}

/** Called by the audio engine for every scheduled beat; decides whether this beat spawns a block. */
export function handleBeat(state: GameState, beatTime: number, beatIndex: number) {
  if (state.phase !== "playing") return;
  state.beatIndex = beatIndex;
  if (beatIndex % state.beatsPerBlock !== 0) return;
  state.blocks.push({
    id: nextId(),
    direction: pickDirection(),
    hitTime: beatTime,
    resolved: false,
  });
}

function addFx(state: GameState, direction: Direction, time: number, result: HitResult) {
  state.fx.push({ id: nextId(), direction, time, result });
}

/** Advance state given the current audio-clock time: expire blocks that were never hit. */
export function tick(state: GameState, audioNow: number) {
  if (state.phase !== "playing") return;

  for (const block of state.blocks) {
    if (block.resolved) continue;
    if (audioNow > block.hitTime + GOOD_WINDOW) {
      block.resolved = true;
      block.result = "miss";
      block.resolvedAt = audioNow;
      registerMiss(state, block.direction, audioNow);
    }
  }

  state.blocks = state.blocks.filter((b) => !b.resolved || audioNow - (b.resolvedAt ?? 0) < 0.6);
  state.fx = state.fx.filter((f) => audioNow - f.time < 0.6);

  if (state.lives <= 0) {
    state.phase = "gameover";
  }
}

function registerMiss(state: GameState, direction: Direction, audioNow: number) {
  state.combo = 0;
  state.hyperDrive = false;
  state.lives = Math.max(0, state.lives - 1);
  addFx(state, direction, audioNow, "miss");
}

function rampDifficulty(state: GameState) {
  state.hitsSinceRampUp++;
  if (state.hitsSinceRampUp >= HITS_PER_RAMP && state.beatsPerBlock > MIN_BEATS_PER_BLOCK) {
    state.beatsPerBlock--;
    state.hitsSinceRampUp = 0;
  }
}

/** Player pressed/swiped a direction. Returns the hit result if a block was resolved, else null. */
export function resolveInput(state: GameState, direction: Direction, audioNow: number): HitResult | null {
  if (state.phase !== "playing") return null;

  let best: Block | null = null;
  let bestDelta = Infinity;
  for (const block of state.blocks) {
    if (block.resolved || block.direction !== direction) continue;
    const delta = Math.abs(audioNow - block.hitTime);
    if (delta <= GOOD_WINDOW && delta < bestDelta) {
      best = block;
      bestDelta = delta;
    }
  }
  if (!best) return null;

  const result: HitResult = bestDelta <= PERFECT_WINDOW ? "perfect" : "good";
  best.resolved = true;
  best.result = result;
  best.resolvedAt = audioNow;

  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  if (state.combo >= HYPER_DRIVE_COMBO) state.hyperDrive = true;

  const base = result === "perfect" ? 100 : 50;
  const multiplier = state.hyperDrive ? 3 : 1;
  state.score += base * multiplier;

  rampDifficulty(state);
  addFx(state, direction, audioNow, result);

  return result;
}

export function screenXYForDirection(direction: Direction, w: number, h: number, progress: number) {
  // progress: 0 = just spawned (off-screen edge), 1 = at hit zone (center)
  const cx = w / 2;
  const cy = h / 2;
  const startDist = Math.max(w, h) * 0.65;
  const dirVec: Record<Direction, { x: number; y: number }> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const v = dirVec[direction];
  const dist = startDist * (1 - progress);
  return { x: cx + v.x * dist, y: cy + v.y * dist };
}
