export type ObstacleType = "spike_floor" | "spike_ceiling" | "wall_low" | "wall_high" | "antigrav_zone";

export interface Obstacle {
  id: number;
  type: ObstacleType;
  worldX: number;
  width: number;
  /** For walls: how far the wall extends from its surface (0..1 of corridor height). */
  extent?: number;
  passed: boolean;
}

export interface Shard {
  id: number;
  worldX: number;
  worldY: number; // 0 = ceiling surface, 1 = floor surface, 0.5 = middle
  collected: boolean;
}

export interface Snapshot {
  t: number;
  distance: number;
  y: number;
  velocityY: number;
  gravityDir: 1 | -1;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export type Phase = "menu" | "playing" | "rewinding" | "gameover";

export interface GameState {
  phase: Phase;
  distance: number;
  speed: number;
  y: number; // 0 (ceiling surface) .. 1 (floor surface)
  velocityY: number;
  gravityDir: 1 | -1;
  inAntigrav: boolean;
  obstacles: Obstacle[];
  shards: Shard[];
  particles: Particle[];
  nextChunkX: number;
  rewindCharges: number;
  invulnTimer: number;
  history: Snapshot[];
  score: number;
  best: number;
  time: number;
  flipFlash: number;
  shakeTimer: number;
  deathCause: ObstacleType | null;
  /** Shards collected during the most recent update() call; transient, for the
   *  renderer/component to react to (spawn a burst effect) then discard. */
  collectedThisFrame: Shard[];
}
