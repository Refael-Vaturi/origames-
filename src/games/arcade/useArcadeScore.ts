import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type GameId = "clicker" | "color_identify" | "city_find";

export const useArcadeScore = (gameId: GameId) => {
  const { user, profile } = useAuth();

  const submitScore = useCallback(
    async (score: number, level: number = 1, metadata: Record<string, unknown> = {}) => {
      if (!user) return { ok: false, reason: "not_authenticated" as const };
      const { error } = await supabase.from("arcade_scores").insert({
        user_id: user.id,
        display_name: profile?.display_name || "Player",
        game_id: gameId,
        score,
        level,
        metadata,
      });
      return { ok: !error, error };
    },
    [user, profile, gameId]
  );

  return { submitScore, userId: user?.id };
};
