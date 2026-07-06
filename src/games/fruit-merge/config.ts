export interface TierInfo {
  name: string;
  radius: number;
  color: string;
  points: number;
}

export const TIERS: TierInfo[] = [
  { name: "Cherry", radius: 15, color: "#f43f5e", points: 1 },
  { name: "Strawberry", radius: 20, color: "#fb7185", points: 3 },
  { name: "Grape", radius: 26, color: "#a855f7", points: 6 },
  { name: "Orange", radius: 33, color: "#fb923c", points: 10 },
  { name: "Apple", radius: 41, color: "#ef4444", points: 15 },
  { name: "Pear", radius: 50, color: "#84cc16", points: 21 },
  { name: "Peach", radius: 60, color: "#fda4af", points: 28 },
  { name: "Pineapple", radius: 71, color: "#facc15", points: 36 },
  { name: "Melon", radius: 83, color: "#4ade80", points: 45 },
  { name: "Watermelon", radius: 96, color: "#16a34a", points: 55 },
];

// Only the first SPAWN_POOL tiers can drop from the top; bigger ones only
// ever appear as the result of a merge.
export const SPAWN_POOL = 5;

export const GRAVITY = 900; // px/s^2
export const DAMPING = 0.985;
export const RESTITUTION = 0.28;
export const WALL_MARGIN = 18;
export const DANGER_LINE_RATIO = 0.16; // fraction of container height from the top
export const DANGER_TIME_LIMIT = 1.6; // seconds allowed above the danger line
export const DROP_COOLDOWN = 0.32;
