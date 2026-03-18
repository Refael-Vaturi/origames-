import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Edit2, Share2, Loader2, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "Player");
  const [username, setUsername] = useState(profile?.username || "");
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setUsername(profile.username || "");
    }
  }, [profile]);

  const stats = [
    { label: t("profile.gamesPlayed"), value: profile?.games_played || 0 },
    { label: t("profile.wins"), value: profile?.wins || 0 },
    { label: t("profile.caught"), value: profile?.fakes_caught || 0 },
    { label: t("profile.survived"), value: profile?.survived || 0 },
  ];

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Login required", variant: "destructive" });
      return;
    }

    // Validate username
    if (username && username.length < 3) {
      toast({ title: t("profile.usernameTooShort") || "Username must be at least 3 characters", variant: "destructive" });
      return;
    }

    // Check uniqueness
    if (username) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username)
        .neq("user_id", user.id)
        .limit(1);

      if (existing && existing.length > 0) {
        toast({ title: t("profile.usernameTaken") || "Username already taken", variant: "destructive" });
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, username: username || null })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("profile.save") + " ✅" });
      await refreshProfile();
      setIsEditing(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be under 2MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      await refreshProfile();
      toast({ title: t("profile.avatarUpdated") || "Avatar updated! 📸" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleShare = async () => {
    const shareText = `🎮 ${displayName} | Lv.${profile?.level || 1} | ${profile?.wins || 0} Wins | Fake It Fast`;
    const shareUrl = `${window.location.origin}/profile`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Fake It Fast - Player Profile",
          text: shareText,
          url: shareUrl,
        });
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          toast({ title: "Share failed", variant: "destructive" });
        }
      }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast({ title: t("friends.idCopied") || "Copied to clipboard! 📋" });
    }
  };

  const handleCopyUsername = async () => {
    const name = profile?.username || profile?.display_name || "";
    await navigator.clipboard.writeText(name);
    setCopied(true);
    toast({ title: t("friends.idCopied") || "Copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />

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
            <div className="ms-auto flex gap-1">
              <button
                onClick={handleShare}
                className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
                title="Share profile"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full gradient-hero flex items-center justify-center font-display text-3xl font-bold text-primary-foreground">
                  {displayName[0]}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 end-0 w-8 h-8 rounded-full bg-card shadow-card flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
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
                <div className="relative">
                  <span className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="username"
                    className="w-full h-11 ps-8 pe-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground text-center placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <p className="text-xs text-muted-foreground font-body text-center">
                  {t("profile.usernameHint") || "Lowercase letters, numbers and underscores only"}
                </p>
                <Button variant="game" size="lg" className="w-full" onClick={handleSave}>
                  {t("profile.save")}
                </Button>
              </div>
            ) : (
              <>
                <h2 className="mt-3 font-display text-xl font-bold text-foreground">{displayName}</h2>
                {username ? (
                  <button
                    onClick={handleCopyUsername}
                    className="flex items-center gap-1 text-sm text-muted-foreground font-body hover:text-primary transition-colors"
                  >
                    @{username}
                    {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-primary font-body underline"
                  >
                    {t("profile.setUsername") || "Set a username"}
                  </button>
                )}
                {(() => {
                  const xp = profile?.xp || 0;
                  const level = profile?.level || 1;
                  const xpInLevel = xp % 100;
                  return (
                    <div className="w-full mt-3 px-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display text-sm font-bold text-primary">Lv.{level}</span>
                        <span className="text-xs text-muted-foreground font-body">{xp} XP</span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                          style={{ width: `${xpInLevel}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground font-body mt-1 text-center">
                        {100 - xpInLevel} XP {t("profile.toNextLevel") || "to next level"}
                      </p>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                className="bg-background rounded-2xl p-3 text-center"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <p className="font-display text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-body">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {!user && (
            <Button variant="hero" size="lg" className="w-full mt-4" onClick={() => navigate("/auth")}>
              {t("auth.loginBtn")}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileScreen;
