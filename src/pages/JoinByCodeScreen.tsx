import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hash } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const JoinByCodeScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (code.trim().length < 4) return;

    if (!user) {
      toast({ title: "Login required", variant: "destructive" });
      navigate("/auth");
      return;
    }

    setLoading(true);
    const { data: room } = await supabase
      .from("rooms")
      .select("id, code, status")
      .eq("code", code.trim())
      .single();

    if (!room) {
      toast({ title: t("join.notFound") || "Room not found", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Join the room
    await supabase.from("room_players").upsert({
      room_id: room.id,
      user_id: user.id,
      is_ready: false,
    }, { onConflict: "room_id,user_id" });

    setLoading(false);
    navigate(`/lobby?code=${room.code}`);
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
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">{t("join.title")}</h1>
          </div>

          <div className="relative mb-4">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("join.placeholder")}
              maxLength={8}
              className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-input bg-background font-display text-xl tracking-widest text-center text-foreground placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-base focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <Button
            variant="hero"
            size="xl"
            className="w-full mb-4"
            onClick={handleJoin}
            disabled={code.trim().length < 4 || loading}
          >
            {loading ? "..." : t("join.button")}
          </Button>

          <p className="text-center text-sm text-muted-foreground font-body">
            {t("join.orLink")}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinByCodeScreen;
