import { CalendarClock, Check, CircleAlert, MoreHorizontal, Pencil, TimerReset, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { getGetDashboardQueryKey, getGetTaskQueryKey, getListRemindersQueryKey, getListTasksQueryKey, useCompleteTask, useRescheduleTask, useSnoozeTask, type Task } from '@workspace/api-client-react';
import { prettyDate, prettyTime, statusLabel, statusStyles } from '@/lib/task-utils';

type Props = { task: Task; onDelete?: (task: Task) => void; compact?: boolean };

export function TaskCard({ task, onDelete, compact = false }: Props) {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [date, setDate] = useState(task.scheduledDate);
  const [time, setTime] = useState(task.scheduledTime);
  const complete = useCompleteTask();
  const reschedule = useRescheduleTask();
  const snooze = useSnoozeTask();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(task.id) });
  };

  const doComplete = () => complete.mutate({ id: task.id }, { onSuccess: invalidate });
  const doSnooze = (minutes: 5 | 10 | 30) => snooze.mutate({ id: task.id, data: { minutes } }, { onSuccess: invalidate });
  const doReschedule = () => reschedule.mutate({ id: task.id, data: { scheduledDate: date, scheduledTime: time } }, { onSuccess: () => { setRescheduleOpen(false); invalidate(); } });

  return (
    <article data-testid={`card-task-${task.id}`} className={`group relative rounded-xl border border-card-border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${task.status === 'overdue' ? 'border-l-2 border-l-destructive' : ''}`}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={doComplete} disabled={task.status === 'completed' || complete.isPending} data-testid={`button-complete-task-${task.id}`} className={`focus-ring mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all ${task.status === 'completed' ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/35 text-transparent hover:border-primary hover:bg-primary/10'}`} aria-label={task.status === 'completed' ? 'Completed' : 'Mark complete'}><Check size={12} strokeWidth={3} /></button>
        <div className="min-w-0 flex-1">
          <Link href={`/tasks/${task.id}`} data-testid={`link-task-${task.id}`} className={`block text-sm font-bold leading-snug text-foreground hover:text-primary ${task.status === 'completed' ? 'text-muted-foreground line-through decoration-muted-foreground/40' : ''}`}>{task.task}</Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-mono-ui"><CalendarClock size={13} className="text-primary" /> {prettyDate(task.scheduledDate)} · {prettyTime(task.scheduledTime)}</span>
            {task.reminderReady && task.status !== 'completed' && <span className="inline-flex items-center gap-1 text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> reminder ready</span>}
          </div>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider ${statusStyles(task.status)}`}>{statusLabel(task.status)}</span>
        <button type="button" onClick={() => setMenuOpen((value) => !value)} data-testid={`button-task-menu-${task.id}`} className="focus-ring -mr-1 rounded-md p-1 text-muted-foreground opacity-50 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100" aria-label="Task actions"><MoreHorizontal size={17} /></button>
      </div>
      {menuOpen && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 animate-rise-in">
          {task.status !== 'completed' && <button type="button" onClick={doComplete} data-testid={`button-menu-complete-${task.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1.5 text-xs font-bold text-accent hover:bg-accent/20"><Check size={13} /> Complete</button>}
          {task.status !== 'completed' && <button type="button" onClick={() => setRescheduleOpen((value) => !value)} data-testid={`button-reschedule-task-${task.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-bold text-secondary-foreground hover:bg-secondary/70"><TimerReset size={13} /> Reschedule</button>}
           {task.status !== 'completed' && <select aria-label="Snooze reminder" defaultValue="" onChange={(event) => { const value = Number(event.target.value); if (value === 5 || value === 10 || value === 30) doSnooze(value); event.target.value = ''; }} data-testid={`select-snooze-task-${task.id}`} className="focus-ring rounded-md border-input bg-background px-2 py-1.5 text-xs font-bold"><option value="" disabled>Snooze</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="30">30 minutes</option></select>}
          <Link href={`/tasks/${task.id}/edit`} data-testid={`link-edit-task-${task.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-bold text-secondary-foreground hover:bg-secondary/70"><Pencil size={13} /> Edit</Link>
          {onDelete && <button type="button" onClick={() => onDelete(task)} data-testid={`button-delete-task-${task.id}`} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"><Trash2 size={13} /> Delete</button>}
        </div>
      )}
      {rescheduleOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-muted/60 p-3 animate-rise-in">
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} data-testid={`input-reschedule-date-${task.id}`} className="focus-ring rounded-md border-input bg-background px-2 py-1.5 text-xs font-normal normal-case tracking-normal" /></label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} data-testid={`input-reschedule-time-${task.id}`} className="focus-ring rounded-md border-input bg-background px-2 py-1.5 text-xs font-normal normal-case tracking-normal" /></label>
          <button type="button" onClick={doReschedule} disabled={reschedule.isPending} data-testid={`button-save-reschedule-${task.id}`} className="rounded-md bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground">{reschedule.isPending ? 'Saving…' : 'Save time'}</button>
        </div>
      )}
      {!compact && task.lastNotifiedAt && <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><CircleAlert size={12} /> Last reminder sent {new Date(task.lastNotifiedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>}
    </article>
  );
}