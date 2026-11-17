# Red Apple: Production Notification System Upgrade

**Audience:** Codex (autonomous coding agent) working inside the Red Apple monorepo (Expo React Native client + Node/TypeScript backend with Prisma, LangGraph, Gemini).
**Goal:** Review the existing notification and reminder code, then rebuild it into a production-ready, industry-standard notification system, including a "Dr. Red" Duolingo-style engagement layer that is safe for a women's reproductive health product.
**Owner expectation:** The owner must not have to edit anything by hand. Finish every step yourself. The only exceptions are the human-only items in Section 0.4, which you must list in a file rather than fake.

---

## 0. Ground Rules (read fully before touching code)

### 0.1 Non-negotiables

1. **No shortcuts.** Implement every phase fully.
2. **No mocks, stubs, placeholders, TODOs, `// implement later`, fake data, or sample IDs** in production code. Test doubles are allowed only inside test files, and only at the external network boundary (the Expo push HTTP service, Gemini).
3. **No hardcoded values** for users, tokens, URLs, timezones, hours, limits, or copy logic. Everything configurable comes from validated environment config, the database, or a single typed constants module with a comment explaining each value.
4. **Discover, don't assume.** Existing file paths, model names, field names (this repo appears to use snake_case such as `user_id`, `reminder_id`, `trigger_time`), auth middleware, logger, test framework, and package manager must be read from the repo and followed. Everything in this document that names a file or model is a hint to verify.
5. **Follow existing conventions** (folder layout, error handling, response envelope, naming, lint and format rules). Do not introduce a second style.
6. **Backwards compatible.** Existing Reminder rows, existing endpoints, and existing app builds in the wild must keep working. Migrations must be non-destructive, with backfill where needed.
7. **Never log or store sensitive data** in notifications: no symptoms, pregnancy status, cycle details, diagnoses, or medication names in push payloads, logs, or analytics.
8. **Work in small, reviewable commits** with clear messages (one per phase minimum). Run typecheck, lint, and tests after each phase and fix everything before moving on.
9. If something is genuinely impossible without a human (credentials, store consoles), do not invent values. Record it in `docs/notifications/HUMAN_ACTIONS.md` (Section 0.4) and make the code fail fast with a clear error when the config is missing.

### 0.2 Working method

For each phase: (a) read the relevant code, (b) write down what you found in `docs/notifications/AUDIT.md`, (c) implement, (d) write tests, (e) run the full verification commands, (f) commit.

### 0.3 Context you must preserve

* **Dr. Red** is the app's AI health agent (`runHealthAgent` / `streamHealthAgent`, LangGraph graph, Gemini). It has tools including `set_reminder`, `log_symptoms`, `book_consultation`, `get_cycle_history`, `find_available_doctors`.
* A deterministic **triage layer** (`evaluateTriage`) classifies messages as `normal`, `monitor`, or `consult_doctor` (with `emergencyCare`). Emergency handling has zero LLM dependency. Do not weaken it.
* Users are primarily in **Nigeria** (default timezone `Africa/Lagos`, emergency number 112), but timezone must be per-user and never assumed.
* Life stages: cycle tracking, pregnancy, postmenopause, general. Notification content must be safe for all of them.

### 0.4 Human-only items (create `docs/notifications/HUMAN_ACTIONS.md`)

Generate this file at the end, listing exactly and only what a human must do, each with the exact command or console path. Expected items (verify each against the repo):

* Create an Expo access token and set `EXPO_ACCESS_TOKEN` in the backend environment (enable "enhanced push security" on the Expo project).
* Upload Android FCM V1 service account credentials and iOS APNs key to EAS (`eas credentials`).
* Provision Redis only if Phase 5 selects the Redis/BullMQ path.
* Run the new Prisma migration in each environment (`prisma migrate deploy`).
* Build a new development/production client (push does not work on Android in Expo Go; native config changes require a new EAS build).

Everything else you do yourself.

---

## Phase 1: Audit the existing system

