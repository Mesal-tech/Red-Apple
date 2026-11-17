import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { File, UploadType } from 'expo-file-system';
import { getAuthSessionSafe } from '../utils/storage';
import { userFriendlyError } from '../utils/userFriendlyErrors';

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

  // Use the explicitly configured API first so a stale Metro host or tunnel cannot override it.
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') || Platform.OS === 'web')) {
    return envUrl.replace(/\/$/, '');
  }

  // 1. Detect developer machine host IP dynamically when running through Expo Go or Metro bundler
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '';
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5001/api`;
    }
  }

  // 2. Official host bridge for Android emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api';
  }

  // 4. Fallback to active developer host IP on Wi-Fi
  return 'http://192.168.18.20:5001/api';
}

/**
 * Core HTTP Request Client.
 * Strict zero bypass: communicates directly with Red Apple backend.
 * Uses AbortController to prevent long network hangs when server is unreachable.
 * Includes automatic fast-fallback across host candidates on Android emulator.
 */
export async function apiRequest(endpoint, options = {}, timeoutMs = 12000) {
  const primaryBase = getBaseApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Build candidate bases to ensure instant reachability in emulator & LAN
  const candidateBases = [primaryBase];
  if (Platform.OS === 'android') {
    if (!candidateBases.includes('http://10.0.2.2:5001/api')) {
      candidateBases.push('http://10.0.2.2:5001/api');
    }
    if (!candidateBases.includes('http://127.0.0.1:5001/api')) {
      candidateBases.push('http://127.0.0.1:5001/api');
    }
    if (!candidateBases.includes('http://192.168.1.234:5001/api')) {
      candidateBases.push('http://192.168.1.234:5001/api');
    }
  }

  const { isMultipart = false, ...fetchOptions } = options;
  const isFormData = isMultipart || (typeof FormData !== 'undefined' && options.body instanceof FormData);
  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
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
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        const error = new Error(userFriendlyError({ endpoint: cleanEndpoint, status: response.status, kind: 'service' }));
        error.status = response.status;
        error.endpoint = cleanEndpoint;
        error.userMessage = error.message;
        throw error;
      }

      if (!response.ok) {
        const errorMessage =
          (typeof data.error === 'string' ? data.error : data.error?.message) ||
          data.message ||
          `Request failed with status ${response.status}`;
        const error = new Error(userFriendlyError({ endpoint: cleanEndpoint, status: response.status, serverMessage: errorMessage, code: data.error?.code }));
        error.status = response.status;
        error.data = data;
        error.endpoint = cleanEndpoint;
        error.serverMessage = errorMessage;
        error.userMessage = error.message;
        throw error;
      }

      // Cache verified working base URL for subsequent requests
      cachedWorkingBaseUrl = base;
      return data;
    } catch (netErr) {
      clearTimeout(timeoutId);
      lastError = netErr;
      if (netErr.name === 'AbortError') {
        const error = new Error(userFriendlyError({ endpoint: cleanEndpoint, kind: 'timeout' }));
        error.endpoint = cleanEndpoint;
        error.kind = 'timeout';
        error.userMessage = error.message;
        throw error;
      }
      // If it was a valid HTTP server response error (e.g. 401, 403, 404, 409), server is reached
      if (netErr.status) {
        throw netErr;
      }
      // Otherwise, retry next candidate host
    }
  }

  console.warn('[ApiClient] Request could not be completed', {
    endpoint: cleanEndpoint,
    method: options.method || 'GET',
    reason: lastError?.name || 'network_error',
    detail: lastError?.message?.slice(0, 180) || 'No network error detail was provided.',
  });
  const error = new Error(userFriendlyError({ endpoint: cleanEndpoint, kind: 'network' }));
  error.endpoint = cleanEndpoint;
  error.kind = 'network';
  error.userMessage = error.message;
  error.cause = lastError;
  throw error;
}

/** Upload a device file using Expo's native multipart implementation. */
export async function uploadFileRequest(endpoint, asset, timeoutMs = 60000) {
  if (Platform.OS === 'web') {
    const form = new FormData();
    if (asset.file) form.append('avatar', asset.file, asset.fileName || 'avatar.jpg');
    else form.append('avatar', { uri: asset.uri, type: asset.mimeType, name: asset.fileName || 'avatar.jpg' });
    return apiRequest(endpoint, { method: 'POST', body: form, isMultipart: true }, timeoutMs);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const session = await getAuthSessionSafe();
  if (!session.accessToken) {
    const error = new Error(userFriendlyError({ endpoint: cleanEndpoint, status: 401 }));
    error.status = 401;
    error.endpoint = cleanEndpoint;
    error.userMessage = error.message;
    throw error;
  }

  const candidateBases = [getBaseApiUrl()];
  if (Platform.OS === 'android') {
    for (const fallback of [
      'http://10.0.2.2:5001/api',
      'http://127.0.0.1:5001/api',
      'http://192.168.1.234:5001/api',
    ]) {
      if (!candidateBases.includes(fallback)) candidateBases.push(fallback);
    }
  }

  const file = new File(asset.uri);
  let lastError = null;
  for (const base of candidateBases) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await file.upload(`${base}${cleanEndpoint}`, {
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        fieldName: 'avatar',
        mimeType: asset.mimeType,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        signal: controller.signal,
        sessionType: 'foreground',
      });
      clearTimeout(timeoutId);

      let data;
      try {
        data = response.body ? JSON.parse(response.body) : {};
      } catch {
        const error = new Error(userFriendlyError({ endpoint: cleanEndpoint, status: response.status, kind: 'service' }));
        error.status = response.status;
        error.endpoint = cleanEndpoint;
        error.userMessage = error.message;
        throw error;
      }

      if (response.status < 200 || response.status >= 300) {
        const serverMessage = typeof data.error === 'string' ? data.error : data.error?.message;
        const error = new Error(userFriendlyError({
          endpoint: cleanEndpoint,
          status: response.status,
          serverMessage,
          code: data.error?.code,
        }));
        error.status = response.status;
        error.endpoint = cleanEndpoint;
        error.serverMessage = serverMessage;
        error.userMessage = error.message;
        throw error;
      }

      cachedWorkingBaseUrl = base;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.status) throw error;
      if (error.name === 'AbortError' || controller.signal.aborted) {
        const timeoutError = new Error(userFriendlyError({ endpoint: cleanEndpoint, kind: 'timeout' }));
        timeoutError.endpoint = cleanEndpoint;
        timeoutError.kind = 'timeout';
        timeoutError.userMessage = timeoutError.message;
        throw timeoutError;
      }
      lastError = error;
    }
  }

  console.warn('[ApiClient] Native file upload could not be completed', {
    endpoint: cleanEndpoint,
    reason: lastError?.name || 'network_error',
    detail: lastError?.message?.slice(0, 180) || 'No upload error detail was provided.',
  });
  const error = new Error(userFriendlyError({ endpoint: cleanEndpoint, kind: 'network' }));
  error.endpoint = cleanEndpoint;
  error.kind = 'network';
  error.userMessage = error.message;
  error.cause = lastError;
  throw error;
}
