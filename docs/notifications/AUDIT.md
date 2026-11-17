# Notification System Audit

Audit date: 2026-11-09

## Implementation status

The audit below records the pre-upgrade state and remains the baseline for the implementation. The upgrade now adds an outbox-backed dispatcher, token and preference APIs, recurring reminder materialization, appointment offsets, engagement planning, notification-open handling, privacy controls, and operator documentation. See [architecture](ARCHITECTURE.md), [runbook](RUNBOOK.md), [privacy notes](PRIVACY.md), and [human actions](HUMAN_ACTIONS.md) for the delivered design and production rollout requirements. A database migration and Expo/EAS credential setup remain environment-specific operator actions.

## Scope and current files

Notification, reminder, token, scheduling, and appointment behavior is currently spread across:

- `backend/prisma/schema.prisma` — `User`, `Reminder`, and `PushToken` data models.
- `backend/src/models/user.model.ts` — user-store notification fields.
- `backend/src/data/user.store.ts` — persistence of `push_tokens`, notification settings, and read IDs in the user health profile.
- `backend/src/data/telemedicine.store.ts` — booking creation and the unsafe missing-user fallback.
- `backend/src/services/notification.service.ts` — direct Expo HTTP delivery, generated in-app reminder list, read tracking.
- `backend/src/services/cronWorker.service.ts` — hourly reminder planning, DB writes, direct Expo delivery.
- `backend/src/controllers/notification.controller.ts` and `backend/src/routes/notification.routes.ts` — legacy APIs, token registration, settings, test push, read operations.
- `backend/src/services/aiAgent.service.ts` — `set_reminder`, `book_consultation`, agent graph and deterministic triage.
- `backend/src/server.ts`, `backend/src/index.ts` — API routes and unconditional cron worker startup.
- `backend/src/middleware/auth.middleware.ts` — JWT auth used by notification routes.
- `backend/src/config/index.ts`, `backend/src/db/prisma.ts` — environment loading and Postgres/Prisma setup.
- `backend/src/tests/notification.test.ts`, `backend/src/tests/ai.test.ts`, `backend/src/tests/p0_p1_integration.test.ts` — notification and agent coverage.
- `mobile/src/services/notificationService.js` — Expo permission/token setup, local scheduling, local settings and inbox.
- `mobile/src/utils/notifications.js` — notification utility wrappers.
- `mobile/src/navigation/AppNavigator.js` — initialization, response listeners and cold-start notification handling.
- `mobile/src/screens/ProfileSettingsSection.js`, `mobile/src/screens/HomeScreen.js`, `mobile/src/screens/DoctorCareScreen.js`, `mobile/src/screens/PostmenopauseScreen.js`, `mobile/src/screens/OnboardingSetupScreen.js`, `mobile/src/screens/AIAssistantScreen.js` — settings, inbox, reminders, first-launch permission prompt, and reminder tool UI.
- `mobile/app.json`, `mobile/android/app/src/main/AndroidManifest.xml`, `mobile/android/app/build.gradle` — Expo notification plugin, Android permission and native FCM integration.
- `backend/.env.example`, `mobile/.env.example`, `.github/workflows/backend-ci.yml`, `.github/workflows/mobile-ci.yml` — configuration examples and CI.

Other docs containing notification descriptions include `README.md`, `docs/UML.md`, `docs/SRS.md`, `docs/SDD.md`, `docs/SCD.md`, and `docs/KB.md`; these are descriptive rather than runtime paths.

## Existing data model

`User` has `user_id`, `name`, `email`, `phone`, password hash, birth date, `pregnancy_mode`, role, `health_profile` JSON, and timestamps. It has no dedicated timezone, first name, streak, or notification preference relation. `health_profile` JSON is used for notification settings, push token copies, and read IDs through `user.store.ts`.

`Reminder` has `reminder_id`, `user_id`, `type`, optional `title`, `body`, `trigger_time`, boolean `sent`, and `created_at`. It has no timezone, recurrence, enabled/status, enqueue marker, or idempotency key.

`PushToken` has `id`, `user_id`, unique `token`, optional `platform`, and `updated_at`. There is no disabled state, device metadata, last-seen timestamp, or delivery/receipt history. The `User` relation cascades on deletion.

There is no persisted `Notification`, `NotificationPreference`, `NotificationDelivery`, or triage-event model. Cycle logs exist and can potentially support activity derivation, but there is no explicit streak record.

## Current delivery behavior

The mobile app requests notification permission/token during navigator initialization and schedules local reminders. It also persists local notification settings and an in-app list. Existing backend `/notifications/reminders` computes reminders dynamically rather than returning a durable notification inbox.

The backend cron worker runs an initial sweep after startup and then every hour. It scans users, computes cycle/pregnancy/appointment alerts, writes selected events as `Reminder(sent=true)`, looks up tokens from both `PushToken` and the user-store JSON, and posts directly to Expo. There is no durable outbox, atomic claim, ticket/receipt processing, retry policy, or multi-process coordination. Worker startup is unconditional in `index.ts`.

The controller's test endpoint also sends inline through `NotificationService.sendExpoPush`. That service hand-builds a raw HTTPS request to Expo; the cron worker independently uses `fetch` to the Expo endpoint. Neither uses `expo-server-sdk`.

## Infrastructure and conventions

