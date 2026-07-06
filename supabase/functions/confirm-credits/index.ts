import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("Not authenticated");

    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== "string") throw new Error("Missing session_id");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify the payment actually happened before trusting anything about it.
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }
    if (!session.metadata || session.metadata.user_id !== user.id) {
      throw new Error("This checkout session does not belong to you");
    }
    const creditsNum = parseInt(session.metadata.credits ?? "0", 10);
    if (!creditsNum || creditsNum <= 0) throw new Error("Invalid credits amount on session");

    // Idempotency: a session can only ever be credited once, even if the
    // success page is reloaded or the request is replayed.
    const { error: claimError } = await supabaseAdmin
      .from("stripe_processed_sessions")
      .insert({ session_id, user_id: user.id, credits: creditsNum });
    if (claimError) {
      if (claimError.code === "23505") {
        // Already processed - return success without granting credits again.
        return new Response(JSON.stringify({ success: true, creditsAdded: 0, alreadyProcessed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      throw claimError;
    }

    // Upsert credits
    const { data: existing } = await supabaseAdmin
      .from("player_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await supabaseAdmin
        .from("player_credits")
        .update({
          credits: existing.credits + creditsNum,
          total_purchased: existing.total_purchased + creditsNum,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    } else {
      await supabaseAdmin
        .from("player_credits")
        .insert({
          user_id: user.id,
          credits: creditsNum,
          total_purchased: creditsNum,
        });
    }

    return new Response(JSON.stringify({ success: true, creditsAdded: creditsNum }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
