import AsyncStorage from '@react-native-async-storage/async-storage';

export const PRIVACY_KEY = '@red_apple_privacy_accepted';
export const ONBOARDING_KEY = '@red_apple_onboarding_completed';
export const ACCESS_TOKEN_KEY = '@red_apple_access_token';
export const REFRESH_TOKEN_KEY = '@red_apple_refresh_token';
export const USER_DATA_KEY = '@red_apple_user_data';
export const POSTMENOPAUSE_DATA_KEY = '@red_apple_postmenopause_data';
export const HEALTH_PROFILE_KEY = '@red_apple_health_profile';
export const HEALTH_MODE_KEY = '@red_apple_health_mode';
export const CYCLE_LOGS_KEY = '@red_apple_cycle_logs';

// Fast in-memory cache to guarantee synchronous safety and zero crashes
let inMemorySession = {
  privacyAccepted: false,
  onboardingCompleted: false,
  accessToken: null,
  refreshToken: null,
  user: null,
  postmenopauseData: null,
  healthProfile: null,
  healthMode: null,
  cycleLogs: [],
};

/* ================= AUTH STORAGE ================= */

export async function getAuthSessionSafe() {
  try {
    const [accessToken, refreshToken, userJson, storedMode] = await Promise.all([
      AsyncStorage.getItem(ACCESS_TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      AsyncStorage.getItem(USER_DATA_KEY),
      AsyncStorage.getItem(HEALTH_MODE_KEY),
    ]);

    let user = null;
    if (userJson && typeof userJson === 'string') {
      try {
        user = JSON.parse(userJson);
      } catch (err) {
        user = null;
      }
    }
    if (accessToken) inMemorySession.accessToken = accessToken;
    if (refreshToken) inMemorySession.refreshToken = refreshToken;
    if (user) inMemorySession.user = user;
    if (storedMode) inMemorySession.healthMode = storedMode;

    return {
      accessToken: accessToken || inMemorySession.accessToken,
      refreshToken: refreshToken || inMemorySession.refreshToken,
      user: user || inMemorySession.user,
    };
  } catch (e) {
    return {
      accessToken: inMemorySession.accessToken,
      refreshToken: inMemorySession.refreshToken,
      user: inMemorySession.user,
    };
  }
}

export async function saveAuthSessionSafe(tokens, user) {
  if (tokens?.accessToken) inMemorySession.accessToken = tokens.accessToken;
  if (tokens?.refreshToken) inMemorySession.refreshToken = tokens.refreshToken;
  if (user) inMemorySession.user = user;

  try {
    const promises = [];
    if (tokens?.accessToken) {
      promises.push(AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken));
    }
    if (tokens?.refreshToken) {
      promises.push(AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken));
    }
    if (user) {
      promises.push(AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user)));
    }
    await Promise.all(promises);
  } catch (e) {}
}

export async function clearAuthSessionSafe() {
  inMemorySession.accessToken = null;
  inMemorySession.refreshToken = null;
  inMemorySession.user = null;

  try {
    await Promise.all([
      AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(USER_DATA_KEY),
    ]);
  } catch (e) {}
}

/* ================= APP & ONBOARDING STORAGE ================= */

export async function getPrivacyStatusSafe() {
  try {
    const val = await AsyncStorage.getItem(PRIVACY_KEY);
    if (val !== null) {
      inMemorySession.privacyAccepted = val === 'true';
      return val === 'true';
    }
  } catch (e) {}
  return inMemorySession.privacyAccepted === true;
}

export async function savePrivacyStatusSafe() {
  inMemorySession.privacyAccepted = true;
  try {
    await AsyncStorage.setItem(PRIVACY_KEY, 'true');
  } catch (e) {}
}

export async function getOnboardingStatusSafe() {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (val !== null) {
      inMemorySession.onboardingCompleted = val === 'true';
      return val === 'true';
    }
  } catch (e) {}
  return inMemorySession.onboardingCompleted === true;
}

