import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getAuthSessionSafe } from '../utils/storage';

export const ACCESS_TOKEN_KEY = '@red_apple_access_token';
export const REFRESH_TOKEN_KEY = '@red_apple_refresh_token';
export const USER_DATA_KEY = '@red_apple_user_data';

let cachedWorkingBaseUrl = null;

/**
 * Automatically resolves the backend API URL.
 * Works across Web, iOS Simulator, Android Emulator, and physical devices via Expo Go.
 */
export function getBaseApiUrl() {
  if (cachedWorkingBaseUrl) {
    return cachedWorkingBaseUrl;
  }

  // 1. Detect developer machine host IP dynamically when running through Expo Go or Metro bundler
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '';
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5000/api`;
    }
  }

  // 2. Check explicit env variable
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') || Platform.OS === 'web')) {
    return envUrl.replace(/\/$/, '');
  }

  // 3. Official host bridge for Android emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  // 4. Fallback to active developer host IP on Wi-Fi
  return 'http://192.168.1.234:5000/api';
}

/**
 * Core HTTP Request Client.
 * Strict zero bypass: communicates directly with Red Apple backend.
 * Uses AbortController to prevent long network hangs when server is unreachable.
 * Includes automatic fast-fallback across host candidates on Android emulator.
 */
export async function apiRequest(endpoint, options = {}, timeoutMs = 6000) {
  const primaryBase = getBaseApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Build candidate bases to ensure instant reachability in emulator & LAN
  const candidateBases = [primaryBase];
  if (Platform.OS === 'android') {
    if (!candidateBases.includes('http://10.0.2.2:5000/api')) {
      candidateBases.push('http://10.0.2.2:5000/api');
    }
    if (!candidateBases.includes('http://127.0.0.1:5000/api')) {
      candidateBases.push('http://127.0.0.1:5000/api');
    }
    if (!candidateBases.includes('http://192.168.1.234:5000/api')) {
      candidateBases.push('http://192.168.1.234:5000/api');
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  // Inject Bearer token if not explicitly excluded
  if (!headers.Authorization && !options.skipAuth) {
    try {
      const session = await getAuthSessionSafe();
      if (session.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`;
      }
    } catch (e) {
      console.warn('[ApiClient] Failed to read token from storage:', e);
    }
  }

  let lastError = null;
  for (const base of candidateBases) {
    const url = `${base}${cleanEndpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        throw new Error(`Invalid server response from ${cleanEndpoint}: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        const errorMessage =
          data.error || data.message || `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      // Cache verified working base URL for subsequent requests
      cachedWorkingBaseUrl = base;
      return data;
    } catch (netErr) {
      clearTimeout(timeoutId);
      lastError = netErr;
      // If it was a valid HTTP server response error (e.g. 401, 403, 404, 409), server is reached
      if (netErr.status) {
        throw netErr;
      }
      // Otherwise, retry next candidate host
    }
  }

  throw new Error(
    `Cannot reach Red Apple backend at ${primaryBase}. Please ensure the backend server is running and accessible.`
  );
}
