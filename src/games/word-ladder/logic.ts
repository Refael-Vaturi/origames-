import type { Language } from "@/contexts/LanguageContext";
import { MAX_GUESSES, getLetterPattern, getWordList } from "./words";

export type LetterStatus = "correct" | "present" | "absent";

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

export function pickDailyWord(language: Language, dateKey: string = todayKey()): string {
  const list = getWordList(language);
  const idx = hashString(dateKey) % list.length;
  return list[idx];
}

export function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const length = answer.length;
  const result: LetterStatus[] = new Array(length).fill("absent");
  const answerLetters = answer.split("");
  const used = new Array(length).fill(false);

  for (let i = 0; i < length; i++) {
    if (guess[i] === answerLetters[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < length; i++) {
    if (result[i] === "correct") continue;
    const idx = answerLetters.findIndex((l, j) => l === guess[i] && !used[j]);
    if (idx !== -1) {
      result[i] = "present";
      used[idx] = true;
    }
  }
  return result;
}

export function isValidGuess(guess: string, language: Language): boolean {
  const wordLength = getWordList(language)[0]?.length ?? 5;
  if ([...guess].length !== wordLength) return false;
  const pattern = getLetterPattern(language);
  return [...guess].every((ch) => pattern.test(ch));
}

export interface DailyRecord {
  dateKey: string;
  guesses: string[];
  results: LetterStatus[][];
  won: boolean;
  finished: boolean;
}

export interface StreakData {
  streak: number;
  best: number;
  lastWinDate: string | null;
  totalPlayed: number;
  totalWon: number;
}

const STREAK_KEY = "wordLadderStreak";
const RECORD_PREFIX = "wordLadderDay-";

export function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { streak: 0, best: 0, lastWinDate: null, totalPlayed: 0, totalWon: 0 };
}

function saveStreak(data: StreakData) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadTodayRecord(language: Language, dateKey: string = todayKey()): DailyRecord | null {
  try {
    const raw = localStorage.getItem(RECORD_PREFIX + language + "-" + dateKey);
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

export function saveTodayRecord(record: DailyRecord, language: Language) {
  try {
    localStorage.setItem(RECORD_PREFIX + language + "-" + record.dateKey, JSON.stringify(record));
  } catch {
    /* ignore */
  }
  if (!record.finished) return;

  const streakData = loadStreak();
  streakData.totalPlayed += 1;
  if (record.won) {
    streakData.totalWon += 1;
    const continuing = streakData.lastWinDate && isYesterday(streakData.lastWinDate, record.dateKey);
    streakData.streak = continuing ? streakData.streak + 1 : 1;
    streakData.best = Math.max(streakData.best, streakData.streak);
    streakData.lastWinDate = record.dateKey;
  } else {
    streakData.streak = 0;
  }
  saveStreak(streakData);
}

export function scoreForRecord(record: DailyRecord): number {
  if (!record.won) return 0;
  const guessesUsed = record.guesses.length;
  return Math.max(0, (MAX_GUESSES - guessesUsed + 1) * 150);
}
