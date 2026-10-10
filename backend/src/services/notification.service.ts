import https from 'https';
import { userStore } from '../data/user.store';
import { telemedicineStore } from '../data/telemedicine.store';
import { calculateFertilityPrediction } from '../utils/cycleCalculators';

export interface AppReminder {
  id: string;
  type:
    | 'period_alert'
    | 'fertile_window'
    | 'ovulation'
    | 'appointment'
    | 'daily_log'
    | 'medication'
    | 'hydration'
    | 'pregnancy_milestone'
    | 'menopause_wellness';
  title: string;
  body: string;
  triggerTime: string;
  priority: 'high' | 'normal';
  data?: Record<string, any>;
  isRead?: boolean;
}

export class NotificationService {
  /**
   * Dispatches push notifications to Expo Push service
   */
  public async sendExpoPush(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<any> {
    const validTokens = tokens.filter(
      (t) => typeof t === 'string' && (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'))
    );

    if (validTokens.length === 0) {
      return { success: false, message: 'No valid Expo push tokens found.' };
    }

    const messages = validTokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: (data?.channelId as string) || 'default',
    }));

    const postData = JSON.stringify(messages);

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: 'exp.host',
          port: 443,
          path: '/--/api/v2/push/send',
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let responseData = '';
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(responseData);
              resolve({ success: true, tickets: parsed.data });
            } catch (e) {
              resolve({ success: false, raw: responseData });
            }
          });
        }
      );

      req.on('error', (err) => {
        console.warn('[NotificationService] Expo push dispatch error:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Computes dynamic, clinically accurate reminders for a given user
   */
  public async computeUserReminders(userId: string): Promise<AppReminder[]> {
    const user = await userStore.findById(userId);
    const reminders: AppReminder[] = [];

    const settings = user?.notification_settings || {};
    const discreet = settings.discreetTitles ?? false;
    const periodAlertsEnabled = settings.periodAlerts !== false;
    const fertileAlertsEnabled = settings.fertileWindowAlerts !== false;
    const appointmentAlertsEnabled = settings.appointmentAlerts !== false;
    const dailyLogEnabled = settings.dailyLogReminder !== false;
    const medicationEnabled = settings.medicationAlerts !== false;
    const hydrationEnabled = settings.hydrationAlerts === true;
    const stage = user?.health_profile?.stage || (user?.pregnancy_mode ? 'pregnancy' : 'cycle');

    const readIds = new Set(user?.read_notification_ids || []);

    // 1. Stage-specific reminders: Cycle Tracking
    if (stage === 'cycle' && user?.health_profile?.lastPeriodDate) {
      const cycleLength = user.health_profile.cycleLength || 28;
      const periodDuration = user.health_profile.periodDuration || 5;
      const lastPeriodDate = user.health_profile.lastPeriodDate;

      const prediction = calculateFertilityPrediction(lastPeriodDate, periodDuration, cycleLength);

      // Period prediction alert
      if (periodAlertsEnabled && prediction.daysUntilNextPeriod >= 0 && prediction.daysUntilNextPeriod <= 4) {
        const daysText =
          prediction.daysUntilNextPeriod === 0
            ? 'today'
            : prediction.daysUntilNextPeriod === 1
            ? 'tomorrow'
            : `in ${prediction.daysUntilNextPeriod} days`;

        reminders.push({
          id: `rem_period_${userId}_${prediction.daysUntilNextPeriod}`,
          type: 'period_alert',
          title: discreet ? 'Cycle Timing Alert' : `Period Expected ${daysText.charAt(0).toUpperCase() + daysText.slice(1)}`,
          body: discreet
            ? 'Open Red Apple to view your health calendar update.'
            : `Your next period is predicted to start ${daysText}. Ensure supplies are ready.`,
          triggerTime: new Date(Date.now() + Math.max(prediction.daysUntilNextPeriod, 0) * 24 * 3600 * 1000).toISOString(),
          priority: 'high',
          data: { screen: 'HomeScreen', prediction },
        });
      }

      // Fertile Window Alert
      if (fertileAlertsEnabled && prediction.isFertileWindow) {
        reminders.push({
          id: `rem_fertile_${userId}`,
          type: 'fertile_window',
          title: discreet ? 'Active Cycle Phase' : 'Fertile Window Active',
          body: discreet
            ? 'Your tracked phase is active today. Tap to check your insights.'
            : `You are in your fertile window today. Peak estimated ovulation: ${prediction.estimatedOvulationDate}.`,
          triggerTime: new Date().toISOString(),
          priority: 'normal',
          data: { screen: 'HomeScreen', phase: 'fertile' },
        });
      }
    }

    // 2. Stage-specific reminders: Pregnancy Mode
    if (stage === 'pregnancy' || user?.pregnancy_mode) {
      const pregnancyDetails = user?.health_profile?.pregnancyDetails || {};
      let currentWeek = pregnancyDetails.currentWeek || 18;
      if (pregnancyDetails.dueDate) {
        const due = new Date(pregnancyDetails.dueDate).getTime();
        const now = Date.now();
        const diffWeeks = Math.round((due - now) / (7 * 24 * 3600 * 1000));
        currentWeek = Math.max(1, Math.min(42, 40 - diffWeeks));
      }

      reminders.push({
        id: `rem_preg_week_${userId}_${currentWeek}`,
        type: 'pregnancy_milestone',
        title: `Pregnancy Update • Week ${currentWeek}`,
        body: `Your baby is growing steadily this week. Track kick counts and review prenatal care guidance.`,
        triggerTime: new Date().toISOString(),
        priority: 'high',
        data: { screen: 'PregnancyScreen', week: currentWeek },
      });
    }

    // 3. Stage-specific reminders: Perimenopause / Postmenopause Mode
    if (stage === 'postmenopause' || stage === 'perimenopause') {
      reminders.push({
        id: `rem_meno_${userId}_${new Date().toISOString().split('T')[0]}`,
        type: 'menopause_wellness',
        title: discreet ? 'Daily Wellness Check' : 'Menopause Wellness Insight',
        body: 'Log vasomotor symptoms, sleep quality, and remember calcium & vitamin D intake today.',
        triggerTime: new Date().toISOString(),
        priority: 'normal',
        data: { screen: 'PostmenopauseScreen' },
      });
    }

    // 4. Upcoming Telemedicine Consultation Reminders
    if (appointmentAlertsEnabled) {
      try {
        const bookings = await telemedicineStore.getUserBookings(userId);
        const upcoming = bookings.filter((b) => b.status === 'confirmed' || b.status === 'requested');

        for (const booking of upcoming) {
          reminders.push({
            id: `rem_book_${booking.booking_id}`,
            type: 'appointment',
            title: `Consultation with ${booking.doctor_name}`,
            body: `Scheduled for ${booking.scheduled_time}. Your encrypted HD video consultation room is ready.`,
            triggerTime: booking.scheduled_time,
            priority: 'high',
            data: {
              screen: 'DoctorCareScreen',
              bookingId: booking.booking_id,
              videoRoomUrl: booking.video_room_url,
            },
          });
        }
      } catch (err) {
        console.warn('[NotificationService] Error fetching appointment reminders:', err);
      }
    }

    // 5. Daily Medication / Prenatal Pill Reminder
    if (medicationEnabled) {
      reminders.push({
        id: `rem_med_${userId}_${new Date().toISOString().split('T')[0]}`,
        type: 'medication',
        title: discreet ? 'Daily Health Routine' : 'Daily Pill & Medication Reminder',
        body: discreet
          ? 'Time for your daily wellness step.'
          : 'Remember to take your prescribed vitamins or medication for optimal reproductive wellness.',
        triggerTime: new Date().toISOString(),
        priority: 'normal',
        data: { screen: 'HomeScreen' },
      });
    }

    // 6. Hydration Reminder
    if (hydrationEnabled) {
      reminders.push({
        id: `rem_hydra_${userId}`,
        type: 'hydration',
        title: 'Hydration Check-in 💧',
        body: 'Stay hydrated! Drinking water supports cellular energy and hormonal balance.',
        triggerTime: new Date().toISOString(),
        priority: 'normal',
        data: { screen: 'HomeScreen' },
      });
    }

    // 7. Daily Symptom & Wellness Check-in
    if (dailyLogEnabled && reminders.length === 0) {
      reminders.push({
        id: `rem_daily_${userId}`,
        type: 'daily_log',
        title: 'Daily Symptom & Wellness Check-in',
        body: 'Log your energy, mood, and symptoms today to refine your personalized cycle predictions.',
        triggerTime: new Date().toISOString(),
        priority: 'normal',
        data: { screen: 'HomeScreen' },
      });
    }

    // Populate isRead flags based on user's read notification records
    return reminders.map((r) => ({
      ...r,
      isRead: readIds.has(r.id),
    }));
  }

  /**
   * Marks a specific reminder ID as read
   */
  public async markReminderRead(userId: string, reminderId: string): Promise<void> {
    const user = await userStore.findById(userId);
    if (!user) return;
    const currentRead = new Set(user.read_notification_ids || []);
    currentRead.add(reminderId);
    await userStore.updateUser(userId, {
      read_notification_ids: Array.from(currentRead),
    });
  }

  /**
   * Marks all reminders as read for a given user
   */
  public async markAllRemindersRead(userId: string): Promise<void> {
    const user = await userStore.findById(userId);
    if (!user) return;
    const reminders = await this.computeUserReminders(userId);
    const allIds = new Set(user.read_notification_ids || []);
    reminders.forEach((r) => allIds.add(r.id));
    await userStore.updateUser(userId, {
      read_notification_ids: Array.from(allIds),
    });
  }
}

export const notificationService = new NotificationService();
