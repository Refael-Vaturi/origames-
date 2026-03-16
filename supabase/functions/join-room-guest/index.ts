import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const code = String(body?.code || "").trim().toUpperCase();
    const name = String(body?.name || "Guest").trim().slice(0, 24) || "Guest";
    const avatar = String(body?.avatar || "🎮").trim().slice(0, 4) || "🎮";

    if (code.length < 4) {
      return new Response(JSON.stringify({ error: "Invalid room code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: room } = await admin
      .from("rooms")
      .select("id, code, max_players, status")
      .eq("code", code)
      .single();

    if (!room) {
      return new Response(JSON.stringify({ error: "Room not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (room.status !== "waiting") {
      return new Response(JSON.stringify({ error: "Game already started" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count } = await admin
      .from("room_players")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);

    if ((count || 0) >= room.max_players) {
      return new Response(JSON.stringify({ error: "Room is full" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const guestUserId = crypto.randomUUID();
    const token = crypto.randomUUID();

    const { data: player, error: playerError } = await admin
      .from("room_players")
      .insert({
        room_id: room.id,
        user_id: guestUserId,
        is_ready: false,
        is_guest: true,
        guest_name: name,
        guest_avatar: avatar,
      })
      .select("id")
      .single();

    if (playerError || !player) {
      throw new Error(playerError?.message || "Failed to create guest player");
    }

    const { error: sessionError } = await admin.from("room_guest_sessions").insert({
      room_player_id: player.id,
      session_token: token,
    });

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    return new Response(
      JSON.stringify({
        roomCode: room.code,
        roomId: room.id,
        playerId: player.id,
        token,
        name,
        avatar,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
