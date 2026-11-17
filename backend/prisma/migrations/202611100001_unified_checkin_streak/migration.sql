-- Preserve historical cycle-log activity in the unified streak ledger.
INSERT INTO "checkin_activities" ("id", "user_id", "kind", "created_at")
SELECT 'cycle-log:' || "log_id", "user_id", 'cycle_log', "created_at"
FROM "cycle_logs";
