import { useEffect, useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  ClipboardList,
  Play,
  Plus,
  Save,
  Sparkles,
  Timer,
  Trophy,
  XCircle,
} from 'lucide-react';
import { supabase, type Note, type Quiz, type QuizQuestion } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, Badge, Progress } from '../../components/ui';
import { Textarea } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { generateQuiz } from '../../lib/ai';

type Difficulty = 'easy' | 'medium' | 'hard';

export function QuizGenerator() {
  const { user } = useAuth();
  const { push } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [sourceText, setSourceText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [count, setCount] = useState(5);
  const [timerMode, setTimerMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [history, setHistory] = useState<Quiz[]>([]);

  // Quiz state
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [n, q] = await Promise.all([
        supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('quizzes').select('*').order('created_at', { ascending: false }).limit(8),
      ]);
      setNotes((n.data as Note[]) ?? []);
      setHistory((q.data as Quiz[]) ?? []);
    })();
  }, [user]);

  // Timer
  useEffect(() => {
    if (!started || !timerMode || finished) return;
    if (timeLeft <= 0) { finish(answers); return; }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [started, timerMode, finished, timeLeft]);

  async function generate() {
    const text = sourceText.trim();
    if (text.length < 80) { push('warning', 'Please paste at least 80 characters of material first.'); return; }
    setGenerating(true);
    setQuiz([]);
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
    const q = generateQuiz(text, count, difficulty);
    setQuiz(q);
    setGenerating(false);
    if (q.length === 0) { push('warning', 'Could not generate questions from this text. Try more content.'); return; }
    setAnswers(new Array(q.length).fill(null));
    setCurrent(0);
    setStarted(true);
    setFinished(false);
    if (timerMode) setTimeLeft(q.length * 30);
    push('success', `Generated ${q.length} questions`);
  }

  function loadNote(note: Note) {
    setSourceText(note.content);
    push('info', `Loaded "${note.title}"`);
  }

  function answer(idx: number) {
    setAnswers((a) => {
      const next = [...a];
      next[current] = idx;
      return next;
    });
  }

  function next() {
    if (current < quiz.length - 1) setCurrent((c) => c + 1);
    else finish(answers);
  }

  async function finish(finalAnswers: (number | null)[]) {
    setFinished(true);
    setStarted(false);
    const score = quiz.reduce((s, q, i) => s + (finalAnswers[i] === q.answer ? 1 : 0), 0);
    if (user) {
      // Log a study session
      await supabase.from('study_sessions').insert({ user_id: user.id, duration_min: quiz.length * 1 });
      // Save quiz record
      const { data } = await supabase
        .from('quizzes')
        .insert({ user_id: user.id, title: `Quiz (${difficulty})`, questions: quiz, score, total: quiz.length, difficulty })
        .select()
        .single();
      if (data) setHistory((h) => [data as Quiz, ...h]);
    }
    push(score >= quiz.length / 2 ? 'success' : 'info', `You scored ${score}/${quiz.length}`);
  }

  function restart() {
    setQuiz([]); setAnswers([]); setCurrent(0); setStarted(false); setFinished(false); setTimeLeft(0);
  }

  const score = quiz.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
  const activeQuestion = quiz[current];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Quiz Generator</h1>
          <p className="text-sm text-ink-500">Generate MCQs from your notes and test yourself.</p>
        </div>

        {!started && !finished && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Source material</h2>
              <Button variant="ghost" size="sm" onClick={() => setSourceText(generateSampleQuizText())}>
                <Plus className="h-4 w-4" /> Sample
              </Button>
            </div>
            <Textarea rows={6} placeholder="Paste notes or text to generate a quiz from…" value={sourceText} onChange={(e) => setSourceText(e.target.value)} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {notes.map((n) => (
                <button key={n.id} onClick={() => loadNote(n)} className="chip bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300">
                  <BrainCircuit className="h-3 w-3" /> {n.title}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">Difficulty</label>
                <div className="flex gap-1">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)} className={cn('flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition', difficulty === d ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300')}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">Questions</label>
                <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="input-base !py-1.5 text-xs">
                  {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">Timer mode</label>
                <button onClick={() => setTimerMode((t) => !t)} className={cn('flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition', timerMode ? 'bg-orange-500 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300')}>
                  <Timer className="h-3.5 w-3.5" /> {timerMode ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            <Button className="mt-5 w-full" onClick={generate} loading={generating}>
              <Sparkles className="h-4 w-4" /> Generate quiz
            </Button>
          </Card>
        )}

        {/* Quiz in progress */}
        {started && activeQuestion && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge color="brand">Question {current + 1} of {quiz.length}</Badge>
                <Badge color={difficulty === 'easy' ? 'accent' : difficulty === 'hard' ? 'red' : 'amber'} className="capitalize">{difficulty}</Badge>
              </div>
              {timerMode && (
                <div className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold', timeLeft < 15 ? 'bg-red-50 text-red-600 dark:bg-red-950/40' : 'bg-ink-100 text-ink-600 dark:bg-ink-800')}>
                  <Clock className="h-3.5 w-3.5" /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
              )}
            </div>
            <Progress value={((current + 1) / quiz.length) * 100} className="mb-5" />

            <h3 className="font-display text-lg font-semibold leading-snug">{activeQuestion.question}</h3>
            <div className="mt-4 space-y-2">
              {activeQuestion.options.map((opt, i) => {
                const selected = answers[current] === i;
                return (
                  <button
                    key={i}
                    onClick={() => answer(i)}
                    className={cn('flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition', selected ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-200' : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800')}
                  >
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold', selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-300 dark:border-ink-600')}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 font-medium text-ink-800 dark:text-ink-100">{opt}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>Previous</Button>
              <Button onClick={next}>
                {current < quiz.length - 1 ? 'Next' : 'Finish'}
              </Button>
            </div>
          </Card>
        )}

        {/* Results */}
        {finished && (
          <Card className="animate-scale-in">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                <Trophy className="h-8 w-8" />
              </div>
              <h2 className="font-display text-3xl font-extrabold">{score}/{quiz.length}</h2>
              <p className="mt-1 text-sm text-ink-500">
                {score === quiz.length ? 'Perfect score!' : score >= quiz.length / 2 ? 'Nice work!' : 'Keep practicing!'}
              </p>
                <Progress value={(score / quiz.length) * 100} className="mx-auto mt-4 max-w-xs" color={score >= quiz.length / 2 ? 'bg-accent-500' : 'bg-amber-500'} />
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-sm">Review answers</h3>
              {quiz.map((q, i) => {
                const userAns = answers[i];
                const correct = userAns === q.answer;
                return (
                  <div key={i} className={cn('rounded-xl border p-4', correct ? 'border-accent-200 bg-accent-50/50 dark:border-accent-900 dark:bg-accent-950/20' : 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20')}>
                    <div className="mb-2 flex items-start gap-2">
                      {correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent-500" /> : <XCircle className="mt-0.5 h-4 w-4 text-red-500" />}
                      <p className="text-sm font-medium">{q.question}</p>
                    </div>
                    {!correct && (
                      <div className="ml-6 text-xs">
                        <p className="text-red-600 dark:text-red-400">Your answer: {userAns !== null ? q.options[userAns] : 'Skipped'}</p>
                        <p className="text-accent-700 dark:text-accent-400">Correct: {q.options[q.answer]}</p>
                      </div>
                    )}
                    {q.explanation && <p className="ml-6 mt-1 text-xs text-ink-500">{q.explanation}</p>}
                  </div>
                );
              })}
            </div>
            <Button className="mt-6 w-full" onClick={restart}>New quiz</Button>
          </Card>
        )}
      </div>

      {/* History */}
      <Card className="!p-0 self-start">
        <div className="border-b border-ink-100 p-4 dark:border-ink-800">
          <h2 className="font-display text-lg font-bold">Quiz history</h2>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {history.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No quizzes yet" description="Generate and complete a quiz to track your scores." />
          ) : (
            history.map((q) => {
              const pct = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;
              return (
                <div key={q.id} className="rounded-xl p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium">{q.title}</p>
                    <Badge color={pct >= 70 ? 'accent' : pct >= 40 ? 'amber' : 'red'}>{pct}%</Badge>
                  </div>
                  <p className="text-xs text-ink-400">{q.score}/{q.total} · {new Date(q.created_at).toLocaleDateString()}</p>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

function generateSampleQuizText(): string {
  return `Newton's first law of motion states that an object at rest stays at rest and an object in motion stays in motion unless acted upon by an unbalanced force. This is also called the law of inertia. Inertia is the tendency of an object to resist changes in its state of motion. Newton's second law states that the acceleration of an object depends on the net force acting on the object and the object's mass, and is summarized by the equation F = ma. Newton's third law states that for every action there is an equal and opposite reaction. Force is measured in newtons, mass in kilograms, and acceleration in meters per second squared. Momentum is the product of mass and velocity and is conserved in a closed system.`;
}

export { Save, Play };
