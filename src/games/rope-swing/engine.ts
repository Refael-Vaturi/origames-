import { GameState } from "./types";
import {
  COURSE_LENGTH,
  FALL_LIMIT,
  GRAB_RADIUS,
  GRAVITY,
  ROPE_LENGTH,
  TIME_LIMIT,
  generateAnchors,
} from "./config";

export function createInitialState(): GameState {
  const anchors = generateAnchors();
  const theta = -0.9;
  const first = anchors[0];
  return {
    phase: "menu",
    anchorIndex: 0,
    attached: true,
    theta,
    omega: 0,
    playerX: first.x + ROPE_LENGTH * Math.sin(theta),
    playerY: first.y + ROPE_LENGTH * Math.cos(theta),
    vx: 0,
    vy: 0,
    ropeLength: ROPE_LENGTH,
    anchors,
    timeLeft: TIME_LIMIT,
    score: 0,
    best: 0,
    trail: [],
  };
}

export function release(state: GameState) {
  if (state.phase !== "playing" || !state.attached) return;
  const { theta, omega, ropeLength } = state;
  state.vx = ropeLength * omega * Math.cos(theta);
  state.vy = -ropeLength * omega * Math.sin(theta);
  state.attached = false;
}

function finishRun(state: GameState, bonus: boolean) {
  const progress = Math.max(0, Math.min(1, state.playerX / COURSE_LENGTH));
  state.score = bonus ? 1000 + Math.round(Math.max(0, state.timeLeft) * 15) : Math.round(progress * 1000);
  state.best = Math.max(state.best, state.score);
  state.phase = bonus ? "finished" : "gameover";
}

export function update(state: GameState, dt: number) {
  if (state.phase !== "playing") return;
  dt = Math.min(dt, 0.032);
  state.timeLeft -= dt;

  if (state.attached) {
    const anchor = state.anchors[state.anchorIndex];
    const alpha = -(GRAVITY / state.ropeLength) * Math.sin(state.theta);
    state.omega += alpha * dt;
    // Frame-rate-independent damping: a fixed per-frame multiplier would decay
    // much faster on high-refresh-rate displays (90/120Hz) since it gets applied
    // more often per second. Scale it by dt so the decay rate is per-second.
    state.omega *= Math.pow(0.97, dt * 60);
    state.theta += state.omega * dt;
    state.playerX = anchor.x + state.ropeLength * Math.sin(state.theta);
    state.playerY = anchor.y + state.ropeLength * Math.cos(state.theta);
  } else {
    state.vy += GRAVITY * dt;
    state.playerX += state.vx * dt;
    state.playerY += state.vy * dt;

    const nextIndex = state.anchorIndex + 1;
    if (nextIndex < state.anchors.length) {
      const next = state.anchors[nextIndex];
      const dist = Math.hypot(state.playerX - next.x, state.playerY - next.y);
      if (dist < GRAB_RADIUS) {
        state.anchorIndex = nextIndex;
        state.attached = true;
        const dx = state.playerX - next.x;
        const dy = state.playerY - next.y;
        const len = Math.hypot(dx, dy) || state.ropeLength;
        state.theta = Math.atan2(dx, dy);
        const tangentialSpeed = (state.vx * Math.cos(state.theta) - state.vy * Math.sin(state.theta));
        state.omega = tangentialSpeed / len;
        state.ropeLength = len;
      }
    }

    const baselineY = state.anchors[Math.min(state.anchorIndex + 1, state.anchors.length - 1)].y;
    if (state.playerY - baselineY > FALL_LIMIT) {
      finishRun(state, false);
      return;
    }
  }

  state.trail.push({ x: state.playerX, y: state.playerY, life: 0.4 });
  for (const t of state.trail) t.life -= dt;
  state.trail = state.trail.filter((t) => t.life > 0).slice(-24);

  if (state.playerX >= COURSE_LENGTH) {
    finishRun(state, true);
    return;
  }

  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    finishRun(state, false);
  }
}
