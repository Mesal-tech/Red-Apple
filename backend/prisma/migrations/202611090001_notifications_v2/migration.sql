ALTER TABLE "users" ADD COLUMN "first_name" VARCHAR(80);
UPDATE "users" SET "first_name" = split_part(trim("name"), ' ', 1) WHERE "first_name" IS NULL AND trim("name") <> '';

ALTER TABLE "reminders"
  ADD COLUMN "timezone" VARCHAR(100),
  ADD COLUMN "recurrence_rule" VARCHAR(100),
  ADD COLUMN "last_enqueued_for" TIMESTAMP(3),
  ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "reminders" SET "timezone" = 'Africa/Lagos' WHERE "timezone" IS NULL;

CREATE TABLE "device_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expo_push_token" TEXT NOT NULL,
  "platform" VARCHAR(20) NOT NULL,
  "device_name" VARCHAR(120),
  "app_version" VARCHAR(40),
  "os_version" VARCHAR(40),
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disabled_at" TIMESTAMP(3),
  "disabled_reason" VARCHAR(80),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_preferences" (
  "user_id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "timezone" VARCHAR(100) NOT NULL DEFAULT 'Africa/Lagos',
  "quiet_hours_start" VARCHAR(5) NOT NULL DEFAULT '21:00',
  "quiet_hours_end" VARCHAR(5) NOT NULL DEFAULT '08:00',
  "tone" VARCHAR(20) NOT NULL DEFAULT 'gentle',
  "discreet_mode" BOOLEAN NOT NULL DEFAULT true,
  "categories" JSONB NOT NULL DEFAULT '{"reminders":true,"appointments":true,"engagement":true,"insights":true}',
  "max_per_day" INTEGER NOT NULL DEFAULT 3,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "tier" VARCHAR(40),
  "title" VARCHAR(120) NOT NULL,
  "body" VARCHAR(240) NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "scheduled_for" TIMESTAMP(3) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3),
  "locked_at" TIMESTAMP(3),
  "locked_by" VARCHAR(120),
  "sent_at" TIMESTAMP(3),
  "opened_at" TIMESTAMP(3),
  "dedupe_key" VARCHAR(255) NOT NULL,
  "source" VARCHAR(40) NOT NULL,
  "source_ref" VARCHAR(255),
  "suppressed_reason" VARCHAR(80),
  "last_error" VARCHAR(240),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_deliveries" (
  "id" TEXT NOT NULL,
  "notification_id" TEXT NOT NULL,
  "device_token_id" TEXT NOT NULL,
  "expo_ticket_id" VARCHAR(120),
  "ticket_status" VARCHAR(30) NOT NULL,
  "receipt_status" VARCHAR(30),
  "receipt_checked_at" TIMESTAMP(3),
  "error_code" VARCHAR(80),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "triage_events" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "level" VARCHAR(30) NOT NULL,
  "emergency_care" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "triage_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "checkin_activities" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "kind" VARCHAR(30) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checkin_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_tokens_expo_push_token_key" ON "device_tokens"("expo_push_token");
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");
CREATE INDEX "device_tokens_disabled_at_idx" ON "device_tokens"("disabled_at");
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
CREATE INDEX "notifications_status_scheduled_for_idx" ON "notifications"("status", "scheduled_for");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
CREATE INDEX "notifications_user_id_category_created_at_idx" ON "notifications"("user_id", "category", "created_at");
CREATE UNIQUE INDEX "notification_deliveries_notification_id_device_token_id_key" ON "notification_deliveries"("notification_id", "device_token_id");
CREATE INDEX "notification_deliveries_receipt_checked_at_created_at_idx" ON "notification_deliveries"("receipt_checked_at", "created_at");
CREATE INDEX "triage_events_user_id_created_at_idx" ON "triage_events"("user_id", "created_at");
CREATE INDEX "checkin_activities_user_id_created_at_idx" ON "checkin_activities"("user_id", "created_at");

INSERT INTO "device_tokens" ("id", "user_id", "expo_push_token", "platform", "last_seen_at", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "user_id", "token", COALESCE("platform", 'unknown'), "updated_at", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "push_tokens"
WHERE "token" ~ '^(Expo|Exponent)PushToken\\[[^]]+\\]$'
ON CONFLICT ("expo_push_token") DO NOTHING;

INSERT INTO "device_tokens" ("id", "user_id", "expo_push_token", "platform", "last_seen_at", "created_at", "updated_at")
SELECT gen_random_uuid()::text, u."user_id", tokens.value, 'unknown', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "users" u
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(u."health_profile" -> 'pushTokens') = 'array'
    THEN u."health_profile" -> 'pushTokens' ELSE '[]'::jsonb END
) AS tokens(value)
WHERE tokens.value ~ '^(Expo|Exponent)PushToken\\[[^]]+\\]$'
ON CONFLICT ("expo_push_token") DO NOTHING;

ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_device_token_id_fkey" FOREIGN KEY ("device_token_id") REFERENCES "device_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checkin_activities" ADD CONSTRAINT "checkin_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
