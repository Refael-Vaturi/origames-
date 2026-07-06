export type Phase = "menu" | "playing" | "gameover";

export interface Fruit {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  justMerged: number; // seconds remaining of merge-immunity/pop animation
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
}

export interface GameState {
  phase: Phase;
  fruits: Fruit[];
  floatingTexts: FloatingText[];
  score: number;
  best: number;
  nextId: number;
  dropX: number;
  currentTier: number;
  queuedTier: number;
  dropCooldown: number;
  dangerTimer: number;
  gameOverFade: number;
}
