import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // ─── Determine player identity ───
    let playerId: string | null = null;

    // 1) Check guest credentials
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

    // 2) Try authenticated user via auth token
    if (!playerId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await admin.auth.getUser(token);

        if (!userError && userData?.user?.id) {
          const userId = userData.user.id;

          // Find player by user_id → need round to get room
          const { data: roundData } = await admin
            .from("game_rounds")
            .select("room_id")
            .eq("id", round_id)
            .single();

          if (roundData) {
            const { data: player } = await admin
              .from("room_players")
              .select("id")
              .eq("room_id", roundData.room_id)
              .eq("user_id", userId)
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

    // ─── Handle actions ───
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

      // Award XP for submitting a hint (auth users only)
      const { data: roundForHint } = await admin
        .from("game_rounds")
        .select("room_id")
        .eq("id", round_id)
        .single();
      if (roundForHint) {
        const { data: hintPlayer } = await admin
          .from("room_players")
          .select("user_id, is_guest")
          .eq("id", playerId)
          .single();
        if (hintPlayer && !hintPlayer.is_guest) {
          await admin.rpc("increment_profile_stat", { p_user_id: hintPlayer.user_id, p_field: "xp", p_amount: 5 });
        }
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

      // ─── Auto-calculate scores when all votes are in ───
      const { data: roundData } = await admin
        .from("game_rounds")
        .select("room_id, fake_player_id, round_number")
        .eq("id", round_id)
        .single();

      if (roundData) {
        const { data: allPlayers } = await admin
          .from("room_players")
          .select("id, user_id, is_guest")
          .eq("room_id", roundData.room_id);

        const { data: allVotes } = await admin
          .from("game_votes")
          .select("voter_id, voted_player_id")
          .eq("round_id", round_id);

        // Check if already scored
        const { count: existingScores } = await admin
          .from("game_scores")
          .select("id", { count: "exact", head: true })
          .eq("round_id", round_id);

        if (
          allPlayers &&
          allVotes &&
          allVotes.length >= allPlayers.length &&
          (existingScores || 0) === 0
        ) {
          // Count votes per player
          const voteCounts: Record<string, number> = {};
          allVotes.forEach((v) => {
            voteCounts[v.voted_player_id] = (voteCounts[v.voted_player_id] || 0) + 1;
          });

          // Find most voted player(s)
          const maxVotes = Math.max(...Object.values(voteCounts));
          const mostVoted = Object.entries(voteCounts)
            .filter(([, count]) => count === maxVotes)
            .map(([id]) => id);

          const fakeId = roundData.fake_player_id;
          const caughtFake = mostVoted.includes(fakeId);

          const scores: {
            room_id: string;
            round_id: string;
            player_id: string;
            points: number;
            reason: string;
          }[] = [];

          // Helper: get user_id for a player_id (only auth users)
          const getAuthUserId = (pid: string) => {
            const p = allPlayers.find((pl) => pl.id === pid);
            return p && !p.is_guest ? p.user_id : null;
          };

          if (caughtFake) {
            allVotes.forEach((v) => {
              if (v.voted_player_id === fakeId) {
                scores.push({
                  room_id: roundData.room_id,
                  round_id,
                  player_id: v.voter_id,
                  points: 10,
                  reason: "correct_vote",
                });
              }
            });
          } else {
            scores.push({
              room_id: roundData.room_id,
              round_id,
              player_id: fakeId,
              points: 15,
              reason: "survived",
            });
          }

          if (scores.length > 0) {
            await admin.from("game_scores").insert(scores);
          }

          // ─── Update profile stats + XP (only for authenticated users) ───
          // XP for voting (all auth voters)
          for (const v of allVotes) {
            const voterUid = getAuthUserId(v.voter_id);
            if (voterUid) {
              await admin.rpc("increment_profile_stat", { p_user_id: voterUid, p_field: "xp", p_amount: 5 });
            }
          }

          if (caughtFake) {
            const correctVoterUserIds = allVotes
              .filter((v) => v.voted_player_id === fakeId)
              .map((v) => getAuthUserId(v.voter_id))
              .filter(Boolean) as string[];

            for (const uid of correctVoterUserIds) {
              await admin.rpc("increment_profile_stat", { p_user_id: uid, p_field: "fakes_caught", p_amount: 1 });
              await admin.rpc("increment_profile_stat", { p_user_id: uid, p_field: "xp", p_amount: 15 });
            }
          } else {
            const fakeUserId = getAuthUserId(fakeId);
            if (fakeUserId) {
              await admin.rpc("increment_profile_stat", { p_user_id: fakeUserId, p_field: "survived", p_amount: 1 });
              await admin.rpc("increment_profile_stat", { p_user_id: fakeUserId, p_field: "xp", p_amount: 20 });
            }
          }

          // ─── Last round? Update games_played + wins ───
          const { data: roomData } = await admin
            .from("rooms")
            .select("rounds")
            .eq("id", roundData.room_id)
            .single();

          if (roomData && roundData.round_number >= roomData.rounds) {
            // Increment games_played for all auth players
            const authUserIds = allPlayers
              .filter((p) => !p.is_guest)
              .map((p) => p.user_id);

            for (const uid of authUserIds) {
              await admin.rpc("increment_profile_stat", { p_user_id: uid, p_field: "games_played", p_amount: 1 });
            }

            // Find winner (highest cumulative score)
            const { data: allScores } = await admin
              .from("game_scores")
              .select("player_id, points")
              .eq("room_id", roundData.room_id);

            if (allScores && allScores.length > 0) {
              const totals: Record<string, number> = {};
              allScores.forEach((s) => {
                totals[s.player_id] = (totals[s.player_id] || 0) + s.points;
              });
              const maxPts = Math.max(...Object.values(totals));
              const winnerId = Object.entries(totals).find(([, pts]) => pts === maxPts)?.[0];
              if (winnerId) {
                const winnerUserId = getAuthUserId(winnerId);
              if (winnerUserId) {
                  await admin.rpc("increment_profile_stat", { p_user_id: winnerUserId, p_field: "wins", p_amount: 1 });
                  await admin.rpc("increment_profile_stat", { p_user_id: winnerUserId, p_field: "xp", p_amount: 25 });
                }
              }
            }
          }
        }
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
