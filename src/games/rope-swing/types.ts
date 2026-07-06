export type Phase = "menu" | "playing" | "finished" | "gameover";

export interface Anchor {
  x: number;
  y: number;
}

export interface GameState {
  phase: Phase;
  anchorIndex: number;
  attached: boolean;
  theta: number; // angle from straight-down, radians
  omega: number; // angular velocity
  playerX: number;
  playerY: number;
  vx: number;
  vy: number;
  ropeLength: number;
  anchors: Anchor[];
  timeLeft: number;
  score: number;
  best: number;
  trail: { x: number; y: number; life: number }[];
}
