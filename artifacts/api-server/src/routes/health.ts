import { Router, type IRouter } from "express";
import { GetSystemHealthResponse, HealthCheckResponse } from "@workspace/api-zod";
import { db, tasksTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";
import { schedulerStatus } from "../lib/scheduler";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok", httpStatus: 200 });
  res.json(data);
});

router.get("/health", async (_req, res): Promise<void> => {
  const started = performance.now();
  try {
    const [{ count: scheduledJobs }] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(eq(tasksTable.status, "scheduled"));
    const scheduler = schedulerStatus();
    const responseTimeMs = Math.round(performance.now() - started);
    const data = GetSystemHealthResponse.parse({
      status: "healthy",
      httpStatus: 200,
      database: "connected",
      scheduler: scheduler.running ? "running" : "stopped",
      scheduledJobs,
      responseTimeMs,
      timestamp: new Date().toISOString(),
      lastSuccessfulCheck: new Date().toISOString(),
    });
    res.json(data);
  } catch (error) {
    _req.log.error({ err: error }, "Health check failed");
    res.status(503).json({
      status: "error",
      httpStatus: 503,
      database: "disconnected",
      scheduler: schedulerStatus().running ? "running" : "stopped",
      scheduledJobs: 0,
      responseTimeMs: Math.round(performance.now() - started),
      timestamp: new Date().toISOString(),
      lastSuccessfulCheck: new Date().toISOString(),
    });
  }
});

export default router;
