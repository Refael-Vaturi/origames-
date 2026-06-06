import { supabase } from "@/integrations/supabase/client";

export interface RecordingEvent {
  t: number; // ms since start
  type: string;
  data?: Record<string, unknown>;
}

/**
 * Save a finished game session to the global game_recordings table.
 * Works for guests (user_id = null) and signed-in users.
 */
export async function recordGameSession(params: {
  game: string;
  events: RecordingEvent[];
  summary?: Record<string, unknown>;
  score?: number;
  durationMs?: number;
  username?: string | null;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    // Cap event count to avoid bloating storage
    const safeEvents = params.events.slice(-2000);
    await (supabase.from as any)("game_recordings").insert({
      user_id: user?.id ?? null,
      username: params.username ?? null,
      game: params.game,
      events: safeEvents,
      summary: params.summary ?? {},
      score: params.score ?? 0,
      duration_ms: params.durationMs ?? 0,
    });
  } catch (e) {
    // Silent fail — recording is best-effort
    console.warn("[gameRecording] failed", e);
  }
}
