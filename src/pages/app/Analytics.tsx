import { useEffect, useState } from 'react';
import { Award, BarChart3, Flame, Target, TrendingUp } from 'lucide-react';
import { supabase, type Quiz, type StudyPlan, type StudySession, type Subject } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Card, EmptyState, Progress, Skeleton } from '../../components/ui';
import { BarChart, DonutChart, LineChart, StatRing } from '../../components/ui/Charts';
import { clamp, startOfWeek } from '../../lib/utils';
import { SUBJECT_COLORS } from '../../lib/use-subjects';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [s, q, p, sub] = await Promise.all([
        supabase.from('study_sessions').select('*').order('session_date', { ascending: true }),
        supabase.from('quizzes').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('study_plans').select('*'),
        supabase.from('subjects').select('*'),
      ]);
      setSessions((s.data as StudySession[]) ?? []);
      setQuizzes((q.data as Quiz[]) ?? []);
      setPlans((p.data as StudyPlan[]) ?? []);
      setSubjects((sub.data as Subject[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}</div>
      </div>
    );
  }

  // Weekly study hours (last 7 days, labeled)
  const weekStart = startOfWeek();
  const weekData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const mins = sessions.filter((s) => s.session_date === ds).reduce((a, b) => a + b.duration_min, 0);
    return { label: DAY_LABELS[d.getDay()], value: Math.round((mins / 60) * 10) / 10 };
  });

  // 14-day trend
  const trendData = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const ds = d.toISOString().slice(0, 10);
    const mins = sessions.filter((s) => s.session_date === ds).reduce((a, b) => a + b.duration_min, 0);
    return { label: `${d.getDate()}`, value: mins };
  });

  // Subject distribution (sessions count)
  const subjectDist = subjects.map((subj, i) => ({
    label: subj.subject_name,
    value: sessions.filter((s) => s.subject_id === subj.id).reduce((a, b) => a + b.duration_min, 10),
    color: subj.color || SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }));
  const uncategorized = sessions.filter((s) => !s.subject_id).reduce((a, b) => a + b.duration_min, 0);
  if (uncategorized > 0) subjectDist.push({ label: 'General', value: uncategorized, color: '#94a3b8' });

  // Quiz accuracy
  const totalQuestions = quizzes.reduce((a, q) => a + q.total, 0);
  const totalCorrect = quizzes.reduce((a, q) => a + q.score, 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Subject-wise performance (from quizzes)
  const subjectPerf = subjects.map((subj) => {
    const subjQuizzes = quizzes.filter((q) => q.subject_id === subj.id);
    const q = subjQuizzes.length;
    const correct = subjQuizzes.reduce((a, x) => a + x.score, 0);
    const total = subjQuizzes.reduce((a, x) => a + x.total, 0);
    return { subj, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0, count: q };
  });

  // Streak
  const streak = computeStreak(sessions);
  const totalMins = sessions.reduce((a, b) => a + b.duration_min, 0);
  const totalHours = Math.round((totalMins / 60) * 10) / 10;

  const taskDone = plans.filter((p) => p.completed).length;
  const taskPct = plans.length > 0 ? Math.round((taskDone / plans.length) * 100) : 0;

  if (sessions.length === 0 && quizzes.length === 0) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Analytics</h1>
        <Card className="mt-6">
          <EmptyState icon={BarChart3} title="No data yet" description="Study using the AI Tutor, complete quizzes, and log sessions — your analytics will appear here." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-ink-500">Track your study hours, accuracy, and progress over time.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="flex items-center gap-4 !p-4">
          <StatRing value={streak} max={30} size={70} thickness={7} color="#f97316" />
          <div>
            <p className="text-xs text-ink-400">Current streak</p>
            <p className="font-display text-2xl font-bold">{streak} <span className="text-sm font-normal text-ink-400">days</span></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 !p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40"><TrendingUp className="h-6 w-6" /></div>
          <div>
            <p className="text-xs text-ink-400">Total study time</p>
            <p className="font-display text-2xl font-bold">{totalHours}<span className="text-sm font-normal text-ink-400"> h</span></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 !p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-950/40"><Target className="h-6 w-6" /></div>
          <div>
            <p className="text-xs text-ink-400">Quiz accuracy</p>
            <p className="font-display text-2xl font-bold">{accuracy}<span className="text-sm font-normal text-ink-400">%</span></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 !p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40"><Award className="h-6 w-6" /></div>
          <div>
            <p className="text-xs text-ink-400">Quizzes taken</p>
            <p className="font-display text-2xl font-bold">{quizzes.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly bar chart */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Study hours this week</h2>
              <p className="text-xs text-ink-400">Hours studied per day</p>
            </div>
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <BarChart data={weekData} valueFormat={(v) => `${v}h`} color="#3b66ff" />
        </Card>

        {/* Subject distribution */}
        <Card>
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold">Subject distribution</h2>
            <p className="text-xs text-ink-400">Minutes studied per subject</p>
          </div>
          {subjectDist.length === 0 ? (
            <EmptyState icon={BarChart3} title="No data" description="Log sessions with subjects to see distribution." />
          ) : (
            <DonutChart data={subjectDist.map((d) => ({ ...d, value: d.value }))} size={160} />
          )}
        </Card>

        {/* 14-day trend */}
        <Card>
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold">14-day study trend</h2>
            <p className="text-xs text-ink-400">Minutes per day over the past two weeks</p>
          </div>
          <LineChart data={trendData} color="#10b981" />
        </Card>

        {/* Subject performance */}
        <Card>
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold">Subject-wise performance</h2>
            <p className="text-xs text-ink-400">Quiz accuracy per subject</p>
          </div>
          {subjectPerf.length === 0 ? (
            <EmptyState icon={Target} title="No subjects" description="Add subjects and complete quizzes to see performance." />
          ) : (
            <div className="space-y-3">
              {subjectPerf.map((p) => (
                <div key={p.subj.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.subj.color }} />
                      <span className="text-sm font-medium">{p.subj.subject_name}</span>
                    </div>
                    <span className="text-xs text-ink-500">{p.accuracy}% · {p.count} quizzes</span>
                  </div>
                  <Progress value={p.accuracy} color="bg-accent-500" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent quizzes */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-bold">Recent quiz results</h2>
        {quizzes.length === 0 ? (
          <EmptyState icon={Target} title="No quizzes yet" description="Complete a quiz in the Quiz Generator to see results." />
        ) : (
          <div className="space-y-2">
            {quizzes.slice(0, 8).map((q) => {
              const pct = q.total > 0 ? clamp(Math.round((q.score / q.total) * 100), 0, 100) : 0;
              return (
                <div key={q.id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{q.title}</p>
                    <p className="text-[10px] text-ink-400">{new Date(q.created_at).toLocaleDateString()} · {q.difficulty}</p>
                  </div>
                  <div className="hidden w-32 sm:block"><Progress value={pct} color={pct >= 70 ? 'bg-accent-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'} /></div>
                  <span className="w-12 text-right text-sm font-bold">{q.score}/{q.total}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Task completion */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Task completion</h2>
          <span className="text-xs text-ink-400">{taskDone}/{plans.length} done</span>
        </div>
        <Progress value={taskPct} color="bg-brand-500" />
      </Card>
    </div>
  );
}

function computeStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.map((s) => s.session_date));
  let streak = 0;
  const d = new Date();
  if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
