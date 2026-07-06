export type Direction = "up" | "down" | "left" | "right";
export type HitResult = "perfect" | "good" | "miss";

export interface Block {
  id: number;
  direction: Direction;
  hitTime: number; // AudioContext time (seconds) this block should be sliced at
  resolved: boolean;
  result?: HitResult;
  resolvedAt?: number; // audio time it was resolved, for a brief post-hit animation
}

export type Phase = "menu" | "playing" | "gameover";

export interface SliceFx {
  id: number;
  direction: Direction;
  time: number; // audio time spawned, for fade-out
  result: HitResult;
}

export interface GameState {
  phase: Phase;
  blocks: Block[];
  fx: SliceFx[];
  score: number;
  combo: number;
  maxCombo: number;
  hyperDrive: boolean;
  lives: number;
  maxLives: number;
  beatIndex: number;
  beatsPerBlock: number; // current spacing between blocks, in beats — shrinks for difficulty
  hitsSinceRampUp: number;
  nextId: number;
}