Produce `docs/notifications/AUDIT.md` containing:

1. Every file touching notifications, reminders, push tokens, scheduling, cron, or `expo-notifications` (search: `notification`, `reminder`, `push`, `expo-notifications`, `expo-server-sdk`, `cron`, `trigger_time`, `setReminderTool`, `prisma.reminder`).
2. The current Prisma models involved (e.g. `Reminder`, `User`) and which fields exist (push token? timezone? streak? preferences?).
3. How reminders are currently delivered (or whether they are only stored and never sent).
4. Auth middleware, request validation approach, logging library, config loader, job or cron infrastructure, DB provider (Postgres vs other), whether Redis is already in use, test framework, CI config.
5. A defect list with file and line references. Known defects to confirm and fix:
   * `setReminderTool` silently converts an invalid `remindAt` into "now + 24h" and accepts times in the past. It must validate and return a clear error the LLM can relay.
   * `setReminderTool` and the agent have no timezone awareness.
   * `bookConsultationTool` falls back to `prisma.user.findFirst()` when the session user is missing or `anonymous_user`, which can book on a random real user's account. Remove this; return an auth error.
   * `bookConsultationTool` schema defaults `confirmed` to `true`, letting the model skip the confirmation step. Make it required with no default, and enforce the confirmation flow in the tool description.
   * Any place a token or health detail is logged.
6. A gap analysis against the target architecture below.

Do not start Phase 2 until the audit is written.

---

## Phase 2: Target architecture (implement exactly this shape, adapting names to the repo)

```
Triggers                         Core                              Delivery
-------------------              ---------------------------       -----------------------
Dr. Red set_reminder tool   -->  NotificationService.enqueue() -->  Dispatcher worker
User reminders (CRUD API)   -->    - preference + quiet-hour        - claims due rows safely
Engagement planner (hourly) -->      checks                         - Expo sender (chunked)
Appointment reminders       -->    - dedupe + frequency caps        - retry w/ backoff + jitter
                                   - writes Notification row        - ticket -> receipt poller
                                     (outbox)                       - disables dead tokens
```

Principles:

* **Outbox pattern.** Nothing is sent inline from request handlers. Everything becomes a `Notification` row, and a worker delivers it. This makes sends durable, retryable, auditable, and safe across multiple server instances.
* **At-least-once delivery with idempotency.** Every notification has a unique `dedupe_key`; enqueueing the same logical event twice creates one row.
* **Multi-instance safe.** Two server processes must never send the same notification. Use row claiming, not in-memory flags.
* **Separation of concerns.** Pure functions for decisions (planner, copy selection, time math), thin adapters for I/O (Expo, DB).

---

## Phase 3: Configuration and dependencies

1. Extend the existing config module (`config`) with a **zod-validated** `notifications` section. Fail fast at boot with a readable message if required values are missing. Include at minimum:
   * `EXPO_ACCESS_TOKEN` (required in production, optional in development)
   * `NOTIFICATIONS_ENABLED` (global kill switch, default true)
   * `NOTIFICATIONS_WORKER_ENABLED` (so web processes and worker processes can be split)
   * `NOTIFICATIONS_DISPATCH_INTERVAL_MS`, `NOTIFICATIONS_BATCH_SIZE`, `NOTIFICATIONS_MAX_ATTEMPTS`, `NOTIFICATIONS_RECEIPT_DELAY_MS`
   * `NOTIFICATIONS_DEFAULT_TIMEZONE` (default `Africa/Lagos`, only used when a user has none)
   * `NOTIFICATIONS_DEFAULT_QUIET_START` / `_END`, `NOTIFICATIONS_MAX_PER_DAY`
   * `NOTIFICATIONS_RETENTION_DAYS`
2. Add all new variables with comments to `.env.example` (and any per-environment example files that exist).
3. Install dependencies with the repo's package manager, pinned to current stable versions: `expo-server-sdk` (backend); a timezone library (`luxon` or `date-fns-tz`; pick one and use it everywhere; do not hand-roll offset math); a scheduler only if needed (see Phase 6). On the client: `expo-notifications`, `expo-device`, `expo-constants` (use `npx expo install` so versions match the SDK).

