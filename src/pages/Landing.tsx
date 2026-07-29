import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Check,
  Clipboard,
  Flame,
  MessageSquareText,
  Moon,
  Quote,
  Sparkles,
  Sun,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useTheme } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui';
import { Logo, LogoMark } from '../components/Logo';

// ─── Real aggregate stats ─────────────────────────────────────────────────────
type HeroStats = { notes: number; quizzes: number; users: number };

function useHeroStats(): HeroStats {
  const [stats, setStats] = useState<HeroStats>({ notes: 0, quizzes: 0, users: 0 });
  useEffect(() => {
    (async () => {
      const [n, q, p] = await Promise.all([
        supabase.from('notes').select('id', { count: 'exact', head: true }),
        supabase.from('quizzes').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        notes: n.count ?? 0,
        quizzes: q.count ?? 0,
        users: p.count ?? 0,
      });
    })();
  }, []);
  return stats;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LandingPage() {
  const { navigate } = useRouter();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const stats = useHeroStats();

  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-ink-200/60 bg-white/80 backdrop-blur-xl dark:border-ink-800/60 dark:bg-ink-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            {['Features', 'How it works', 'Testimonials', 'Pricing'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm font-medium text-ink-600 transition hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="btn-ghost p-2" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <Button size="sm" onClick={() => navigate({ name: 'dashboard' })}>
                Open app <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'auth', mode: 'login' })}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => navigate({ name: 'auth', mode: 'signup' })}>
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid-light bg-[size:32px_32px] dark:opacity-[0.12]" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[130px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-900 dark:bg-brand-950/60 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered study companion
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] text-balance sm:text-5xl lg:text-6xl">
              Learn smarter with{' '}
              <span className="gradient-text">ScholarAI</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-600 dark:text-ink-300">
              Generate summaries, quiz yourself, build flashcards, plan your week, and get
              step-by-step AI tutoring — everything a student needs, in one workspace.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => navigate({ name: 'auth', mode: 'signup' })}
                className="w-full sm:w-auto"
              >
                Start for free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate({ name: 'auth', mode: 'login' })}
                className="w-full sm:w-auto"
              >
                Sign in
              </Button>
            </div>
            <p className="mt-3 text-xs text-ink-400">No credit card required · Free plan available</p>
          </div>

          {/* Hero browser mockup with REAL stats */}
          <div className="relative mx-auto mt-14 max-w-5xl">
            <div className="card overflow-hidden !p-0 shadow-glow">
              <div className="flex items-center gap-1.5 border-b border-ink-100 px-4 py-2.5 dark:border-ink-800">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-accent-400" />
                <span className="ml-3 flex items-center gap-1.5 text-xs font-medium text-ink-400">
                  <LogoMark size={14} />
                  ScholarAI — Dashboard
                </span>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                {[
                  {
                    icon: BookOpen,
                    label: 'Notes created',
                    value: stats.notes > 0 ? stats.notes.toLocaleString() : '—',
                    color: 'text-brand-500',
                    bg: 'bg-brand-50 dark:bg-brand-950/40',
                  },
                  {
                    icon: Trophy,
                    label: 'Quizzes taken',
                    value: stats.quizzes > 0 ? stats.quizzes.toLocaleString() : '—',
                    color: 'text-amber-500',
                    bg: 'bg-amber-50 dark:bg-amber-950/40',
                  },
                  {
                    icon: Users,
                    label: 'Students',
                    value: stats.users > 0 ? stats.users.toLocaleString() : '—',
                    color: 'text-accent-500',
                    bg: 'bg-accent-50 dark:bg-accent-950/40',
                  },
                ].map((s) => (
                  <div key={s.label} className="card flex items-center gap-3 !p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg} ${s.color}`}>
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-ink-400">{s.label}</p>
                      <p className="font-display text-xl font-bold">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge color="brand"><Sparkles className="h-3 w-3" /> Features</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to ace your studies
          </h2>
          <p className="mt-4 text-ink-600 dark:text-ink-300">
            One platform for all your study needs — from AI tutoring to detailed analytics.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="card group p-6 transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.bg} ${f.color} transition-transform group-hover:scale-110`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        className="border-y border-ink-200/60 bg-white dark:border-ink-800/60 dark:bg-ink-900/50"
      >
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge color="accent"><Zap className="h-3 w-3" /> How it works</Badge>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              From overwhelmed to on top of it
            </h2>
            <p className="mt-4 text-ink-600 dark:text-ink-300">
              Three steps to a calmer, more effective study routine.
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="relative">
                <span className="font-display text-5xl font-extrabold text-brand-100 dark:text-brand-950/80">
                  {s.step}
                </span>
                <h3 className="mt-1 font-display text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge color="amber"><Quote className="h-3 w-3" /> Testimonials</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by students everywhere
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="card flex flex-col p-6">
              <div className="mb-3 flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
                "{t.quote}"
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-ink-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        id="pricing"
        className="border-t border-ink-200/60 bg-white dark:border-ink-800/60 dark:bg-ink-900/50"
      >
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge color="brand"><Trophy className="h-3 w-3" /> Pricing</Badge>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, student-friendly pricing
            </h2>
            <p className="mt-4 text-ink-600 dark:text-ink-300">
              Start free. Upgrade only when you need more.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative card p-7 ${p.featured ? 'ring-2 ring-brand-500 shadow-glow' : ''}`}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge color="brand">Most popular</Badge>
                  </div>
                )}
                <h3 className="font-display text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-ink-500">{p.desc}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold">${p.price}</span>
                  <span className="text-sm text-ink-400">/month</span>
                </div>
                <Button
                  variant={p.featured ? 'primary' : 'secondary'}
                  size="lg"
                  className="mt-6 w-full"
                  onClick={() => navigate({ name: 'auth', mode: 'signup' })}
                >
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </Button>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                      <span className="text-ink-700 dark:text-ink-200">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-8 py-16 text-center shadow-glow">
          <div className="pointer-events-none absolute inset-0 bg-grid-light bg-[size:24px_24px] opacity-15" />
          <div className="relative">
            <LogoMark size={52} />
            <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              Ready to study smarter?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-100">
              Join students using ScholarAI to ace their exams.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8"
              onClick={() => navigate({ name: 'auth', mode: 'signup' })}
            >
              Create your free account <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-ink-200/60 bg-white dark:border-ink-800/60 dark:bg-ink-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo />
            <p className="text-sm text-ink-400">
              © {new Date().getFullYear()} ScholarAI. Built for students, by students.
            </p>
            <div className="flex items-center gap-3 text-xs text-ink-400">
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                Keep that streak alive
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Static data ───────────────────────────────────────────────────────────────

const features = [
  {
    icon: MessageSquareText,
    title: 'AI Tutor',
    desc: 'Chat with an AI that explains concepts step-by-step and saves the conversation for later.',
    color: 'text-brand-600',
    bg: 'bg-brand-50 dark:bg-brand-950/50',
  },
  {
    icon: BookOpen,
    title: 'Notes Summarizer',
    desc: 'Upload or paste notes to generate clean summaries and key points you can save anytime.',
    color: 'text-accent-600',
    bg: 'bg-accent-50 dark:bg-accent-950/40',
  },
  {
    icon: Clipboard,
    title: 'Quiz Generator',
    desc: 'Turn notes into MCQs with difficulty levels, a timer mode, and full answer explanations.',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    icon: BrainCircuit,
    title: 'Flashcards',
    desc: 'Auto-generate flashcard decks from any material, flip through them, and track review sessions.',
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
  },
  {
    icon: CalendarCheck,
    title: 'Study Planner',
    desc: 'Set daily goals, a weekly schedule, due dates, and priorities — then tick them off.',
    color: 'text-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'See study hours, subject performance, quiz accuracy, and streaks in a clean dashboard.',
    color: 'text-sky-600',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
  },
];

const steps = [
  {
    step: '01',
    title: 'Add your materials',
    desc: 'Upload notes or paste text. The AI reads it and structures everything for you.',
  },
  {
    step: '02',
    title: 'Generate & practise',
    desc: 'Create summaries, quizzes, and flashcards in one click — then test yourself with timer mode.',
  },
  {
    step: '03',
    title: 'Track & improve',
    desc: 'Watch your streak, accuracy, and study hours climb with clean analytics.',
  },
];

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'JEE 2024 — AIR 340',
    quote:
      'The quiz generator is a lifesaver. I turn my notes into MCQs in seconds and the explanations actually teach me what I got wrong.',
  },
  {
    name: 'James O.',
    role: 'Computer Science, 2nd year',
    quote:
      'My study streak went from 0 to 28 days. The dashboard keeps me accountable and the AI tutor explains things better than my textbook.',
  },
  {
    name: 'Aisha Patel',
    role: 'USMLE Step 1 Candidate',
    quote:
      'Flashcards plus the planner combo is unbeatable for med school. I review every morning and never miss a topic on my schedule.',
  },
];

const plans = [
  {
    name: 'Free',
    price: 0,
    desc: 'Perfect for getting started.',
    cta: 'Get started free',
    featured: false,
    features: [
      'AI tutor (50 messages/month)',
      'Notes summarizer',
      'Flashcards (3 decks)',
      'Basic analytics',
      'Study planner',
    ],
  },
  {
    name: 'Premium',
    price: 9,
    desc: 'For serious students.',
    cta: 'Go Premium',
    featured: true,
    features: [
      'Unlimited AI tutor messages',
      'Unlimited flashcard decks',
      'Quiz generator with timer mode',
      'Advanced analytics',
      'Priority support',
      'Cloud sync across devices',
    ],
  },
];
