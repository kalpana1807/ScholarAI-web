import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Flame,
  MessageSquareText,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Type,
  Zap,
} from 'lucide-react';
import { supabase, type Note, type Quiz, type StudyPlan, type StudySession } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useRouter, type Route } from '../../lib/router';
import { useToast } from '../../lib/toast';
import { useSubjects } from '../../lib/use-subjects';
import { Card, EmptyState, Skeleton } from '../../components/ui';
import { StatRing } from '../../components/ui/Charts';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { cn, formatDate, formatRelative, startOfWeek } from '../../lib/utils';

// ─── helpers ──────────────────────────────────────────────────────────────────
function computeStreak(sessions: StudySession[]): number {
  if (!sessions.length) return 0;
  const dates = new Set(sessions.map((s) => s.session_date));
  let n = 0;
  const d = new Date();
  if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (dates.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function weekMinutes(sessions: StudySession[]): number {
  const wk = startOfWeek();
  return sessions
    .filter((s) => new Date(s.session_date) >= wk)
    .reduce((a, b) => a + b.duration_min, 0);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Dashboard() {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const { push } = useToast();
  const { subjects, reload: reloadSubjects } = useSubjects();

  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<StudyPlan[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-subject modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [n, t, s, q] = await Promise.all([
        supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(6),
        supabase
          .from('study_plans')
          .select('*')
          .order('due_date')
          .limit(10),
        supabase
          .from('study_sessions')
          .select('*')
          .order('session_date', { ascending: false })
          .limit(60),
        supabase
          .from('quizzes')
          .select('id,score,total,created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      setNotes((n.data as Note[]) ?? []);
      setTasks((t.data as StudyPlan[]) ?? []);
      setSessions((s.data as StudySession[]) ?? []);
      setQuizzes((q.data as Quiz[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  async function toggleTask(task: StudyPlan) {
    const updated = !task.completed;
    setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, completed: updated } : x)));
    await supabase.from('study_plans').update({ completed: updated }).eq('id', task.id);
  }

  async function addSubject() {
    if (!newSubject.trim()) return;
    setAddingSubject(true);
    const { error } = await supabase
      .from('subjects')
      .insert({ subject_name: newSubject.trim() });
    setAddingSubject(false);
    if (error) {
      push('error', 'Could not add subject');
      return;
    }
    setNewSubject('');
    setShowSubjectModal(false);
    await reloadSubjects();
    push('success', `Subject "${newSubject.trim()}" added`);
  }

  // ── derived values ──────────────────────────────────────────────────────────
  const streak = computeStreak(sessions);
  const weekMin = weekMinutes(sessions);
  const weekHours = Math.round((weekMin / 60) * 10) / 10;

  const todayStr = new Date().toISOString().slice(0, 10);
  const pendingToday = tasks.filter((t) => !t.completed && t.due_date <= todayStr);
  const completedCount = tasks.filter((t) => t.completed).length;
  const taskCompletionPct =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  void taskCompletionPct; // used via StatRing below

  const totalQuizScore = quizzes.reduce((a, q) => a + q.score, 0);
  const totalQuizTotal = quizzes.reduce((a, q) => a + q.total, 0);
  const quizAccuracy =
    totalQuizTotal > 0 ? Math.round((totalQuizScore / totalQuizTotal) * 100) : 0;

  const firstName = profile?.name?.split(' ')[0] ?? 'there';
  const greeting =
    new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 17
        ? 'Good afternoon'
        : 'Good evening';

  const isNewUser =
    !loading &&
    notes.length === 0 &&
    tasks.length === 0 &&
    subjects.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {greeting}, {firstName}!
          </h1>
        </div>
        <Button onClick={() => navigate({ name: 'tutor' })}>
          <Sparkles className="h-4 w-4" /> Ask AI Tutor
        </Button>
      </div>

      {/* ── New-user onboarding (no data yet) ── */}
      {isNewUser && <OnboardingBanner onAddSubject={() => setShowSubjectModal(true)} navigate={navigate} />}

      {/* ── Stat row ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Study streak"
          value={streak > 0 ? `${streak} day${streak !== 1 ? 's' : ''}` : 'Start today!'}
          accent="text-orange-500"
          bg="bg-orange-50 dark:bg-orange-950/30"
          loading={loading}
        />
        <StatCard
          icon={ClockIcon}
          label="This week"
          value={weekMin > 0 ? `${weekHours}h` : '—'}
          accent="text-brand-500"
          bg="bg-brand-50 dark:bg-brand-950/30"
          loading={loading}
        />
        <StatCard
          icon={BookOpen}
          label="Notes saved"
          value={String(notes.length)}
          accent="text-accent-500"
          bg="bg-accent-50 dark:bg-accent-950/30"
          loading={loading}
        />
        <StatCard
          icon={Trophy}
          label="Quiz accuracy"
          value={totalQuizTotal > 0 ? `${quizAccuracy}%` : '—'}
          accent="text-amber-500"
          bg="bg-amber-50 dark:bg-amber-950/30"
          loading={loading}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left 2/3 */}
        <div className="space-y-6 xl:col-span-2">
          {/* Today's tasks */}
          <Card>
            <SectionHeader
              icon={CalendarCheck}
              title="Today's tasks"
              subtitle={
                pendingToday.length > 0
                  ? `${pendingToday.length} remaining`
                  : 'All clear!'
              }
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'planner' })}>
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            />
            {loading ? (
              <SkeletonList count={3} />
            ) : pendingToday.length === 0 ? (
              <EmptyState
                icon={CalendarPlus}
                title={tasks.length > 0 ? 'All tasks done for today!' : 'No tasks scheduled'}
                description="Add tasks in the Study Planner to organize your day."
                action={
                  <Button size="sm" onClick={() => navigate({ name: 'planner' })}>
                    <Plus className="h-4 w-4" /> Open planner
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {pendingToday.slice(0, 5).map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggleTask} subjects={subjects} />
                ))}
              </ul>
            )}
          </Card>

          {/* Recent notes */}
          <Card>
            <SectionHeader
              icon={BookOpen}
              title="Recent notes"
              subtitle={notes.length > 0 ? `${notes.length} saved` : 'None yet'}
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'notes' })}>
                  All notes <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            />
            {loading ? (
              <SkeletonGrid count={4} />
            ) : notes.length === 0 ? (
              <EmptyState
                icon={Type}
                title="No notes yet"
                description="Paste study material and summarize it to save notes here."
                action={
                  <Button size="sm" onClick={() => navigate({ name: 'notes' })}>
                    Create a note
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {notes.slice(0, 4).map((n) => (
                  <NoteCard key={n.id} note={n} onClick={() => navigate({ name: 'notes' })} />
                ))}
              </div>
            )}
          </Card>

          {/* Subjects */}
          <Card>
            <SectionHeader
              icon={BrainCircuit}
              title="My subjects"
              subtitle={`${subjects.length} subject${subjects.length !== 1 ? 's' : ''}`}
              action={
                <Button variant="ghost" size="sm" onClick={() => setShowSubjectModal(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              }
            />
            {loading ? (
              <SkeletonList count={3} />
            ) : subjects.length === 0 ? (
              <EmptyState
                icon={BrainCircuit}
                title="No subjects yet"
                description="Create subjects to organise your notes, quizzes, and flashcards."
                action={
                  <Button size="sm" onClick={() => setShowSubjectModal(true)}>
                    <Plus className="h-4 w-4" /> Add a subject
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium dark:border-ink-700 dark:bg-ink-800"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.subject_name}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Weekly goal ring */}
          <Card className="flex flex-col items-center text-center">
            <h2 className="mb-4 self-start font-display text-base font-bold">Weekly goal</h2>
            <StatRing value={weekMin} max={600} size={148} thickness={12} color="#2447f5" label="of 10h" />
            <p className="mt-3 text-sm text-ink-500">
              {weekMin >= 600
                ? 'Weekly goal smashed!'
                : weekMin > 0
                  ? `${Math.max(0, 600 - weekMin)} min left to hit 10h`
                  : 'Start studying to track progress'}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              onClick={() => navigate({ name: 'analytics' })}
            >
              <TrendingUp className="h-4 w-4" /> View analytics
            </Button>
          </Card>

          {/* Quick actions */}
          <Card>
            <h2 className="mb-4 font-display text-base font-bold">Quick actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={MessageSquareText} label="AI Tutor" onClick={() => navigate({ name: 'tutor' })} color="bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400" />
              <QuickAction icon={Type} label="Summarize" onClick={() => navigate({ name: 'notes' })} color="bg-accent-50 text-accent-600 dark:bg-accent-950/40 dark:text-accent-400" />
              <QuickAction icon={ClipboardList} label="New quiz" onClick={() => navigate({ name: 'quiz' })} color="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" />
              <QuickAction icon={CalendarPlus} label="Add task" onClick={() => navigate({ name: 'planner' })} color="bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400" />
            </div>
          </Card>

          {/* Progress ring */}
          {tasks.length > 0 && (
            <Card className="flex flex-col items-center text-center">
              <h2 className="mb-4 self-start font-display text-base font-bold">Task completion</h2>
              <StatRing value={completedCount} max={tasks.length} size={100} thickness={9} color="#10b981" />
              <p className="mt-2 text-sm text-ink-500">
                {completedCount} of {tasks.length} tasks done
              </p>
            </Card>
          )}

          {/* Upcoming 4 tasks */}
          {tasks.filter((t) => !t.completed && t.due_date > todayStr).length > 0 && (
            <Card>
              <h2 className="mb-3 font-display text-base font-bold">Upcoming</h2>
              <ul className="space-y-2.5">
                {tasks
                  .filter((t) => !t.completed && t.due_date > todayStr)
                  .slice(0, 4)
                  .map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 shrink-0 text-ink-300" />
                      <span className="flex-1 truncate text-ink-700 dark:text-ink-200">{t.task}</span>
                      <span className="text-[11px] text-ink-400">{formatDate(t.due_date)}</span>
                    </li>
                  ))}
              </ul>
            </Card>
          )}

          {/* Flashcards CTA */}
          <Card className="relative overflow-hidden border-brand-200 bg-gradient-to-br from-brand-50 to-accent-50 dark:border-brand-900/60 dark:from-brand-950/40 dark:to-accent-950/30">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-400/10" />
            <Zap className="mb-2 h-6 w-6 text-brand-500" />
            <h3 className="font-display text-sm font-bold">Ready to review?</h3>
            <p className="mt-1 text-xs text-ink-500">Open flashcards and test yourself.</p>
            <Button size="sm" className="mt-3 w-full" onClick={() => navigate({ name: 'flashcards' })}>
              Start reviewing
            </Button>
          </Card>
        </div>
      </div>

      {/* Add Subject modal */}
      <Modal
        open={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title="Add subject"
        description="Organise your notes, quizzes, and flashcards by subject."
      >
        <Input
          label="Subject name"
          placeholder="e.g. Organic Chemistry, Calculus"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSubject()}
          autoFocus
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowSubjectModal(false)}>
            Cancel
          </Button>
          <Button onClick={addSubject} loading={addingSubject}>
            Add subject
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function OnboardingBanner({
  onAddSubject,
  navigate,
}: {
  onAddSubject: () => void;
  navigate: (r: Route) => void;
}) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-accent-50 p-6 dark:border-brand-900/60 dark:from-brand-950/30 dark:via-ink-900 dark:to-accent-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold">Welcome to ScholarAI!</h2>
          <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">
            Get started in 3 steps: add your subjects, summarize some notes, and take your first quiz.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onAddSubject}>
            <Plus className="h-4 w-4" /> Add subject
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate({ name: 'notes' })}>
            Summarize notes
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate({ name: 'tutor' })}>
            Chat with AI
          </Button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { icon: BrainCircuit, label: 'Add a subject', hint: 'Keep things organised' },
          { icon: BookOpen, label: 'Summarize notes', hint: 'Paste any text' },
          { icon: ClipboardList, label: 'Take a quiz', hint: 'Test your knowledge' },
        ].map((step, i) => (
          <div key={i} className="rounded-xl border border-ink-200/70 bg-white p-3 text-center dark:border-ink-800 dark:bg-ink-900">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
              <step.icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold">{step.label}</p>
            <p className="text-[10px] text-ink-400">{step.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  bg,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
  bg: string;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-20 w-full" />;
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bg, accent)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-ink-400">{label}</p>
          <p className="font-display text-xl font-bold leading-tight">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-ink-400" />
        <div>
          <h2 className="font-display text-base font-bold leading-none">{title}</h2>
          <p className="mt-0.5 text-[11px] text-ink-400">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  subjects,
}: {
  task: StudyPlan;
  onToggle: (t: StudyPlan) => void;
  subjects: { id: string; subject_name: string; color: string }[];
}) {
  const subj = subjects.find((s) => s.id === task.subject_id);
  const priorityColors: Record<string, string> = {
    high: 'text-red-600 bg-red-50 dark:bg-red-950/40',
    medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
    low: 'text-accent-600 bg-accent-50 dark:bg-accent-950/30',
  };
  return (
    <li>
      <button
        onClick={() => onToggle(task)}
        className="flex w-full items-center gap-3 rounded-xl border border-ink-100 p-3 text-left transition hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/50"
      >
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
            task.completed
              ? 'border-accent-500 bg-accent-500 text-white'
              : 'border-ink-300 dark:border-ink-600'
          )}
        >
          {task.completed && <CheckCircle2 className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm font-medium',
              task.completed
                ? 'text-ink-400 line-through'
                : 'text-ink-800 dark:text-ink-100'
            )}
          >
            {task.task}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-ink-400">
            <span>{formatDate(task.due_date)}</span>
            {subj && (
              <>
                <span>·</span>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: subj.color }}
                />
                <span>{subj.subject_name}</span>
              </>
            )}
          </div>
        </div>
        <span className={cn('chip text-[10px]', priorityColors[task.priority] ?? 'bg-ink-100 text-ink-500')}>
          {task.priority}
        </span>
      </button>
    </li>
  );
}

function NoteCard({ note, onClick }: { note: Note; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group rounded-xl border border-ink-100 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/30 dark:border-ink-800 dark:hover:bg-brand-950/20"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
          <BookOpen className="h-3.5 w-3.5" />
        </span>
        <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{note.title}</p>
      </div>
      <p className="line-clamp-2 text-xs text-ink-500 dark:text-ink-400">
        {note.summary ?? note.content.slice(0, 110)}
      </p>
      <p className="mt-2 text-[10px] text-ink-400">{formatRelative(note.created_at)}</p>
    </button>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-ink-100 p-3.5 text-center transition hover:border-brand-200 hover:shadow-soft dark:border-ink-800 dark:hover:border-brand-900"
    >
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', color)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-xs font-medium text-ink-700 dark:text-ink-200">{label}</span>
    </button>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

// Inline clock icon (avoids extra lucide import)
function ClockIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
