import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Use service role to bypass RLS for admin queries
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parallel admin stats
    const [
      usersRes,
      notesRes,
      quizzesRes,
      flashcardsRes,
      sessionsRes,
      pdfsRes,
      eventsRes,
      recentUsersRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id, name, email:id, created_at, is_admin", { count: "exact" }),
      supabase.from("notes").select("id", { count: "exact", head: true }),
      supabase.from("quizzes").select("id, score, total, created_at", { count: "exact" }),
      supabase.from("flashcards").select("id", { count: "exact", head: true }),
      supabase.from("study_sessions").select("duration_min, session_date"),
      supabase.from("pdf_uploads").select("id, status, created_at", { count: "exact" }),
      supabase.from("analytics_events").select("event_type, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("id, name, created_at, is_admin").order("created_at", { ascending: false }).limit(10),
    ]);

    // Sessions: compute total study hours
    const sessions = (sessionsRes.data ?? []) as { duration_min: number; session_date: string }[];
    const totalStudyMin = sessions.reduce((a, s) => a + s.duration_min, 0);

    // Quiz accuracy
    const quizzes = (quizzesRes.data ?? []) as { score: number; total: number; created_at: string }[];
    const totalScore = quizzes.reduce((a, q) => a + q.score, 0);
    const totalTotal = quizzes.reduce((a, q) => a + q.total, 0);

    // Daily active users (last 14 days from analytics_events)
    const events = (eventsRes.data ?? []) as { event_type: string; created_at: string }[];
    const dauMap: Record<string, number> = {};
    events.forEach((e) => {
      const day = e.created_at.slice(0, 10);
      dauMap[day] = (dauMap[day] ?? 0) + 1;
    });
    const dau = Object.entries(dauMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date, count }));

    // Event type breakdown
    const eventBreakdown: Record<string, number> = {};
    events.forEach((e) => {
      eventBreakdown[e.event_type] = (eventBreakdown[e.event_type] ?? 0) + 1;
    });

    const stats = {
      users: {
        total: usersRes.count ?? 0,
        recent: recentUsersRes.data ?? [],
      },
      content: {
        notes: notesRes.count ?? 0,
        quizzes: quizzesRes.count ?? 0,
        flashcards: flashcardsRes.count ?? 0,
        pdfs: pdfsRes.count ?? 0,
      },
      engagement: {
        total_study_hours: Math.round((totalStudyMin / 60) * 10) / 10,
        quiz_accuracy: totalTotal > 0 ? Math.round((totalScore / totalTotal) * 100) : 0,
        dau,
        event_breakdown: eventBreakdown,
      },
      pdfs: {
        total: pdfsRes.count ?? 0,
        done: (pdfsRes.data ?? []).filter((p: { status: string }) => p.status === "done").length,
        error: (pdfsRes.data ?? []).filter((p: { status: string }) => p.status === "error").length,
      },
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-stats error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
