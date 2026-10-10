import prisma from '../db/prisma';
import { calculateFertilityPrediction } from '../utils/cycleCalculators';

interface ExpoPushMessage {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class CronWorkerService {
  private timer: NodeJS.Timeout | null = null;
  private intervalMinutes: number = 60; // Run every hour

  public start(): void {
    console.log('⏰ Scheduled Notification Worker initialized (interval: 60m)');
    // Run an initial sweep 10 seconds after server startup
    setTimeout(() => {
      this.runNotificationSweep().catch((err) =>
        console.error('Initial notification sweep error:', err)
      );
    }, 10000);

    // Then schedule recurring hourly sweep
    this.timer = setInterval(() => {
      this.runNotificationSweep().catch((err) =>
        console.error('Hourly notification sweep error:', err)
      );
    }, this.intervalMinutes * 60 * 1000);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('⏰ Scheduled Notification Worker stopped');
    }
  }

  public async runNotificationSweep(): Promise<void> {
    console.log('🔄 [Worker] Running scheduled reminder & notification sweep...');
    const now = new Date();

    try {
      // 1. CYCLE REMINDERS (Period in 2 days, fertile window starting)
      const usersWithProfile = await prisma.user.findMany({
        where: {
          pregnancy_mode: false,
          health_profile: { not: null as any },
        },
      });

      for (const u of usersWithProfile) {
        const profile = u.health_profile as any;
        if (!profile?.lastPeriodDate) continue;

        const cycleLength = profile.cycleLength || 28;
        const periodDuration = profile.periodDuration || 5;
        const lastDate = new Date(profile.lastPeriodDate);

        const predictions = calculateFertilityPrediction(
          profile.lastPeriodDate,
          periodDuration,
          cycleLength,
          now
        );

        if (predictions?.daysUntilNextPeriod === 2) {
          await this.queueAndSendReminder({
            userId: u.user_id,
            type: 'CYCLE_PREDICTION',
            title: 'Period Predicted Soon',
            body: `Your period is estimated to begin in 2 days. Keep your period essentials handy.`,
          });
        } else if (predictions?.currentPhase === 'Ovulation' || predictions?.isFertileWindow) {
          await this.queueAndSendReminder({
            userId: u.user_id,
            type: 'FERTILE_WINDOW',
            title: 'Peak Fertility Today',
            body: 'You are currently in your peak fertile window with the highest likelihood of conception.',
          });
        }
      }

      // 2. ANTENATAL PREGNANCY REMINDERS (FR-4.3)
      const pregnantUsers = await prisma.user.findMany({
        where: { pregnancy_mode: true },
        include: { pregnancy_tracker: true },
      });

      for (const pu of pregnantUsers) {
        const tracker = pu.pregnancy_tracker;
        if (!tracker?.lmp_date) continue;

        const lmp = new Date(tracker.lmp_date);
        const gestWeeks = Math.max(
          1,
          Math.floor((now.getTime() - lmp.getTime()) / (1000 * 3600 * 24 * 7))
        );

        // Milestone alerts
        let antenatalMilestone = '';
        if (gestWeeks === 12) {
          antenatalMilestone = 'Week 12 Milestone: Schedule your first trimester Nuchal Translucency ultrasound.';
        } else if (gestWeeks === 20) {
          antenatalMilestone = 'Week 20 Milestone: Mid-pregnancy anomaly scan recommended this week.';
        } else if (gestWeeks === 28) {
          antenatalMilestone = 'Week 28 (Third Trimester): Glucose screening and RhoGAM injection window.';
        } else if (gestWeeks === 36) {
          antenatalMilestone = 'Week 36: Weekly antenatal clinic checkup recommended until delivery.';
        }

        if (antenatalMilestone) {
          await this.queueAndSendReminder({
            userId: pu.user_id,
            type: 'ANTENATAL_CARE',
            title: `Pregnancy Care • Week ${gestWeeks}`,
            body: antenatalMilestone,
          });
        }
      }

      // 3. APPOINTMENT REMINDERS (Upcoming Telemedicine Consultations)
      const pendingBookings = await prisma.booking.findMany({
        where: {
          status: 'confirmed',
        },
        include: {
          doctor: true,
        },
      });

      for (const b of pendingBookings) {
        // Parse scheduled time (e.g. today or upcoming)
        await this.queueAndSendReminder({
          userId: b.user_id,
          type: 'CONSULTATION_UPCOMING',
          title: `Upcoming Consultation`,
          body: `Reminder: Virtual consultation scheduled with ${b.doctor.name} (${b.scheduled_time}).`,
        });
      }

      console.log('✅ [Worker] Scheduled sweep completed.');
    } catch (err) {
      console.error('❌ [Worker] Error running reminder sweep:', err);
    }
  }

  private async queueAndSendReminder(opts: {
    userId: string;
    type: string;
    title: string;
    body: string;
  }): Promise<void> {
    try {
      // Check if reminder was already sent today to avoid duplicate spam
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existing = await prisma.reminder.findFirst({
        where: {
          user_id: opts.userId,
          type: opts.type,
          created_at: { gte: todayStart },
        },
      });

      if (existing) return;

      // Save to NeonDB
      await prisma.reminder.create({
        data: {
          user_id: opts.userId,
          type: opts.type,
          title: opts.title,
          body: opts.body,
          trigger_time: new Date(),
          sent: true,
        },
      });

      // Dispatch to Expo Push Token if registered
      const pushTokens = await prisma.pushToken.findMany({
        where: { user_id: opts.userId },
      });

      if (pushTokens.length > 0) {
        const messages: ExpoPushMessage[] = pushTokens.map((pt) => ({
          to: pt.token,
          sound: 'default',
          title: opts.title,
          body: opts.body,
          data: { type: opts.type },
        }));

        await this.sendExpoPushNotifications(messages);
      }
    } catch (err) {
      console.error('Error queuing reminder:', err);
    }
  }

  private async sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.warn('Expo push dispatch response not OK:', response.status);
      }
    } catch (err) {
      console.warn('Expo push network dispatch error:', err);
    }
  }
}

export const cronWorker = new CronWorkerService();
