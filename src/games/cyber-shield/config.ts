import { EnemyType, TowerType } from "./types";

export interface TowerStats {
  name: string;
  cost: number;
  upgradeCost: (level: number) => number;
  range: (level: number) => number; // in cells
  damage: (level: number) => number;
  fireInterval: (level: number) => number; // seconds between shots
  slow?: number; // fraction speed reduction while in range (firewall only)
  bonusVs?: EnemyType; // damage multiplier target
  color: string;
}

export const TOWER_STATS: Record<TowerType, TowerStats> = {
  firewall: {
    name: "Firewall",
    cost: 40,
    upgradeCost: (lvl) => 30 + lvl * 25,
    range: (lvl) => 1.3 + lvl * 0.15,
    damage: () => 4,
    fireInterval: () => 0.6,
    slow: 0.45,
    color: "#38bdf8",
  },
  antivirus: {
    name: "Antivirus Turret",
    cost: 60,
    upgradeCost: (lvl) => 40 + lvl * 30,
    range: (lvl) => 1.8 + lvl * 0.2,
    damage: (lvl) => 12 + lvl * 8,
    fireInterval: (lvl) => Math.max(0.25, 0.55 - lvl * 0.06),
    bonusVs: "trojan",
    color: "#22c55e",
  },
  decoy: {
    name: "Encryption Decoy",
    cost: 90,
    upgradeCost: (lvl) => 60 + lvl * 40,
    range: (lvl) => 1.5 + lvl * 0.15,
    damage: (lvl) => 22 + lvl * 14,
    fireInterval: (lvl) => Math.max(0.5, 1.1 - lvl * 0.08),
    bonusVs: "ransomware",
    color: "#c084fc",
  },
};

export interface EnemyStats {
  name: string;
  hp: number;
  speed: number; // cells per second
  reward: number;
  damage: number; // to database on reaching the end
  color: string;
}

export const ENEMY_STATS: Record<EnemyType, EnemyStats> = {
  trojan: { name: "Trojan", hp: 26, speed: 1.6, reward: 6, damage: 5, color: "#f97316" },
  virus: { name: "Virus", hp: 55, speed: 1.15, reward: 10, damage: 8, color: "#eab308" },
  ransomware: { name: "Ransomware", hp: 130, speed: 0.85, reward: 20, damage: 15, color: "#ef4444" },
};

/** Wave composition: list of [enemyType, count] spawned in order, with a
 *  flat per-enemy spawn gap that shortens slightly on later waves. */
export function getWave(waveNumber: number): EnemyType[] {
  const queue: EnemyType[] = [];
  const trojans = 4 + waveNumber * 2;
  const viruses = Math.max(0, waveNumber - 1) * 2;
  const ransomware = waveNumber >= 3 ? Math.floor((waveNumber - 2) * 1.5) : 0;

  for (let i = 0; i < trojans; i++) queue.push("trojan");
  for (let i = 0; i < viruses; i++) queue.push("virus");
  for (let i = 0; i < ransomware; i++) queue.push("ransomware");

  // Interleave so it's not just three flat blocks
  return queue.sort(() => Math.random() - 0.5);
}

export const SPAWN_INTERVAL = 0.7;
export const STARTING_DATA_BITS = 150;
export const STARTING_DATABASE_HP = 20;
