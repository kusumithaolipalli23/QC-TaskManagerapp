import type { Task } from '@workspace/api-client-react';

export const toDateInput = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const prettyDate = (value: string) =>
  new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`));

export const prettyDateLong = (value: string) =>
  new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));

export const prettyTime = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);
};

export const isToday = (value: string) => value === toDateInput();

export const statusLabel = (status: Task['status']) => ({
  scheduled: 'Scheduled',
  completed: 'Complete',
  overdue: 'Overdue',
}[status]);

export const statusStyles = (status: Task['status']) => ({
  scheduled: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]',
  completed: 'bg-[hsl(var(--accent)/.14)] text-[hsl(var(--accent))]',
  overdue: 'bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]',
}[status]);

export const errorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'Something went wrong. Try again.';
};