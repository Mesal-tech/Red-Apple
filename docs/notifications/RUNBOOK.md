# Notification Operations Runbook

## Enablement

1. Apply the additive migration to the intended database with `cd backend; npx prisma migrate deploy`.
2. Configure `NOTIFICATIONS_ENABLED=true`, `NOTIFICATION_WORKER_ENABLED=true`, and a secret `EXPO_ACCESS_TOKEN` in the backend environment. Use `backend/.env.example` for the remaining defaults.
3. Configure EAS push credentials for each platform and create a native development build before validating push delivery.
4. Deploy the backend, then verify `/health` and the admin-only `/api/admin/notifications/health` heartbeat and queue depth.
5. Install the build on a physical device, allow notifications from Settings, confirm a device token is registered, and enqueue a generic test notification.

## Triage

- **Worker disabled or no heartbeat:** Check the two enablement flags, backend startup logs, and database connectivity. The worker starts only when both flags are true.
- **Queue depth rising:** Check pending row age and status counts in `notifications`; verify worker heartbeat, Expo credentials, outbound connectivity, and the delivery logs.
- **Failed delivery:** Inspect `last_error` and delivery error codes. Invalid credentials require EAS/provider credential repair. `DeviceNotRegistered` is handled by disabling the token; ask the user to reopen the app and register again.
- **No delivery for one user:** Check the master/category preference, active `DeviceToken`, `suppressed_reason`, and pending reminder state. Do not inspect or expose health-profile content to troubleshoot a push.
- **Duplicate concern:** Check the unique `dedupe_key`, delivery records, and appointment/reminder source reference. Do not manually replay a row without reviewing its prior tickets.

## Rollback

Set `NOTIFICATIONS_ENABLED=false` to stop new notification work and dispatch. This does not delete notification history, device tokens, or applied schema. Leave the additive migration in place during code rollback; rolling back the database schema is not required and risks losing state. Re-enable only after the cause is resolved and queue contents are reviewed.

## Database safety

Run migrations against an explicitly selected environment and verify the connection target before deployment. The migration is additive and backfills existing valid Expo tokens and reminder timezones. Do not point migration commands at production from a developer workstation.
