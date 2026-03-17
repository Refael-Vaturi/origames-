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
    const name = String(body?.name || "Guest").trim().slice(0, 24) || "Guest";
    const avatar = String(body?.avatar || "🎮").trim().slice(0, 4) || "🎮";
    const roomName = String(body?.roomName || "Game Room").trim().slice(0, 40) || "Game Room";
    const rounds = Math.min(15, Math.max(1, Number(body?.rounds) || 5));
    const responseTime = Math.min(120, Math.max(10, Number(body?.responseTime) || 30));
    const discussionTime = Math.min(120, Math.max(15, Number(body?.discussionTime) || 45));
    const voteTime = Math.min(60, Math.max(10, Number(body?.voteTime) || 20));
    const maxPlayers = Math.min(12, Math.max(3, Number(body?.maxPlayers) || 8));
    const isPrivate = body?.isPrivate !== false;

    // Generate room code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const guestHostId = crypto.randomUUID();
    const token = crypto.randomUUID();

    // Create room
    const { data: room, error: roomError } = await admin
      .from("rooms")
      .insert({
        code,
        host_id: guestHostId,
        name: roomName,
        max_players: maxPlayers,
        rounds,
        response_time: responseTime,
        discussion_time: discussionTime,
        vote_time: voteTime,
        is_private: isPrivate,
      })
      .select("id, code")
      .single();

    if (roomError || !room) {
      throw new Error(roomError?.message || "Failed to create room");
    }

    // Create guest player (host)
    const { data: player, error: playerError } = await admin
      .from("room_players")
      .insert({
        room_id: room.id,
        user_id: guestHostId,
        is_ready: true,
        is_guest: true,
        guest_name: name,
        guest_avatar: avatar,
      })
      .select("id")
      .single();

    if (playerError || !player) {
      throw new Error(playerError?.message || "Failed to create guest player");
    }

    // Create guest session
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
        hostId: guestHostId,
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
