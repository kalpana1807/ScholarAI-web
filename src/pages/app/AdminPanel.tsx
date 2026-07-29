import { useEffect, useState } from 'react';
import {
  AlertCircle, BarChart3, BookOpen, Clock, FileUp, Layers,
  RefreshCw, Shield, Trophy, Users, Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { callAdminStats } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useRouter } from '../../lib/router';
import { useToast } from '../../lib/toast';
import { Card, Badge, Skeleton } from '../../components/ui';
import { BarChart, LineChart } from '../../components/ui/Charts';
import { cn, formatDate } from '../../lib/utils';

type AdminStats = {
  users: { total: number; recent: { id: string; name: string; created_at: string; is_admin: boolean }[] };
  content: { notes: number; quizzes: number; flashcards: number; pdfs: number };
  engagement: { total_study_hours: number; quiz_accuracy: number; dau: { date: string; count: number }[]; event_breakdown: Record<string, number> };
  pdfs: { total: number; done: number; error: number };
};

export function AdminPanel() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { push } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; created_at: string; is_admin: boolean; email?: string }[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (!profile.is_admin) { navigate({ name: 'dashboard' }); return; }
    load();
  }, [profile]);

  async function load() {
    setLoading(true);
    const [statsData, usersData] = await Promise.all([
      callAdminStats(),
      supabase.from('profiles').select('id, name, created_at, is_admin').order('created_at', { ascending: false }),
    ]);
    setStats(statsData as AdminStats | null);
    setAllUsers((usersData.data as { id: string; name: string; created_at: string; is_admin: boolean }[]) ?? []);
    setLoading(false);
  }

  async function toggleAdmin(userId: string, current: boolean) {
    setToggling(userId);
    const { error } = await supabase.from('profiles').update({ is_admin: !current }).eq('id', userId);
    if (error) push('error', 'Could not update role');
    else {
      setAllUsers((u) => u.map((x) => (x.id === userId ? { ...x, is_admin: !current } : x)));
      push('success', `Admin ${!current ? 'granted' : 'revoked'}`);
    }
    setToggling(null);
  }

  if (!profile?.is_admin) return null;

  const dauData = stats?.engagement.dau.map((d) => ({
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.count,
  })) ?? [];

  const eventBreakdown = Object.entries(stats?.engagement.event_breakdown ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-500" />
            <h1 className="font-display text-2xl font-bold tracking-tight">Admin Panel</h1>
          </div>
          <p className="text-sm text-ink-500">Platform-wide statistics and user management.</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm" disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {stats === null && !loading && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">Could not load admin stats. Make sure the admin-stats edge function is deployed and you have admin access.</p>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : (
          <>
            <KpiCard icon={Users} label="Total users" value={String(stats?.users.total ?? 0)} color="text-brand-500" bg="bg-brand-50 dark:bg-brand-950/40" />
            <KpiCard icon={BookOpen} label="Notes" value={String(stats?.content.notes ?? 0)} color="text-accent-500" bg="bg-accent-50 dark:bg-accent-950/40" />
            <KpiCard icon={Trophy} label="Quizzes" value={String(stats?.content.quizzes ?? 0)} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-950/40" />
            <KpiCard icon={Clock} label="Study hours" value={`${stats?.engagement.total_study_hours ?? 0}h`} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-950/40" />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? null : (
          <>
            <KpiCard icon={Layers} label="Flashcards" value={String(stats?.content.flashcards ?? 0)} color="text-pink-500" bg="bg-pink-50 dark:bg-pink-950/40" />
            <KpiCard icon={FileUp} label="PDFs processed" value={String(stats?.pdfs.done ?? 0)} color="text-sky-500" bg="bg-sky-50 dark:bg-sky-950/40" />
            <KpiCard icon={Zap} label="Quiz accuracy" value={`${stats?.engagement.quiz_accuracy ?? 0}%`} color="text-orange-500" bg="bg-orange-50 dark:bg-orange-950/40" />
            <KpiCard icon={BarChart3} label="Events logged" value={String(Object.values(stats?.engagement.event_breakdown ?? {}).reduce((a, b) => a + b, 0))} color="text-teal-500" bg="bg-teal-50 dark:bg-teal-950/40" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* DAU chart */}
        <Card>
          <h2 className="mb-4 font-display text-base font-bold">Daily activity (last 14 days)</h2>
          {loading ? <Skeleton className="h-48 w-full" /> : dauData.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No events yet.</p>
          ) : (
            <LineChart data={dauData} color="#2447f5" height={180} />
          )}
        </Card>

        {/* Event breakdown */}
        <Card>
          <h2 className="mb-4 font-display text-base font-bold">Feature usage breakdown</h2>
          {loading ? <Skeleton className="h-48 w-full" /> : eventBreakdown.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No events tracked yet.</p>
          ) : (
            <BarChart
              data={eventBreakdown.map(([label, value]) => ({ label: label.replace(/_/g, ' '), value }))}
              color="#10b981" height={180}
            />
          )}
        </Card>
      </div>

      {/* Recent signups */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Recent signups</h2>
          <Badge color="gray">{stats?.users.recent.length ?? 0}</Badge>
        </div>
        {loading ? <Skeleton className="h-32 w-full" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left dark:border-ink-800">
                  <th className="pb-2 pr-4 text-xs font-semibold text-ink-400">Name</th>
                  <th className="pb-2 pr-4 text-xs font-semibold text-ink-400">Joined</th>
                  <th className="pb-2 text-xs font-semibold text-ink-400">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50 dark:divide-ink-800/50">
                {(stats?.users.recent ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="py-2 pr-4 font-medium">{u.name || '(no name)'}</td>
                    <td className="py-2 pr-4 text-ink-500">{formatDate(u.created_at)}</td>
                    <td className="py-2">
                      <Badge color={u.is_admin ? 'brand' : 'gray'}>{u.is_admin ? 'Admin' : 'User'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* All users + admin toggle */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">All users</h2>
          <Badge color="gray">{allUsers.length}</Badge>
        </div>
        {loading ? <Skeleton className="h-40 w-full" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left dark:border-ink-800">
                  <th className="pb-2 pr-4 text-xs font-semibold text-ink-400">Name</th>
                  <th className="pb-2 pr-4 text-xs font-semibold text-ink-400">Joined</th>
                  <th className="pb-2 pr-4 text-xs font-semibold text-ink-400">Role</th>
                  <th className="pb-2 text-xs font-semibold text-ink-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50 dark:divide-ink-800/50">
                {allUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2 pr-4 font-medium">{u.name || '(no name)'}</td>
                    <td className="py-2 pr-4 text-ink-500">{formatDate(u.created_at)}</td>
                    <td className="py-2 pr-4">
                      <Badge color={u.is_admin ? 'brand' : 'gray'}>{u.is_admin ? 'Admin' : 'User'}</Badge>
                    </td>
                    <td className="py-2">
                      <button
                        disabled={toggling === u.id}
                        onClick={() => toggleAdmin(u.id, u.is_admin)}
                        className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-600 transition hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                      >
                        {toggling === u.id ? '…' : u.is_admin ? 'Revoke admin' : 'Make admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, bg }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string; bg: string }) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bg, color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-ink-400">{label}</p>
          <p className="font-display text-xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}
