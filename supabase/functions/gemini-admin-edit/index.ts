// Gemini-powered admin content editor. Turns natural-language admin requests
// into structured changes to public.site_settings (JSON key/value store).
//
// Body: { prompt: string, apply?: boolean }
// Returns: { changes: [{key,value,description}], summary, appliedCount }
//
// Auth: requires an admin JWT (email in the is_admin() allowlist).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_KEY = Deno.env.get("GEMINI") || Deno.env.get("GEMINI_API_KEY");

const ADMIN_EMAILS = ["orivaturi22@gmail.com", "batatakara@gmail.com"];

const SYSTEM_PROMPT = `You are the AI Admin for the "Ori Games" portal. You edit dynamic site content that lives in a JSON key/value store called site_settings. You do NOT write React or CSS code.

Return STRICT JSON of the shape:
{
  "summary": "short human summary of what you are changing (Hebrew or English, match the user's language)",
  "changes": [
    { "key": "<snake_case_key>", "value": <any JSON value>, "description": "<one line describing this key>" }
  ]
}

Rules:
- Keys use snake_case, prefixed by section: portal.hero_title, portal.hero_subtitle, iron_dome.menu_title, banners.top_message, feature_flags.show_store, etc.
- Values may be strings, numbers, booleans, arrays, or objects — pick whatever fits.
- Never invent code, CSS, or React JSX. Only content/config.
- If the user's request is unclear or unsafe, return { "summary": "clarify: ...", "changes": [] }.
- Keep the change set minimal and focused on the request.
- Respond with the JSON object ONLY, no markdown fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!GEMINI_KEY) {
      return json({ error: "GEMINI key is not configured on the server" }, 500);
    }

    // Verify JWT + admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
    const email = (userData.user.email || "").toLowerCase();
    if (!ADMIN_EMAILS.includes(email)) return json({ error: "Not an admin" }, 403);

    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt || "").trim();
    const apply = Boolean(body?.apply);
    if (!prompt) return json({ error: "prompt is required" }, 400);

    // Fetch current settings so the model can update in place
    const { data: existing } = await admin
      .from("site_settings")
      .select("key,value,description")
      .limit(500);

    const contextBlock = existing?.length
      ? `Current site_settings (JSON):\n${JSON.stringify(existing, null, 2)}`
      : "site_settings is currently empty.";

    // Call Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: `${contextBlock}\n\nAdmin request:\n${prompt}` }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return json({ error: `Gemini error ${geminiRes.status}`, detail: errText }, 502);
    }

    const geminiJson = await geminiRes.json();
    const text: string =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsed: { summary?: string; changes?: Array<{ key: string; value: unknown; description?: string }> } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ error: "Model returned invalid JSON", raw: text }, 502);
    }

    const changes = Array.isArray(parsed.changes) ? parsed.changes : [];
    let appliedCount = 0;

    if (apply && changes.length) {
      const rows = changes
        .filter((c) => c && typeof c.key === "string" && c.key.length <= 120)
        .map((c) => ({
          key: c.key,
          value: c.value ?? null,
          description: c.description ?? null,
          updated_by: userData.user.id,
        }));
      if (rows.length) {
        const { error: upsertErr, count } = await admin
          .from("site_settings")
          .upsert(rows, { onConflict: "key", count: "exact" });
        if (upsertErr) return json({ error: upsertErr.message }, 500);
        appliedCount = count ?? rows.length;
      }
    }

    // Log
    await admin.from("ai_admin_edits").insert({
      admin_id: userData.user.id,
      admin_email: email,
      prompt,
      changes,
      applied: apply && appliedCount > 0,
      model: "gemini-2.5-flash",
    });

    return json({
      summary: parsed.summary ?? "",
      changes,
      appliedCount,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