export async function saveOnboardingStatusSafe() {
  inMemorySession.privacyAccepted = true;
  inMemorySession.onboardingCompleted = true;
  try {
    await Promise.all([
      AsyncStorage.setItem(PRIVACY_KEY, 'true'),
      AsyncStorage.setItem(ONBOARDING_KEY, 'true'),
    ]);
  } catch (e) {}
}

export async function clearAppSessionSafe() {
  await clearAuthSessionSafe();
  inMemorySession.privacyAccepted = false;
  inMemorySession.onboardingCompleted = false;
  inMemorySession.healthProfile = null;
  inMemorySession.healthMode = null;
  inMemorySession.postmenopauseData = null;
  inMemorySession.cycleLogs = [];
  try {
    await Promise.all([
      AsyncStorage.removeItem(PRIVACY_KEY),
      AsyncStorage.removeItem(ONBOARDING_KEY),
      AsyncStorage.removeItem(POSTMENOPAUSE_DATA_KEY),
      AsyncStorage.removeItem(HEALTH_PROFILE_KEY),
      AsyncStorage.removeItem(HEALTH_MODE_KEY),
      AsyncStorage.removeItem(CYCLE_LOGS_KEY),
    ]);
  } catch (e) {}
}

export async function getPostmenopauseDataSafe() {
  try {
    const val = await AsyncStorage.getItem(POSTMENOPAUSE_DATA_KEY);
    if (val) {
      try {
        return JSON.parse(val);
      } catch (err) {
        return null;
      }
    }
  } catch (e) {}
  return inMemorySession.postmenopauseData || null;
}

export async function savePostmenopauseDataSafe(data) {
  inMemorySession.postmenopauseData = data;
  try {
    await AsyncStorage.setItem(POSTMENOPAUSE_DATA_KEY, JSON.stringify(data));
  } catch (e) {}
}

export async function getHealthProfileSafe() {
  try {
    const val = await AsyncStorage.getItem(HEALTH_PROFILE_KEY);
    if (val) {
      try {
        return JSON.parse(val);
      } catch (err) {
        return null;
      }
    }
  } catch (e) {}
  return inMemorySession.healthProfile || null;
}

export async function saveHealthProfileSafe(profile) {
  inMemorySession.healthProfile = profile;
  try {
    await AsyncStorage.setItem(HEALTH_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {}
}

export async function getActiveHealthModeSafe() {
  try {
    const val = await AsyncStorage.getItem(HEALTH_MODE_KEY);
    if (val) {
      inMemorySession.healthMode = val;
      return val;
    }
  } catch (e) {}
  return inMemorySession.healthMode || 'cycle';
}

export async function saveActiveHealthModeSafe(mode) {
  inMemorySession.healthMode = mode;
  try {
    await AsyncStorage.setItem(HEALTH_MODE_KEY, mode);
  } catch (e) {}
}

export function getCachedActiveHealthMode() {
  return inMemorySession.healthMode || null;
}

/* ================= CYCLE LOGS STORAGE ================= */

export async function getCycleLogsSafe() {
  try {
    const val = await AsyncStorage.getItem(CYCLE_LOGS_KEY);
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        inMemorySession.cycleLogs = parsed;
        return parsed;
      }
    }
  } catch (e) {}
  return inMemorySession.cycleLogs || [];
}

export async function saveCycleLogsSafe(logs) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  inMemorySession.cycleLogs = safeLogs;
  try {
    await AsyncStorage.setItem(CYCLE_LOGS_KEY, JSON.stringify(safeLogs));
  } catch (e) {}
}

export async function addCycleLogSafe(log) {
  if (!log) return;
  const currentLogs = await getCycleLogsSafe();
  const dateKey = log.date || (log.logged_at ? log.logged_at.split('T')[0] : new Date().toISOString().split('T')[0]);
  
  // Replace if existing log for the same date exists, or prepend
  const filtered = currentLogs.filter((l) => {
    const itemDate = l.date || (l.logged_at ? l.logged_at.split('T')[0] : null);
    return itemDate !== dateKey;
  });
  
  const updatedLogs = [log, ...filtered];
  await saveCycleLogsSafe(updatedLogs);
  return updatedLogs;
}


