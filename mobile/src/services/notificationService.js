import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { apiRequest } from './apiClient';

let Device = null;
try {
  Device = require('expo-device');
} catch (error) {
  // Keep the app usable with an older native binary; push registration needs a rebuilt binary.
  console.warn('[notificationService] expo-device native module is unavailable. Rebuild the app to enable push registration.');
}

let Notifications = null;
if (Platform.OS !== 'web') {
  try {
    const isExpoGo =
      Constants?.appOwnership === 'expo' ||
      Constants?.executionEnvironment === 'storeClient';
    // In Expo Go on Android SDK 53+, remote notifications module throws when imported.
    if (!(Platform.OS === 'android' && isExpoGo)) {
      Notifications = require('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: notification?.request?.content?.data?.category !== 'engagement',
          shouldSetBadge: notification?.request?.content?.data?.category !== 'engagement',
          priority: Notifications?.AndroidNotificationPriority?.MAX || 'max',
        }),
      });
    }
  } catch (e) {
    console.warn('[notificationService] expo-notifications module not loaded:', e?.message);
  }
}

export const NOTIFICATION_SETTINGS_KEY = '@redapple_notification_settings';
export const INAPP_NOTIFICATIONS_KEY = '@redapple_inapp_notifications';
export const PUSH_TOKEN_KEY = '@redapple_push_token';

