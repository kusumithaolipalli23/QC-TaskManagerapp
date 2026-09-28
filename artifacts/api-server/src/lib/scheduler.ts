import { and, count, eq, isNull, lte } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import { logger } from "./logger";
import { localDateTime } from "./task-utils";

let schedulerTimer: NodeJS.Timeout | undefined;
let schedulerStartedAt: Date | undefined;
let lastSuccessfulRun: Date | undefined;

async function seedTasks(): Promise<void> {
  const [{ count: taskCount }] = await db.select({ count: count() }).from(tasksTable);
  if (taskCount > 0) {
    return;
  }

  const now = Date.now();
  const seedTimes = [45, 180, 1440].map((minutes) => new Date(now + minutes * 60_000));
  await db.insert(tasksTable).values(
    seedTimes.map((scheduledDatetime, index) => ({
      task: [
        "Review the incoming quality queue",
        "Send the afternoon QC status update",
        "Prepare tomorrow's release checklist",
      ][index],
      scheduledDatetime,
      status: "scheduled",
      reminderReady: false,
    })),
  );
  logger.info({ count: seedTimes.length }, "Seeded starter tasks");
}

export async function processDueTasks(): Promise<void> {
  try {
    const now = new Date();
    await db
      .update(tasksTable)
      .set({
        status: "overdue",
        reminderReady: true,
        updatedAt: now,
      })
      .where(
        and(
          eq(tasksTable.status, "scheduled"),
          lte(tasksTable.scheduledDatetime, now),
          isNull(tasksTable.completedAt),
        ),
      );
    lastSuccessfulRun = now;
  } catch (error) {
    logger.error({ err: error }, "Scheduler run failed");
  }
}

export function startScheduler(): void {
  if (schedulerTimer) {
    return;
  }

  schedulerStartedAt = new Date();
  void seedTasks().then(() => processDueTasks()).catch((error) => {
    logger.error({ err: error }, "Scheduler startup recovery failed");
  });
  schedulerTimer = setInterval(() => void processDueTasks(), 15_000);
  schedulerTimer.unref();
  logger.info({ startedAt: schedulerStartedAt.toISOString() }, "Task scheduler started");
}

export function schedulerStatus() {
  return {
    running: Boolean(schedulerTimer),
    startedAt: schedulerStartedAt?.toISOString() ?? null,
    lastSuccessfulRun: lastSuccessfulRun?.toISOString() ?? null,
  };
}