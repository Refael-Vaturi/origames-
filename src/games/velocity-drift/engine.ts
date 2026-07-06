import { DriftParticle, GameState, InputState } from "./types";
import { ROAD_WIDTH, startPositionAndHeading, trackInfoAt } from "./track";

const MAX_SPEED = 260; // units/sec
const NITRO_MAX_SPEED = 400;
const ACCEL = 140;
const OFF_TRACK_MAX_SPEED = 90;
const TURN_RATE = 2.6; // rad/sec at full steer
const DRIFT_TURN_MULTIPLIER = 1.55;
const GRIP_NORMAL = 0.12; // how fast velocity angle chases heading (per-frame lerp factor baseline)
const GRIP_DRIFT = 0.035;
const MIN_DRIFT_SPEED = 70;
const NITRO_FILL_RATE = 0.22; // per second while drifting
const NITRO_DRAIN_RATE = 0.55; // per second while boosting
const COMBO_GROWTH = 0.6; // per second while cleanly drifting
const COMBO_MAX = 5;
const TIME_LIMIT = 75;

export function createInitialState(): GameState {
  const { pos, heading } = startPositionAndHeading();
  return {
    phase: "menu",
    pos,
    heading,
    velAngle: heading,
    speed: 0,
    distance: 0,
    offTrack: false,
    isDrifting: false,
    driftHeat: 0,
    combo: 1,
    nitro: 0,
    nitroActive: false,
    nitroTimer: 0,
    score: 0,
    best: 0,
    timeLeft: TIME_LIMIT,
    particles: [],
    shakeTimer: 0,
    nextParticleId: 1,
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
}

function angleDiff(a: number, b: number): number {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function update(state: GameState, dt: number, input: InputState): GameState {
  if (state.phase !== "playing") return state;
  dt = Math.min(dt, 0.05);

  state.timeLeft -= dt;
  state.shakeTimer = Math.max(0, state.shakeTimer - dt);

  const wantsDrift = input.drift && Math.abs(input.steer) > 0 && state.speed > MIN_DRIFT_SPEED;
  state.isDrifting = wantsDrift;

  const turnMult = state.isDrifting ? DRIFT_TURN_MULTIPLIER : 1;
  state.heading += input.steer * TURN_RATE * turnMult * dt;

  const grip = state.isDrifting ? GRIP_DRIFT : GRIP_NORMAL;
  state.velAngle = lerpAngle(state.velAngle, state.heading, Math.min(1, grip * (dt * 60)));

  // Nitro boost
  state.nitroActive = input.nitro && state.nitro > 0;
  if (state.nitroActive) {
    state.nitro = Math.max(0, state.nitro - NITRO_DRAIN_RATE * dt);
    state.nitroTimer += dt;
  } else {
    state.nitroTimer = 0;
  }

  const trackInfo = trackInfoAt(state.pos);
  state.offTrack = trackInfo.distanceToCenter > ROAD_WIDTH / 2;

  const maxSpeed = state.offTrack ? OFF_TRACK_MAX_SPEED : state.nitroActive ? NITRO_MAX_SPEED : MAX_SPEED;
  const accel = state.offTrack ? ACCEL * 0.4 : state.nitroActive ? ACCEL * 1.8 : ACCEL;
  state.speed += (maxSpeed - state.speed) * Math.min(1, (accel / MAX_SPEED) * dt * 3);
  state.speed = Math.max(0, Math.min(maxSpeed, state.speed));

  state.pos.x += Math.cos(state.velAngle) * state.speed * dt;
  state.pos.y += Math.sin(state.velAngle) * state.speed * dt;
  state.distance += state.speed * dt;

  // Combo / scoring
  if (state.offTrack) {
    if (state.combo > 1) state.shakeTimer = 0.25;
    state.combo = 1;
    state.driftHeat = Math.max(0, state.driftHeat - dt * 3);
  } else if (state.isDrifting) {
    const slideAngle = Math.abs(angleDiff(state.velAngle, state.heading));
    state.driftHeat = Math.min(1, state.driftHeat + dt * 1.5);
    state.combo = Math.min(COMBO_MAX, state.combo + COMBO_GROWTH * dt);
    state.nitro = Math.min(1, state.nitro + NITRO_FILL_RATE * dt);
    state.score += Math.round((20 + slideAngle * 40) * state.combo * dt * 10);
  } else {
    state.driftHeat = Math.max(0, state.driftHeat - dt * 2);
    state.score += Math.round(4 * state.combo * dt * 10);
  }

  // Drift trail particles
  if (state.isDrifting && !state.offTrack) {
    state.nextParticleId++;
    const particle: DriftParticle = {
      x: state.pos.x - Math.cos(state.velAngle) * 12,
      y: state.pos.y - Math.sin(state.velAngle) * 12,
      life: 0.5,
      maxLife: 0.5,
      size: 6 + Math.random() * 3,
    };
    state.particles.push(particle);
  }
  for (const p of state.particles) p.life -= dt;
  state.particles = state.particles.filter((p) => p.life > 0);

  if (state.timeLeft <= 0) {
    state.phase = "gameover";
    state.best = Math.max(state.best, state.score);
  }

  return state;
}
