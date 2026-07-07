import { QUESTIONS, QUESTIONS_PER_DAY, TriviaQuestion } from "./questions";

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Deterministic PRNG (mulberry32) seeded from the date, so every player gets
// the same daily question set with no server round-trip required.
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickDailyQuestions(dateKey: string = todayKey()): TriviaQuestion[] {
  const rand = seededRandom(hashString(dateKey));
  const pool = [...QUESTIONS];
  // Fisher-Yates shuffle, then take the first N
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUESTIONS_PER_DAY);
}

export interface DailyRecord {
  dateKey: string;
  answers: (number | null)[];
  correctCount: number;
  finished: boolean;
}

export interface StreakData {
  streak: number;
  best: number;
  lastPlayDate: string | null;
  totalPlayed: number;
}

const STREAK_KEY = "dailyTriviaStreak";
const RECORD_PREFIX = "dailyTriviaDay-";

export function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { streak: 0, best: 0, lastPlayDate: null, totalPlayed: 0 };
}

function saveStreak(data: StreakData) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadTodayRecord(dateKey: string = todayKey()): DailyRecord | null {
  try {
    const raw = localStorage.getItem(RECORD_PREFIX + dateKey);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

function isYesterday(dateKey: string, today: string): boolean {
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  const y = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return dateKey === y;
}

export function saveTodayRecord(record: DailyRecord) {
  try {
    localStorage.setItem(RECORD_PREFIX + record.dateKey, JSON.stringify(record));
  } catch {
    /* ignore */
  }
  if (!record.finished) return;

  const streakData = loadStreak();
  const alreadyCounted = streakData.lastPlayDate === record.dateKey;
  if (!alreadyCounted) {
    streakData.totalPlayed += 1;
    const continuing = streakData.lastPlayDate && isYesterday(streakData.lastPlayDate, record.dateKey);
    streakData.streak = continuing ? streakData.streak + 1 : 1;
    streakData.best = Math.max(streakData.best, streakData.streak);
    streakData.lastPlayDate = record.dateKey;
    saveStreak(streakData);
  }
}

export function scoreForRecord(record: DailyRecord): number {
  return record.correctCount * 100;
}
