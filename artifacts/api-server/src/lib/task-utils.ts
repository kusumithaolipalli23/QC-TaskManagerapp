import type { Task } from "@workspace/db";

const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Kolkata";

type DateParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

function getParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  return parts.reduce(
    (result, part) => {
      if (
        part.type === "year" ||
        part.type === "month" ||
        part.type === "day" ||
        part.type === "hour" ||
        part.type === "minute"
      ) {
        result[part.type as keyof DateParts] = part.value;
      }
      return result;
    },
    {} as DateParts,
  );
}

function getTimezoneOffsetMs(date: Date): number {
  const parts = getParts(date);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    0,
  );
  return asUtc - date.getTime();
}

export function localScheduleToUtc(dateString: string, timeString: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString) || !/^\d{2}:\d{2}$/.test(timeString)) {
    return null;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);
  if (
    !year ||
    !month ||
    !day ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day ||
    candidate.getUTCHours() !== hour ||
    candidate.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return new Date(candidate.getTime() - getTimezoneOffsetMs(candidate));
}

export function localDateTime(date: Date): { date: string; time: string } {
  const parts = getParts(date);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function serializeTask(task: Task) {
  const local = localDateTime(task.scheduledDatetime);
  return {
    id: task.id,
    task: task.task,
    scheduledDate: local.date,
    scheduledTime: local.time,
    scheduledDatetime: task.scheduledDatetime.toISOString(),
    status: task.status as "scheduled" | "completed" | "overdue",
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null,
    lastNotifiedAt: task.lastNotifiedAt?.toISOString() ?? null,
    reminderReady: task.reminderReady,
  };
}

export function todayInAppTimezone(): string {
  return localDateTime(new Date()).date;
}

export function appTimezone(): string {
  return APP_TIMEZONE;
}