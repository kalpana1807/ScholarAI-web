import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
// Gemini 2.5 Flash — current stable, fast, affordable model (July 2026)
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured. Please add GEMINI_API_KEY to your Supabase Edge Function secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { messages, subject } = body as {
      messages: { role: string; content: string }[];
      subject?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemInstruction = subject
      ? `You are ScholarAI, an expert AI tutor specialising in ${subject}. Provide clear, structured explanations with step-by-step reasoning. Use examples, analogies, and formatted markdown (bold for key terms, numbered lists for steps, code blocks for equations). Keep responses focused, educational, and encouraging.`
      : `You are ScholarAI, an expert AI study tutor helping students across all subjects. Provide clear, structured explanations with step-by-step reasoning. Use examples, analogies, and formatted markdown. Keep responses educational and encouraging.`;

    // Gemini uses "user" / "model" roles (not "assistant").
    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Gemini REST API uses camelCase field names
    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.7,
      },
    };

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Gemini request failed (${response.status}): ${errText.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Check for blocked responses (safety filters, etc.)
    const candidate = data.candidates?.[0];
    if (!candidate) {
      const blockReason = data.promptFeedback?.blockReason ?? "Unknown reason";
      return new Response(
        JSON.stringify({ error: `Gemini returned no response (blocked: ${blockReason}). Try rephrasing your question.` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content: string = candidate.content?.parts?.[0]?.text ?? "";

    if (!content) {
      const finishReason = candidate.finishReason ?? "UNKNOWN";
      return new Response(
        JSON.stringify({ error: `Gemini returned an empty response (finishReason: ${finishReason}). Please try again.` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-chat error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
