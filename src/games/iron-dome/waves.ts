import { WaveConfig, ThreatType } from './types';

export const CAMPAIGN_WAVES: WaveConfig[] = [
  // Wave 1: Easy intro
  { missiles: 5, uavs: 0, clusters: 0, heavies: 0, speed: 1.0, spawnInterval: 2500 },
  // Wave 2
  { missiles: 7, uavs: 1, clusters: 0, heavies: 0, speed: 1.1, spawnInterval: 2200 },
  // Wave 3
  { missiles: 8, uavs: 2, clusters: 0, heavies: 0, speed: 1.2, spawnInterval: 2000 },
  // Wave 4: Clusters intro
  { missiles: 6, uavs: 2, clusters: 1, heavies: 0, speed: 1.3, spawnInterval: 1900 },
  // Wave 5
  { missiles: 8, uavs: 3, clusters: 2, heavies: 0, speed: 1.4, spawnInterval: 1800 },
  // Wave 6: Heavy intro
  { missiles: 8, uavs: 3, clusters: 2, heavies: 1, speed: 1.5, spawnInterval: 1700 },
  // Wave 7
  { missiles: 10, uavs: 4, clusters: 2, heavies: 1, speed: 1.6, spawnInterval: 1500 },
  // Wave 8
  { missiles: 10, uavs: 4, clusters: 3, heavies: 2, speed: 1.7, spawnInterval: 1400 },
  // Wave 9
  { missiles: 12, uavs: 5, clusters: 3, heavies: 2, speed: 1.8, spawnInterval: 1300 },
  // Wave 10: Final
  { missiles: 14, uavs: 6, clusters: 4, heavies: 3, speed: 2.0, spawnInterval: 1100 },
];

export function getSurvivalWave(wave: number): WaveConfig {
  const base = Math.min(wave, 30);
  return {
    missiles: 5 + Math.floor(base * 1.5),
    uavs: Math.floor(base * 0.8),
    clusters: Math.max(0, Math.floor((base - 3) * 0.5)),
    heavies: Math.max(0, Math.floor((base - 5) * 0.4)),
    speed: 1.0 + wave * 0.12,
    spawnInterval: Math.max(600, 2500 - wave * 80),
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
