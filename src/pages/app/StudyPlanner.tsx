import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Flame,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase, type StudyPlan } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useSubjects } from '../../lib/use-subjects';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, Badge, Progress, Skeleton } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { cn, formatDate, startOfWeek } from '../../lib/utils';

type Priority = 'low' | 'medium' | 'high';

export function StudyPlanner() {
  const { user } = useAuth();
  const { push } = useToast();
  const { subjects } = useSubjects();

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'week'>('list');
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek());
  const [showModal, setShowModal] = useState(false);

  const [task, setTask] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<Priority>('medium');
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('study_plans').select('*').order('due_date');
      setPlans((data as StudyPlan[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  async function add() {
    if (!task.trim()) { push('warning', 'Enter a task'); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from('study_plans')
      .insert({ user_id: user!.id, subject_id: subjectId || null, task: task.trim(), due_date: dueDate, priority })
      .select()
      .single();
    setSaving(false);
    if (error) { push('error', 'Could not add task'); return; }
    setPlans((p) => [...p, data as StudyPlan].sort((a, b) => a.due_date.localeCompare(b.due_date)));
    setTask(''); setSubjectId(''); setPriority('medium'); setShowModal(false);
    push('success', 'Task added');
  }

  async function toggle(p: StudyPlan) {
    const updated = !p.completed;
    setPlans((arr) => arr.map((x) => (x.id === p.id ? { ...x, completed: updated } : x)));
    await supabase.from('study_plans').update({ completed: updated }).eq('id', p.id);
  }

  async function remove(p: StudyPlan) {
    setPlans((arr) => arr.filter((x) => x.id !== p.id));
    await supabase.from('study_plans').delete().eq('id', p.id);
    push('success', 'Task deleted');
  }

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todays = plans.filter((p) => p.due_date === todayStr);
  const overdue = plans.filter((p) => !p.completed && p.due_date < todayStr);
  const upcoming = plans.filter((p) => !p.completed && p.due_date >= todayStr);
  const done = plans.filter((p) => p.completed).length;
  const completionPct = plans.length > 0 ? Math.round((done / plans.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Study Planner</h1>
          <p className="text-sm text-ink-500">Plan goals, track progress, and never miss a deadline.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-ink-200 p-0.5 dark:border-ink-700">
            <button onClick={() => setView('list')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', view === 'list' ? 'bg-brand-600 text-white' : 'text-ink-600 dark:text-ink-300')}>List</button>
            <button onClick={() => setView('week')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', view === 'week' ? 'bg-brand-600 text-white' : 'text-ink-600 dark:text-ink-300')}>Week</button>
          </div>
          <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> New task</Button>
        </div>
      </div>

      {/* Progress overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="!p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-ink-400">Overall progress</p>
            <Badge color="brand">{completionPct}%</Badge>
          </div>
          <Progress value={completionPct} />
          <p className="mt-2 text-xs text-ink-500">{done} of {plans.length} tasks done</p>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-xs text-ink-400">Due today</p>
              <p className="font-display text-xl font-bold">{todays.filter((t) => !t.completed).length}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-xs text-ink-400">Overdue</p>
              <p className="font-display text-xl font-bold">{overdue.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <Card><div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div></Card>
      ) : view === 'list' ? (
        <div className="space-y-5">
          {/* Today */}
          <TaskSection title="Today" tasks={todays} onToggle={toggle} onDelete={remove} subjects={subjects} highlight />
          {/* Overdue */}
          {overdue.length > 0 && <TaskSection title="Overdue" tasks={overdue} onToggle={toggle} onDelete={remove} subjects={subjects} danger />}
          {/* Upcoming */}
          <TaskSection title="Upcoming" tasks={upcoming} onToggle={toggle} onDelete={remove} subjects={subjects} />
        </div>
      ) : (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}><ChevronLeft className="h-4 w-4" /></Button>
            <p className="font-display text-sm font-bold">
              {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
            {weekDays.map((day) => {
              const dateStr = day.toISOString().slice(0, 10);
              const dayTasks = plans.filter((p) => p.due_date === dateStr);
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr} className={cn('min-h-[120px] rounded-xl border p-2', isToday ? 'border-brand-300 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-950/30' : 'border-ink-100 dark:border-ink-800')}>
                  <div className="mb-2 text-center">
                    <p className="text-[10px] font-medium uppercase text-ink-400">{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                    <p className={cn('text-sm font-bold', isToday && 'text-brand-600 dark:text-brand-400')}>{day.getDate()}</p>
                  </div>
                  <div className="space-y-1">
                    {dayTasks.map((t) => (
                      <button key={t.id} onClick={() => toggle(t)} className={cn('block w-full truncate rounded-md px-1.5 py-1 text-[10px] font-medium', t.completed ? 'bg-accent-100 text-accent-600 line-through dark:bg-accent-950/40' : priorityBg(t.priority))} title={t.task}>
                        {t.task}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!loading && plans.length === 0 && (
        <Card>
          <EmptyState icon={CalendarDays} title="No tasks yet" description="Add a study task, set a due date, and track your progress." action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Add a task</Button>} />
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New task" description="Add a study goal or task to your planner.">
        <div className="space-y-4">
          <Input label="Task" placeholder="e.g. Revise chapter 5 problems" value={task} onChange={(e) => setTask(e.target.value)} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="input-base">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">Subject (optional)</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="input-base">
              <option value="">No subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={add} loading={saving}>Add task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TaskSection({ title, tasks, onToggle, onDelete, subjects, highlight, danger }: { title: string; tasks: StudyPlan[]; onToggle: (p: StudyPlan) => void; onDelete: (p: StudyPlan) => void; subjects: { id: string; subject_name: string; color: string }[]; highlight?: boolean; danger?: boolean; }) {
  if (tasks.length === 0) return null;
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <CalendarCheck className={cn('h-4 w-4', danger ? 'text-red-500' : highlight ? 'text-brand-500' : 'text-ink-400')} />
        <h2 className="font-display text-base font-bold">{title}</h2>
        <Badge color="gray">{tasks.length}</Badge>
      </div>
      <ul className="space-y-2">
        {tasks.map((p) => {
          const subj = subjects.find((s) => s.id === p.subject_id);
          return (
            <li key={p.id} className="group flex items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
              <button onClick={() => onToggle(p)} className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', p.completed ? 'border-accent-500 bg-accent-500 text-white' : 'border-ink-300 dark:border-ink-600')}>
                {p.completed && <CheckCircle2 className="h-4 w-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', p.completed ? 'text-ink-400 line-through' : 'text-ink-800 dark:text-ink-100')}>{p.task}</p>
                <div className="flex items-center gap-2 text-[10px] text-ink-400">
                  <span>{formatDate(p.due_date)}</span>
                  {subj && <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: subj.color }} />{subj.subject_name}</span>}
                  <span className={cn('capitalize', p.priority === 'high' ? 'text-red-500' : p.priority === 'medium' ? 'text-amber-500' : 'text-accent-500')}>{p.priority}</span>
                </div>
              </div>
              <button onClick={() => onDelete(p)} className="text-ink-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function priorityBg(p: Priority): string {
  return p === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300' : p === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-accent-100 text-accent-600 dark:bg-accent-950/40 dark:text-accent-300';
}
