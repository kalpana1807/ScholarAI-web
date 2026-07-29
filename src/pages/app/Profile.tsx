import { useState } from 'react';
import {
  Bell,
  Check,
  LogOut,
  Mail,
  Moon,
  Sun,
  Target,
  Trophy,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useRouter } from '../../lib/router';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, Badge } from '../../components/ui';
import { formatDate, initials } from '../../lib/utils';

export function Profile() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { navigate } = useRouter();
  const { theme, toggle } = useTheme();
  const { push } = useToast();

  const [name, setName] = useState(profile?.name ?? '');
  const [learningGoal, setLearningGoal] = useState(profile?.learning_goal ?? '');
  const [targetExam, setTargetExam] = useState(profile?.target_exam ?? '');
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);

  async function save() {
    setSaving(true);
    const { error } = await updateProfile({ name, learning_goal: learningGoal || null, target_exam: targetExam || null });
    setSaving(false);
    if (error) push('error', 'Could not save profile');
    else push('success', 'Profile updated');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-sm text-ink-500">Manage your account, learning goals, and preferences.</p>
      </div>

      {/* Profile card */}
      <Card>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-2xl font-bold text-white shadow-glow">
            {initials(profile?.name ?? 'Student')}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-display text-xl font-bold">{profile?.name ?? 'Student'}</h2>
            <p className="flex items-center justify-center gap-1.5 text-sm text-ink-500 sm:justify-start"><Mail className="h-3.5 w-3.5" />{user?.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge color="brand">Free plan</Badge>
              <Badge color="gray">Joined {profile ? formatDate(profile.created_at) : ''}</Badge>
              {profile?.target_exam && <Badge color="amber"><Trophy className="h-3 w-3" /> {profile.target_exam}</Badge>}
            </div>
          </div>
        </div>
      </Card>

      {/* Edit profile */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><UserIcon className="h-5 w-5 text-brand-500" /> Account details</h2>
        <div className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} icon={UserIcon} />
          <Input label="Email" value={user?.email ?? ''} disabled icon={Mail} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input label="Learning goal" placeholder="e.g. Ace my finals" value={learningGoal} onChange={(e) => setLearningGoal(e.target.value)} icon={Target} />
            </div>
            <div>
              <Input label="Target exam" placeholder="e.g. JEE, SAT, GRE" value={targetExam} onChange={(e) => setTargetExam(e.target.value)} icon={Trophy} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} loading={saving}><Check className="h-4 w-4" /> Save changes</Button>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-bold">Preferences</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-ink-100 p-3.5 dark:border-ink-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 text-ink-600 dark:bg-ink-800">
                {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium">Dark mode</p>
                <p className="text-xs text-ink-400">Toggle between light and dark themes</p>
              </div>
            </div>
            <Toggle on={theme === 'dark'} onClick={toggle} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-ink-100 p-3.5 dark:border-ink-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 text-ink-600 dark:bg-ink-800"><Bell className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-medium">Study reminders</p>
                <p className="text-xs text-ink-400">Daily nudge to keep your streak</p>
              </div>
            </div>
            <Toggle on={notifications} onClick={() => { setNotifications((n) => !n); push('info', notifications ? 'Reminders off' : 'Reminders on'); }} />
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200 dark:border-red-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-red-600 dark:text-red-400">Sign out</h2>
            <p className="text-xs text-ink-500">You'll need to log in again to access your account.</p>
          </div>
          <Button variant="danger" onClick={async () => { await signOut(); navigate({ name: 'landing' }); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700'}`}
      role="switch"
      aria-checked={on}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}
