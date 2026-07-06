export type Phase = "menu" | "playing" | "finished" | "gameover";

export interface GapObstacle {
  type: "gap";
  x: number;
  width: number;
}

export interface SpinnerObstacle {
  type: "spinner";
  x: number;
  armLength: number;
  speed: number; // radians/sec
  angle: number;
}

export type Obstacle = GapObstacle | SpinnerObstacle;

export interface GameState {
  phase: Phase;
  playerX: number;
  playerY: number; // 0 = on floor, negative = airborne (up)
  velY: number;
  grounded: boolean;
  falling: boolean;
  knockTimer: number;
  invuln: number;
  obstacles: Obstacle[];
  timeLeft: number;
  score: number;
  best: number;
  wobble: number;
  shakeTimer: number;
}
