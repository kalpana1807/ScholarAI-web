import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { RouterProvider, useRouter } from './lib/router';
import { ToastViewport } from './components/ui/Toast';
import { LandingPage } from './pages/Landing';
import { AuthPage } from './pages/Auth';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Dashboard } from './pages/app/Dashboard';
import { AITutor } from './pages/app/AITutor';
import { NotesSummarizer } from './pages/app/NotesSummarizer';
import { PDFPage } from './pages/app/PDFPage';
import { QuizGenerator } from './pages/app/QuizGenerator';
import { Flashcards } from './pages/app/Flashcards';
import { StudyPlanner } from './pages/app/StudyPlanner';
import { Analytics } from './pages/app/Analytics';
import { AchievementsPage } from './pages/app/Achievements';
import { Profile } from './pages/app/Profile';
import { AdminPanel } from './pages/app/AdminPanel';

function Routes() {
  const { route } = useRouter();

  if (route.name === 'landing') return <LandingPage />;
  if (route.name === 'auth') return <AuthPage mode={route.mode ?? 'login'} />;

  return (
    <DashboardLayout>
      {route.name === 'dashboard'    && <Dashboard />}
      {route.name === 'tutor'        && <AITutor />}
      {route.name === 'notes'        && <NotesSummarizer />}
      {route.name === 'pdf'          && <PDFPage />}
      {route.name === 'quiz'         && <QuizGenerator />}
      {route.name === 'flashcards'   && <Flashcards />}
      {route.name === 'planner'      && <StudyPlanner />}
      {route.name === 'analytics'    && <Analytics />}
      {route.name === 'achievements' && <AchievementsPage />}
      {route.name === 'profile'      && <Profile />}
      {route.name === 'admin'        && <AdminPanel />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider>
            <Routes />
            <ToastViewport />
          </RouterProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
