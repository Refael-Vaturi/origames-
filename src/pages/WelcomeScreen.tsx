import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import logoImage from "@/assets/logo.png";
import heroImage from "@/assets/hero-characters.png";

const WelcomeScreen = () => {
  const navigate = useNavigate();
  const { t, toggleLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-game-pink/20 animate-float" />
        <div className="absolute top-32 right-16 w-14 h-14 rounded-full bg-game-cyan/20 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-20 left-20 w-16 h-16 rounded-full bg-game-yellow/20 animate-float" style={{ animationDelay: "0.5s" }} />
        <div className="absolute bottom-32 right-10 w-12 h-12 rounded-full bg-game-purple/20 animate-float" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Language toggle */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-4 end-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-card shadow-card text-foreground font-body text-sm hover:bg-muted transition-colors"
        onClick={toggleLanguage}
      >
        <Globe className="w-4 h-4" />
        {t("general.language")}
      </motion.button>

      {/* Logo */}
      <motion.img
        src={logoImage}
        alt="Fake It Fast"
        className="w-64 md:w-80 mb-2"
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
      />

      {/* Characters */}
      <motion.img
        src={heroImage}
        alt="Game characters"
        className="w-56 md:w-72 mb-4"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      />

      {/* Tagline */}
      <motion.p
        className="text-lg md:text-xl text-muted-foreground font-body mb-8 text-center max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {t("welcome.tagline")}
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        className="flex flex-col gap-3 w-full max-w-xs"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <Button variant="hero" size="xl" onClick={() => navigate("/auth")}>
          {t("welcome.login")}
        </Button>
        <Button variant="game" size="lg" onClick={() => navigate("/")}>
          {t("welcome.guest")}
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate("/join")}>
          {t("welcome.joinCode")}
        </Button>
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;
