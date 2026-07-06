import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Trophy, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { playClick, playSuccess, playError, playPop } from "@/hooks/useSound";
import { useGameFirstVisit } from "@/hooks/useGameFirstVisit";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";
import { MAX_GUESSES, WORD_LENGTH } from "./words";
import {
  DailyRecord,
  LetterStatus,
  evaluateGuess,
  isValidGuess,
  loadStreak,
  loadTodayRecord,
  pickDailyWord,
  saveTodayRecord,
  scoreForRecord,
  todayKey,
} from "./logic";

const KEY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

const STATUS_BG: Record<LetterStatus, string> = {
  correct: "bg-emerald-500 text-white border-emerald-500",
  present: "bg-amber-400 text-white border-amber-400",
  absent: "bg-muted text-muted-foreground border-muted",
};

const WordLadderGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitScore, userId } = useArcadeScore("word_ladder");
  const { isFirstVisit, markSeen } = useGameFirstVisit("word-ladder");

  const dateKey = useMemo(() => todayKey(), []);
  const answer = useMemo(() => pickDailyWord(dateKey), [dateKey]);

  const [guesses, setGuesses] = useState<string[]>([]);
  const [results, setResults] = useState<LetterStatus[][]>([]);
  const [current, setCurrent] = useState("");
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [shake, setShake] = useState(false);
  const [streak, setStreak] = useState(loadStreak());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showIntro, setShowIntro] = useState(isFirstVisit);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const record = loadTodayRecord(dateKey);
    if (record && record.finished) {
      setGuesses(record.guesses);
      setResults(record.results);
      setFinished(true);
      setWon(record.won);
    }
  }, [dateKey]);

  const keyStatus = useMemo(() => {
    const map: Record<string, LetterStatus> = {};
    results.forEach((row, i) => {
      const g = guesses[i];
      row.forEach((status, j) => {
        const letter = g[j];
        const existing = map[letter];
        if (!existing || (existing !== "correct" && status === "correct") || (existing === "absent" && status === "present")) {
          map[letter] = status;
        }
      });
    });
    return map;
  }, [guesses, results]);

  const submitGuess = useCallback(() => {
    if (finished) return;
    if (!isValidGuess(current)) {
      setShake(true);
      playError();
      setTimeout(() => setShake(false), 400);
      return;
    }
    const evalResult = evaluateGuess(current, answer);
    const newGuesses = [...guesses, current];
    const newResults = [...results, evalResult];
    setGuesses(newGuesses);
    setResults(newResults);
    setCurrent("");

    const isWin = current === answer;
    const isDone = isWin || newGuesses.length >= MAX_GUESSES;
    if (isWin) playSuccess();
    else playPop();

    if (isDone) {
      setFinished(true);
      setWon(isWin);
      const record: DailyRecord = { dateKey, guesses: newGuesses, results: newResults, won: isWin, finished: true };
      saveTodayRecord(record);
      setStreak(loadStreak());
    }
  }, [answer, current, dateKey, finished, guesses, results]);

  const handleKey = useCallback(
    (key: string) => {
      if (finished) return;
      if (key === "ENTER") {
        submitGuess();
      } else if (key === "BACK") {
        setCurrent((c) => c.slice(0, -1));
      } else if (current.length < WORD_LENGTH) {
        playClick();
        setCurrent((c) => c + key);
      }
    },
    [current.length, finished, submitGuess],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleKey("ENTER");
      else if (e.key === "Backspace") handleKey("BACK");
      else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleKey]);

  const finalScore = finished ? scoreForRecord({ dateKey, guesses, results, won, finished }) : 0;

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: "Sign in to submit your score" });
      navigate("/auth?redirect=/word-ladder");
      return;
    }
    const r = await submitScore(finalScore, 1, { won, guesses: guesses.length });
    if (r.ok) {
      setSubmitted(true);
      toast({ title: "Score submitted!", description: `${finalScore} points` });
      setRefreshKey((k) => k + 1);
    } else {
      toast({ title: "Failed to submit", variant: "destructive" });
    }
  };

  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => {
    if (i < guesses.length) return { letters: guesses[i].split(""), status: results[i] };
    if (i === guesses.length && !finished) return { letters: current.padEnd(WORD_LENGTH, " ").split(""), status: null };
    return { letters: Array(WORD_LENGTH).fill(""), status: null };
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-sm flex flex-col items-center px-4 pt-4 pb-8" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
        <div className="w-full flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="font-display font-bold text-foreground">Word Ladder</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Flame className={`w-4 h-4 ${streak.streak > 0 ? "text-orange-500" : ""}`} />
            {streak.streak}
          </div>
        </div>

        <motion.div
          className="grid grid-rows-6 gap-1.5 mb-5"
          animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.35 }}
        >
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-5 gap-1.5">
              {row.letters.map((letter, j) => (
                <div
                  key={j}
                  className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-md border-2 font-display font-bold text-xl uppercase ${
                    row.status ? STATUS_BG[row.status[j]] : letter.trim() ? "border-foreground/40 text-foreground" : "border-border text-foreground"
                  }`}
                >
                  {letter.trim()}
                </div>
              ))}
            </div>
          ))}
        </motion.div>

        {!finished && (
          <div className="w-full space-y-1.5">
            {KEY_ROWS.map((row, i) => (
              <div key={i} className="flex justify-center gap-1">
                {row.map((key) => {
                  const status = keyStatus[key];
                  const isSpecial = key === "ENTER" || key === "BACK";
                  return (
                    <button
                      key={key}
                      onClick={() => handleKey(key)}
                      className={`h-11 rounded-md font-display font-semibold text-xs flex items-center justify-center active:scale-95 transition ${
                        isSpecial ? "px-3 bg-muted text-foreground" : "w-8"
                      } ${!isSpecial && status ? STATUS_BG[status] : !isSpecial ? "bg-card border border-border text-foreground" : ""}`}
                    >
                      {key === "BACK" ? <Delete className="w-4 h-4" /> : key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {finished && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mt-2 space-y-4 text-center"
            >
              <h2 className="font-display font-bold text-xl">
                {won ? "Nice one! 🎉" : `The word was ${answer}`}
              </h2>
              <div className="text-3xl font-black tabular-nums text-primary">{finalScore}</div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" /> Streak {streak.streak}
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> Best {streak.best}
                </span>
              </div>
              <Button
                className="w-full"
                onClick={submitToLeaderboard}
                disabled={submitted}
              >
                {submitted ? "Submitted" : "Submit Score"}
              </Button>
              <ArcadeLeaderboard gameId="word_ladder" currentUserId={userId} refreshKey={refreshKey} />
              <p className="text-xs text-muted-foreground">Come back tomorrow for a new word!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <div className="max-w-sm w-full text-center text-white space-y-5">
              <div className="text-5xl">🔤</div>
              <h1 className="text-2xl font-display font-bold">Word Ladder</h1>
              <p className="text-sm text-white/70">
                Guess the 5-letter word in 6 tries. After each guess, tiles turn{" "}
                <span className="text-emerald-400 font-semibold">green</span> if the letter is correct and in the
                right spot, <span className="text-amber-400 font-semibold">yellow</span> if it's in the word but the
                wrong spot, and gray if it's not in the word at all. A new word every day!
              </p>
              <Button
                size="lg"
                className="w-full font-bold"
                onClick={() => {
                  playClick();
                  markSeen();
                  setShowIntro(false);
                }}
              >
                Let's Go
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WordLadderGame;
