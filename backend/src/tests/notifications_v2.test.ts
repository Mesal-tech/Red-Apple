import assert from 'assert';
import { DateTime } from 'luxon';
import { calculateStreakDays, EngagementState, isInsideQuietHours, resolveEngagementTier } from '../notifications/engagement';
import { chooseCopyVariant, getCopyVariants } from '../notifications/notificationCopy';
import { bookConsultationTool } from '../services/aiAgent.service';
import { engagementDedupeKey, calculateRetryDelay, shiftOutOfQuietHours } from '../notifications/notificationMath';
import { assertTimezone } from '../notifications/preferences.service';

const base: EngagementState = {
  localHour: 20,
  streakDays: 0,
  loggedToday: false,
  hoursSinceLastLog: null,
  ignoredPushes: 0,
  daysSinceLastPush: null,
  tone: 'cheeky',
  discreetMode: true,
  lifeStage: 'general',
  recentEscalatedTriage: false,
  pregnancyMode: false,
  daysSinceBreakup: null,
  ignoredWinbacks: 0,
  maxIgnoredWinbacks: 2,
  insideQuietHours: false,
};

assert.strictEqual(resolveEngagementTier({ ...base, localHour: 9, streakDays: 5 }, new Date()), 'streak_at_risk');
assert.strictEqual(resolveEngagementTier({ ...base, hoursSinceLastLog: 24 }, new Date()), 'missed_1');
assert.strictEqual(resolveEngagementTier({ ...base, hoursSinceLastLog: 48 }, new Date()), 'missed_2');
assert.strictEqual(resolveEngagementTier({ ...base, hoursSinceLastLog: 48, ignoredPushes: 4 }, new Date()), 'breakup');
assert.strictEqual(resolveEngagementTier({ ...base, tone: 'gentle', localHour: 9, hoursSinceLastLog: 48 }, new Date()), 'morning');
assert.strictEqual(resolveEngagementTier({ ...base, lifeStage: 'pregnancy', localHour: 9, hoursSinceLastLog: 72, ignoredPushes: 10 }, new Date()), 'morning');
assert.strictEqual(resolveEngagementTier({ ...base, recentEscalatedTriage: true, localHour: 20, hoursSinceLastLog: 72, ignoredPushes: 10 }, new Date()), null);
assert.strictEqual(resolveEngagementTier({ ...base, insideQuietHours: true, localHour: 9 }, new Date()), null);
assert.strictEqual(resolveEngagementTier({ ...base, loggedToday: true, localHour: 9 }, new Date()), 'morning');
assert.strictEqual(resolveEngagementTier({ ...base, loggedToday: true, localHour: 18 }, new Date()), null);
assert.strictEqual(resolveEngagementTier({ ...base, daysSinceLastPush: 0.5, hoursSinceLastLog: 48 }, new Date()), null);
assert.strictEqual(resolveEngagementTier({ ...base, daysSinceBreakup: 10, daysSinceLastPush: 1 }, new Date()), null);
assert.strictEqual(resolveEngagementTier({ ...base, daysSinceBreakup: 10, daysSinceLastPush: 8 }, new Date()), 'winback');
assert.strictEqual(resolveEngagementTier({ ...base, daysSinceBreakup: 10, daysSinceLastPush: 8, ignoredWinbacks: 2 }, new Date()), null);
assert.strictEqual(resolveEngagementTier({ ...base, tone: 'gentle', localHour: 20, daysSinceLastPush: 8 }, new Date()), 'winback');

const zone = 'America/New_York';
const now = DateTime.fromISO('2026-03-10T12:00:00', { zone }).toJSDate();
const logTimes = [
  DateTime.fromISO('2026-03-08T23:30:00', { zone }).toJSDate(),
  DateTime.fromISO('2026-03-09T23:30:00', { zone }).toJSDate(),
];
assert.strictEqual(calculateStreakDays(logTimes, now, zone), 2);
assert.strictEqual(isInsideQuietHours(DateTime.fromISO('2026-03-08T02:30:00', { zone }).toJSDate(), zone, '21:00', '08:00'), true);
const quietStart = DateTime.fromISO('2026-03-08T23:00:00', { zone }).toJSDate();
const shifted = DateTime.fromJSDate(shiftOutOfQuietHours(quietStart, zone, '21:00', '08:00'), { zone });
assert.strictEqual(shifted.toISO(), '2026-03-09T08:00:00.000-04:00');
assert.strictEqual(calculateRetryDelay(0, 0.5), 1500);
assert.strictEqual(calculateRetryDelay(20, 0), 3600000);
assert.strictEqual(engagementDedupeKey('user-x', '2026-11-09'), 'engagement:user-x:2026-11-09');
assertTimezone('Africa/Lagos');
assert.throws(() => assertTimezone('Not/A-Timezone'), /IANA timezone/);

const blocked = /symptom|period|bleed|pregnan|cramp|fertile|ovulat|contracept|miscarr/i;
for (const tone of ['gentle', 'cheeky'] as const) {
  for (const tier of ['morning', 'streak_at_risk', 'missed_1', 'missed_2', 'breakup', 'winback'] as const) {
    for (const discreet of [true, false]) {
      const variants = getCopyVariants(tier, tone, discreet);
      assert.strictEqual(variants.length, 4, `${tier}/${tone}/${discreet} must have four variants`);
      for (const variant of variants) {
        assert(variant.body.length < 120, `${variant.id} body is too long`);
        assert(!blocked.test(`${variant.title} ${variant.body}`), `${variant.id} contains a blocked term`);
        assert(!/\{[^}]+\}/.test(`${variant.title} ${variant.body}`), `${variant.id} has an unresolved placeholder`);
      }
    }
  }
}
const variants = getCopyVariants('morning', 'gentle', true);
const selected = chooseCopyVariant(variants, variants.slice(0, 3).map((variant) => variant.id));
assert.strictEqual(selected.id, variants[3].id, 'variant selection avoids the last three copies');

async function verifyBookingConfirmationSafety() {
  const anonymousRaw: any = await bookConsultationTool.invoke(
    { doctorId: 'not-used', scheduledTime: '2030-01-01T12:00:00Z', confirmed: true },
    { configurable: { userId: 'anonymous_user' } } as any,
  );
  const anonymous = JSON.parse(typeof anonymousRaw === 'string' ? anonymousRaw : anonymousRaw.content);
  assert.strictEqual(anonymous.error, 'User not authenticated');
  const missingRaw: any = await bookConsultationTool.invoke(
    { doctorId: 'not-used', scheduledTime: '2030-01-01T12:00:00Z', confirmed: true },
    { configurable: {} } as any,
  );
  const missing = JSON.parse(typeof missingRaw === 'string' ? missingRaw : missingRaw.content);
  assert.strictEqual(missing.error, 'User not authenticated');
  assert.strictEqual(bookConsultationTool.schema.safeParse({ doctorId: 'doctor', scheduledTime: '2030-01-01T12:00:00Z' }).success, false, 'confirmed must be explicit');
}

verifyBookingConfirmationSafety().then(() => console.log('Notification v2 and booking safety unit tests passed.')).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
