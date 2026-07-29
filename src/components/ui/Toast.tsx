import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToast } from '../../lib/toast';
import { cn } from '../../lib/utils';

const cfg = {
  success: { Icon: CheckCircle2, cls: 'text-accent-600 border-accent-200 bg-accent-50 dark:bg-accent-950/40 dark:border-accent-900' },
  error: { Icon: XCircle, cls: 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900' },
  warning: { Icon: AlertTriangle, cls: 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900' },
  info: { Icon: Info, cls: 'text-brand-600 border-brand-200 bg-brand-50 dark:bg-brand-950/40 dark:border-brand-900' },
};

export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const { Icon, cls } = cfg[t.type];
        return (
          <div
            key={t.id}
            className={cn('pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-card animate-slide-up', cls)}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-medium text-ink-800 dark:text-ink-100">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-ink-700 dark:hover:text-ink-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
