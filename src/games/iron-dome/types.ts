export type ThreatType = 'missile' | 'uav' | 'cluster' | 'submunition' | 'heavy';
export type MissileColor = 'red' | 'green' | 'yellow' | 'blue' | 'purple' | 'white' | 'pink';

export interface Threat {
  id: number;
  type: ThreatType;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  hp: number;
  maxHp: number;
  angle: number;
  trail: { x: number; y: number }[];
  evasive: boolean;
  evasiveTimer: number;
  clusterTimer: number;
  points: number;
  locked: boolean;
  missileColor?: MissileColor;
}

export interface Interceptor {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  angle: number;
  trail: { x: number; y: number }[];
  targetThreatId?: number;
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  isGround: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface City {
  x: number;
  width: number;
  alive: boolean;
  buildings: { x: number; w: number; h: number; color: string; windows: { x: number; y: number; lit: boolean }[] }[];
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  alpha: number;
  vy: number;
  color: string;
  size: number;
}

export interface WaveConfig {
  missiles: number;
  uavs: number;
  clusters: number;
  heavies: number;
  speed: number;
  spawnInterval: number;
}

export interface StoreItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  maxBuys: number;
  bought: number;
}

export type GamePhase = 'menu' | 'playing' | 'wave-intro' | 'wave-clear' | 'store' | 'game-over' | 'victory' | 'paused' | 'rules' | 'leaderboard';
export type GameMode = 'campaign' | 'survival';

export interface GameState {
  phase: GamePhase;
  mode: GameMode;
  wave: number;
  score: number;
  lives: number;
  maxLives: number;
  combo: number;
  maxCombo: number;
  comboMultiplier: number;
  credits: number;
  ammo: number;
  maxAmmo: number;
  reloading: boolean;
  reloadTimer: number;
  fastReload: boolean;
  threats: Threat[];
  interceptors: Interceptor[];
  explosions: Explosion[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  cities: City[];
  storeItems: StoreItem[];
  airSupportCharges: number;
  gpsJammerCharges: number;
  ironBeamActive: boolean;
  ironBeamCreditsPerShot: number;
  spawnTimer: number;
  spawnQueue: ThreatType[];
  waveIntroTimer: number;
  waveClearTimer: number;
  totalIntercepted: number;
  totalMissed: number;
  totalFired: number;
  nextId: number;
  // Special missile effects
  tripleInterceptorTimer: number;
  autoDefenseTimer: number;
  shieldTimer: number;
  empTimer: number;
  // Sound events queue (consumed by UI layer)
  soundEvents: string[];
}
