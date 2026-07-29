import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  // Gemini REST API uses camelCase field names
  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 3000, temperature: 0.4 },
  };

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  if (!candidate) {
    const blockReason = data.promptFeedback?.blockReason ?? "Unknown";
    throw new Error(`Gemini blocked the response (${blockReason}). Try different text.`);
  }
  return candidate.content?.parts?.[0]?.text ?? "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured. Please add GEMINI_API_KEY to your Supabase Edge Function secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { upload_id, text, action = "all" } = body as {
      upload_id: string;
      text: string;
      action?: "summary" | "quiz" | "flashcards" | "all";
    };

    if (!upload_id || !text) {
      return new Response(
        JSON.stringify({ error: "upload_id and text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("pdf_uploads").update({ status: "processing" }).eq("id", upload_id);

    const truncated = text.slice(0, 12000);

    // ── Summary ──────────────────────────────────────────────────────────────
    let summary = "";
    let keyPoints = "";
    if (action === "summary" || action === "all") {
      const raw = await callGemini(
        `Summarise the following academic text. Return a JSON object with keys:
"summary" (3-5 sentence paragraph) and "key_points" (array of 5-7 concise bullet strings).
Return valid JSON only — no markdown fences, no extra text.

Text:
${truncated}`,
        "You are an expert academic summariser. Always return valid JSON only, no markdown code fences or extra commentary."
      );
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
        const parsed = JSON.parse(cleaned);
        summary = parsed.summary ?? "";
        keyPoints = Array.isArray(parsed.key_points) ? parsed.key_points.join("\n") : parsed.key_points ?? "";
      } catch {
        summary = raw.slice(0, 800);
      }
    }

    // ── Quiz ─────────────────────────────────────────────────────────────────
    let quizQuestions = null;
    if (action === "quiz" || action === "all") {
      const raw = await callGemini(
        `Generate 8 multiple-choice questions from this text.
Return a JSON array where each element has:
  "question" (string), "options" (array of exactly 4 strings), "answer" (0-based index integer), "explanation" (string).
Return a valid JSON array only — no markdown fences, no extra text.

Text:
${truncated}`,
        "You are an expert exam question writer. Always return a valid JSON array only, no markdown fences."
      );
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
        quizQuestions = JSON.parse(cleaned);
      } catch {
        quizQuestions = [];
      }
    }

    // ── Flashcards ────────────────────────────────────────────────────────────
    let flashcardPairs = null;
    if (action === "flashcards" || action === "all") {
      const raw = await callGemini(
        `Create 10 flashcard pairs from this text.
Return a JSON array where each element has:
  "question" (string) and "answer" (string, 1-2 concise sentences).
Return a valid JSON array only — no markdown fences, no extra text.

Text:
${truncated}`,
        "You are a flashcard creator. Always return a valid JSON array only, no markdown fences."
      );
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
        flashcardPairs = JSON.parse(cleaned);
      } catch {
        flashcardPairs = [];
      }
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("pdf_uploads")
      .update({
        extracted_text: text,
        summary,
        key_points: keyPoints,
        quiz_questions: quizQuestions,
        flashcard_pairs: flashcardPairs,
        status: "done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", upload_id);

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ success: true, summary, key_points: keyPoints, quiz_questions: quizQuestions, flashcard_pairs: flashcardPairs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("pdf-process error:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    try {
      const bodyClone = await req.clone().json().catch(() => ({})) as { upload_id?: string };
      if (bodyClone?.upload_id) {
        await supabase.from("pdf_uploads").update({ status: "error", error_message: msg }).eq("id", bodyClone.upload_id);
      }
    } catch { /* ignore */ }
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