// Listeners for in-app reactive badge updates
const notificationListeners = new Set();
const handledNotificationResponseIds = new Set();

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
  reminderSyncContext = null;

  /**
   * Initializes notification channels and listeners on app startup
   */
  async init() {
    if (this.privateInitialized || !Notifications) return;

    try {
      if (Platform.OS === 'android') {
        const visibility = Notifications.AndroidNotificationVisibility?.PUBLIC || 1;

        await Notifications.setNotificationChannelAsync('dr-red', {
          name: 'Dr. Red check-ins',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: null,
          vibrationPattern: [],
          showBadge: false,
          lockscreenVisibility: visibility,
        });
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FA4A14',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          lockscreenVisibility: visibility,
        });
        await Notifications.setNotificationChannelAsync('appointments', {
          name: 'Appointments',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#059669',
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

  notifyListeners(value) {
    notificationListeners.forEach((fn) => {
      try {
        fn(value);
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

      if (!Device) return { success: true, localOnly: true, reason: 'native_module_unavailable' };
      if (!Device.isDevice) return { success: true, localOnly: true, reason: 'physical_device_required' };

      const { status: finalStatus } = await Notifications.getPermissionsAsync();

      if (finalStatus !== 'granted') {
        return { success: false, reason: 'permission_denied' };
      }

      // Retrieve Expo Push Token
      try {
        const isExpoGo =
          Constants?.appOwnership === 'expo' ||
          Constants?.executionEnvironment === 'storeClient';
        if (isExpoGo && Platform.OS === 'android') {
          return { success: true, localOnly: true };
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ||
          Constants?.easConfig?.projectId;

        if (!projectId) throw new Error('EAS projectId is missing. Add extra.eas.projectId to the Expo app configuration.');

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );

        const pushToken = tokenData?.data;
        if (pushToken) {
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
          // Sync with backend API
          try {
            await this.retryRegistration(() => apiRequest('/notifications/devices', {
              method: 'POST',
              body: JSON.stringify({ token: pushToken, platform: Platform.OS, deviceName: Device.deviceName || undefined, appVersion: Constants.nativeAppVersion || undefined, osVersion: Device.osVersion || undefined }),
            }));
            await this.updatePreferences({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
          } catch (apiErr) {
            console.warn('[NotificationService] Server push token registration error:', apiErr?.status || apiErr?.name || 'registration_error');
          }
          return { success: true, token: pushToken };
        }
      } catch (tokenErr) {
        console.warn('[NotificationService] Push token acquisition warning:', tokenErr?.code || tokenErr?.name || 'token_error');
      }

      return { success: true, localOnly: true };
    } catch (e) {
      console.warn('[NotificationService] Permission request failed:', e?.message);
      return { success: false, error: e?.message };
    }
  }

  async ensurePermissions() {
    await this.init();
    if (!Notifications) return { status: 'unavailable' };
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted' || current.granted) return current;
    return Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true, allowProvisional: true } });
  }

  async retryRegistration(register) {
    let lastError;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try { return await register(); } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
      }
    }
    throw lastError;
  }

  async unregister() {
    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (token) await apiRequest('/notifications/devices', { method: 'DELETE', body: JSON.stringify({ token }) });
    } catch (error) {
      console.warn('[NotificationService] Device unregister failed:', error?.message);
    } finally {
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  }

  async registerForPush() { return this.requestPermissionsAndToken(); }

  initListeners(navigation) {
    if (!Notifications) return () => {};
    const handled = handledNotificationResponseIds;
    const pending = new Set();
    const allowedRoutes = new Set(['AIAssistant', 'Appointments']);
    const handleResponse = async (response) => {
      const content = response?.notification?.request?.content;
      const data = content?.data || {};
      const responseId = response?.notification?.request?.identifier || data.notification_id;
      if (!responseId || handled.has(responseId) || pending.has(responseId)) return;
      if (data.notification_id) {
        apiRequest(`/notifications/${encodeURIComponent(data.notification_id)}/opened`, { method: 'POST' }).catch(() => {});
      }
      if (!allowedRoutes.has(data.route)) { handled.add(responseId); return; }
      pending.add(responseId);
      const startedAt = Date.now();
      const navigateWhenReady = () => {
        if (!navigation?.isReady?.()) {
          if (Date.now() - startedAt < 10000) setTimeout(navigateWhenReady, 100);
          else pending.delete(responseId);
          return;
        }
        handled.add(responseId);
        pending.delete(responseId);
        if (data.route === 'AIAssistant') navigation.navigate('AIAssistant', { entrySeed: typeof data.seed === 'string' ? data.seed : 'gentle_checkin' });
        else navigation.navigate('MainTabs', { screen: 'Telemed' });
      };
      navigateWhenReady();
    };
    const responseSub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    Notifications.getLastNotificationResponseAsync?.().then(handleResponse).catch(() => {});
    return () => responseSub?.remove?.();
  }

  async getPreferences() {
    const result = await apiRequest('/notifications/preferences');
    return result.preferences;
  }

  async updatePreferences(patch) {
    return apiRequest('/notifications/preferences', { method: 'PUT', body: JSON.stringify(patch) });
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
      try {
        await this.updatePreferences({
          categories: {
            reminders: updated.periodAlerts !== false || updated.dailyPillAlerts !== false || updated.dailyLogReminder !== false,
            appointments: updated.appointmentAlerts !== false,
            engagement: updated.engagementAlerts !== false,
            insights: updated.weeklyGrowthAlerts !== false,
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } catch (syncErr) {
        console.warn('[NotificationService] Could not sync notification preferences:', syncErr?.message);
      }

      if (this.reminderSyncContext) {
        await this.syncAllReminders(this.reminderSyncContext);
      }

      return updated;
    } catch (err) {
      console.warn('[NotificationService] Update settings error:', err?.message);
      return partialSettings;
    }
  }

  async updateSetting(key, val) {
    return this.updateSettings({ [key]: val });
  }

  /**
   * Schedules a local notification with proper SDK 52/57 typed triggers
   */
  async scheduleLocalNotification({
    identifier,
    id,
    title,
    body,
    trigger,
    seconds,
    data = {},
    channelId = 'reminders',
    recordInApp = false,
  }) {
    const finalId = identifier || id || `notif_${Date.now()}`;
    const finalTrigger = trigger || (seconds !== undefined ? { seconds } : null);
    const currentSettings = await this.getSettings();
    const safeTitle = title || 'Red Apple Notification';
    const safeBody = body || '';
    const safeData = channelId === 'appointments'
      ? { route: 'Appointments', ...(typeof data?.bookingId === 'string' ? { booking_id: data.bookingId } : {}) }
      : { route: 'AIAssistant', seed: 'gentle_checkin' };

    // Scheduled reminders belong in the inbox only after they are delivered.
    if (recordInApp) {
      await this.addInAppNotification({
        id: finalId,
        title: safeTitle || 'Red Apple Notification',
        body: safeBody || '',
        time: 'Just now',
        type: 'general',
        icon: 'notifications',
        iconBg: '#FFEBEF',
        iconColor: '#FA4A14',
      });
    }

    if (!Notifications) return finalId;
    await this.init();

    try {
      if (finalId) {
        await this.cancelNotification(finalId).catch(() => {});
      }

      // Format trigger to be strictly compliant with Expo SDK 52/57 SchedulableNotificationTriggerInput
      let formattedTrigger = null;
      if (finalTrigger) {
        if (finalTrigger instanceof Date || typeof finalTrigger === 'number') {
          formattedTrigger = {
            type: Notifications.SchedulableTriggerInputTypes?.DATE || 'date',
            date: finalTrigger,
            channelId: channelId || 'default',
          };
        } else if (finalTrigger.seconds !== undefined) {
          formattedTrigger = {
            type: Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL || 'timeInterval',
            seconds: Math.max(1, Math.round(finalTrigger.seconds)),
            repeats: !!finalTrigger.repeats,
            channelId: channelId || 'default',
          };
        } else if (finalTrigger.hour !== undefined) {
          formattedTrigger = {
            type: Notifications.SchedulableTriggerInputTypes?.DAILY || 'daily',
            hour: finalTrigger.hour,
            minute: finalTrigger.minute ?? 0,
            channelId: channelId || 'default',
          };
        } else if (finalTrigger.type) {
          formattedTrigger = { ...finalTrigger, channelId: channelId || 'default' };
        } else {
          formattedTrigger = finalTrigger;
        }
      }

      const scheduledId = await Notifications.scheduleNotificationAsync({
        identifier: finalId,
        content: {
          title: safeTitle,
          body: safeBody,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority?.MAX || 'max',
          channelId: channelId || 'default',
          data: safeData,
        },
        trigger: formattedTrigger,
      });

      return scheduledId || finalId;
    } catch (err) {
      console.warn('[NotificationService] Schedule local notification error:', err?.message);
      return finalId;
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

    const title = 'Notification test';
    const body = 'Your notification settings are working.';

    // 1. Fire immediate local notification on device
    const id = await this.scheduleLocalNotification({
      identifier: `test_${Date.now()}`,
      title,
      body,
      trigger: { seconds: 1 },
      channelId: 'reminders',
      data: { type: 'test' },
      recordInApp: true,
    });

    // 2. Also ping backend test endpoint
    try {
      await apiRequest('/notifications/test', { method: 'POST' });
    } catch (e) {
      // Backend test ping is optional
    }

    return { success: true, id, title, body };
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
          time: notification.time || this.formatTimeAgo(notification.sentAt || notification.sent_at || notification.createdAt || notification.created_at || notification.triggerTime || new Date().toISOString()),
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

    // Prefer durable records that were actually dispatched; reminders are a legacy fallback.
    try {
      const history = await apiRequest('/notifications?limit=50', {}, 3000);
      if (history?.success && Array.isArray(history.notifications)) {
        const localReadMap = new Map(localList.map((item) => [item.id, item.isRead]));
        const delivered = history.notifications
          .filter((item) => item.status === 'sent' || item.sent_at)
          .map((item) => {
            const category = item.category || 'reminders';
            const type = category === 'appointments' ? 'appointment' : category === 'reminders' ? 'reminder' : category;
            return {
              id: item.id,
              title: item.title,
              body: item.body,
              time: this.formatTimeAgo(item.sent_at || item.created_at),
              type,
              isRead: Boolean(item.opened_at) || Boolean(localReadMap.get(item.id)),
              data: item.data || {},
              source: 'outbox',
              icon: category === 'appointments' ? 'videocam-outline' : 'notifications-outline',
              iconBg: category === 'appointments' ? '#E6F4EA' : '#F3F4F6',
              iconColor: category === 'appointments' ? '#059669' : '#4B5563',
            };
          });
        const merged = [...delivered];
        for (const item of localList) {
          if (item.source === 'legacy-reminder' || /^rem_(period|fertile|book|preg_week|meno|med|hydra|daily)_/.test(item.id || '')) continue;
          if (!merged.some((entry) => entry.id === item.id)) {
            merged.push({ ...item, time: item.time || this.formatTimeAgo(item.createdAt || item.created_at) });
          }
        }
        await AsyncStorage.setItem(INAPP_NOTIFICATIONS_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (error) {
      // Older backend versions may not expose durable notification history.
    }

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
            time: this.formatTimeAgo(r.sentAt || r.sent_at || r.createdAt || r.created_at || r.triggerTime),
            type: r.type,
            isRead: !!r.isRead,
            data: r.data || {},
            source: 'legacy-reminder',
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
            mergedMap.set(loc.id, {
              ...loc,
              time: loc.time || this.formatTimeAgo(loc.sentAt || loc.sent_at || loc.createdAt || loc.created_at || loc.triggerTime),
            });
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
      const stored = await AsyncStorage.getItem(INAPP_NOTIFICATIONS_KEY);
      const list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) throw new Error('Stored notifications are invalid');
      const updated = list.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item
      );
      await AsyncStorage.setItem(INAPP_NOTIFICATIONS_KEY, JSON.stringify(updated));

      // Keep the interaction local and immediate; persist remotely in the background.
      const item = list.find((entry) => entry.id === notificationId);
      if (item?.source === 'outbox') {
        apiRequest(`/notifications/${encodeURIComponent(notificationId)}/opened`, { method: 'POST' }).catch(() => {});
      } else {
        apiRequest('/notifications/read', {
          method: 'POST',
          body: JSON.stringify({ reminderId: notificationId }),
        }).catch(() => {});
      }
      this.notifyListeners(updated);
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
      const stored = await AsyncStorage.getItem(INAPP_NOTIFICATIONS_KEY);
      const list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) throw new Error('Stored notifications are invalid');
      const updated = list.map((item) => ({ ...item, isRead: true }));
      await AsyncStorage.setItem(INAPP_NOTIFICATIONS_KEY, JSON.stringify(updated));

      // Do not block the inbox while the server stores the read state.
      apiRequest('/notifications/read-all', { method: 'POST' }).catch(() => {});
      this.notifyListeners(updated);
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
   * Shows elapsed time from delivery, or time until a future reminder, in the device timezone.
   */
  formatTimeAgo(isoString) {
    if (!isoString) return '';
    try {
      const timestamp = new Date(isoString).getTime();
      if (Number.isNaN(timestamp)) return '';
      const deltaMinutes = Math.floor((Date.now() - timestamp) / 60000);
      const future = deltaMinutes < 0;
      const minutes = Math.abs(deltaMinutes);
      if (minutes < 1) return future ? 'in less than a minute' : 'Just now';
      if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return future ? `in ${days}d` : `${days}d ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return future ? `in ${months}mo` : `${months}mo ago`;
      const years = Math.floor(days / 365);
      return future ? `in ${years}y` : `${years}y ago`;
    } catch (e) {
      return '';
    }
  }

  /**
   * Comprehensive Synchronizer:
   * Re-schedules or cancels local device triggers according to active user preferences,
   * active life stage (cycle, pregnancy, menopause), and upcoming doctor bookings.
   */
  async syncAllReminders(options = {}) {
    await this.init();
    this.reminderSyncContext = {
      healthProfile: null,
      bookings: [],
      stage: 'cycle',
      ...(this.reminderSyncContext || {}),
      ...options,
    };
    const { healthProfile, bookings, stage } = this.reminderSyncContext;
    const settings = await this.getSettings();
    const activeScheduleIds = new Set(['daily_medication', 'daily_log']);

    // 1. Daily Medication / Pill Reminder
    if (settings.dailyPillAlerts !== false && settings.medicationAlerts !== false) {
      const hour = settings.pillReminderHour ?? 8;
      const minute = settings.pillReminderMinute ?? 0;
      await this.scheduleLocalNotification({
        identifier: 'daily_medication',
        title: 'Daily medication reminder',
        body: 'Take your prescribed vitamins or medication.',
        trigger: {
          hour,
          minute,
          repeats: true,
        },
        channelId: 'reminders',
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
        title: 'Daily symptom and wellness check-in',
        body: 'Take a moment to log your energy, mood, and symptoms today.',
        trigger: {
          hour,
          minute,
          repeats: true,
        },
        channelId: 'reminders',
        data: { type: 'daily_log', screen: 'HomeScreen' },
      });
    } else {
      await this.cancelNotification('daily_log');
    }

    // 3. Pregnancy Milestones (if active)
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
          activeScheduleIds.add(`preg_milestone_${m.week}`);
          const weeksAway = m.week - currentWeek;
          const secondsUntil = weeksAway === 0 ? 30 : Math.min(weeksAway * 7 * 24 * 3600, 2147483);
          await this.scheduleLocalNotification({
            identifier: `preg_milestone_${m.week}`,
            title: m.title,
            body: m.body,
            trigger: { seconds: secondsUntil },
            channelId: 'reminders',
            data: { type: 'pregnancy_milestone', week: m.week, screen: 'PregnancyScreen' },
          });
        }
      }
    }

    // Remove appointment and pregnancy reminders that are no longer enabled or upcoming.
    if (Notifications?.getAllScheduledNotificationsAsync) {
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const item of scheduled) {
          const id = item.identifier;
          if (
            typeof id === 'string' &&
            (id.startsWith('appointment_') || id.startsWith('preg_milestone_')) &&
            !activeScheduleIds.has(id)
          ) {
            await this.cancelNotification(id);
          }
        }
      } catch (err) {
        console.warn('[NotificationService] Could not remove stale reminders:', err?.message);
      }
    }

    this.notifyListeners();
  }
}

export const notificationService = new NotificationService();
export default notificationService;
