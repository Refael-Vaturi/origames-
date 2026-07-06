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
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { target_user_id, type, title, body: notifBody, data } = body;

    if (!target_user_id || !type || !title) {
      return new Response(
        JSON.stringify({ error: "Missing target_user_id, type, or title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify sender is authenticated
    const authHeader = req.headers.get("authorization");
    let senderId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: authError } = await admin.auth.getUser(token);
      if (!authError && userData?.user) {
        senderId = userData.user.id;
      }
    }

    if (!senderId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only these two friend-flow notifications may be sent this way, and
    // only when the underlying friendship row actually justifies them —
    // otherwise any authenticated user could spam/spoof notifications to
    // any other user with arbitrary title/body/data.
    const ALLOWED_TYPES = new Set(["friend_request", "friend_accepted"]);
    if (!ALLOWED_TYPES.has(type)) {
      return new Response(
        JSON.stringify({ error: "Unsupported notification type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expectedFriendship = type === "friend_request"
      ? { requester_id: senderId, addressee_id: target_user_id, status: "pending" }
      : { requester_id: target_user_id, addressee_id: senderId, status: "accepted" };

    const { data: friendship } = await admin
      .from("friendships")
      .select("id")
      .match(expectedFriendship)
      .maybeSingle();

    if (!friendship) {
      return new Response(
        JSON.stringify({ error: "No matching friendship for this notification" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeTitle = String(title).slice(0, 200);
    const safeBody = notifBody ? String(notifBody).slice(0, 500) : null;

    // Create notification
    const { data: notification, error } = await admin
      .from("notifications")
      .insert({
        user_id: target_user_id,
        type,
        title: safeTitle,
        body: safeBody,
        data: { sender_id: senderId },
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, notification }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
