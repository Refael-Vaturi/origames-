import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Eye, MessageSquare, Vote, Sparkles } from "lucide-react";

const TutorialScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const isFirstVisit = searchParams.get("first") === "1";

  const steps = [
    {
      icon: Eye,
      titleKey: "tutorial.step1Title",
      descKey: "tutorial.step1Desc",
      color: "hsl(var(--game-purple))",
    },
    {
      icon: MessageSquare,
      titleKey: "tutorial.step2Title",
      descKey: "tutorial.step2Desc",
      color: "hsl(var(--game-cyan))",
    },
    {
      icon: Vote,
      titleKey: "tutorial.step3Title",
      descKey: "tutorial.step3Desc",
      color: "hsl(var(--game-pink))",
    },
    {
      icon: Sparkles,
      titleKey: "tutorial.step4Title",
      descKey: "tutorial.step4Desc",
      color: "hsl(var(--game-yellow))",
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  const handleDone = () => {
    localStorage.setItem("fif-tutorial-seen", "1");
    navigate("/", { replace: true });
  };

  const handleBack = () => {
    if (isFirstVisit) return; // Can't go back on first visit
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="bg-card rounded-3xl p-8 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            {!isFirstVisit && (
              <button
                onClick={handleBack}
                className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground flex items-center gap-1"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-body">{t("general.back")}</span>
              </button>
            )}
            <h1 className="font-display text-2xl font-bold text-foreground">{t("tutorial.title")}</h1>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ background: current.color }}
              >
                <Icon className="w-10 h-10 text-primary-foreground" />
              </div>

              <h2 className="font-display text-xl font-bold text-foreground mb-3">
                {t(current.titleKey)}
              </h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed mb-8">
                {t(current.descKey)}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="w-4 h-4" />
                {t("general.back")}
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                variant="hero"
                size="lg"
                className="flex-1"
                onClick={() => setStep(step + 1)}
              >
                {t("tutorial.next")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="hero"
                size="lg"
                className="flex-1"
                onClick={handleDone}
              >
                {t("tutorial.done")}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TutorialScreen;
