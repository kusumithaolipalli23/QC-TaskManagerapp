import { ArrowUpRight, BellRing, CalendarDays, CheckCircle2, ChevronRight, CircleAlert, ListChecks, RefreshCw, Timer } from 'lucide-react';
import { Link } from 'wouter';
import { getListRemindersQueryKey, useGetDashboard, useListReminders } from '@workspace/api-client-react';
import { TaskCard } from '@/components/task-card';
import { errorMessage, prettyDate, prettyTime } from '@/lib/task-utils';

function LoadingBlock() {
  return <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-[76px] animate-pulse rounded-xl bg-muted" />)}</div>;
}

function Metric({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof CalendarDays; tone: string }) {
  return <div data-testid={`metric-${label.toLowerCase()}`} className={`relative overflow-hidden rounded-xl border border-card-border bg-card p-5 shadow-xs ${tone}`}><div className="flex items-start justify-between"><span className="eyebrow text-muted-foreground">{label}</span><Icon size={17} className="text-current opacity-75" /></div><div className="mt-5 text-3xl font-extrabold tracking-tight">{value}</div><div className="mt-1 text-xs font-semibold text-muted-foreground">{detail}</div><div className="absolute -bottom-5 -right-3 h-20 w-20 rounded-full border-[12px] border-current opacity-[.07]" /></div>;
}

export default function Dashboard() {
  const dashboard = useGetDashboard();
  const reminders = useListReminders({ query: { refetchInterval: 30000, queryKey: getListRemindersQueryKey() } });
  const data = dashboard.data;
  if (dashboard.isLoading) return <div className="animate-rise-in"><div className="h-8 w-64 animate-pulse rounded bg-muted" /><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl bg-muted" />)}</div><div className="mt-8"><LoadingBlock /></div></div>;
  if (dashboard.isError || !data) return <div data-testid="status-dashboard-error" className="grid min-h-[55vh] place-items-center"><div className="max-w-sm text-center"><CircleAlert className="mx-auto text-destructive" size={30} /><h1 className="mt-4 text-lg font-extrabold">The desk is out of sync</h1><p className="mt-2 text-sm text-muted-foreground">{errorMessage(dashboard.error)}</p><button type="button" onClick={() => dashboard.refetch()} data-testid="button-retry-dashboard" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground"><RefreshCw size={14} /> Try again</button></div></div>;
  const today = data.today ?? [];
  const upcoming = data.upcoming ?? [];
  const overdue = data.overdue ?? [];
  const completed = data.completed ?? [];
  return (
    <div className="animate-rise-in">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><div className="eyebrow text-primary">Operations overview</div><h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Keep the day moving.</h1><p className="mt-2 text-sm text-muted-foreground">A clear runbook for what needs attention next.</p></div>
        <Link href="/tasks/new" data-testid="link-dashboard-new-task" className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"><ListChecks size={16} /> Schedule a task</Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Scheduled" value={data.counts.scheduled} detail="on the active board" icon={CalendarDays} tone="text-primary" />
        <Metric label="Upcoming" value={data.counts.upcoming} detail="next in line" icon={Timer} tone="text-[hsl(var(--chart-3))]" />
        <Metric label="Completed" value={data.counts.completed} detail="closed out" icon={CheckCircle2} tone="text-accent" />
        <Metric label="Overdue" value={data.counts.overdue} detail={data.counts.overdue ? 'needs a decision' : 'nothing waiting'} icon={CircleAlert} tone={data.counts.overdue ? 'text-destructive' : 'text-muted-foreground'} />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-xl border border-card-border bg-card p-5 shadow-xs md:p-6">
          <div className="flex items-start justify-between"><div><div className="eyebrow text-primary">Today’s run</div><h2 className="mt-1 text-lg font-extrabold">What’s on deck</h2></div><span className="rounded-md bg-secondary px-2 py-1 font-mono-ui text-xs text-secondary-foreground">{today.length} items</span></div>
          <div className="mt-5 space-y-3">{today.length ? today.map((task) => <TaskCard key={task.id} task={task} compact />) : <Empty icon={CheckCircle2} title="Clear runway" body="Nothing is scheduled for today. Add a task when the next handoff is known." action="Schedule something" href="/tasks/new" />}</div>
        </section>
        <section className="rounded-xl border border-card-border bg-card p-5 shadow-xs md:p-6">
          <div className="flex items-start justify-between"><div><div className="eyebrow text-primary">Live reminders</div><h2 className="mt-1 text-lg font-extrabold">Ready to surface</h2></div><div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/12 text-primary"><BellRing size={16} /></div></div>
          <div className="mt-5">{reminders.isLoading ? <LoadingBlock /> : reminders.isError ? <p data-testid="status-reminders-error" className="rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive">Reminder service is unavailable right now.</p> : reminders.data?.length ? <div className="space-y-3">{reminders.data.slice(0, 4).map((task) => <div key={task.id} data-testid={`reminder-${task.id}`} className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/35 p-3"><div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/12 text-primary"><BellRing size={14} /></div><div className="min-w-0"><Link href={`/tasks/${task.id}`} data-testid={`link-reminder-${task.id}`} className="block truncate text-xs font-extrabold hover:text-primary">{task.task}</Link><p className="mt-1 font-mono-ui text-[10px] text-muted-foreground">{prettyDate(task.scheduledDate)} · {prettyTime(task.scheduledTime)}</p></div></div>)}</div> : <div data-testid="empty-reminders" className="rounded-lg border border-dashed border-border p-5 text-center"><BellRing className="mx-auto text-muted-foreground/50" size={22} /><p className="mt-2 text-xs font-bold">No reminders waiting</p><p className="mt-1 text-[11px] text-muted-foreground">You’re caught up for now.</p></div>}</div>
          <Link href="/tasks" data-testid="link-view-all-reminders" className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline">View all tasks <ArrowUpRight size={13} /></Link>
        </section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TaskLane title="Coming up next" eyebrow="Next 7 days" tasks={upcoming} icon={CalendarDays} empty="No upcoming work on the board." />
        <TaskLane title="Needs a decision" eyebrow="Overdue" tasks={overdue} icon={CircleAlert} empty="Nothing overdue. Nice work." danger />
      </div>
      {completed.length > 0 && <section className="mt-6 rounded-xl border border-card-border bg-card p-5 shadow-xs"><div className="flex items-center justify-between"><div><div className="eyebrow text-accent">Recently closed</div><h2 className="mt-1 text-lg font-extrabold">Completion log</h2></div><Link href="/tasks?status=completed" data-testid="link-completed-tasks" className="text-xs font-bold text-primary hover:underline">View all</Link></div><div className="mt-4 grid gap-3 md:grid-cols-2">{completed.slice(0, 4).map((task) => <TaskCard key={task.id} task={task} compact />)}</div></section>}
    </div>
  );
}

