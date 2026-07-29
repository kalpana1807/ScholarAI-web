import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Card({ children, className, hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={cn('card p-5', hover && 'hover:shadow-glow hover:-translate-y-0.5', className)}>{children}</div>;
}

export function Badge({ children, color = 'brand', className }: { children: ReactNode; color?: 'brand' | 'accent' | 'amber' | 'red' | 'gray'; className?: string }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',
    accent: 'bg-accent-50 text-accent-700 dark:bg-accent-950/60 dark:text-accent-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
    gray: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  };
  return <span className={cn('chip', colors[color], className)}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-base font-bold text-ink-900 dark:text-ink-100">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer-bg animate-shimmer rounded-lg', className)} />;
}

export function Progress({ value, className, color = 'bg-brand-500' }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800', className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
