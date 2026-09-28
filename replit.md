# QC-TaskManagerapp

QC-TaskManagerapp is a scheduling dashboard for creating, monitoring, completing, and rescheduling timed quality-control work with live reminders and system health visibility.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server on the workflow-provided port
- `pnpm --filter @workspace/qc-taskmanagerapp run dev` — run the web app on the workflow-provided port
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server run build` — build the API bundle
- `PORT=18873 BASE_PATH=/ pnpm --filter @workspace/qc-taskmanagerapp run build` — build the web app outside its managed workflow
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push database schema changes in development

Required environment:

- `DATABASE_URL` — managed PostgreSQL connection string
- `APP_TIMEZONE` — optional display timezone, defaults to `Asia/Kolkata`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React, Vite, Tailwind CSS, Wouter, TanStack Query
- API: Express 5
- Database: PostgreSQL + Drizzle ORM
- Scheduling: database-backed in-process scheduler with restart recovery
- Validation: OpenAPI, Orval-generated Zod schemas and React Query hooks

## Where things live

- `artifacts/qc-taskmanagerapp/` — web application and UI routes
- `artifacts/api-server/` — task, dashboard, reminder, health, and scheduler routes
- `lib/api-spec/openapi.yaml` — API source of truth
- `lib/api-client-react/src/generated/` — generated client hooks
- `lib/api-zod/src/generated/` — generated server validation schemas
- `lib/db/src/schema/tasks.ts` — task table schema

## Architecture decisions

- PostgreSQL is the database source of truth; the scheduler only derives reminder-ready state and reloads pending work on startup.
- Task date/time input is interpreted in `APP_TIMEZONE` and stored as an absolute timestamp.
- Reminder delivery is browser-safe: the API marks due tasks ready, the frontend polls `/api/reminders`, and the app shows an actionable overlay.
- The scheduler uses the task id as the logical job identity, so updates and reschedules cannot create duplicate task records or reminder states.

## Product

- Dashboard counts for scheduled, upcoming, completed, and overdue work
- Task CRUD, detail views, edit/reschedule, completion, deletion, and snooze actions
- Browser reminder overlay with complete, snooze, and dismiss actions
- Live system status page backed by actual API health responses
- Responsive layouts for desktop, tablet, and mobile

## Gotchas

- The web workflow supplies `PORT` and `BASE_PATH`; do not start the Vite app from the workspace root.
- After changing `lib/api-spec/openapi.yaml`, run codegen before using the generated client or Zod exports.
- Restart both managed workflows after backend or frontend runtime changes.