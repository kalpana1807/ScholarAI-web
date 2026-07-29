import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type Toast = {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
};

type ToastCtx = {
  toasts: Toast[];
  push: (type: Toast['type'], message: string) => void;
  dismiss: (id: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (type: Toast['type'], message: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  return <Ctx.Provider value={{ toasts, push, dismiss }}>{children}</Ctx.Provider>;
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
