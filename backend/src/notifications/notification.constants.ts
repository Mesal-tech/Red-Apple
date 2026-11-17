// Local morning window used only by the engagement planner; quiet hours remain preference-driven.
export const ENGAGEMENT_MORNING_START_HOUR = 8;
export const ENGAGEMENT_MORNING_END_HOUR = 11;
// Minimum quiet period between engagement messages, measured in local calendar days.
export const ENGAGEMENT_MIN_DAYS_BETWEEN_PUSHES = 1;
// Silence thresholds separate the two gentle inactivity tiers.
export const ENGAGEMENT_MISSED_ONE_HOURS = 24;
export const ENGAGEMENT_MISSED_TWO_HOURS = 48;
// After this many ignored playful nudges, the planner may send one breakup tier.
export const ENGAGEMENT_BREAKUP_IGNORED_THRESHOLD = 4;
// A winback after a breakup is limited to one per week.
export const ENGAGEMENT_WINBACK_COOLDOWN_DAYS = 7;
// Only the latest interactions are needed to derive current engagement state.
export const ENGAGEMENT_ACTIVITY_LOOKBACK_DAYS = 45;
export const ENGAGEMENT_QUIET_NUDGE_TIER: 'winback' = 'winback';
// Engagement planning cadence is hourly as specified by product policy.
export const ENGAGEMENT_PLANNER_INTERVAL_MS = 60 * 60 * 1000;
// Per-local-day engagement cap prevents duplicate nudges across worker ticks.
export const ENGAGEMENT_MAX_PER_LOCAL_DAY = 1;
// Keep data below Expo's payload ceiling with room for envelope fields.
export const NOTIFICATION_DATA_MAX_BYTES = 3072;
// Short bodies reduce lock-screen exposure and stay within the product copy limit.
export const NOTIFICATION_BODY_MAX_BYTES = 240;
// Retry schedule uses exponential backoff, capped at one hour, with up to one second of jitter.
export const NOTIFICATION_RETRY_BASE_MS = 1000;
export const NOTIFICATION_RETRY_MAX_MS = 60 * 60 * 1000;
export const NOTIFICATION_RETRY_JITTER_MS = 1000;
// Retention cleanup runs once per day per worker process.
export const NOTIFICATION_MAINTENANCE_INTERVAL_MS = 24 * 60 * 60 * 1000;
// Appointment reminders are scheduled one day and one hour before the appointment.
export const APPOINTMENT_REMINDER_OFFSETS = [
  { key: '24h', milliseconds: 24 * 60 * 60 * 1000, body: 'You have an appointment coming up tomorrow.' },
  { key: '1h', milliseconds: 60 * 60 * 1000, body: 'Your appointment is coming up in about an hour.' },
] as const;
