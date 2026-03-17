import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Users, Wifi } from "lucide-react";

const MatchmakingScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [dots, setDots] = useState("");
  const [playersFound, setPlayersFound] = useState(1);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    const playerInterval = setInterval(() => {
      setPlayersFound((prev) => {
        if (prev >= 6) {
          clearInterval(playerInterval);
          setTimeout(() => navigate("/game"), 1500);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => {
      clearInterval(dotInterval);
      clearInterval(playerInterval);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        className="w-full max-w-sm text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="bg-card rounded-3xl p-8 shadow-card">
          {/* Back button */}
          <div className="flex items-start mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Searching animation */}
          <motion.div
            className="w-24 h-24 mx-auto mb-6 rounded-full gradient-hero flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Globe className="w-12 h-12 text-primary-foreground" />
          </motion.div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            {t("matchmaking.searching")}{dots}
          </h1>
          <p className="text-sm text-muted-foreground font-body mb-6">
            {t("matchmaking.finding")}
          </p>

          {/* Players found indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold text-foreground">
              {playersFound}/6 {t("general.players")}
            </span>
          </div>

          {/* Player dots */}
          <div className="flex justify-center gap-3 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm ${
                  i < playersFound
                    ? "text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                style={i < playersFound ? { background: `hsl(${200 + i * 40} 70% 55%)` } : {}}
                initial={i < playersFound ? { scale: 0 } : {}}
                animate={i < playersFound ? { scale: 1 } : {}}
                transition={{ type: "spring", delay: i * 0.1 }}
              >
                {i < playersFound ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  "?"
                )}
              </motion.div>
            ))}
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate("/")}
          >
            {t("matchmaking.cancel")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default MatchmakingScreen;
