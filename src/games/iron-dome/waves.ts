import { WaveConfig, ThreatType } from './types';

export const CAMPAIGN_WAVES: WaveConfig[] = [
  // Wave 1: Easy intro - single missiles
  { missiles: 5, uavs: 0, clusters: 0, heavies: 0, speed: 0.8, spawnInterval: 3000 },
  // Wave 2: A bit more
  { missiles: 8, uavs: 0, clusters: 0, heavies: 0, speed: 0.9, spawnInterval: 2500 },
  // Wave 3: UAVs appear
  { missiles: 10, uavs: 2, clusters: 0, heavies: 0, speed: 1.0, spawnInterval: 2200 },
  // Wave 4: More pressure
  { missiles: 12, uavs: 3, clusters: 0, heavies: 0, speed: 1.1, spawnInterval: 2000 },
  // Wave 5: Clusters intro
  { missiles: 12, uavs: 3, clusters: 2, heavies: 0, speed: 1.2, spawnInterval: 1800 },
  // Wave 6: Heavy intro
  { missiles: 14, uavs: 4, clusters: 2, heavies: 1, speed: 1.4, spawnInterval: 1600 },
  // Wave 7: Intense
  { missiles: 16, uavs: 5, clusters: 3, heavies: 2, speed: 1.6, spawnInterval: 1400 },
  // Wave 8: Chaos
  { missiles: 18, uavs: 6, clusters: 3, heavies: 2, speed: 1.8, spawnInterval: 1200 },
  // Wave 9: Near impossible
  { missiles: 20, uavs: 7, clusters: 4, heavies: 3, speed: 2.0, spawnInterval: 1000 },
  // Wave 10: Final boss wave
  { missiles: 25, uavs: 8, clusters: 5, heavies: 4, speed: 2.2, spawnInterval: 800 },
];

export function getSurvivalWave(wave: number): WaveConfig {
  const base = Math.min(wave, 50);
  return {
    missiles: 5 + Math.floor(base * 2),
    uavs: Math.floor(base * 1.0),
    clusters: Math.max(0, Math.floor((base - 2) * 0.6)),
    heavies: Math.max(0, Math.floor((base - 4) * 0.5)),
    speed: 0.8 + wave * 0.15,
    spawnInterval: Math.max(400, 2500 - wave * 100),
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
