// Centralised edge-function caller with auth header.
import { supabase } from './supabase';

const BASE = import.meta.env.VITE_SUPABASE_URL as string;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  };
}

export async function callAIChat(
  messages: { role: string; content: string }[],
  subject?: string
): Promise<{ content: string; error?: string }> {
  const res = await fetch(`${BASE}/functions/v1/ai-chat`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ messages, subject }),
  });
  const data = await res.json();
  if (!res.ok || data.error) return { content: '', error: data.error ?? `Error ${res.status}` };
  return { content: data.content ?? '' };
}

export async function callPdfProcess(
  upload_id: string,
  text: string
): Promise<{ success: boolean; summary?: string; key_points?: string; quiz_questions?: unknown; flashcard_pairs?: unknown; error?: string }> {
  const res = await fetch(`${BASE}/functions/v1/pdf-process`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ upload_id, text }),
  });
  const data = await res.json();
  if (!res.ok || data.error) return { success: false, error: data.error ?? `Error ${res.status}` };
  return { success: true, ...data };
}

export async function callAdminStats(): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE}/functions/v1/admin-stats`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) return null;
  return res.json();
}
