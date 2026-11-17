import { Expo } from 'expo-server-sdk';
import prisma from '../db/prisma';

export interface DeviceRegistration {
  token: string;
  platform: 'ios' | 'android' | 'unknown';
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;
}

export const deviceTokensService = {
  async registerDevice(userId: string, payload: DeviceRegistration) {
    if (!Expo.isExpoPushToken(payload.token)) throw new Error('token must be a valid Expo push token');
    if (!['ios', 'android', 'unknown'].includes(payload.platform)) throw new Error('platform must be ios or android');
    return prisma.deviceToken.upsert({
      where: { expo_push_token: payload.token },
      update: {
        user_id: userId,
        platform: payload.platform,
        device_name: payload.deviceName?.slice(0, 120),
        app_version: payload.appVersion?.slice(0, 40),
        os_version: payload.osVersion?.slice(0, 40),
        last_seen_at: new Date(),
        disabled_at: null,
        disabled_reason: null,
      },
      create: {
        user_id: userId,
        expo_push_token: payload.token,
        platform: payload.platform,
        device_name: payload.deviceName?.slice(0, 120),
        app_version: payload.appVersion?.slice(0, 40),
        os_version: payload.osVersion?.slice(0, 40),
      },
    });
  },
  async unregisterDevice(userId: string, token: string) {
    return prisma.deviceToken.updateMany({ where: { user_id: userId, expo_push_token: token, disabled_at: null }, data: { disabled_at: new Date(), disabled_reason: 'logout' } });
  },
  async disableToken(tokenId: string, reason: string) {
    return prisma.deviceToken.update({ where: { id: tokenId }, data: { disabled_at: new Date(), disabled_reason: reason.slice(0, 80) } });
  },
};
