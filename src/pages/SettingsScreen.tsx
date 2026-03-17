import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Volume2, VolumeX, Moon, Sun, Vibrate, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { playClick, setSoundEnabled, isSoundEnabled } from "@/hooks/useSound";

const SettingsScreen = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, toggleLanguage, language } = useLanguage();
  const [sound, setSound] = useState(isSoundEnabled());
  const [vibration, setVibration] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-7 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"} relative`}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-card shadow transition-all ${value ? "left-6" : "left-1"}`} />
    </button>
  );

  const SettingRow = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm font-body text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="bg-card rounded-3xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">{t("settings.title")}</h1>
          </div>

          <div className="divide-y divide-border">
            <SettingRow icon={Globe} label={t("settings.language")}>
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-xl bg-muted font-display text-sm font-semibold text-foreground hover:bg-primary/20 transition-colors"
              >
                {language === "en" ? "עברית" : "English"}
              </button>
            </SettingRow>

            <SettingRow icon={sound ? Volume2 : VolumeX} label={t("settings.sound")}>
              <Toggle value={sound} onChange={(v) => { setSound(v); setSoundEnabled(v); if (v) playClick(); }} />
            </SettingRow>

            <SettingRow icon={Vibrate} label={t("settings.vibration")}>
              <Toggle value={vibration} onChange={setVibration} />
            </SettingRow>

            <SettingRow icon={darkMode ? Moon : Sun} label={t("settings.darkMode")}>
              <Toggle
                value={darkMode}
                onChange={(v) => {
                  setDarkMode(v);
                  document.documentElement.classList.toggle("dark", v);
                }}
              />
            </SettingRow>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <button className="flex items-center gap-3 w-full py-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
              <Info className="w-5 h-5" />
              {t("settings.about")}
            </button>
          </div>

          <Button variant="outline" size="lg" className="w-full mt-4" onClick={async () => {
            await signOut();
            navigate("/");
          }}>
            {t("settings.logout")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsScreen;