---

## Phase 4: Data model (Prisma)

Add models following existing naming conventions. The following is the required content; adapt names and types to the repo (UUIDs vs cuid, snake_case vs camelCase, `@@map` usage).

**`DeviceToken`** (one user, many devices)
* `id`, `user_id` (FK, `onDelete: Cascade`), `expo_push_token` (**unique**), `platform` (`ios` | `android`), `device_name?`, `app_version?`, `os_version?`, `last_seen_at`, `disabled_at?`, `disabled_reason?`, `created_at`, `updated_at`
* Indexes: `(user_id)`, `(disabled_at)`

**`NotificationPreference`** (one per user, created lazily with defaults from config)
* `user_id` (unique, FK), `enabled`, `timezone` (IANA string, validated), `quiet_hours_start`, `quiet_hours_end` (local time), `tone` (`cheeky` | `gentle`, default `gentle`), `discreet_mode` (default **true**: generic wording, no health terms), `categories` (JSON or booleans: `reminders`, `appointments`, `engagement`, `insights`), `max_per_day`, `updated_at`

**`Notification`** (the outbox)
* `id`, `user_id` (FK, cascade), `category`, `tier?`, `title`, `body`, `data` (JSON, must stay under 3 KB), `scheduled_for`, `status` (`pending` | `processing` | `sent` | `failed` | `cancelled` | `suppressed`), `attempts`, `next_attempt_at`, `locked_at?`, `locked_by?`, `sent_at?`, `opened_at?`, `dedupe_key` (**unique**), `source` (`reminder` | `dr_red_engagement` | `appointment` | `agent_tool` | `system`), `source_ref?`, `suppressed_reason?`, `last_error?`, `created_at`
* Indexes: `(status, scheduled_for)`, `(user_id, created_at)`, `(user_id, category, created_at)`

**`NotificationDelivery`** (one per device per notification)
* `id`, `notification_id` (FK), `device_token_id` (FK), `expo_ticket_id?`, `ticket_status`, `receipt_status?`, `receipt_checked_at?`, `error_code?`, `created_at`

**`TriageEvent`** (only if the repo does not already persist triage results)
* `id`, `user_id`, `level`, `emergency_care` (bool), `created_at`. **Never store message text or symptoms.** Write it from `runHealthAgent` / `streamHealthAgent` whenever triage is not `normal`. The engagement planner needs it to suppress guilt messaging after a medical scare.

**Existing `Reminder` model:** keep it as the user-facing definition of recurring or one-off reminders, add whatever is missing (`timezone`, `recurrence_rule` or simple `repeat` enum, `last_enqueued_for`, `enabled`, `status`), and make the planner materialize `Notification` rows from it. Write a data migration that backfills these fields for existing rows with the owner's existing `trigger_time` semantics preserved.

Also verify or add on `User`: `first_name` for personalization, and a reliable way to compute last-logged time and streak (see Phase 7). If the streak is derived from `cycleStore` logs, compute it; if there is no suitable source, add the minimal field or table needed and keep it correct.

Generate the migration with `prisma migrate dev --name notifications_v2`, review the SQL, and make sure `prisma generate` and typecheck pass.

---

## Phase 5: Backend core services

Create a cohesive module (for example `src/notifications/`) with separate files for each responsibility.

### 5.1 `deviceTokens.service`
* `registerDevice(userId, payload)`: validate with `Expo.isExpoPushToken`, upsert by token. If the token already belongs to another user (shared phone, re-login), **reassign it to the current user** and re-enable it. Update `last_seen_at`.
* `unregisterDevice(userId, token)` for logout. Disable rather than hard delete.
* `disableToken(tokenId, reason)` used by the receipt handler.

### 5.2 `preferences.service`
* `getOrCreate(userId)`, `update(userId, patch)`. Validate IANA timezone with the chosen time library, validate quiet-hour format, clamp `max_per_day`.

