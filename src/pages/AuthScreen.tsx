import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";

const AuthScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const redirectPath = useMemo(() => {
    const target = searchParams.get("redirect") || "/home";
    if (!target.startsWith("/") || target.startsWith("//")) return "/home";
    return target;
  }, [searchParams]);

  const modeFromUrl = searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(modeFromUrl);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(modeFromUrl);
  }, [modeFromUrl]);

  const handleAuthError = (error: unknown) => {
    const message = String((error as { message?: string })?.message || error || "");

    if (message.includes("Email not confirmed") || message.includes("email_not_confirmed")) {
      toast({ title: t("auth.emailNotConfirmed"), variant: "destructive" });
      return;
    }

    if (message.includes("Invalid login credentials") || message.includes("invalid_credentials")) {
      toast({ title: t("auth.invalidCredentials"), variant: "destructive" });
      return;
    }

    toast({ title: t("auth.error") || "Error", description: message, variant: "destructive" });
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + redirectPath,
      });

      if (result.error) handleAuthError(result.error);
    } catch (e) {
      handleAuthError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin + redirectPath,
      });

      if (result.error) handleAuthError(result.error);
    } catch (e) {
      handleAuthError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || "Player" },
            emailRedirectTo: window.location.origin + redirectPath,
          },
        });

        if (error) throw error;

        toast({ title: t("auth.checkEmail") || "Check your email to confirm!" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirectPath, { replace: true });
      }
    } catch (e) {
      handleAuthError(e);
    } finally {
      setLoading(false);
    }
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
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {mode === "login" ? t("auth.login") : t("auth.register")}
            </h1>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-12 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground flex items-center justify-center gap-3 hover:bg-muted transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("auth.google")}
            </button>

            <button
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full h-12 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground flex items-center justify-center gap-3 hover:bg-muted transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.12 4.52-3.74 4.25z"/>
              </svg>
              {t("auth.apple")}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-body">{t("auth.or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3 mb-4">
            {mode === "register" && (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("auth.displayName")}
                className="w-full h-12 px-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            )}
            <div className="relative">
              <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email")}
                className="w-full h-12 ps-11 pe-4 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="relative">
              <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.password")}
                className="w-full h-12 ps-11 pe-11 rounded-2xl border-2 border-input bg-background font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                type="button"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button variant="hero" size="xl" className="w-full mb-4" onClick={handleSubmit} disabled={loading}>
            {loading ? "..." : mode === "login" ? t("auth.loginBtn") : t("auth.registerBtn")}
          </Button>

          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="w-full text-center text-sm text-primary font-body hover:underline"
          >
            {mode === "login" ? t("auth.switchRegister") : t("auth.switchLogin")}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
