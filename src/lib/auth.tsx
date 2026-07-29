import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile } from '../lib/supabase';

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: string | null }>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (mounted.current && !error) setProfile(data as Profile | null);
  }

  useEffect(() => {
    mounted.current = true;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted.current && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Avoid the onAuthStateChange deadlock: only react to real changes.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted.current) return;
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession);
        if (newSession?.user) {
          // Defer profile fetch to avoid blocking the auth state callback.
          setTimeout(() => loadProfile(newSession.user.id), 0);
        }
      }
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signUp(email, password, name) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return { error: error.message };
      // Trigger handle_new_user (already runs via trigger). If email confirm is off we also sign in.
      if (data.user && !data.session) {
        await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
      }
      if (data.user) {
        // Ensure profile has the name (trigger may have created it already).
        await supabase
          .from('profiles')
          .upsert({ id: data.user.id, name }, { onConflict: 'id' });
      }
      return { error: null };
    },
    async signOut() {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    },
    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      return { error: error?.message ?? null };
    },
    async refreshProfile() {
      if (session?.user) await loadProfile(session.user.id);
    },
    async updateProfile(patch) {
      if (!session?.user) return { error: 'Not signed in' };
      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', session.user.id);
      if (!error) await loadProfile(session.user.id);
      return { error: error?.message ?? null };
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