### 5.3 `notification.service` (the single entry point)
`enqueue({ userId, category, tier?, title, body, data, scheduledFor, dedupeKey, source, sourceRef })`:
1. Idempotent insert on `dedupe_key` (catch the unique violation and return the existing row).
2. Check preferences: master switch, category toggle. If disabled, write the row as `suppressed` with a reason so the decision is auditable.
3. Apply **quiet hours** in the user's timezone: if `scheduled_for` falls inside quiet hours, move it to the next allowed local time (for `reminders` and `appointments` categories defined by the user, honor the exact time unless the user opted out; for `engagement`, always defer or drop).
4. Apply **frequency caps** (`max_per_day` per local day for `engagement`; user-set reminders are exempt from the engagement cap but still subject to the global safety cap).
5. Never put sensitive text in `data`. Allowed: `notification_id`, `category`, `route`, `seed`, and opaque IDs.

### 5.3a Expo sender adapter
* `new Expo({ accessToken: config.notifications.expoAccessToken })`.
* Build messages per active device token. Set `channelId` (Android), `sound`, `priority`, `ttl` (reasonable expiry per category; engagement pushes should expire the same day), `data` including `notification_id`.
* Use `chunkPushNotifications`, send chunks sequentially with limited concurrency, handle chunk-level failures.
* Persist each returned ticket in `NotificationDelivery`.

### 5.3b Dispatcher worker
* Every `NOTIFICATIONS_DISPATCH_INTERVAL_MS`, **claim** a batch of due rows atomically. On Postgres use `UPDATE ... WHERE id IN (SELECT id ... WHERE status='pending' AND scheduled_for <= now() ORDER BY scheduled_for FOR UPDATE SKIP LOCKED LIMIT n) RETURNING *` via `prisma.$queryRaw`, setting `status='processing'`, `locked_at`, `locked_by`.
* Recover **stuck rows**: rows `processing` for longer than a lock timeout go back to `pending` (incrementing attempts).
* On success mark `sent`. On transient failure (network, 5xx, `MessageRateExceeded`) retry with **exponential backoff and jitter** up to `NOTIFICATIONS_MAX_ATTEMPTS`, then `failed` with `last_error`. On permanent failure (no active devices, `MessageTooBig`) mark `failed` immediately without retry.
* Graceful shutdown on `SIGTERM`/`SIGINT`: stop claiming, finish in-flight work, release locks.

### 5.3c Receipt poller
* A second loop checks receipts for tickets older than `NOTIFICATIONS_RECEIPT_DELAY_MS` (Expo recommends waiting roughly 15 minutes; receipts are kept about 24 hours). Use `chunkPushNotificationReceiptIds` and `getPushNotificationReceiptsAsync`.
* `DeviceNotRegistered` disables the token (`disabled_reason`). `InvalidCredentials`, `MismatchSenderId` and similar errors log at error level and raise an alert-worthy metric.
* Write `receipt_status` and `receipt_checked_at`.

### 5.4 Choosing the scheduler/queue backend
* Inspect the repo. If **Redis is already used**, implement the dispatcher with BullMQ (repeatable jobs, attempts/backoff config) and keep the outbox table as the source of truth.
* If **not**, use the Postgres `SKIP LOCKED` approach above. **Do not** use a bare `node-cron` loop with in-memory state; it double-sends when more than one instance runs. A cron library is acceptable only as the tick trigger on top of the DB claim logic.
* Explain the decision in `AUDIT.md`.

### 5.5 Retention
A daily maintenance job deletes `Notification` and `NotificationDelivery` rows older than `NOTIFICATIONS_RETENTION_DAYS` and any disabled tokens older than a configurable age.

---

## Phase 6: HTTP API

Use the existing router, auth middleware, validation approach (zod), and response envelope. Every route requires authentication, and the user ID **always comes from the session**, never from the body.

