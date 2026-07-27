import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Constants from 'expo-constants';

export async function requestAndScheduleNotifications() {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: true, timeout: true });
    }, 2000);

    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        clearTimeout(timeout);
        return resolve({ success: granted === PermissionsAndroid.RESULTS.GRANTED });
      }

      const isExpoGo =
        Constants?.appOwnership === 'expo' ||
        Constants?.executionEnvironment === 'storeClient';

      if (isExpoGo) {
        Alert.alert(
          '"Red Apple" Would Like to Send You Notifications',
          'Notifications may include cycle alerts, fertile window predictions, and health reminders.',
          [
            {
              text: "Don't Allow",
              onPress: () => {
                clearTimeout(timeout);
                resolve({ success: false });
              },
              style: 'cancel',
            },
            {
              text: 'Allow',
              onPress: () => {
                clearTimeout(timeout);
                resolve({ success: true });
              },
            },
          ]
        );
        return;
      }

      const Notifications = require('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      clearTimeout(timeout);
      resolve({ success: status === 'granted' });
    } catch (e) {
      clearTimeout(timeout);
      resolve({ success: true, fallback: true });
    }
  });
}
