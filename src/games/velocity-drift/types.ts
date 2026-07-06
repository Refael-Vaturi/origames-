export interface Vec2 {
  x: number;
  y: number;
}

export type Phase = "menu" | "playing" | "gameover";

export interface DriftParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface GameState {
  phase: Phase;
  pos: Vec2;
  heading: number; // radians, direction the car is pointed
  velAngle: number; // radians, direction the car is actually moving
  speed: number; // units/sec
  distance: number; // total distance traveled along the track (for scoring/laps)
  offTrack: boolean;
  isDrifting: boolean;
  driftHeat: number; // 0..1, current drift chain intensity for visuals
  combo: number; // multiplier, grows while drifting cleanly, resets off-track
  nitro: number; // 0..1 fuel
  nitroActive: boolean;
  nitroTimer: number;
  score: number;
  best: number;
  timeLeft: number;
  particles: DriftParticle[];
  shakeTimer: number;
  nextParticleId: number;
}

export interface InputState {
  steer: -1 | 0 | 1;
  drift: boolean;
  nitro: boolean;
}
