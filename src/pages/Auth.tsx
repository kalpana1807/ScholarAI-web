import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, Check, KeyRound, Loader2, Lock, Mail, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useTheme } from '../lib/theme';
import { useToast } from '../lib/toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo, LogoMark } from '../components/Logo';

export function AuthPage({ mode }: { mode: 'login' | 'signup' | 'forgot' | 'reset' }) {
  const { signIn, signUp, resetPassword } = useAuth();
  const { navigate } = useRouter();
  const { theme, toggle } = useTheme();
  const { push } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (mode === 'signup' && name.trim().length < 2) e.name = 'Please enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (mode !== 'forgot' && password.length < 6) e.password = 'At least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, name);
        if (error) push('error', error);
        else {
          push('success', 'Account created! Welcome to ScholarAI.');
          navigate({ name: 'dashboard' });
        }
      } else if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) push('error', error);
        else {
          push('success', 'Welcome back!');
          navigate({ name: 'dashboard' });
        }
      } else if (mode === 'forgot' || mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) push('error', error);
        else {
          setSent(true);
          push('success', 'Password reset link sent — check your email.');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-950">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 lg:flex">
        <div className="absolute inset-0 bg-grid-light bg-[size:28px_28px] opacity-20" />
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-accent-400/30 blur-[100px]" />
        <div className="relative z-10 flex h-full flex-col p-12 text-white">
          {/* Brand in panel */}
          <button
            onClick={() => navigate({ name: 'landing' })}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <LogoMark size={28} />
            </div>
            <span className="font-display text-xl font-bold tracking-[-0.02em]">
              Scholar<span className="opacity-75">AI</span>
            </span>
          </button>

          <div className="my-auto max-w-md">
            <h1 className="font-display text-4xl font-extrabold leading-[1.12] tracking-tight">
              {mode === 'signup'
                ? 'Start learning smarter today'
                : mode === 'forgot'
                  ? 'Reset your password'
                  : 'Welcome back, scholar'}
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-brand-100">
              Generate summaries, quiz yourself, build flashcards, and track your progress — all powered by AI.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                'AI tutor with step-by-step explanations',
                'Quizzes, flashcards, and note summaries',
                'Analytics, streaks, and study planning',
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-brand-50">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-3 w-3" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-brand-200/70">
            © {new Date().getFullYear()} ScholarAI. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between p-5">
          <button
            onClick={() => navigate({ name: 'landing' })}
            className="flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label="Back home"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button onClick={toggle} className="btn-ghost p-2" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md animate-slide-up">
            {/* Mobile logo */}
            <div className="mb-6 flex justify-center lg:hidden">
              <Logo />
            </div>

            <h2 className="font-display text-2xl font-bold tracking-[-0.01em]">
              {mode === 'login' && 'Log in to ScholarAI'}
              {mode === 'signup' && 'Create your free account'}
              {mode === 'forgot' && 'Forgot your password?'}
              {mode === 'reset' && 'Reset your password'}
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">
              {mode === 'login' && "Welcome back — let's pick up where you left off."}
              {mode === 'signup' && 'Start learning in seconds. No credit card required.'}
              {(mode === 'forgot' || mode === 'reset') && "We'll send you a link to reset your password."}
            </p>

            {sent ? (
              <div className="mt-8 card border-accent-200 bg-accent-50 p-6 text-center dark:border-accent-900 dark:bg-accent-950/40">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-600 dark:bg-accent-900 dark:text-accent-300">
                  <Mail className="h-6 w-6" />
                </div>
                <p className="font-semibold">Check your inbox</p>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                  We sent a reset link to <strong>{email}</strong>.
                </p>
                <Button
                  variant="secondary"
                  className="mt-5 w-full"
                  onClick={() => navigate({ name: 'auth', mode: 'login' })}
                >
                  Back to login
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
                {mode === 'signup' && (
                  <Input
                    label="Full name"
                    placeholder="Jane Doe"
                    icon={User}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={errors.name}
                    autoComplete="name"
                  />
                )}
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                />
                {mode !== 'forgot' && (
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    icon={Lock}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                )}

                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate({ name: 'auth', mode: 'forgot' })}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</>
                  ) : (
                    <>
                      {mode === 'login' && 'Log in'}
                      {mode === 'signup' && 'Create account'}
                      {(mode === 'forgot' || mode === 'reset') && (
                        <><KeyRound className="h-4 w-4" /> Send reset link</>
                      )}
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-ink-500">
              {mode === 'login' && (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => navigate({ name: 'auth', mode: 'signup' })}
                    className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Sign up free
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate({ name: 'auth', mode: 'login' })}
                    className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Log in
                  </button>
                </>
              )}
              {(mode === 'forgot' || mode === 'reset') && (
                <button
                  onClick={() => navigate({ name: 'auth', mode: 'login' })}
                  className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  Back to login
                </button>
              )}
            </div>

            <AuthTip />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthTip(): ReactNode {
  return (
    <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-4 text-xs text-ink-500 dark:border-ink-800 dark:bg-ink-900">
      <p className="font-semibold text-ink-700 dark:text-ink-300">Security tip</p>
      <p className="mt-1">
        Use a unique password you don't use elsewhere. Your data is encrypted and only visible to you.
      </p>
    </div>
  );
}
