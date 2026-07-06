import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WORDS = [
  { en: "Basketball", he: "כדורסל" },
  { en: "Pizza", he: "פיצה" },
  { en: "Dog", he: "כלב" },
  { en: "Guitar", he: "גיטרה" },
  { en: "Beach", he: "חוף" },
  { en: "Coffee", he: "קפה" },
  { en: "Airplane", he: "מטוס" },
  { en: "Moon", he: "ירח" },
  { en: "Doctor", he: "רופא" },
  { en: "Chocolate", he: "שוקולד" },
  { en: "Rain", he: "גשם" },
  { en: "Lion", he: "אריה" },
  { en: "Bicycle", he: "אופניים" },
  { en: "Apple", he: "תפוח" },
  { en: "Camera", he: "מצלמה" },
  { en: "Elephant", he: "פיל" },
  { en: "Ice Cream", he: "גלידה" },
  { en: "Volcano", he: "הר געש" },
  { en: "Sunglasses", he: "משקפי שמש" },
  { en: "Penguin", he: "פינגווין" },
  { en: "Dentist", he: "רופא שיניים" },
  { en: "Umbrella", he: "מטריה" },
  { en: "Robot", he: "רובוט" },
  { en: "Pirate", he: "פיראט" },
  { en: "Snowman", he: "איש שלג" },
  { en: "Butterfly", he: "פרפר" },
  { en: "Popcorn", he: "פופקורן" },
  { en: "Lighthouse", he: "מגדלור" },
  { en: "Kangaroo", he: "קנגורו" },
  { en: "Fireworks", he: "זיקוקים" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { room_id, round_number } = body;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ─── Verify the caller is actually a member of this room ───
    let callerId: string | null = null;

    if (body.guest_player_id && body.guest_token) {
      const { data: session } = await admin
        .from("room_guest_sessions")
        .select("room_player_id")
        .eq("room_player_id", body.guest_player_id)
        .eq("session_token", body.guest_token)
        .single();
      if (session) {
        const { data: guestPlayer } = await admin
          .from("room_players")
          .select("id")
          .eq("id", session.room_player_id)
          .eq("room_id", room_id)
          .single();
        if (guestPlayer) callerId = guestPlayer.id;
      }
    }

    if (!callerId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await admin.auth.getUser(token);
        if (!userError && userData?.user?.id) {
          const { data: player } = await admin
            .from("room_players")
            .select("id")
            .eq("room_id", room_id)
            .eq("user_id", userData.user.id)
            .single();
          if (player) callerId = player.id;
        }
      }
    }

    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NOTE: fake_player_id is intentionally still returned to every room
    // member here — GameScreen.tsx keeps the round only in local state (no
    // later re-fetch/reveal endpoint) and needs it client-side, for every
    // player, to render the post-vote reveal. Masking it per-caller would
    // break the reveal screen for everyone except the fake player. The real
    // fix (only disclosing it once voting closes) requires a separate
    // reveal endpoint / client refactor, tracked as follow-up, not done here.
    const sanitize = (r: Record<string, unknown>) => r;

    // Check if round already exists (idempotent)
    const { data: existing } = await admin
      .from("game_rounds")
      .select("*")
      .eq("room_id", room_id)
      .eq("round_number", round_number)
      .single();

    if (existing) {
      return new Response(JSON.stringify(sanitize(existing)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get players in room
    const { data: players } = await admin
      .from("room_players")
      .select("id")
      .eq("room_id", room_id);

    if (!players || players.length < 2) {
      return new Response(JSON.stringify({ error: "Not enough players (minimum 2)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick random word (avoid repeating within same room)
    const { data: usedRounds } = await admin
      .from("game_rounds")
      .select("word_en")
      .eq("room_id", room_id);

    const usedWords = new Set((usedRounds || []).map((r: { word_en: string }) => r.word_en));
    const available = WORDS.filter((w) => !usedWords.has(w.en));
    const pool = available.length > 0 ? available : WORDS;
    const word = pool[Math.floor(Math.random() * pool.length)];

    // Pick random fake player
    const fakePlayer = players[Math.floor(Math.random() * players.length)];

    // Set room status to playing on first round
    if (round_number === 1) {
      await admin.from("rooms").update({ status: "playing" }).eq("id", room_id);
    }

    const { data: round, error } = await admin
      .from("game_rounds")
      .insert({
        room_id,
        round_number,
        word_en: word.en,
        word_he: word.he,
        fake_player_id: fakePlayer.id,
      })
      .select()
      .single();

    if (error) {
      // Handle race condition
      if (error.code === "23505") {
        const { data: raceExisting } = await admin
          .from("game_rounds")
          .select("*")
          .eq("room_id", room_id)
          .eq("round_number", round_number)
          .single();

        return new Response(JSON.stringify(raceExisting ? sanitize(raceExisting) : raceExisting), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(sanitize(round)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