| Method & path | Purpose |
|---|---|
| `POST /notifications/devices` | Register or refresh a push token (body: token, platform, deviceName?, appVersion?, osVersion?) |
| `DELETE /notifications/devices` | Unregister the current device token (logout) |
| `GET /notifications/preferences` | Read preferences (created lazily) |
| `PUT /notifications/preferences` | Update preferences (timezone, quiet hours, tone, discreet mode, category toggles) |
| `POST /notifications/:id/opened` | Mark as opened; verify the notification belongs to the caller; idempotent |
| `GET /notifications` | Paginated in-app notification history (cursor pagination) |
| `POST /notifications/read-all` | Optional, only if the client implements an inbox |

Also:
* Rate-limit registration and opened endpoints using the repo's existing limiter (or add `express-rate-limit` if none).
* Convert the existing reminder endpoints and the `set_reminder` agent tool to call `notification.service`/reminder service (no direct `prisma.reminder.create` with ad hoc defaults). The tool must accept an ISO string **with offset or a timezone-resolved local time**, reject past or invalid times with an explanatory error, and use the user's stored timezone.
* On user deletion, cascade removes devices, preferences, and notifications. Confirm this in the migration.

---

## Phase 7: Dr. Red engagement planner (Duolingo-style, done safely)

### 7.1 Streak and activity definitions (write these in a code comment and in the docs)
* A "check-in" is any qualifying log action (symptom log, cycle log, daily check-in, or Dr. Red chat message; verify what exists). Count by the user's **local calendar day**.
* `streak_days` = consecutive local days with at least one check-in, ending today or yesterday.
* `hours_since_last_log` and `ignored_pushes` (consecutive engagement notifications with no `opened_at`) come from the database, not guesses.

### 7.2 Pure decision function
Implement `resolveEngagementTier(state, now)` as a **pure, deterministic function** with exhaustive unit tests. Inputs: local hour, streak, logged today, hours since last log, ignored pushes, days since last push, tone, discreet mode, life stage, recent escalated triage, pregnancy-mode flag.

Tiers: `morning`, `streak_at_risk`, `missed_1`, `missed_2`, `breakup`, `winback`.

**Hard safety rules (must be enforced in code and tested):**
1. If the user had `emergencyCare` or `consult_doctor` triage within the last 14 days, send only neutral supportive nudges, never guilt tiers.
2. If tone is `gentle` (the default), only `morning` and `winback` with warm wording are allowed.
3. Pregnancy mode: never use guilt tiers. Silence can mean loss, illness, or a hard time. Use neutral wording only.
4. Escalation ceiling: after `breakup`, send at most one `winback` per 7 days, then stop after a configurable number of ignored winbacks. Never keep escalating.
5. Maximum one engagement notification per local day, only between quiet-hour boundaries from preferences.
6. Never mention symptoms, bleeding, pregnancy, cycles, contraception, fertility, or any condition unless the user turned off `discreet_mode`. Even then, avoid specifics.
7. Respect the global kill switch and category toggles.

### 7.3 Planner job
Runs hourly (and safely under multiple instances using the same claim mechanism or an advisory lock `pg_try_advisory_lock`). Batch users with cursor pagination (never load all users into memory). Skip users with no active device token. For each eligible user call the resolver, render copy, then `enqueue` with `dedupe_key = engagement:{userId}:{localDate}`.

### 7.4 Copy catalog
* Put copy in a typed module (e.g. `notificationCopy.ts`) keyed by `tier × tone × discreet`, with at least 4 variants per cell so repeats are rare. Track the last N variant IDs per user (in `Notification.data.variant` or a column) and avoid repeating them.
* Voice: warm, cheeky, short (under 120 characters body), light emoji at most one. Dr. Red is the character. **Do not mention competitors** (no "Duo" jokes).
* Placeholders (`{name}`, `{streak}`) must have safe fallbacks. If `first_name` is missing, use a neutral address.
* Write a **copy lint test** that fails if any string contains blocked terms (symptom, period, bleed, pregnan, cramp, fertile, ovulat, contracept, miscarr, etc.) in discreet variants, exceeds length limits, or has unresolved placeholders.
* Optional LLM-generated variants: **do not implement** unless trivially safe. Static copy is the default.

