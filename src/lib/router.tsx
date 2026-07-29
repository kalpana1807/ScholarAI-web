import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'auth'; mode?: 'login' | 'signup' | 'forgot' | 'reset' }
  | { name: 'dashboard' }
  | { name: 'tutor' }
  | { name: 'notes' }
  | { name: 'quiz' }
  | { name: 'flashcards' }
  | { name: 'planner' }
  | { name: 'analytics' }
  | { name: 'profile' }
  | { name: 'pdf' }
  | { name: 'achievements' }
  | { name: 'admin' };

export type Router = { route: Route; navigate: (route: Route) => void; query: URLSearchParams };

const Ctx = createContext<Router | null>(null);

function parseHash(): { route: Route; query: URLSearchParams } {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = hash.split('?');
  const query = new URLSearchParams(queryPart ?? '');
  const parts = pathPart.split('/').filter(Boolean);
  const root = parts[0] ?? '';
  const sub = parts[1];

  let route: Route = { name: 'landing' };
  switch (root) {
    case '': case 'home': route = { name: 'landing' }; break;
    case 'auth':
      if (sub === 'signup' || sub === 'forgot' || sub === 'reset') route = { name: 'auth', mode: sub };
      else route = { name: 'auth', mode: 'login' };
      break;
    case 'dashboard': route = { name: 'dashboard' }; break;
    case 'tutor': route = { name: 'tutor' }; break;
    case 'notes': route = { name: 'notes' }; break;
    case 'quiz': route = { name: 'quiz' }; break;
    case 'flashcards': route = { name: 'flashcards' }; break;
    case 'planner': route = { name: 'planner' }; break;
    case 'analytics': route = { name: 'analytics' }; break;
    case 'profile': route = { name: 'profile' }; break;
    case 'pdf': route = { name: 'pdf' }; break;
    case 'achievements': route = { name: 'achievements' }; break;
    case 'admin': route = { name: 'admin' }; break;
    default: route = { name: 'landing' };
  }
  return { route, query };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => parseHash());
  useEffect(() => {
    const onChange = () => setState(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((route: Route) => {
    let path = '/';
    switch (route.name) {
      case 'landing': path = '/'; break;
      case 'auth': path = route.mode === 'login' ? '/auth' : `/auth/${route.mode}`; break;
      default: path = `/${route.name}`;
    }
    window.location.hash = path;
  }, []);
  return <Ctx.Provider value={{ route: state.route, navigate, query: state.query }}>{children}</Ctx.Provider>;
}

export function useRouter(): Router {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
