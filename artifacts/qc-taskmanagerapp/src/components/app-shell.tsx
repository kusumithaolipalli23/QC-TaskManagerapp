import { Activity, ClipboardCheck, Clock3, LayoutDashboard, ListTodo, Plus, Radar, Settings2 } from 'lucide-react';
import { BellRing, Check, TimerReset, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardQueryKey,
  getListRemindersQueryKey,
  getListTasksQueryKey,
  useCompleteTask,
  useHealthCheck,
  useListReminders,
  useSnoozeTask,
} from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { prettyDate, prettyTime } from '@/lib/task-utils';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/tasks', label: 'All tasks', icon: ListTodo },
  { href: '/status', label: 'System status', icon: Activity },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const health = useHealthCheck();
  const reminders = useListReminders({ query: { refetchInterval: 30000, queryKey: getListRemindersQueryKey() } });
  const queryClient = useQueryClient();
  const complete = useCompleteTask();
  const snooze = useSnoozeTask();
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const healthy = health.data?.status === 'ok' || health.data?.status === 'healthy';
  const activeReminder = reminders.data?.find((task) => !dismissedIds.includes(task.id));

  useEffect(() => {
    if (!activeReminder) {
      setDismissedIds([]);
    }
  }, [activeReminder]);

  const refreshTaskViews = () => {
    queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {activeReminder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[hsl(var(--sidebar)/.72)] p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reminder-title">
          <div className="w-full max-w-md animate-rise-in rounded-2xl border border-card-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary"><BellRing size={21} /></div>
                <div>
                  <p className="eyebrow text-primary">Task reminder</p>
                  <h2 id="reminder-title" className="mt-1 text-xl font-extrabold">This needs your attention</h2>
                </div>
              </div>
              <button type="button" onClick={() => setDismissedIds((ids) => [...ids, activeReminder.id])} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close reminder"><X size={18} /></button>
            </div>
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-base font-extrabold leading-snug">{activeReminder.task}</p>
              <p className="mt-2 font-mono-ui text-xs text-muted-foreground">{prettyDate(activeReminder.scheduledDate)} · {prettyTime(activeReminder.scheduledTime)}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => complete.mutate({ id: activeReminder.id }, { onSuccess: refreshTaskViews })} disabled={complete.isPending} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-extrabold text-accent-foreground"><Check size={16} /> {complete.isPending ? 'Saving…' : 'Mark complete'}</button>
              <select aria-label="Snooze reminder" defaultValue="" onChange={(event) => { const value = Number(event.target.value); if (value === 5 || value === 10 || value === 30) snooze.mutate({ id: activeReminder.id, data: { minutes: value } }, { onSuccess: refreshTaskViews }); event.target.value = ''; }} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-bold"><option value="" disabled>Snooze</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="30">30 minutes</option></select>
            </div>
          </div>
        </div>
      )}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-7">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <ClipboardCheck size={21} strokeWidth={2.6} />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight">QC / desk</div>
            <div className="eyebrow mt-0.5 text-sidebar-foreground/55">Task manager</div>
          </div>
        </div>
        <div className="px-4 pt-8">
          <div className="eyebrow px-3 pb-3 text-sidebar-foreground/40">Workspace</div>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? location === '/' : location.startsWith(href);
              return (
                <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`focus-ring group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>
                  <Icon size={17} className={active ? 'text-sidebar-primary' : 'text-sidebar-foreground/55'} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${health.isLoading ? 'bg-sidebar-foreground/40' : healthy ? 'animate-pulse-dot bg-sidebar-primary' : 'bg-[hsl(var(--destructive))]'}`} />
              <span className="text-xs font-bold">{health.isLoading ? 'Checking desk' : healthy ? 'Systems operational' : 'Needs attention'}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/50">Reminders stay ready while you work.</p>
            <Link href="/status" data-testid="link-view-status" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sidebar-primary hover:underline">View status <Radar size={12} /></Link>
          </div>
          <div className="mt-4 flex items-center justify-between px-2 text-sidebar-foreground/35">
            <span className="eyebrow">v0.1 / local desk</span>
            <Settings2 size={14} />
          </div>
        </div>
      </aside>

      <div className="md:pl-[248px]">
        <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-md md:px-10">
          <div className="flex items-center gap-3 md:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><ClipboardCheck size={18} /></div>
            <span className="text-sm font-extrabold">QC / desk</span>
          </div>
          <div className="hidden items-center gap-2 text-muted-foreground md:flex">
            <Clock3 size={15} />
            <span className="font-mono-ui text-xs">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/tasks/new" data-testid="link-header-new-task" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-extrabold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"><Plus size={15} /> New task</Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-5 py-7 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}