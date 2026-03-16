import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Edit2 } from "lucide-react";

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState("Player123");
  const [username, setUsername] = useState("@player123");
  const [isEditing, setIsEditing] = useState(false);

  const stats = [
    { label: t("profile.gamesPlayed"), value: 24 },
    { label: t("profile.wins"), value: 8 },
    { label: t("profile.caught"), value: 15 },
    { label: t("profile.survived"), value: 6 },
  ];

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
            <h1 className="font-display text-2xl font-bold text-foreground">{t("profile.title")}</h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="ms-auto p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full gradient-hero flex items-center justify-center font-display text-3xl font-bold text-primary-foreground">
                {displayName[0]}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 end-0 w-8 h-8 rounded-full bg-card shadow-card flex items-center justify-center text-muted-foreground">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="mt-4 w-full space-y-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("profile.displayName")}
                  className="w-full h-11 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground text-center placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username"
                  className="w-full h-11 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground text-center placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <Button variant="game" size="lg" className="w-full" onClick={() => setIsEditing(false)}>
                  {t("profile.save")}
                </Button>
              </div>
            ) : (
              <>
                <h2 className="mt-3 font-display text-xl font-bold text-foreground">{displayName}</h2>
                <p className="text-sm text-muted-foreground font-body">{username}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Level 1 · 0 XP</p>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-background rounded-2xl p-3 text-center">
                <p className="font-display text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-body">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileScreen;
