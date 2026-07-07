import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Trophy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { playClick, playSuccess, playError } from "@/hooks/useSound";
import { useGameFirstVisit } from "@/hooks/useGameFirstVisit";
import ArcadeLeaderboard from "../arcade/ArcadeLeaderboard";
import { useArcadeScore } from "../arcade/useArcadeScore";
import { toast } from "@/hooks/use-toast";
import { DailyTriviaGlyph } from "./MenuArt";
import { QUESTIONS } from "./questions";
import { localizeQuestion, preloadTriviaTranslations } from "./localize";
import {
  DailyRecord,
  loadStreak,
  loadTodayRecord,
  pickDailyQuestions,
  saveTodayRecord,
  scoreForRecord,
  todayKey,
} from "./logic";

const DailyTriviaGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tf, language } = useLanguage();
  const { submitScore, userId } = useArcadeScore("daily_trivia");
  const { isFirstVisit, markSeen } = useGameFirstVisit("daily-trivia");

  const dateKey = useMemo(() => todayKey(), []);
  const rawQuestions = useMemo(() => pickDailyQuestions(dateKey), [dateKey]);

  const [translationsTick, setTranslationsTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    preloadTriviaTranslations(language).then(() => {
      if (!cancelled) setTranslationsTick((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const questions = useMemo(
    () => rawQuestions.map((q) => localizeQuestion(q, QUESTIONS.indexOf(q), language)),
    // translationsTick intentionally forces a recompute once async translations resolve
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawQuestions, language, translationsTick],
  );

  const existingRecord = useMemo(() => loadTodayRecord(dateKey), [dateKey]);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => existingRecord?.answers ?? Array(questions.length).fill(null));
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(!!existingRecord?.finished);
  const [streak, setStreak] = useState(loadStreak());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showIntro, setShowIntro] = useState(isFirstVisit);
  const [submitted, setSubmitted] = useState(false);

  const q = questions[current];
  const correctCount = answers.filter((a, i) => a === questions[i]?.correct).length;
  const finalScore = finished ? scoreForRecord({ dateKey, answers, correctCount, finished: true }) : 0;

  const choose = (choiceIndex: number) => {
    if (selected !== null || finished) return;
    setSelected(choiceIndex);
    const isCorrect = choiceIndex === q.correct;
    if (isCorrect) playSuccess();
    else playError();

    const newAnswers = [...answers];
    newAnswers[current] = choiceIndex;
    setAnswers(newAnswers);

    setTimeout(() => {
      if (current + 1 < questions.length) {
        setCurrent((c) => c + 1);
        setSelected(null);
      } else {
        const finalCorrect = newAnswers.filter((a, i) => a === questions[i]?.correct).length;
        const record: DailyRecord = { dateKey, answers: newAnswers, correctCount: finalCorrect, finished: true };
        saveTodayRecord(record);
        setStreak(loadStreak());
        setFinished(true);
      }
    }, 900);
  };

  const submitToLeaderboard = async () => {
    if (!user) {
      toast({ title: t("arcade.signInToSubmit") });
      navigate("/auth?redirect=/daily-trivia");
      return;
    }
    const r = await submitScore(finalScore, 1, { correctCount, total: questions.length });
    if (r.ok) {
      setSubmitted(true);
      toast({ title: t("arcade.scoreSubmittedToast"), description: `${finalScore} points` });
      setRefreshKey((k) => k + 1);
    } else {
      toast({ title: t("arcade.failedToSubmit"), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-sm flex flex-col items-center px-4 pt-4 pb-8" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
        <div className="w-full flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => { playClick(); navigate("/"); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> {t("arcade.back")}
          </Button>
          <h1 className="font-display font-bold text-foreground">Daily Trivia</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Flame className={`w-4 h-4 ${streak.streak > 0 ? "text-orange-500" : ""}`} />
            {streak.streak}
          </div>
        </div>

        {!finished && q && (
          <>
            <div className="w-full flex items-center gap-1.5 mb-6">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < current ? "bg-primary" : i === current ? "bg-primary/50" : "bg-muted"}`}
                />
              ))}
            </div>

            <div className="w-full text-xs font-semibold text-primary uppercase tracking-wide mb-2">{t(`trivia.category.${q.category}`)}</div>
            <motion.h2
              key={current}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full text-lg font-display font-bold text-foreground mb-6 min-h-[3.5rem]"
            >
              {q.q}
            </motion.h2>

            <div className="w-full space-y-2.5">
              {q.choices.map((choice, i) => {
                const isSelected = selected === i;
                const isCorrectChoice = i === q.correct;
                const showResult = selected !== null;
                let cls = "border-border bg-card text-foreground";
                if (showResult && isCorrectChoice) cls = "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                else if (showResult && isSelected && !isCorrectChoice) cls = "border-destructive bg-destructive/10 text-destructive";

                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={selected !== null}
                    className={`w-full text-left rtl:text-right px-4 py-3 rounded-xl border-2 font-medium transition flex items-center justify-between gap-2 ${cls}`}
                  >
                    <span>{choice}</span>
                    {showResult && isCorrectChoice && <Check className="w-4 h-4 shrink-0" />}
                    {showResult && isSelected && !isCorrectChoice && <X className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <AnimatePresence>
          {finished && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mt-2 space-y-4 text-center"
            >
              <h2 className="font-display font-bold text-xl">
                {correctCount === questions.length
                  ? t("dailyTrivia.perfectScore")
                  : tf("dailyTrivia.scoreOutOf", { correct: correctCount, total: questions.length })}
              </h2>
              <div className="text-3xl font-black tabular-nums text-primary">{finalScore}</div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" /> Streak {streak.streak}
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> {t("arcade.bestLabel")} {streak.best}
                </span>
              </div>
              <Button className="w-full" onClick={submitToLeaderboard} disabled={submitted}>
                {submitted ? t("arcade.submitted") : t("arcade.submitScore")}
              </Button>
              <ArcadeLeaderboard gameId="daily_trivia" currentUserId={userId} refreshKey={refreshKey} />
              <p className="text-xs text-muted-foreground">{t("dailyTrivia.comeBackTomorrow")}</p>
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
              <DailyTriviaGlyph />
              <h1 className="text-2xl font-display font-bold">Daily Trivia</h1>
              <p className="text-sm text-white/70">{t("dailyTrivia.intro")}</p>
              <Button
                size="lg"
                className="w-full font-bold"
                onClick={() => {
                  playClick();
                  markSeen();
                  setShowIntro(false);
                }}
              >
                {t("dailyTrivia.start")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyTriviaGame;
