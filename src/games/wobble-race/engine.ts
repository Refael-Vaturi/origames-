import { GameState, Obstacle } from "./types";
import {
  COURSE_LENGTH,
  GRAVITY,
  INVULN_DURATION,
  JUMP_VELOCITY,
  KNOCKBACK_DISTANCE,
  KNOCK_DURATION,
  PLAYER_RADIUS,
  RUN_SPEED,
  TIME_LIMIT,
  generateCourse,
} from "./config";

const PIVOT_HEIGHT = 70;
const TIP_RADIUS = 15;
const FALL_DEPTH = 260;

export function createInitialState(): GameState {
  return {
    phase: "menu",
    playerX: 0,
    playerY: 0,
    velY: 0,
    grounded: true,
    falling: false,
    knockTimer: 0,
    invuln: 0,
    obstacles: generateCourse(),
    timeLeft: TIME_LIMIT,
    score: 0,
    best: 0,
    wobble: 0,
    shakeTimer: 0,
  };
}

function gapAt(obstacles: Obstacle[], x: number): Obstacle | null {
  for (const o of obstacles) {
    if (o.type === "gap" && x + PLAYER_RADIUS * 0.4 > o.x && x - PLAYER_RADIUS * 0.4 < o.x + o.width) return o;
  }
  return null;
}

export function jump(state: GameState) {
  if (state.phase !== "playing") return;
  if (state.falling || state.knockTimer > 0) return;
  if (!state.grounded) return;
  state.velY = JUMP_VELOCITY;
  state.grounded = false;
}

export function update(state: GameState, dt: number) {
  if (state.phase !== "playing") return;
  dt = Math.min(dt, 0.032);

  state.timeLeft -= dt;
  state.shakeTimer = Math.max(0, state.shakeTimer - dt);
  state.invuln = Math.max(0, state.invuln - dt);

  for (const o of state.obstacles) {
    if (o.type === "spinner") o.angle += o.speed * dt;
  }

  if (state.falling) {
    state.velY += GRAVITY * dt;
    state.playerY += state.velY * dt;
    if (state.playerY > FALL_DEPTH) {
      const gap = state.obstacles.find((o) => o.type === "gap" && Math.abs(o.x - (state.playerX)) < 400 && state.playerX >= o.x);
      const respawnX = gap ? Math.max(0, gap.x - 40) : Math.max(0, state.playerX - 200);
      state.playerX = respawnX;
      state.playerY = 0;
      state.velY = 0;
      state.falling = false;
      state.grounded = true;
      state.knockTimer = KNOCK_DURATION;
      state.invuln = INVULN_DURATION;
      state.shakeTimer = 0.3;
    }
    return;
  }

  if (state.knockTimer > 0) {
    state.knockTimer -= dt;
    // still apply gravity/landing while stunned
  }

  // Vertical physics
  if (!state.grounded) {
    state.velY += GRAVITY * dt;
    state.playerY += state.velY * dt;
    if (state.playerY >= 0 && state.velY > 0) {
      const gap = gapAt(state.obstacles, state.playerX);
      if (gap) {
        state.falling = true;
        state.playerY = 1;
      } else {
        state.playerY = 0;
        state.velY = 0;
        state.grounded = true;
      }
    }
  } else {
    const gap = gapAt(state.obstacles, state.playerX);
    if (gap) {
      state.grounded = false;
      state.falling = true;
      state.playerY = 1;
      state.velY = 60;
    }
  }

  // Forward progress
  if (state.knockTimer <= 0) {
    state.playerX += RUN_SPEED * dt;
  }
  state.wobble = Math.sin(state.playerX * 0.05) * (state.grounded ? 1 : 0);

  // Spinner collisions
  if (state.invuln <= 0) {
    for (const o of state.obstacles) {
      if (o.type !== "spinner") continue;
      const tipX = o.x + Math.cos(o.angle) * o.armLength;
      const tipY = -PIVOT_HEIGHT + Math.sin(o.angle) * o.armLength;
      const dx = state.playerX - tipX;
      const dy = state.playerY - tipY;
      const dist = Math.hypot(dx, dy);
      if (dist < PLAYER_RADIUS + TIP_RADIUS) {
        state.playerX = Math.max(0, state.playerX - KNOCKBACK_DISTANCE);
        state.knockTimer = KNOCK_DURATION;
        state.invuln = INVULN_DURATION;
        state.shakeTimer = 0.35;
        if (state.grounded) {
          state.velY = -260;
          state.grounded = false;
        }
        break;
      }
    }
  }

  if (state.playerX >= COURSE_LENGTH) {
    state.phase = "finished";
    state.score = 1000 + Math.round(Math.max(0, state.timeLeft) * 20);
    state.best = Math.max(state.best, state.score);
    return;
  }

  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.phase = "gameover";
    state.score = Math.round((state.playerX / COURSE_LENGTH) * 1000);
    state.best = Math.max(state.best, state.score);
  }
}
