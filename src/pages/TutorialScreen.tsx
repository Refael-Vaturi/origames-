import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Eye, MessageSquare, Vote, Sparkles, Lightbulb, Users } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";

const TutorialScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const isFirstVisit = searchParams.get("first") === "1";

  const steps = [
    {
      icon: Users,
      titleKey: "tutorial.step0Title",
      descKey: "tutorial.step0Desc",
      color: "hsl(var(--game-cyan))",
      exampleKey: null as string | null,
    },
    {
      icon: Eye,
      titleKey: "tutorial.step1Title",
      descKey: "tutorial.step1Desc",
      color: "hsl(var(--game-purple))",
      exampleKey: "tutorial.step1Example",
    },
    {
      icon: MessageSquare,
      titleKey: "tutorial.step2Title",
      descKey: "tutorial.step2Desc",
      color: "hsl(var(--game-cyan))",
      exampleKey: "tutorial.step2Example",
    },
    {
      icon: Vote,
      titleKey: "tutorial.step3Title",
      descKey: "tutorial.step3Desc",
      color: "hsl(var(--game-pink))",
      exampleKey: null,
    },
    {
      icon: Sparkles,
      titleKey: "tutorial.step4Title",
      descKey: "tutorial.step4Desc",
      color: "hsl(var(--game-yellow))",
      exampleKey: null,
    },
    {
      icon: Lightbulb,
      titleKey: "tutorial.step5Title",
      descKey: "tutorial.step5Desc",
      color: "hsl(var(--game-purple))",
      exampleKey: null,
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  const handleDone = () => {
    localStorage.setItem("fif-tutorial-seen", "1");
    navigate("/", { replace: true });
  };

  const handleBack = () => {
    if (isFirstVisit) return;
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
          {/* Header with back button and language selector */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {!isFirstVisit && (
                <button
                  onClick={handleBack}
                  className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="font-display text-2xl font-bold text-foreground">{t("tutorial.title")}</h1>
            </div>
            <LanguageSelector />
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5 mb-6">
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
                className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ background: current.color }}
              >
                <Icon className="w-10 h-10 text-primary-foreground" />
              </div>

              <h2 className="font-display text-xl font-bold text-foreground mb-3">
                {t(current.titleKey)}
              </h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
                {t(current.descKey)}
              </p>

              {/* Example box */}
              {current.exampleKey && (
                <div className="bg-muted/50 rounded-2xl p-3 mb-4 border border-border">
                  <p className="text-xs font-display font-semibold text-primary mb-1">
                    {t("tutorial.example")}
                  </p>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">
                    {t(current.exampleKey)}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Step counter */}
          <p className="text-center text-xs text-muted-foreground mb-4 font-body">
            {step + 1} / {steps.length}
          </p>

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
