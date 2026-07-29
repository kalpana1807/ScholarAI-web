import { useEffect, useState, type ReactNode } from 'react';
import {
  Award,
  BarChart3,
  BookOpenText,
  BrainCircuit,
  CalendarCheck,
  ClipboardList,
  FileUp,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Search,
  Settings,
  Shield,
  Sun,
  X,
} from 'lucide-react';
import { supabase, type StudySession } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useRouter, type Route } from '../../lib/router';
import { useTheme } from '../../lib/theme';
import { cn, initials } from '../../lib/utils';
import { Logo } from '../Logo';
import { Button } from '../ui/Button';

const nav: { name: Route['name']; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { name: 'tutor', label: 'AI Tutor', icon: MessageSquareText, badge: 'AI' },
  { name: 'notes', label: 'Notes', icon: BookOpenText },
  { name: 'pdf', label: 'PDF Upload', icon: FileUp },
  { name: 'quiz', label: 'Quizzes', icon: ClipboardList },
  { name: 'flashcards', label: 'Flashcards', icon: BrainCircuit },
  { name: 'planner', label: 'Study Planner', icon: CalendarCheck },
  { name: 'analytics', label: 'Analytics', icon: BarChart3 },
  { name: 'achievements', label: 'Achievements', icon: Award },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const { route, navigate } = useRouter();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ name: 'auth', mode: 'login' });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('study_sessions').select('session_date')
        .order('session_date', { ascending: false }).limit(60);
      const dates = new Set(((data as Pick<StudySession, 'session_date'>[]) ?? []).map((s) => s.session_date));
      let s = 0;
      const d = new Date();
      if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
      while (dates.has(d.toISOString().slice(0, 10))) { s++; d.setDate(d.getDate() - 1); }
      setStreak(s);
    })();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 dark:bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 animate-pulse-soft" />
          <p className="text-sm text-ink-400">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  const visibleNav = profile?.is_admin ? [...nav, { name: 'admin' as Route['name'], label: 'Admin', icon: Shield }] : nav;

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-200/70 bg-white/90 px-4 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/90 lg:hidden">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <Logo compact />
        </div>
        <button onClick={toggle} className="btn-ghost p-2">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-ink-200/70 bg-white dark:border-ink-800 dark:bg-ink-900 lg:flex">
        <div className="flex h-16 items-center px-5"><Logo /></div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {visibleNav.map((item) => (
            <NavItem key={item.name} item={item} active={route.name === item.name} onClick={() => navigate({ name: item.name as Route['name'] })} />
          ))}
        </nav>
        <div className="px-3 pb-2">
          <NavItem item={{ name: 'profile', label: 'Settings', icon: Settings }} active={route.name === 'profile'} onClick={() => navigate({ name: 'profile' })} />
        </div>
        <UserCard name={profile?.name ?? user.email ?? 'Student'} email={user.email ?? ''} streak={streak} onSignOut={signOut} onClickProfile={() => navigate({ name: 'profile' })} />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] flex flex-col bg-white dark:bg-ink-900">
            <div className="flex h-14 items-center justify-between border-b border-ink-200/60 px-4 dark:border-ink-800">
              <Logo />
              <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-2"><X className="h-4 w-4" /></button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {visibleNav.map((item) => (
                <NavItem key={item.name} item={item} active={route.name === item.name} onClick={() => { navigate({ name: item.name as Route['name'] }); setSidebarOpen(false); }} />
              ))}
              <NavItem item={{ name: 'profile', label: 'Settings', icon: Settings }} active={route.name === 'profile'} onClick={() => { navigate({ name: 'profile' }); setSidebarOpen(false); }} />
            </nav>
            <div className="p-3">
              <UserCard name={profile?.name ?? 'Student'} email={user.email ?? ''} streak={streak} onSignOut={signOut} onClickProfile={() => { navigate({ name: 'profile' }); setSidebarOpen(false); }} />
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-ink-200/70 bg-white/80 px-8 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/80 lg:flex">
          <SearchBar />
          <div className="flex items-center gap-2.5">
            <StreakChip streak={streak} />
            <button onClick={toggle} className="btn-ghost p-2">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            <button onClick={() => navigate({ name: 'profile' })} className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white transition hover:scale-105 hover:shadow-glow">
              {initials(profile?.name ?? 'Student')}
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ item, active, onClick }: { item: { name?: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all', active ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50')}>
      <item.icon className={cn('h-4 w-4', active ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400')} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge && <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white">{item.badge}</span>}
      {active && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
    </button>
  );
}

function SearchBar() {
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input placeholder="Search notes, quizzes, tasks…" className="w-full rounded-xl border border-ink-200 bg-ink-50 py-2 pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-400 transition focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:focus:bg-ink-900" />
    </div>
  );
}

function StreakChip({ streak }: { streak: number | null }) {
  if (!streak || streak === 0) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-400">
      <Flame className="h-3.5 w-3.5" />{streak} day streak
    </div>
  );
}

function UserCard({ name, email, streak, onSignOut, onClickProfile }: { name: string; email: string; streak: number | null; onSignOut: () => void; onClickProfile: () => void }) {
  return (
    <div className="mx-3 mb-4 rounded-xl border border-ink-200 bg-ink-50 p-3 dark:border-ink-800 dark:bg-ink-800/50">
      <div className="flex items-center gap-3">
        <button onClick={onClickProfile} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white text-sm">
          {initials(name)}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{name}</p>
          <p className="truncate text-xs text-ink-400">{email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
      </div>
      {streak !== null && streak > 0 && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
          <Flame className="h-3.5 w-3.5" />{streak} day streak — keep it up!
        </div>
      )}
    </div>
  );
}

export { BookOpenText, BrainCircuit, CalendarCheck, ClipboardList, BarChart3 };
