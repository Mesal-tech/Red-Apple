import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { apiRequest } from './apiClient';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications?.AndroidNotificationPriority?.MAX || 'max',
    }),
  });
} catch (e) {
  console.warn('[notificationService] expo-notifications module not loaded:', e?.message);
}

export const NOTIFICATION_SETTINGS_KEY = '@redapple_notification_settings';
export const INAPP_NOTIFICATIONS_KEY = '@redapple_inapp_notifications';
export const PUSH_TOKEN_KEY = '@redapple_push_token';

// Listeners for in-app reactive badge updates
const notificationListeners = new Set();

export const defaultNotificationSettings = {
  periodAlerts: true,
  fertileWindowAlerts: true,
  appointmentAlerts: true,
  dailyPillAlerts: true,
  medicationAlerts: true,
  dailyLogReminder: true,
  weeklyGrowthAlerts: true,
  hydrationAlerts: false,
  discreetTitles: false,
  pillReminderHour: 8,
  pillReminderMinute: 0,
  dailyLogReminderHour: 20,
  dailyLogReminderMinute: 0,
};

class NotificationService {
  privateInitialized = false;

  /**
   * Initializes notification channels and listeners on app startup
   */
  async init() {
    if (this.privateInitialized || !Notifications) return;

    try {
      if (Platform.OS === 'android') {
        const visibility = Notifications.AndroidNotificationVisibility?.PUBLIC || 1;

        // 1. General Default Channel
        await Notifications.setNotificationChannelAsync('default', {
          name: 'General Health Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FA4A14',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          lockscreenVisibility: visibility,
        });

        // 2. Cycle & Fertility Channel
        await Notifications.setNotificationChannelAsync('cycle', {
          name: 'Cycle & Ovulation Tracking',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 200, 300],
          lightColor: '#FA4A14',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          lockscreenVisibility: visibility,
        });

        // 3. Telemedicine Appointments Channel (Max priority)
        await Notifications.setNotificationChannelAsync('appointments', {
          name: 'Telemedicine Consultations',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#059669',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          lockscreenVisibility: visibility,
        });

        // 4. Medication & Habits Channel
        await Notifications.setNotificationChannelAsync('medication', {
          name: 'Medication & Health Habits',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250],
          lightColor: '#2563EB',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          lockscreenVisibility: visibility,
        });
      }

