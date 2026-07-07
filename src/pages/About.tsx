import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import logoImage from "@/assets/ori-games-logo.png";
import { useLanguage } from "@/contexts/LanguageContext";

const About = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {t("arcade.back")}
        </button>

        <motion.div
          className="flex flex-col items-center mb-8"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <img src={logoImage} alt="Ori Games" className="w-20 h-20 mb-3" />
          <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-primary to-[hsl(var(--game-pink))] bg-clip-text text-transparent">
            {t("about.title")}
          </h1>
        </motion.div>

        <article className="prose prose-invert max-w-none text-foreground space-y-5 font-body leading-relaxed">
          <p>{t("about.intro")}</p>

          <h2 className="font-display text-2xl font-bold mt-8">{t("about.heading1")}</h2>
          <p>{t("about.section1Intro")}</p>
          <ul className="list-disc ps-6 space-y-2">
            <li>{t("about.fakeItFast")}</li>
            <li>{t("about.ironDome")}</li>
            <li>{t("about.arcadeCollection")}</li>
          </ul>
          <p>{t("about.section1Closing")}</p>

          <h2 className="font-display text-2xl font-bold mt-8">{t("about.heading2")}</h2>
          <p>{t("about.builtForEveryone")}</p>

          <h2 className="font-display text-2xl font-bold mt-8">{t("about.heading3")}</h2>
          <p>{t("about.socialConnected")}</p>

          <h2 className="font-display text-2xl font-bold mt-8">{t("about.heading4")}</h2>
          <p>{t("about.polishedPlayful")}</p>

          <h2 className="font-display text-2xl font-bold mt-8">{t("about.heading5")}</h2>
          <p>{t("about.globalPlayground")}</p>

          <p>{t("about.closing")}</p>
        </article>
      </div>
    </div>
  );
};

export default About;
