import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.warn('Supabase env vars missing.');
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string; name: string; avatar_url: string | null;
  learning_goal: string | null; target_exam: string | null;
  dark_mode: boolean; is_admin: boolean; created_at: string;
};
export type Subject = { id: string; user_id: string; subject_name: string; color: string; created_at: string };
export type Note = { id: string; user_id: string; subject_id: string | null; title: string; content: string; summary: string | null; key_points: string | null; created_at: string; updated_at: string };
export type QuizQuestion = { question: string; options: string[]; answer: number; explanation?: string };
export type Quiz = { id: string; user_id: string; subject_id: string | null; title: string; questions: QuizQuestion[]; score: number; total: number; difficulty: 'easy' | 'medium' | 'hard'; created_at: string };
export type Flashcard = { id: string; user_id: string; subject_id: string | null; deck_name: string; question: string; answer: string; reviewed: boolean; review_count: number; created_at: string };
export type StudyPlan = { id: string; user_id: string; subject_id: string | null; task: string; due_date: string; completed: boolean; priority: 'low' | 'medium' | 'high'; created_at: string };
export type StudySession = { id: string; user_id: string; subject_id: string | null; duration_min: number; session_date: string; created_at: string };
export type ChatThread = { id: string; user_id: string; subject: string | null; title: string; created_at: string; updated_at: string };
export type ChatMessage = { id: string; thread_id: string; user_id: string; role: 'user' | 'assistant'; content: string; created_at: string };
export type PdfUpload = { id: string; user_id: string; filename: string; file_size: number; extracted_text: string | null; summary: string | null; key_points: string | null; quiz_questions: QuizQuestion[] | null; flashcard_pairs: { question: string; answer: string }[] | null; status: 'pending' | 'processing' | 'done' | 'error'; error_message: string | null; subject_id: string | null; created_at: string; updated_at: string };
export type Achievement = { id: string; title: string; description: string; icon: string; category: string; threshold: number; points: number; created_at: string };
export type UserAchievement = { id: string; user_id: string; achievement_id: string; earned_at: string };
export type AnalyticsEvent = { id: string; user_id: string; event_type: string; metadata: Record<string, unknown> | null; created_at: string };

// ─── Event tracking helper ────────────────────────────────────────────────────
export async function trackEvent(event_type: string, metadata?: Record<string, unknown>) {
  try {
    await supabase.from('analytics_events').insert({ event_type, metadata: metadata ?? null });
  } catch { /* non-critical */ }
}
