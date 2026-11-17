# Notification Privacy

- Push bodies are generic for reminders and appointments. Engagement copy is short and avoids repeating sensitive profile details. Discreet-title mode further reduces lock-screen information.
- Push data is restricted to small allowlisted routing metadata, an allowlisted assistant entry seed, and opaque reminder or booking identifiers. Do not place symptoms, cycle details, pregnancy data, clinical notes, names, email addresses, or access tokens in push payloads.
- Device tokens are bound to the authenticated user and can be unregistered on logout. Invalid tokens are disabled after Expo reports them unusable.
- Notification history and delivery records are retained for the configured `NOTIFICATION_RETENTION_DAYS`; disabled tokens are purged on the same retention schedule.
- Triage and check-in activity records contain event kinds and timestamps needed for prioritization, not free-text check-in content.
- Engagement planning uses coarse activity dates and preference settings. Suppression checks prevent an engagement push when recent triage requires care or the user has disabled the relevant category.
- Expo access credentials belong only in backend secrets. Never embed them in mobile configuration or source control.

When investigating delivery, use notification IDs, status, source, and provider error codes. Avoid copying user notification bodies or push tokens into tickets, logs, or screenshots.