function Empty({ icon: Icon, title, body, action, href }: { icon: typeof CheckCircle2; title: string; body: string; action: string; href: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-muted/25 p-8 text-center"><Icon className="mx-auto text-accent" size={25} /><p className="mt-3 text-sm font-extrabold">{title}</p><p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{body}</p><Link href={href} data-testid="link-empty-action" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline">{action} <ChevronRight size={13} /></Link></div>;
}

function TaskLane({ title, eyebrow, tasks, icon: Icon, empty, danger = false }: { title: string; eyebrow: string; tasks: import('@workspace/api-client-react').Task[]; icon: typeof CalendarDays; empty: string; danger?: boolean }) {
  return <section className="rounded-xl border border-card-border bg-card p-5 shadow-xs md:p-6"><div className="flex items-start justify-between"><div><div className={`eyebrow ${danger ? 'text-destructive' : 'text-primary'}`}>{eyebrow}</div><h2 className="mt-1 text-lg font-extrabold">{title}</h2></div><Icon size={18} className={danger ? 'text-destructive' : 'text-primary'} /></div><div className="mt-5 space-y-3">{tasks.length ? tasks.slice(0, 4).map((task) => <TaskCard key={task.id} task={task} compact />) : <div className="rounded-lg bg-muted/45 p-6 text-center text-xs font-semibold text-muted-foreground">{empty}</div>}</div></section>;
}