- HTTP: Express 4; `/api/notifications` router applies `authenticateToken` to every current route. User identity is taken from `req.user.userId`.
- Validation: Zod is used for AI tool schemas, but notification controller request bodies currently use ad hoc checks and selective destructuring. No shared notification request schema exists.
- Logging: no structured logger dependency was found. Runtime paths use `console.log`, `console.warn`, and `console.error`; the Prisma client logs warnings/errors in development and errors in production.
- Config: `backend/src/config/index.ts` loads root `.env.local` then backend environment via dotenv and builds a plain object. It is not schema-validated. No root `.env.example` exists; `backend/.env.example` and `mobile/.env.example` do.
- Database: PostgreSQL (Neon comments in Prisma adapter), Prisma 7 with `pg` adapter. There are no committed migration directories found under `backend/prisma/migrations` at audit time.
- Scheduling/queue: an in-process `setInterval` in `cronWorker.service.ts`; `node-cron` is installed but not the worker's current mechanism. No Redis or BullMQ dependency/use was found. Per the plan, PostgreSQL row claiming is the appropriate queue design.
- Tests: hand-run TypeScript scripts using `ts-node` and Node `assert`; no Jest/Vitest framework. Backend `npm test` invokes auth, telemedicine, payment and notification scripts. Existing scripts start a backend and depend on configured services/database.
- CI: GitHub Actions backend workflow installs dependencies and runs `tsc --noEmit`, then builds/deploys the container on main. Mobile CI exists; no notification-specific test/lint/format steps were found.

## Confirmed defects and risks

Line numbers refer to the audited working tree on 2026-11-09.

1. `backend/src/services/aiAgent.service.ts:368-371` falls back to `prisma.user.findFirst()` if the booking session user is missing or `anonymous_user`. `backend/src/data/telemedicine.store.ts:350-356` independently falls back to the first database user if the requested user is absent. Both can associate a booking with an unrelated account.
2. `backend/src/services/aiAgent.service.ts:407` gives `confirmed` a default of `true`; the model can omit explicit confirmation. The tool description at lines 402-406 also does not enforce a two-step confirmation.
3. `backend/src/services/aiAgent.service.ts:416-434` parses `remindAt` with `new Date`, silently substitutes now plus 24 hours for invalid input, accepts past dates, and persists directly without timezone validation or conversion.
4. `backend/src/services/cronWorker.service.ts:15-38` starts an uncoordinated process-local timer; lines 194-258 perform a non-atomic duplicate check, persist a sent reminder, and send inline. Concurrent instances can duplicate or lose sends.
5. `backend/src/services/cronWorker.service.ts:50-143` scans all eligible users into memory and builds explicit period/fertility and pregnancy content. Those medical details are placed in push title/body and are not gated by a default-on discreet mode.
6. `backend/src/services/notification.service.ts:30-92` sends directly to Expo without SDK validation, chunking, access-token security, receipts, or retries. On request failure it logs the raw error message; the controller's test response at `backend/src/controllers/notification.controller.ts:252-263` returns test payload content and simulated status.
7. Tokens are stored in both `PushToken` and health-profile JSON (`backend/src/controllers/notification.controller.ts:48-87`, `backend/src/data/user.store.ts:29-31,177-181`), with duplicate sources of truth. The controller logs Prisma sync error details at `notification.controller.ts:79` and includes sensitive health-related claims in test notification body at `:228`.
8. `backend/src/controllers/notification.controller.ts:39-46` accepts arbitrary token strings without Expo token validation or size limits. Settings input at `:98-140` is not type-validated. All current routes do require JWT auth through `notification.routes.ts:13`.
9. `backend/src/services/notification.service.ts:106-263` can construct detailed clinical in-app alert content. Settings default `discreetTitles` to false (`:104`); health content and local push data are not consistently minimized.
10. `mobile/src/navigation/AppNavigator.js:264-266` calls permission/token registration at app startup, contrary to the required contextual pre-prompt. Client token registration uses the legacy `/register-token` endpoint and has no reliable backend unregister lifecycle. The code also locally schedules health-related reminders; see `mobile/src/services/notificationService.js` and `mobile/src/utils/notifications.js`.
11. No per-user timezone handling exists in notification preferences, reminder scheduling, or the agent tool. Backend worker day boundaries use server-local `setHours` (`cronWorker.service.ts:195-196`).
12. The config module has no notification kill switch, worker switch, Expo access-token validation, queue settings, or timezone config. The worker starts regardless of process role or config.
13. Potential token exposure/logging exists in request/service error paths. The audit found no intentional token-value logging, but raw upstream/network error details and direct response bodies need review and masking during the redesign. Health content is definitely written into persisted `Reminder`/push body fields in the worker.

## Target architecture gap analysis

The current implementation is legacy/local-first and does not have the required durable outbox or delivery lifecycle. It needs additive Prisma models/migrations for per-device token state, preferences, notification outbox rows, delivery tickets/receipts, and reminder recurrence metadata. Existing endpoints and client behavior need backwards-compatible migration to the outbox model. Device registration/preferences require schemas, IANA timezone validation, category controls, quiet-hour/frequency decisions, and stable auth ownership. Expo delivery should move to the SDK behind a sender adapter; a Postgres `FOR UPDATE SKIP LOCKED` worker should provide atomic claims, retry/recovery, receipt polling, dead-token disabling, and retention. Engagement planning and safe static copy do not exist. Appointment and reminder events need durable scheduling, cancellation/rescheduling, and dedupe keys. Client permission timing, token refresh/unregister, channels, tap allowlisting, preference UI, and local chat seeding require a coordinated refactor. Observability, privacy/runbook/architecture docs, operational health status, and the requested unit/integration/regression coverage are also absent.

## Preserved working-tree changes

At audit start, the working tree already contained user edits in `backend/src/controllers/notification.controller.ts`, `backend/src/services/notification.service.ts`, `mobile/src/screens/ProfileSettingsSection.js`, and `mobile/src/services/notificationService.js`, plus deletions of two mobile icon scripts and the new plan file. These changes were inspected and are being preserved; this audit does not attribute them to this upgrade.
