import { ArrowLeft, CalendarDays, Check, Clock3, LoaderCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { getGetDashboardQueryKey, getGetTaskQueryKey, getListRemindersQueryKey, getListTasksQueryKey, useCreateTask, useUpdateTask, type Task } from '@workspace/api-client-react';
import { errorMessage, prettyDateLong, toDateInput } from '@/lib/task-utils';

export function TaskForm({ task }: { task?: Task }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [text, setText] = useState(task?.task ?? '');
  const [date, setDate] = useState(task?.scheduledDate ?? toDateInput());
  const [time, setTime] = useState(task?.scheduledTime ?? '09:00');
  const [error, setError] = useState('');
  const create = useCreateTask();
  const update = useUpdateTask();
  const pending = create.isPending || update.isPending;
  useEffect(() => { if (task) { setText(task.task); setDate(task.scheduledDate); setTime(task.scheduledTime); } }, [task]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || !date || !time) { setError('Add a task name, date, and time before saving.'); return; }
    setError('');
    const data = { task: text.trim(), scheduledDate: date, scheduledTime: time };
    const onSuccess = (saved: Task) => {
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
      if (task) queryClient.setQueryData(getGetTaskQueryKey(task.id), saved);
      setLocation(`/tasks/${saved.id}`);
    };
    if (task) update.mutate({ id: task.id, data }, { onSuccess, onError: (reason) => setError(errorMessage(reason)) });
    else create.mutate({ data }, { onSuccess, onError: (reason) => setError(errorMessage(reason)) });
  };
  return (
    <div className="mx-auto max-w-3xl animate-rise-in">
      <Link href={task ? `/tasks/${task.id}` : '/tasks'} data-testid="link-form-back" className="focus-ring inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /> Back to {task ? 'task' : 'tasks'}</Link>
      <div className="mt-7 grid gap-8 md:grid-cols-[1fr_260px]">
        <div>
          <div className="eyebrow text-primary">{task ? 'Update record' : 'New scheduled work'}</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{task ? 'Edit this task' : 'Put it on the desk'}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{task ? 'Change the wording or move the schedule. The reminder will follow the new time.' : 'Give the work a clear name and a time you can trust.'}</p>
          <form onSubmit={submit} className="mt-8 space-y-6">
            <label className="grid gap-2"><span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Task name</span><input autoFocus maxLength={500} value={text} onChange={(event) => setText(event.target.value)} placeholder="e.g. Review incoming quality report" data-testid="input-task-name" className="focus-ring rounded-xl border-input bg-card px-4 py-3.5 text-sm font-semibold shadow-xs outline-none placeholder:text-muted-foreground/55" /><span className="text-right text-[11px] text-muted-foreground">{text.length}/500</span></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2"><span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Scheduled date</span><div className="relative"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-3.5 text-primary" /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} data-testid="input-task-date" className="focus-ring w-full rounded-xl border-input bg-card py-3.5 pl-10 pr-3 text-sm font-semibold shadow-xs outline-none" /></div></label>
              <label className="grid gap-2"><span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Scheduled time</span><div className="relative"><Clock3 size={16} className="pointer-events-none absolute left-3 top-3.5 text-primary" /><input type="time" value={time} onChange={(event) => setTime(event.target.value)} data-testid="input-task-time" className="focus-ring w-full rounded-xl border-input bg-card py-3.5 pl-10 pr-3 text-sm font-semibold shadow-xs outline-none" /></div></label>
            </div>
            {error && <div data-testid="status-task-form-error" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive">{error}</div>}
            <div className="flex items-center justify-end gap-3 border-t border-border pt-5"><Link href={task ? `/tasks/${task.id}` : '/tasks'} data-testid="link-form-cancel" className="rounded-lg px-3.5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted">Cancel</Link><button type="submit" disabled={pending} data-testid="button-save-task" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60">{pending && <LoaderCircle size={15} className="animate-spin" />}{task ? 'Save changes' : 'Create task'}</button></div>
          </form>
        </div>
        <aside className="hidden h-fit rounded-xl border border-card-border bg-card p-5 shadow-xs md:block"><div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/12 text-primary"><Check size={18} /></div><div className="mt-4 text-sm font-extrabold">A reliable handoff</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Tasks appear in today’s runbook and the reminder queue as soon as you save.</p><div className="mt-5 border-t border-border pt-4"><div className="eyebrow text-muted-foreground">Scheduled for</div><div className="mt-1 text-sm font-bold">{date ? prettyDateLong(date) : 'Choose a date'}</div><div className="mt-1 font-mono-ui text-xs text-primary">{time || 'Choose a time'}</div></div></aside>
      </div>
    </div>
  );
}