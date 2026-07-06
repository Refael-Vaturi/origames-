export type TowerType = "firewall" | "antivirus" | "decoy";
export type EnemyType = "trojan" | "virus" | "ransomware";
export type Phase = "menu" | "playing" | "gameover";

export interface Tower {
  id: number;
  type: TowerType;
  row: number;
  col: number;
  level: number;
  cooldown: number;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  pathIndex: number; // which path segment it's currently on
  segmentT: number; // 0..1 progress along the current segment
  hp: number;
  maxHp: number;
  slowTimer: number; // seconds remaining of firewall slow effect
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  fromType: TowerType;
  speed: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface GameState {
  phase: Phase;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  floatingTexts: FloatingText[];
  dataBits: number;
  databaseHp: number;
  maxDatabaseHp: number;
  wave: number;
  score: number;
  best: number;
  waveActive: boolean;
  spawnQueue: EnemyType[];
  spawnTimer: number;
  nextId: number;
}
