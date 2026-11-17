# Human Actions Before Production Rollout

These steps require access to the target infrastructure and Expo/EAS account; they cannot be completed from this repository checkout.

1. **Select and migrate each environment.** Confirm the target database, take the normal database backup, then run `cd backend; npx prisma migrate deploy` for that environment. Do not use a production URL for local validation.
2. **Set Expo push security and the backend secret.** In Expo, open the Red Apple project settings and enable enhanced push security. Create an Expo access token, then add it as backend secret `EXPO_ACCESS_TOKEN`. After the migration is applied, enable `NOTIFICATIONS_ENABLED` and `NOTIFICATIONS_WORKER_ENABLED`; keep both flags off until the release is ready.
3. **Configure native push credentials and builds.** From `mobile/`, run `npx eas-cli credentials` and configure Android FCM v1 service account credentials and the iOS APNs key. Then run `npx eas-cli build --platform android --profile development`, `npx eas-cli build --platform ios --profile development`, and the corresponding `--profile production` commands for the platforms being released.
4. **Run a device smoke check.** On a physical iOS and Android device, verify permission settings, device registration, generic test delivery, notification-open routing, logout token removal, and admin health endpoint access.
5. **Monitor launch.** Watch worker heartbeat, pending queue age, suppressed counts, ticket/receipt errors, and disabled-token counts during rollout. Use the kill switch if queue or provider errors grow unexpectedly.

See [RUNBOOK.md](RUNBOOK.md) for detailed operational checks and rollback.
