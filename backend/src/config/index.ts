import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load root project variables before the backend-local .env so process variables still win.
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config();

const boolEnv = (fallback: boolean) => z.preprocess((value) => {
  if (value === undefined || value === '') return fallback;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}, z.boolean());

const timezoneSchema = z.string().refine((value) => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}, 'must be a valid IANA timezone');

const notificationConfigSchema = z.object({
  expoAccessToken: z.string().default(''),
  // Keep production bootable when the deployment has not configured Expo yet.
  // Notifications can be explicitly enabled once EXPO_ACCESS_TOKEN is set.
  enabled: boolEnv(process.env.NODE_ENV !== 'production'),
  workerEnabled: boolEnv(true),
  dispatchIntervalMs: z.coerce.number().int().min(1000).default(15000),
  batchSize: z.coerce.number().int().min(1).max(500).default(50),
  maxAttempts: z.coerce.number().int().min(1).max(20).default(5),
  receiptDelayMs: z.coerce.number().int().min(1000).default(900000),
  defaultTimezone: timezoneSchema.default('Africa/Lagos'),
  defaultQuietStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('21:00'),
  defaultQuietEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('08:00'),
  maxPerDay: z.coerce.number().int().min(1).max(20).default(3),
  globalMaxPerDay: z.coerce.number().int().min(1).max(100).default(10),
  retentionDays: z.coerce.number().int().min(1).max(3650).default(90),
  lockTimeoutMs: z.coerce.number().int().min(10000).default(120000),
  maxIgnoredWinbacks: z.coerce.number().int().min(1).max(10).default(2),
}).superRefine((values, ctx) => {
  if (process.env.NODE_ENV === 'production' && values.enabled && !values.expoAccessToken) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expoAccessToken'], message: 'EXPO_ACCESS_TOKEN is required when notifications are enabled in production' });
  }
});

const notifications = notificationConfigSchema.parse({
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN,
  enabled: process.env.NOTIFICATIONS_ENABLED,
  workerEnabled: process.env.NOTIFICATIONS_WORKER_ENABLED,
  dispatchIntervalMs: process.env.NOTIFICATIONS_DISPATCH_INTERVAL_MS,
  batchSize: process.env.NOTIFICATIONS_BATCH_SIZE,
  maxAttempts: process.env.NOTIFICATIONS_MAX_ATTEMPTS,
  receiptDelayMs: process.env.NOTIFICATIONS_RECEIPT_DELAY_MS,
  defaultTimezone: process.env.NOTIFICATIONS_DEFAULT_TIMEZONE,
  defaultQuietStart: process.env.NOTIFICATIONS_DEFAULT_QUIET_START,
  defaultQuietEnd: process.env.NOTIFICATIONS_DEFAULT_QUIET_END,
  maxPerDay: process.env.NOTIFICATIONS_MAX_PER_DAY,
  globalMaxPerDay: process.env.NOTIFICATIONS_GLOBAL_MAX_PER_DAY,
  retentionDays: process.env.NOTIFICATIONS_RETENTION_DAYS,
  lockTimeoutMs: process.env.NOTIFICATIONS_LOCK_TIMEOUT_MS,
  maxIgnoredWinbacks: process.env.NOTIFICATIONS_MAX_IGNORED_WINBACKS,
});

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  notifications,
  jwt: {
    secret: process.env.JWT_SECRET || 'red-apple-production-jwt-secret-key-32chars-min!!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'red-apple-production-jwt-refresh-secret-key-32chars!!',
    accessExpiresIn: '30d',
    refreshExpiresIn: '30d',
  },
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    appleClientId: process.env.APPLE_CLIENT_ID || '',
  },
  stream: {
    apiKey: process.env.STREAM_API_KEY || 'mmhfdzb5evj2',
    apiSecret: process.env.STREAM_API_SECRET || '',
  },
  doctor: {
    profileId: process.env.DOCTOR_PROFILE_ID || '',
  },
  r2: {
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID || '',
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || '',
    publicDomain: process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || '',
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  },
  azureSpeech: {
    key: process.env.AZURE_SPEECH_KEY || '',
    region: process.env.AZURE_SPEECH_REGION || '',
    voice: process.env.AZURE_SPEECH_VOICE || 'en-NG-EzinneNeural',
  },
};
