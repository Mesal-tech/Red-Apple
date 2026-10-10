import notificationService from '../services/notificationService';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {}

/**
 * Requests notification permissions, retrieves Expo push token,
 * and registers it with the Red Apple backend.
 */
export async function requestAndScheduleNotifications() {
  return await notificationService.requestPermissionsAndToken();
}

/**
 * Schedules a local device notification for cycle or appointment reminder
 */
export async function scheduleLocalNotification(title, body, triggerSeconds = 5, data = {}) {
  const seconds = Math.max(1, triggerSeconds);
  return await notificationService.scheduleLocalNotification({
    title,
    body,
    trigger: { seconds },
    data,
    channelId: data?.type === 'appointment' ? 'appointments' : 'cycle',
  });
}

/**
 * Schedules antenatal milestone notifications for pregnant users
 */
export async function scheduleAntenatalReminders(currentWeek = 18, dueDateStr = null) {
  if (!Notifications) return [];

  const milestones = [
    { week: 12, title: 'Antenatal Milestone • Week 12', body: 'Schedule your first trimester Nuchal Translucency ultrasound.' },
    { week: 20, title: 'Antenatal Milestone • Week 20', body: 'Mid-pregnancy anatomy scan recommended this week.' },
    { week: 28, title: 'Third Trimester Check • Week 28', body: 'Glucose tolerance screening and RhoGAM window.' },
    { week: 36, title: 'Weekly Care • Week 36', body: 'Weekly antenatal clinic consultations recommended until delivery.' },
  ];

  const scheduled = [];
  for (const m of milestones) {
    if (m.week >= currentWeek) {
      const weeksAway = m.week - currentWeek;
      const triggerSeconds = weeksAway === 0 ? 15 : Math.max(60, weeksAway * 7 * 24 * 3600);
      const id = await scheduleLocalNotification(m.title, m.body, triggerSeconds, { type: 'ANTENATAL', week: m.week });
      if (id) scheduled.push(id);
    }
  }

  return scheduled;
}

export { notificationService };
export default notificationService;
