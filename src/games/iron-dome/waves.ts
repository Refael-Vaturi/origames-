import { WaveConfig, ThreatType } from './types';

export const CAMPAIGN_WAVES: WaveConfig[] = [
  // Wave 1: Easy intro
  { missiles: 6, uavs: 0, clusters: 0, heavies: 0, speed: 0.9, spawnInterval: 2800 },
  // Wave 2: More missiles, faster
  { missiles: 10, uavs: 1, clusters: 0, heavies: 0, speed: 1.0, spawnInterval: 2200 },
  // Wave 3: UAVs appear, double shot perk
  { missiles: 14, uavs: 3, clusters: 0, heavies: 0, speed: 1.1, spawnInterval: 1800 },
  // Wave 4: More pressure, fast reload perk
  { missiles: 18, uavs: 4, clusters: 1, heavies: 0, speed: 1.25, spawnInterval: 1500 },
  // Wave 5: Clusters + triple dome perk
  { missiles: 22, uavs: 5, clusters: 2, heavies: 1, speed: 1.4, spawnInterval: 1300 },
  // Wave 6: Heavy intro, big jump
  { missiles: 26, uavs: 6, clusters: 3, heavies: 2, speed: 1.6, spawnInterval: 1100 },
  // Wave 7: Triple shot perk, intense
  { missiles: 30, uavs: 7, clusters: 4, heavies: 2, speed: 1.8, spawnInterval: 950 },
  // Wave 8: Chaos, auto-defense perk
  { missiles: 35, uavs: 8, clusters: 4, heavies: 3, speed: 2.0, spawnInterval: 800 },
  // Wave 9: Near impossible
  { missiles: 40, uavs: 10, clusters: 5, heavies: 4, speed: 2.3, spawnInterval: 650 },
  // Wave 10: Final boss wave - massive
  { missiles: 50, uavs: 12, clusters: 6, heavies: 5, speed: 2.6, spawnInterval: 500 },
];

export function getSurvivalWave(wave: number): WaveConfig {
  const base = Math.min(wave, 50);
  return {
    missiles: 6 + Math.floor(base * 2.5),
    uavs: Math.floor(base * 1.2),
    clusters: Math.max(0, Math.floor((base - 2) * 0.8)),
    heavies: Math.max(0, Math.floor((base - 3) * 0.6)),
    speed: 0.9 + wave * 0.18,
    spawnInterval: Math.max(300, 2500 - wave * 120),
  };
}

export function buildSpawnQueue(config: WaveConfig): ThreatType[] {
  const queue: ThreatType[] = [];
  for (let i = 0; i < config.missiles; i++) queue.push('missile');
  for (let i = 0; i < config.uavs; i++) queue.push('uav');
  for (let i = 0; i < config.clusters; i++) queue.push('cluster');
  for (let i = 0; i < config.heavies; i++) queue.push('heavy');
  // Shuffle
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

export const THREAT_CONFIGS: Record<ThreatType, { hp: number; points: number; speed: number }> = {
  missile: { hp: 1, points: 100, speed: 1.0 },
  uav: { hp: 1, points: 150, speed: 0.8 },
  cluster: { hp: 1, points: 300, speed: 0.7 },
  submunition: { hp: 1, points: 75, speed: 1.5 },
  heavy: { hp: 2, points: 250, speed: 0.6 },
};