      this.privateInitialized = true;
    } catch (err) {
      console.warn('[NotificationService] Failed to initialize Android channels:', err?.message);
    }
  }

  /**
   * Subscribe a component (e.g. HomeScreen header) to notification state changes
   */
  subscribe(listener) {
    notificationListeners.add(listener);
    return () => {
      notificationListeners.delete(listener);
    };
  }

  notifyListeners() {
    notificationListeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.warn('[NotificationService] Listener error:', e);
      }
    });
  }

  /**
   * Requests device permission for notifications and registers Expo Push token
   */
  async requestPermissionsAndToken() {
    await this.init();

    try {
      if (!Notifications) {
        return { success: true, fallback: true };
      }

      // Android 13+ runtime permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
        } catch (pErr) {}
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
          android: {},
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { success: false, reason: 'permission_denied' };
      }

      // Retrieve Expo Push Token
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ||
          Constants?.easConfig?.projectId ||
          '69965fdb-1050-4f5b-b3c3-24125f8865ad';

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );

        const pushToken = tokenData?.data;
        if (pushToken) {
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
          // Sync with backend API
          try {
            await apiRequest('/notifications/register-token', {
              method: 'POST',
              body: JSON.stringify({ token: pushToken }),
            });
          } catch (apiErr) {
            console.warn('[NotificationService] Server push token registration error:', apiErr?.message);
          }
          return { success: true, token: pushToken };
        }
      } catch (tokenErr) {
        console.warn('[NotificationService] Push token acquisition warning:', tokenErr?.message);
      }

      return { success: true, localOnly: true };
    } catch (e) {
      console.warn('[NotificationService] Permission request failed:', e?.message);
      return { success: false, error: e?.message };
    }
  }

  /**
   * Retrieves user notification settings from AsyncStorage, with backend fallback
   */
  async getSettings() {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        return { ...defaultNotificationSettings, ...JSON.parse(stored) };
      }
    } catch (e) {}
    return { ...defaultNotificationSettings };
  }

  /**
   * Updates notification settings, saves locally and syncs with backend API
   */
  async updateSettings(partialSettings) {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...partialSettings };
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));

      // Sync with backend
      try {
        await apiRequest('/notifications/settings', {
          method: 'POST',
          body: JSON.stringify(updated),
        });
      } catch (syncErr) {
        console.warn('[NotificationService] Could not sync preferences to backend:', syncErr?.message);
      }

      return updated;
    } catch (err) {
      console.warn('[NotificationService] Update settings error:', err?.message);
      return partialSettings;
    }
  }

  /**
   * Schedules a local notification with proper SDK 52/57 typed triggers
   */
  async scheduleLocalNotification({
    identifier,
    title,
    body,
    trigger,
    data = {},
    channelId = 'default',
  }) {
    if (!Notifications) return null;
    await this.init();

    try {
      if (identifier) {
        await this.cancelNotification(identifier).catch(() => {});
      }

      // Format trigger to be strictly compliant with Expo SDK 52/57 SchedulableNotificationTriggerInput
      let formattedTrigger = null;
      if (trigger) {
        if (trigger instanceof Date || typeof trigger === 'number') {
          formattedTrigger = {
            type: Notifications.SchedulableTriggerInputTypes?.DATE || 'date',
            date: trigger,
            channelId: channelId || 'default',
          };
        } else if (trigger.seconds !== undefined) {
          formattedTrigger = {
            type: Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL || 'timeInterval',
            seconds: Math.max(1, Math.round(trigger.seconds)),
            repeats: !!trigger.repeats,
            channelId: channelId || 'default',
          };
        } else if (trigger.hour !== undefined) {
          formattedTrigger = {
            type: Notifications.SchedulableTriggerInputTypes?.DAILY || 'daily',
            hour: trigger.hour,
            minute: trigger.minute ?? 0,
            channelId: channelId || 'default',
          };
        } else if (trigger.type) {
          formattedTrigger = { ...trigger, channelId: channelId || 'default' };
        } else {
          formattedTrigger = trigger;
        }
      }

      const id = await Notifications.scheduleNotificationAsync({
        identifier: identifier || undefined,
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority?.MAX || 'max',
          channelId: channelId || 'default',
          data,
        },
        trigger: formattedTrigger,
      });

      return id;
    } catch (err) {
      console.warn('[NotificationService] Schedule local notification error:', err?.message);
      return null;
    }
  }

  /**
   * Cancels a scheduled notification by identifier
   */
  async cancelNotification(identifier) {
    if (!Notifications || !identifier) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (e) {}
  }

  /**
   * Cancels all scheduled notifications
   */
  async cancelAllNotifications() {
    if (!Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {}
  }

  /**
   * Immediate test notification trigger for user verification
   */
  async triggerTestNotification() {
    await this.init();
    await this.requestPermissionsAndToken();

    // 1. Fire immediate local notification on device
    await this.scheduleLocalNotification({
      title: 'Red Apple Health Alert 🍎',
      body: 'Notifications are active! You will receive timely alerts for your cycle, medication & appointments.',
      trigger: { seconds: 1 },
      channelId: 'default',
      data: { type: 'test' },
    });

    // 2. Also ping backend test endpoint
    try {
      await apiRequest('/notifications/test', { method: 'POST' });
    } catch (e) {
      // Backend test ping is optional
    }

    // 3. Add to in-app notification center list
    await this.addInAppNotification({
      id: `test_${Date.now()}`,
      title: 'Red Apple Health Alert 🍎',
      body: 'Notifications are active! You will receive timely alerts for your cycle, medication & appointments.',
      time: 'Just now',
      type: 'test',
      icon: 'notifications',
      iconBg: '#FFEBEF',
      iconColor: '#FA4A14',
    });

    this.notifyListeners();
  }

  /**
   * Adds an in-app notification record to local storage
   */
  async addInAppNotification(notification) {
    try {
      const existing = await this.getInAppNotifications();
      // Avoid duplicate IDs
      const filtered = existing.filter((item) => item.id !== notification.id);
      const updated = [
        {
          ...notification,
          isRead: false,
          createdAt: notification.createdAt || new Date().toISOString(),
        },
        ...filtered,
      ].slice(0, 50); // Keep last 50 notifications
      await AsyncStorage.setItem(INAPP_NOTIFICATIONS_KEY, JSON.stringify(updated));
      this.notifyListeners();
      return updated;
    } catch (e) {
      return [];
    }
  }

  /**
   * Fetches unified in-app notifications (merging backend reminders & local records)
   */
  async getInAppNotifications() {
    let localList = [];
    try {
      const stored = await AsyncStorage.getItem(INAPP_NOTIFICATIONS_KEY);
      if (stored) {
        localList = JSON.parse(stored);
      }
    } catch (e) {}

    // Attempt to pull latest server-computed reminders
    try {
      const res = await apiRequest('/notifications/reminders', {}, 3000);
      if (res?.success && Array.isArray(res.reminders)) {
        const serverReminders = res.reminders.map((r) => {
          let icon = 'notifications-outline';
          let iconBg = '#F3F4F6';
          let iconColor = '#4B5563';

          if (r.type === 'period_alert' || r.type === 'fertile_window') {
            icon = 'water-outline';
            iconBg = '#FFE5E9';
            iconColor = '#FA4A14';
          } else if (r.type === 'appointment') {
            icon = 'videocam-outline';
            iconBg = '#E6F4EA';
            iconColor = '#059669';
          } else if (r.type === 'medication') {
            icon = 'medical-outline';
            iconBg = '#E0F2F1';
            iconColor = '#008080';
          } else if (r.type === 'hydration') {
            icon = 'water';
            iconBg = '#EFF6FF';
            iconColor = '#2563EB';
          } else if (r.type === 'pregnancy_milestone') {
            icon = 'nutrition-outline';
            iconBg = '#F3E5F5';
            iconColor = '#7C3AED';
          } else if (r.type === 'menopause_wellness') {
            icon = 'flower-outline';
            iconBg = '#FFF8E1';
            iconColor = '#D97706';
          }

          return {
            id: r.id,
            title: r.title,
            body: r.body,
            time: this.formatRelativeTime(r.triggerTime),
            type: r.type,
            isRead: !!r.isRead,
            data: r.data || {},
            icon,
            iconBg,
            iconColor,
          };
        });

        // Merge, preferring read status from local if already marked locally
        const localReadMap = new Map(localList.map((l) => [l.id, l.isRead]));
        const mergedMap = new Map();

        // 1. Put server reminders
        for (const sr of serverReminders) {
          if (localReadMap.has(sr.id)) {
            sr.isRead = localReadMap.get(sr.id);
          }
          mergedMap.set(sr.id, sr);
        }

        // 2. Put local-only items (e.g. test or appointment reminders created on device)
        for (const loc of localList) {
          if (!mergedMap.has(loc.id)) {
            mergedMap.set(loc.id, loc);
          }
        }

        const merged = Array.from(mergedMap.values());
        await AsyncStorage.setItem(INAPP_NOTIFICATIONS_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (netErr) {
      // Network failure, return local cached notifications
    }

    return localList;
  }

  /**
   * Marks a specific notification as read
   */
  async markAsRead(notificationId) {
    try {
      const list = await this.getInAppNotifications();
      const updated = list.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item
      );
      await AsyncStorage.setItem(INAPP_NOTIFICATIONS_KEY, JSON.stringify(updated));

      // Sync with backend API
      try {
        await apiRequest('/notifications/read', {
          method: 'POST',
          body: JSON.stringify({ reminderId: notificationId }),
        });
      } catch (e) {}

      this.notifyListeners();
      return updated;
    } catch (e) {
      return [];
    }
  }

  /**
   * Marks all notifications as read
   */
  async markAllAsRead() {
    try {
      const list = await this.getInAppNotifications();
      const updated = list.map((item) => ({ ...item, isRead: true }));
      await AsyncStorage.setItem(INAPP_NOTIFICATIONS_KEY, JSON.stringify(updated));

      // Sync with backend API
      try {
        await apiRequest('/notifications/read-all', { method: 'POST' });
      } catch (e) {}

      this.notifyListeners();
      return updated;
    } catch (e) {
      return [];
    }
  }

  /**
   * Returns current unread notifications count
   */
  async getUnreadCount() {
    const list = await this.getInAppNotifications();
    return list.filter((n) => !n.isRead).length;
  }

  /**
   * Formats ISO timestamp to human friendly relative string
   */
  formatRelativeTime(isoString) {
    if (!isoString) return 'Today';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Recent';
    }
  }

  /**
   * Comprehensive Synchronizer:
   * Re-schedules or cancels local device triggers according to active user preferences,
   * active life stage (cycle, pregnancy, menopause), and upcoming doctor bookings.
   */
  async syncAllReminders({ healthProfile, bookings = [], stage = 'cycle' }) {
    await this.init();
    const settings = await this.getSettings();

    // 1. Daily Medication / Pill Reminder
    if (settings.dailyPillAlerts || settings.medicationAlerts) {
      const hour = settings.pillReminderHour ?? 8;
      const minute = settings.pillReminderMinute ?? 0;
      await this.scheduleLocalNotification({
        identifier: 'daily_medication',
        title: settings.discreetTitles ? 'Daily Health Routine' : 'Daily Pill & Medication Reminder',
        body: settings.discreetTitles
          ? 'Time for your daily wellness step.'
          : 'Remember to take your daily vitamin or contraceptive pill.',
        trigger: {
          hour,
          minute,
          repeats: true,
        },
        channelId: 'medication',
        data: { type: 'medication', screen: 'HomeScreen' },
      });
    } else {
      await this.cancelNotification('daily_medication');
    }

    // 2. Daily Symptom & Wellness Check-in Reminder
    if (settings.dailyLogReminder) {
      const hour = settings.dailyLogReminderHour ?? 20;
      const minute = settings.dailyLogReminderMinute ?? 0;
      await this.scheduleLocalNotification({
        identifier: 'daily_log',
        title: settings.discreetTitles ? 'Evening Wellness Check-in' : 'Daily Symptom & Cycle Log',
        body: 'Log your energy, mood, and symptoms today to keep predictions accurate.',
        trigger: {
          hour,
          minute,
          repeats: true,
        },
        channelId: 'default',
        data: { type: 'daily_log', screen: 'HomeScreen' },
      });
    } else {
      await this.cancelNotification('daily_log');
    }

    // 3. Telemedicine Appointment Reminders
    if (settings.appointmentAlerts && Array.isArray(bookings)) {
      const now = Date.now();
      for (const booking of bookings) {
        if (booking.status === 'confirmed' || booking.status === 'requested') {
          const appointmentTime = new Date(booking.scheduled_time).getTime();
          // Schedule 30 minutes before appointment
          const triggerTime = appointmentTime - 30 * 60 * 1000;
          if (triggerTime > now) {
            const secondsUntil = Math.max(1, Math.floor((triggerTime - now) / 1000));
            await this.scheduleLocalNotification({
              identifier: `appointment_${booking.booking_id}`,
              title: `Upcoming Consultation with ${booking.doctor_name}`,
              body: `Your video appointment starts in 30 minutes. Tap to prepare and enter the room.`,
              trigger: { seconds: secondsUntil },
              channelId: 'appointments',
              data: {
                screen: 'DoctorCareScreen',
                bookingId: booking.booking_id,
                videoRoomUrl: booking.video_room_url,
              },
            });
          }
        }
      }
    }

    // 4. Pregnancy Milestones (if active)
    if (stage === 'pregnancy' && settings.weeklyGrowthAlerts) {
      const currentWeek = healthProfile?.pregnancyDetails?.currentWeek || 18;
      const milestones = [
        { week: 12, title: 'Antenatal Milestone • Week 12', body: 'Schedule your first trimester Nuchal Translucency ultrasound.' },
        { week: 20, title: 'Antenatal Milestone • Week 20', body: 'Mid-pregnancy anatomy scan recommended this week.' },
        { week: 28, title: 'Third Trimester Check • Week 28', body: 'Glucose tolerance screening and RhoGAM window.' },
        { week: 36, title: 'Weekly Care • Week 36', body: 'Weekly antenatal clinic consultations recommended until delivery.' },
      ];

      for (const m of milestones) {
        if (m.week >= currentWeek) {
          const weeksAway = m.week - currentWeek;
          const secondsUntil = weeksAway === 0 ? 30 : Math.min(weeksAway * 7 * 24 * 3600, 2147483);
          await this.scheduleLocalNotification({
            identifier: `preg_milestone_${m.week}`,
            title: m.title,
            body: m.body,
            trigger: { seconds: secondsUntil },
            channelId: 'default',
            data: { type: 'pregnancy_milestone', week: m.week, screen: 'PregnancyScreen' },
          });
        }
      }
    }

    this.notifyListeners();
  }
}

export const notificationService = new NotificationService();
export default notificationService;
