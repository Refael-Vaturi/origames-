export type Phase = "menu" | "playing" | "gameover";

export interface Generator {
  id: number;
  tier: number;
  row: number;
  col: number;
  pulse: number; // seconds remaining of a small "produced income" pop animation
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
  generators: Generator[];
  floatingTexts: FloatingText[];
  currency: number;
  totalEarned: number;
  best: number;
  purchaseCount: number;
  timeLeft: number;
  selectedId: number | null;
  nextId: number;
  incomeAccum: number;
}
