# QC-TaskManagerapp

QC-TaskManagerapp is a production-oriented task scheduling dashboard. It helps a quality-control team keep timed work visible, reschedule work without duplicate reminders, and confirm that the database, scheduler, and HTTP API are healthy.

## Features

- Create tasks with a description, date, and time
- View dashboard counts for scheduled, upcoming, completed, and overdue tasks
- Browse, search, and filter the full task queue
- View task details and edit task text or schedule
- Reschedule tasks, mark them complete, delete them, or snooze reminders for 5, 10, or 30 minutes
- Poll for due reminders and display an actionable browser overlay
- Recover pending scheduled work after an API restart
- View live HTTP status, response time, database connectivity, scheduler state, and scheduled job count
- Use a configurable application timezone, defaulting to `Asia/Kolkata`

## Supported project stack

This Replit project uses its existing full-stack workspace runtime:

- React + Vite + Tailwind CSS
- Express 5 API server
- PostgreSQL with Drizzle ORM
- OpenAPI with generated Zod validation and React Query hooks
- A lightweight in-process scheduler backed by the database

The user-facing behavior follows the supplied QC-TaskManagerapp specification. The workspace runtime uses Express/PostgreSQL rather than a separate Flask/SQLite process so it can use the project's existing managed API, database, preview, and publish workflows.

## Local setup

Install dependencies with pnpm:

```bash
pnpm install
```

The project uses the managed development database exposed through `DATABASE_URL`. Apply the schema with:

```bash
pnpm --filter @workspace/db run push
```

Optional configuration:

```bash
export APP_TIMEZONE=Asia/Kolkata
```

## Run locally in Replit

Start the API server and web app through their managed workflows:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/qc-taskmanagerapp run dev
```

The workflow supplies the required `PORT` and `BASE_PATH` values. The shared proxy exposes the API under `/api` and the web app at the root preview path.

## API

The OpenAPI source is `lib/api-spec/openapi.yaml`. Regenerate clients after changing it:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Important routes:

```text
GET    /api/healthz
GET    /api/health
GET    /api/dashboard
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/:id/complete
POST   /api/tasks/:id/reschedule
POST   /api/tasks/:id/snooze
GET    /api/reminders
```

## Scheduler and reminders

The API scheduler runs a short polling loop that marks due, incomplete tasks as overdue and reminder-ready. The database remains the source of truth, so restarting the API does not lose scheduled work.

The browser polls `/api/reminders` through the generated React Query hook. When the API returns a pending reminder, the shared application shell opens a visible overlay. The user can complete the task, snooze it, or dismiss the overlay. Completed and deleted tasks cannot trigger future reminders.

## Verification

Run the static checks:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run build
PORT=18873 BASE_PATH=/ pnpm --filter @workspace/qc-taskmanagerapp run build
```

The API has been exercised through the shared proxy for health, dashboard, create, update, complete, detail, and delete flows.

## Deployment

Publish the project through Replit's publish flow after reviewing the generated preview. The web artifact uses the managed workflow and the API server uses the existing API workflow, so runtime ports and path routing are supplied by the project configuration.

## Production considerations

- Run a single API scheduler instance per deployment process to avoid duplicate in-memory loops.
- For multiple API worker processes, move scheduler ownership to one dedicated process or add a distributed lock before scaling horizontally.
- Configure `APP_TIMEZONE` explicitly when users work outside the default timezone.
- Keep `DATABASE_URL` and other runtime values in the environment, never in source control.