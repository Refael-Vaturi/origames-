import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, round_id } = body;

    if (!action || !round_id) {
      return new Response(JSON.stringify({ error: "Missing action or round_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine player identity
    let playerId: string | null = null;

    // Check guest credentials first
    if (body.guest_player_id && body.guest_token) {
      const { data: session } = await admin
        .from("room_guest_sessions")
        .select("room_player_id")
        .eq("room_player_id", body.guest_player_id)
        .eq("session_token", body.guest_token)
        .single();

      if (session) {
        playerId = session.room_player_id;
      }
    }

    // Try authenticated user
    if (!playerId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const {
          data: { user },
        } = await userClient.auth.getUser();

        if (user) {
          // Get round to find room_id
          const { data: round } = await admin
            .from("game_rounds")
            .select("room_id")
            .eq("id", round_id)
            .single();

          if (round) {
            const { data: player } = await admin
              .from("room_players")
              .select("id")
              .eq("room_id", round.room_id)
              .eq("user_id", user.id)
              .single();

            if (player) playerId = player.id;
          }
        }
      }
    }

    if (!playerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit-hint") {
      const { hint_round, hint_text } = body;
      if (!hint_round || !hint_text) {
        return new Response(JSON.stringify({ error: "Missing hint data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await admin.from("game_hints").upsert(
        {
          round_id,
          player_id: playerId,
          hint_round: Number(hint_round),
          hint_text: String(hint_text).trim().slice(0, 50),
        },
        { onConflict: "round_id,player_id,hint_round" },
      );

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (action === "submit-vote") {
      const { voted_player_id } = body;
      if (!voted_player_id) {
        return new Response(JSON.stringify({ error: "Missing vote data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await admin.from("game_votes").upsert(
        {
          round_id,
          voter_id: playerId,
          voted_player_id,
        },
        { onConflict: "round_id,voter_id" },
      );

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, player_id: playerId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
