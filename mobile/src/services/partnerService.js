import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './apiClient';

export const PARTNER_SYNC_KEY = '@red_apple_partner_sync';

const DEFAULT_PREFERENCES = {
  shareFertileWindow: true,
  shareCyclePhase: true,
  shareSymptoms: true,
  shareDailyTips: true,
};

function getLocalFallbackSync() {
  return {
    inviteCode: 'RED-APPLE-SYNC',
    status: 'none',
    partnerName: null,
    partnerEmail: null,
    partnerAvatarUrl: null,
    cardDismissed: false,
    connectedAt: null,
    preferences: DEFAULT_PREFERENCES,
  };
}

/**
 * Fetch current user's partner sync state from backend with AsyncStorage caching.
 */
export async function getPartnerStatus() {
  try {
    const res = await apiRequest('/partner/status', { method: 'GET' }, 5000);
    if (res?.success && res.partnerSync) {
      await AsyncStorage.setItem(PARTNER_SYNC_KEY, JSON.stringify(res.partnerSync));
      return res.partnerSync;
    }
  } catch (err) {
    // network fallback to cached state
  }

  try {
    const cached = await AsyncStorage.getItem(PARTNER_SYNC_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  return getLocalFallbackSync();
}

/**
 * Generate an invite code or send a direct invitation to partner's email/phone.
 */
export async function sendPartnerInvite(data = {}) {
  try {
    const res = await apiRequest(
      '/partner/invite',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      7000
    );

    if (res?.success && res.partnerSync) {
      await AsyncStorage.setItem(PARTNER_SYNC_KEY, JSON.stringify(res.partnerSync));
      return res;
    }
    return res;
  } catch (err) {
    // If backend unreachable, generate local offline invite code
    const cached = (await getPartnerStatus()) || getLocalFallbackSync();
    const updated = {
      ...cached,
      status: data.partnerEmail || data.partnerPhone ? 'pending' : cached.status,
      partnerName: data.partnerName || cached.partnerName,
      partnerEmail: data.partnerEmail || cached.partnerEmail,
      inviteSentAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(PARTNER_SYNC_KEY, JSON.stringify(updated));
    return {
      success: true,
      inviteCode: updated.inviteCode,
      shareUrl: `https://redapple.app/partner/join?code=${updated.inviteCode}`,
      shareMessage: `Join me on Red Apple to sync our cycle rhythm and moments! Use my invite code: ${updated.inviteCode}`,
      partnerSync: updated,
    };
  }
}

/**
 * Accept a partner's invite code to link accounts.
 */
export async function acceptPartnerInvite(inviteCode) {
  const cleanCode = (inviteCode || '').trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('Please enter a valid invite code');
  }

  try {
    const res = await apiRequest(
      '/partner/accept',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: cleanCode }),
      },
      7000
    );

    if (res?.success && res.partnerSync) {
      await AsyncStorage.setItem(PARTNER_SYNC_KEY, JSON.stringify(res.partnerSync));
      return res;
    }
    if (res?.error) {
      throw new Error(res.error);
    }
    return res;
  } catch (err) {
    throw err;
  }
}

/**
 * Unlinks the connected partner.
 */
export async function unlinkPartner() {
  try {
    const res = await apiRequest('/partner/unlink', { method: 'DELETE' }, 6000);
    if (res?.partnerSync) {
      await AsyncStorage.setItem(PARTNER_SYNC_KEY, JSON.stringify(res.partnerSync));
      return res.partnerSync;
    }
  } catch (e) {}

  const cached = (await getPartnerStatus()) || getLocalFallbackSync();
  const reset = {
    ...cached,
    status: 'none',
    partnerName: null,
    partnerEmail: null,
    partnerAvatarUrl: null,
    connectedAt: null,
  };
  await AsyncStorage.setItem(PARTNER_SYNC_KEY, JSON.stringify(reset));
  return reset;
}

/**
 * Update sharing preferences.
 */
export async function updatePartnerPreferences(preferences) {
  try {
    const res = await apiRequest(
      '/partner/preferences',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      },
      5000
    );
    if (res?.preferences) {
      const cached = (await getPartnerStatus()) || getLocalFallbackSync();
      const updated = { ...cached, preferences: res.preferences };
      await AsyncStorage.setItem(PARTNER_SYNC_KEY, JSON.stringify(updated));
      return updated;
    }
  } catch (e) {}

  const cached = (await getPartnerStatus()) || getLocalFallbackSync();
  const updated = {
    ...cached,
    preferences: { ...(cached.preferences || DEFAULT_PREFERENCES), ...preferences },
  };
  await AsyncStorage.setItem(PARTNER_SYNC_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Dismiss or restore partner card from the home feed.
 */
export async function dismissPartnerCard(dismissed = true) {
  try {
    await apiRequest(
      '/partner/dismiss-card',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed }),
      },
      3000
    );
  } catch (e) {}

  try {
    const cached = (await getPartnerStatus()) || getLocalFallbackSync();
    const updated = { ...cached, cardDismissed: dismissed };
    await AsyncStorage.setItem(PARTNER_SYNC_KEY, JSON.stringify(updated));
    return updated;
  } catch {}
}

/**
 * Fetch linked partner's cycle status.
 */
export async function getSharedPartnerCycle() {
  try {
    const res = await apiRequest('/partner/partner-cycle', { method: 'GET' }, 5000);
    if (res?.success) {
      return res.partnerCycle;
    }
  } catch (e) {}
  return null;
}

export default {
  getPartnerStatus,
  sendPartnerInvite,
  acceptPartnerInvite,
  unlinkPartner,
  updatePartnerPreferences,
  dismissPartnerCard,
  getSharedPartnerCycle,
};
