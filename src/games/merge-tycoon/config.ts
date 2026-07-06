export const GRID_COLS = 5;
export const GRID_ROWS = 5;
export const TIME_LIMIT = 90;
export const STARTING_CURRENCY = 30;
export const BASE_BUY_COST = 12;
export const BUY_COST_GROWTH = 1.16;

export interface TierInfo {
  name: string;
  rate: number; // currency per second
  color: string;
}

export const TIERS: TierInfo[] = [
  { name: "Lemonade Stand", rate: 1, color: "#94a3b8" },
  { name: "Food Cart", rate: 3, color: "#38bdf8" },
  { name: "Cafe", rate: 8, color: "#22c55e" },
  { name: "Diner", rate: 20, color: "#a3e635" },
  { name: "Bistro", rate: 50, color: "#facc15" },
  { name: "Restaurant", rate: 120, color: "#fb923c" },
  { name: "Franchise", rate: 280, color: "#f472b6" },
  { name: "Empire HQ", rate: 650, color: "#c084fc" },
];

export function buyCost(purchaseCount: number): number {
  return Math.round(BASE_BUY_COST * Math.pow(BUY_COST_GROWTH, purchaseCount));
}
