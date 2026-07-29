import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, className, ...rest }, ref) => (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">{label}</span>}
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />}
        <input ref={ref} className={cn('input-base', Icon && 'pl-10', className)} {...rest} />
      </div>
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  )
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...rest }, ref) => (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">{label}</span>}
      <textarea ref={ref} className={cn('input-base resize-y', className)} {...rest} />
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  )
);
Textarea.displayName = 'Textarea';
