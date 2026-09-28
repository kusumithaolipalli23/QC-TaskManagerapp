import { index, pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    task: text("task").notNull(),
    scheduledDatetime: timestamp("scheduled_datetime", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    reminderReady: boolean("reminder_ready").notNull().default(false),
  },
  (table) => [
    index("tasks_status_idx").on(table.status),
    index("tasks_scheduled_datetime_idx").on(table.scheduledDatetime),
  ],
);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;