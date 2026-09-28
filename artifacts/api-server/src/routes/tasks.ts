import { and, asc, desc, eq, gte, isNull, lt, lte } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CompleteTaskParams,
  CreateTaskBody,
  DeleteTaskParams,
  GetDashboardResponse,
  GetTaskParams,
  ListRemindersResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  RescheduleTaskBody,
  RescheduleTaskParams,
  SnoozeTaskBody,
  SnoozeTaskParams,
  UpdateTaskBody,
  UpdateTaskParams,
} from "@workspace/api-zod";
import { db, tasksTable } from "@workspace/db";
import { processDueTasks } from "../lib/scheduler";
import { localScheduleToUtc, serializeTask, todayInAppTimezone } from "../lib/task-utils";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

function getTaskSchedule(
  body: { scheduledDate: string; scheduledTime: string },
): Date | null {
  return localScheduleToUtc(body.scheduledDate, body.scheduledTime);
}

async function findTask(id: number) {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  return task;
}

router.get("/tasks", async (req, res): Promise<void> => {
  await processDueTasks();
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status, limit } = query.data;
  const conditions = [];
  if (status && status !== "all") {
    conditions.push(eq(tasksTable.status, status));
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(tasksTable.scheduledDatetime))
    .limit(limit ?? 100);

  res.json(ListTasksResponse.parse(tasks.map(serializeTask)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const scheduledDatetime = getTaskSchedule(parsed.data);
  if (!scheduledDatetime || scheduledDatetime.getTime() <= Date.now()) {
    res.status(400).json({ error: "Schedule a valid time in the future." });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      task: parsed.data.task.trim(),
      scheduledDatetime,
      status: "scheduled",
      reminderReady: false,
    })
    .returning();

  req.log.info({ taskId: task.id }, "Task created");
  res.status(201).json(serializeTask(task));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const parsed = GetTaskParams.safeParse({ id: parseId(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await processDueTasks();
  const task = await findTask(parsed.data.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(serializeTask(task));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse({ id: parseId(req.params.id) });
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : body.error?.message ?? "Invalid request body",
    });
    return;
  }
  const scheduledDatetime = getTaskSchedule(body.data);
  if (!scheduledDatetime || scheduledDatetime.getTime() <= Date.now()) {
    res.status(400).json({ error: "Schedule a valid time in the future." });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set({
      task: body.data.task.trim(),
      scheduledDatetime,
      status: "scheduled",
      completedAt: null,
      lastNotifiedAt: null,
      reminderReady: false,
      updatedAt: new Date(),
    })
    .where(eq(tasksTable.id, params.data.id))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  req.log.info({ taskId: task.id }, "Task updated");
  res.json(serializeTask(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const parsed = DeleteTaskParams.safeParse({ id: parseId(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, parsed.data.id))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  req.log.info({ taskId: task.id }, "Task deleted");
  res.sendStatus(204);
});

router.post("/tasks/:id/complete", async (req, res): Promise<void> => {
  const parsed = CompleteTaskParams.safeParse({ id: parseId(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const now = new Date();
  const [task] = await db
    .update(tasksTable)
    .set({
      status: "completed",
      completedAt: now,
      updatedAt: now,
      reminderReady: false,
    })
    .where(eq(tasksTable.id, parsed.data.id))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  req.log.info({ taskId: task.id }, "Task completed");
  res.json(serializeTask(task));
});

router.post("/tasks/:id/reschedule", async (req, res): Promise<void> => {
  const params = RescheduleTaskParams.safeParse({ id: parseId(req.params.id) });
  const body = RescheduleTaskBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : body.error?.message ?? "Invalid request body",
    });
    return;
  }
  const scheduledDatetime = getTaskSchedule(body.data);
  if (!scheduledDatetime || scheduledDatetime.getTime() <= Date.now()) {
    res.status(400).json({ error: "Schedule a valid time in the future." });
    return;
  }
  const [task] = await db
    .update(tasksTable)
    .set({
      scheduledDatetime,
      status: "scheduled",
      completedAt: null,
      lastNotifiedAt: null,
      reminderReady: false,
      updatedAt: new Date(),
    })
    .where(eq(tasksTable.id, params.data.id))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  req.log.info({ taskId: task.id }, "Task rescheduled");
  res.json(serializeTask(task));
});

router.post("/tasks/:id/snooze", async (req, res): Promise<void> => {
  const params = SnoozeTaskParams.safeParse({ id: parseId(req.params.id) });
  const body = SnoozeTaskBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : body.error?.message ?? "Invalid request body",
    });
    return;
  }
  const task = await findTask(params.data.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const scheduledDatetime = new Date(Date.now() + body.data.minutes * 60_000);
  const [updated] = await db
    .update(tasksTable)
    .set({
      scheduledDatetime,
      status: "scheduled",
      completedAt: null,
      lastNotifiedAt: null,
      reminderReady: false,
      updatedAt: new Date(),
    })
    .where(eq(tasksTable.id, params.data.id))
    .returning();
  req.log.info({ taskId: updated.id, minutes: body.data.minutes }, "Task snoozed");
  res.json(serializeTask(updated));
});

router.get("/reminders", async (_req, res): Promise<void> => {
  await processDueTasks();
  const reminders = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.reminderReady, true), isNull(tasksTable.completedAt)))
    .orderBy(desc(tasksTable.scheduledDatetime));

  if (reminders.length) {
    await db
      .update(tasksTable)
      .set({ reminderReady: false, lastNotifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasksTable.reminderReady, true));
  }

  res.json(ListRemindersResponse.parse(reminders.map(serializeTask)));
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  await processDueTasks();
  const tasks = await db.select().from(tasksTable).orderBy(asc(tasksTable.scheduledDatetime));
  const today = todayInAppTimezone();
  const serialized = tasks.map(serializeTask);
  const scheduled = serialized.filter((task) => task.status === "scheduled");
  const completed = serialized.filter((task) => task.status === "completed");
  const overdue = serialized.filter((task) => task.status === "overdue");
  const todayTasks = serialized.filter((task) => task.scheduledDate === today && task.status !== "completed");
  const upcoming = scheduled.filter((task) => task.scheduledDate >= today);

  res.json(
    GetDashboardResponse.parse({
      counts: {
        scheduled: scheduled.length,
        upcoming: upcoming.length,
        completed: completed.length,
        overdue: overdue.length,
      },
      today: todayTasks,
      upcoming: upcoming.slice(0, 10),
      overdue: overdue.slice(0, 10),
      completed: completed.slice(0, 10),
    }),
  );
});

export default router;