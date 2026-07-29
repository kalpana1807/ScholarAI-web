import { useEffect, useState } from 'react';
import {
  Award, BookOpen, Clipboard, Clock, Flame, Layers, MessageSquare, Target, Trophy, Zap,
  FileUp, CalendarCheck, Star,
} from 'lucide-react';
import { supabase, trackEvent, type Achievement, type UserAchievement } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Card, Badge, Skeleton } from '../../components/ui';
import { cn, formatDate } from '../../lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'file-text': BookOpen, 'book-open': BookOpen, 'library': BookOpen,
  'clipboard-list': Clipboard, 'trophy': Trophy, 'zap': Zap,
  'flame': Flame, 'layers': Layers, 'file-up': FileUp,
  'calendar-check': CalendarCheck, 'target': Target,
  'message-square': MessageSquare, 'sparkles': Star,
  'clock': Clock, 'award': Award,
};

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[name] ?? Trophy;
}

const CATEGORY_COLORS: Record<string, string> = {
  notes: 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300',
  quizzes: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  streaks: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
  flash: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  pdf: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  planner: 'bg-accent-50 text-accent-600 dark:bg-accent-950/40 dark:text-accent-400',
  ai: 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400',
  time: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400',
  general: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
};

export function AchievementsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const [a, ua] = await Promise.all([
      supabase.from('achievements').select('*').order('points'),
      supabase.from('user_achievements').select('*').order('earned_at', { ascending: false }),
    ]);
    setAchievements((a.data as Achievement[]) ?? []);
    setEarned((ua.data as UserAchievement[]) ?? []);
    setLoading(false);
  }

  async function checkAndAward() {
    if (!user || checking) return;
    setChecking(true);
    try {
      // Pull all user stats
      const [notes, quizzes, flash, tasks, sessions, pdfs, chats, ua] = await Promise.all([
        supabase.from('notes').select('id', { count: 'exact', head: true }),
        supabase.from('quizzes').select('score, total'),
        supabase.from('flashcards').select('id', { count: 'exact', head: true }),
        supabase.from('study_plans').select('completed'),
        supabase.from('study_sessions').select('duration_min, session_date').order('session_date', { ascending: false }).limit(60),
        supabase.from('pdf_uploads').select('id', { count: 'exact', head: true }),
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
        supabase.from('user_achievements').select('achievement_id'),
      ]);

      const alreadyEarned = new Set((ua.data ?? []).map((x: { achievement_id: string }) => x.achievement_id));
      const notesCount = notes.count ?? 0;
      const quizList = (quizzes.data ?? []) as { score: number; total: number }[];
      const quizCount = quizList.length;
      const flashCount = flash.count ?? 0;
      const completedTasks = ((tasks.data ?? []) as { completed: boolean }[]).filter((t) => t.completed).length;
      const pdfsCount = pdfs.count ?? 0;
      const chatCount = chats.count ?? 0;
      const sessList = (sessions.data ?? []) as { duration_min: number; session_date: string }[];
      const totalMin = sessList.reduce((a, s) => a + s.duration_min, 0);

      // Streak
      const dates = new Set(sessList.map((s) => s.session_date));
      let streak = 0;
      const d = new Date();
      if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
      while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }

      // Perfect quiz
      const hasPerfect = quizList.some((q) => q.total > 0 && q.score === q.total);

      // All-rounder: used every feature
      const allRounder = notesCount > 0 && quizCount > 0 && flashCount > 0 && pdfsCount > 0 && chatCount > 0 && completedTasks > 0;

      const toAward: string[] = [];
      const checks: { id: string; condition: boolean }[] = [
        { id: 'first_note', condition: notesCount >= 1 },
        { id: 'note_10', condition: notesCount >= 10 },
        { id: 'note_50', condition: notesCount >= 50 },
        { id: 'first_quiz', condition: quizCount >= 1 },
        { id: 'quiz_ace', condition: hasPerfect },
        { id: 'quiz_10', condition: quizCount >= 10 },
        { id: 'streak_3', condition: streak >= 3 },
        { id: 'streak_7', condition: streak >= 7 },
        { id: 'streak_30', condition: streak >= 30 },
        { id: 'first_flash', condition: flashCount >= 1 },
        { id: 'flash_50', condition: flashCount >= 50 },
        { id: 'first_pdf', condition: pdfsCount >= 1 },
        { id: 'pdf_5', condition: pdfsCount >= 5 },
        { id: 'task_10', condition: completedTasks >= 10 },
        { id: 'task_50', condition: completedTasks >= 50 },
        { id: 'first_chat', condition: chatCount >= 1 },
        { id: 'chat_50', condition: chatCount >= 50 },
        { id: 'hours_10', condition: totalMin >= 600 },
        { id: 'hours_50', condition: totalMin >= 3000 },
        { id: 'all_rounder', condition: allRounder },
      ];

      for (const { id, condition } of checks) {
        if (condition && !alreadyEarned.has(id)) toAward.push(id);
      }

      if (toAward.length > 0) {
        await supabase.from('user_achievements').insert(toAward.map((achievement_id) => ({ achievement_id })));
        await trackEvent('achievement_earned', { ids: toAward });
        await loadData();
        push('success', `You earned ${toAward.length} new badge${toAward.length > 1 ? 's' : ''}!`);
      } else {
        push('info', 'No new badges yet — keep studying!');
      }
    } finally {
      setChecking(false);
    }
  }

  const earnedSet = new Set(earned.map((e) => e.achievement_id));
  const categories = ['all', ...Array.from(new Set(achievements.map((a) => a.category)))];
  const filtered = filter === 'all' ? achievements : achievements.filter((a) => a.category === filter);
  const totalPoints = earned.reduce((sum, ua) => {
    const ach = achievements.find((a) => a.id === ua.achievement_id);
    return sum + (ach?.points ?? 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Achievements</h1>
          <p className="text-sm text-ink-500">Earn badges by studying consistently and using every feature.</p>
        </div>
        <button onClick={checkAndAward} disabled={checking}
          className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
          {checking ? 'Checking…' : 'Check for new badges'}
        </button>
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="!p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-ink-400">Badges earned</p>
              <p className="font-display text-xl font-bold">{earned.length} <span className="text-sm font-normal text-ink-400">/ {achievements.length}</span></p>
            </div>
          </Card>
          <Card className="!p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-ink-400">Total points</p>
              <p className="font-display text-xl font-bold">{totalPoints}</p>
            </div>
          </Card>
          <Card className="!p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-950/40">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-ink-400">Completion</p>
              <p className="font-display text-xl font-bold">{achievements.length > 0 ? Math.round((earned.length / achievements.length) * 100) : 0}%</p>
            </div>
          </Card>
        </div>
      )}

      {/* Recently earned */}
      {earned.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-base font-bold">Recently earned</h2>
          <div className="flex flex-wrap gap-2">
            {earned.slice(0, 6).map((ua) => {
              const ach = achievements.find((a) => a.id === ua.achievement_id);
              if (!ach) return null;
              const Icon = getIcon(ach.icon);
              return (
                <div key={ua.id} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">{ach.title}</p>
                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">{formatDate(ua.earned_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={cn('rounded-full px-3 py-1.5 text-xs font-medium capitalize transition',
              filter === cat ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300')}>
            {cat}
          </button>
        ))}
      </div>

      {/* Badges grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ach) => {
            const Icon = getIcon(ach.icon);
            const isEarned = earnedSet.has(ach.id);
            const earnedEntry = earned.find((e) => e.achievement_id === ach.id);
            const colorCls = isEarned ? (CATEGORY_COLORS[ach.category] ?? CATEGORY_COLORS.general) : 'bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-600';
            return (
              <div key={ach.id}
                className={cn('card p-5 transition', isEarned ? 'border-amber-200 dark:border-amber-900/50 shadow-soft' : 'opacity-60')}>
                <div className="flex items-start gap-4">
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', colorCls)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-sm font-bold">{ach.title}</p>
                      {isEarned && <span className="text-amber-500">✓</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{ach.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge color={isEarned ? 'amber' : 'gray'} className="text-[10px]">
                        {ach.points} pts
                      </Badge>
                      <span className="text-[10px] capitalize text-ink-400">{ach.category}</span>
                      {isEarned && earnedEntry && (
                        <span className="text-[10px] text-ink-400">· {formatDate(earnedEntry.earned_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