### 7.5 Appointment and reminder notifications
* Appointment reminders (24h and 1h before a booked telemedicine consultation) created when a booking succeeds, cancelled or rescheduled when the booking changes. Dedupe key per booking and offset.
* User reminders from the Reminder model: materialize the next occurrence into the outbox shortly before it is due (not far ahead), then schedule the following occurrence. Handle recurrence in the user's timezone, including DST correctness for other zones.

---

## Phase 8: Client (Expo React Native)

Locate the existing notification code first (Phase 1) and refactor rather than duplicating.

1. **Central module** (e.g. `src/services/notificationService.js`) exposing: `ensurePermissions()`, `registerForPush()`, `unregister()`, `initListeners(navigation)`, `getPreferences()`, `updatePreferences()`.
2. **Configuration**
   * `app.json`/`app.config` plugin config for `expo-notifications` (Android small icon and accent color from existing brand assets; do not add placeholder images).
   * Read the EAS `projectId` from `Constants.expoConfig.extra.eas.projectId` (fall back to `Constants.easConfig`), and fail with a clear error if absent. Never hardcode it.
3. **Android channels** created **before** requesting a token (`setNotificationChannelAsync`): at least `dr-red` (engagement), `reminders` (high importance), `appointments` (high importance). Channel IDs must match what the backend sends.
4. **Permission flow:** do not prompt at first launch. Show a contextual pre-prompt explaining the value after a meaningful action, then call the system prompt (handle Android 13+ `POST_NOTIFICATIONS`, iOS provisional/denied states, and a "go to Settings" path when permanently denied).
5. **Token lifecycle:** register after login and on every app start when authenticated (tokens rotate), send to `POST /notifications/devices`, retry with backoff on failure, call `DELETE /notifications/devices` on logout. Physical device check via `expo-device`.
6. **Handlers:** `setNotificationHandler` for foreground behavior (show banner, no sound for engagement), `addNotificationResponseReceivedListener` for taps, and **cold-start handling** with `useLastNotificationResponse` or `getLastNotificationResponseAsync`, so a tap that launches the app still navigates once navigation is ready. Remove all listeners on cleanup.
7. **Tap handling:** read `data.route`, `data.seed`, `data.notification_id`. Validate the route against an allowlist before navigating (never navigate to arbitrary strings). Call `POST /notifications/:id/opened`. Deep link into the Dr. Red chat with `entrySeed`.
8. **Dr. Red chat seeding:** when opened with `entrySeed`, show a tone-matched opening line and quick replies **locally in the client**. Do not route the seed through the LLM or triage, and do not alter `getSuggestedQuickReplies` triage behavior.
9. **Settings screen** for preferences: master toggle, per-category toggles, quiet hours, timezone (default to the device timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone`, sent to the backend on registration), tone (`Gentle`/`Playful`), discreet mode toggle with a plain-language explanation. Use the app's existing design system and components.
10. **Badge handling:** clear on app foreground; do not set badges from engagement pushes.
11. Accessibility labels and i18n through whatever mechanism the app already uses.

---

## Phase 9: Observability and operations

* Structured logs through the repo's logger (levels, correlation with `notification_id`, never tokens or bodies containing user data; mask tokens to last 6 chars at most).
* Counters/gauges where the repo has a metrics facility (otherwise structured log events at fixed names): enqueued, suppressed (by reason), sent, failed, retries, receipts_ok, receipts_error (by code), tokens_disabled, queue_depth, oldest_pending_age.
* A health/readiness endpoint section reporting worker heartbeat and queue depth, behind existing admin auth.
* Kill switches: `NOTIFICATIONS_ENABLED=false` stops enqueueing engagement and sending; `NOTIFICATIONS_WORKER_ENABLED=false` runs the API without the worker.
* Document the runbook in `docs/notifications/RUNBOOK.md`: how to pause sending, replay failed rows, investigate a user who says they get nothing (token state, preferences, quiet hours, receipts), and common Expo error codes.

---

## Phase 10: Security and privacy

* Auth on every route; authorization on `:id` resources (the notification must belong to the caller).
* Validate and size-limit all inputs. Strip HTML from any user-supplied text used in notifications.
* Payload `data` ≤ 3 KB, `body` short; check Expo's 4 KB limit in code.
* Enable Expo enhanced push security (token in the SDK client).
* Comply with the Nigeria Data Protection Act principles: data minimization (no health content in pushes), purpose limitation, user control (preferences and full opt-out), deletion on account removal, retention job.
* Document what is stored and why in `docs/notifications/PRIVACY.md`.

---

## Phase 11: Tests

Use the repo's existing test framework (add `vitest` or `jest` consistent with the stack only if none exists).

**Unit:** engagement resolver (every tier boundary, every safety rule, life stages, quiet hours, local-day boundaries across timezones including one with DST), copy lint, copy variant no-repeat, streak calculation, quiet-hour shifting, dedupe key generation, retry/backoff calculation, preference validation.

**Integration (real test database):** device registration (new, refresh, token reassigned between users), preference CRUD and validation, `enqueue` idempotency, suppression reasons, concurrent dispatchers claiming the same rows (spawn two workers; assert each row is sent once), stuck-row recovery, receipt handling disables tokens on `DeviceNotRegistered`, opened endpoint authorization, reminder materialization including recurrence, and the `set_reminder` tool rejecting invalid or past times and using the stored timezone.
* The Expo HTTP service is the only thing replaced by a test double, via the SDK boundary or an HTTP interceptor, inside test files only.

**Agent regression tests:** `bookConsultationTool` returns an auth error for a missing or anonymous user and never touches another user's account; `confirmed` must be explicit.

**Client:** unit tests for route allowlist, permission state machine, and the registration retry logic, if a client test setup exists.

---

## Phase 12: Documentation

Create or update, in `docs/notifications/`: `AUDIT.md`, `ARCHITECTURE.md` (diagram in Mermaid, data model, flows), `RUNBOOK.md`, `PRIVACY.md`, `HUMAN_ACTIONS.md`. Update the main README with a short pointer.

---

## Verification checklist (run all; fix all failures before finishing)

1. `prisma validate`, `prisma generate`, `prisma migrate dev` (clean database) and `prisma migrate deploy` simulation on a database seeded with legacy Reminder rows.
2. Backend: typecheck, lint, format check, unit tests, integration tests, production build.
3. Client: typecheck (if TS), lint, tests, `npx expo-doctor`, `npx expo export` (or the repo's build check).
4. Start the backend with the worker enabled against a local database and exercise the flows with real HTTP calls: register device, update preferences, enqueue a reminder, observe it claimed and a delivery row written (Expo network call replaced only in the test environment).
5. Grep the repo for leftovers: `TODO`, `FIXME`, `mock`, `placeholder`, `lorem`, hardcoded `ExponentPushToken[`, hardcoded user IDs, `findFirst()` fallbacks in tools.

## Definition of done

* [ ] Every phase implemented; no TODOs or placeholders in production code.
* [ ] All migrations are additive and tested on legacy data.
* [ ] Multi-instance safe (verified by test), idempotent, retried, with receipt handling and dead-token cleanup.
* [ ] Dr. Red engagement logic enforces every safety rule in 7.2, covered by tests.
* [ ] No sensitive health data in any push payload, log line, or analytics event.
* [ ] Client handles permissions, token lifecycle, foreground, background, and cold-start taps, with an allowlisted navigation.
* [ ] Agent tool defects from the audit are fixed and regression-tested.
* [ ] Docs written; `HUMAN_ACTIONS.md` lists only genuinely human-only steps with exact commands.
* [ ] Final report posted: summary of changes per phase, migration notes, new env vars, verification output, and any residual risks.
