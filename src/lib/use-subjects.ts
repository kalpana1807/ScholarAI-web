import { useCallback, useEffect, useState } from 'react';
import { supabase, type Subject } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export const SUBJECT_COLORS = ['#3b66ff', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#84cc16'];

export function useSubjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('subjects').select('*').order('subject_name');
    setSubjects((data as Subject[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addSubject = useCallback(async (name: string, color?: string): Promise<Subject | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('subjects')
      .insert({ subject_name: name, color: color ?? SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)] })
      .select()
      .single();
    if (error || !data) return null;
    setSubjects((s) => [...s, data as Subject].sort((a, b) => a.subject_name.localeCompare(b.subject_name)));
    return data as Subject;
  }, [user]);

  return { subjects, loading, reload: load, addSubject };
}
