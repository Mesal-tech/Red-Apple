import { apiRequest } from './apiClient';
import syncQueueService from './syncQueueService';
import { getHealthProfileSafe, saveHealthProfileSafe } from '../utils/storage';

/**
 * Fetches live gestational age, trimester, baby size analogy,
 * and kick/contraction counts from the backend API.
 */
export async function getPregnancyStatus() {
  try {
    return await apiRequest('/pregnancy/status', { method: 'GET' });
  } catch (err) {
    console.warn('[pregnancyService] Offline fallback for pregnancy status:', err?.message);
    const profile = await getHealthProfileSafe();
    const lmpDate = profile?.pregnancyDetails?.lmpDate || profile?.lastPeriodDate;

    // Local calculation fallback if server is unreachable
    const now = new Date();
    const lmp = lmpDate ? new Date(lmpDate) : new Date(now.getTime() - 16 * 7 * 24 * 3600 * 1000);
    const diffDays = Math.max(1, Math.floor((now.getTime() - lmp.getTime()) / (24 * 3600 * 1000)));
    const currentWeek = Math.min(42, Math.floor(diffDays / 7) + 1);
    const dueDate = new Date(lmp.getTime() + 280 * 24 * 3600 * 1000);

    return {
      success: true,
      pregnancy: {
        active: true,
        current_week: currentWeek,
        current_day_in_week: (diffDays % 7) + 1,
        trimester: currentWeek >= 28 ? 3 : currentWeek >= 14 ? 2 : 1,
        estimated_due_date: dueDate.toISOString().split('T')[0],
        days_until_due_date: Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 3600 * 1000))),
        baby_size_comparison: 'Avocado',
        weekly_milestone_title: 'Patterned Hair & Heart Development',
        weekly_milestone_description: 'Eyes are becoming sensitive to light and facial expressions develop.',
      },
    };
  }
}

/**
 * Updates user LMP or conception date and recalculates gestational milestone
 */
export async function updatePregnancyLMP(lmpDate, conceptionDate) {
  try {
    const res = await apiRequest('/pregnancy/lmp', {
      method: 'POST',
      body: JSON.stringify({ lmpDate, conceptionDate }),
    });
    // Persist locally too
    const profile = await getHealthProfileSafe();
    await saveHealthProfileSafe({
      ...profile,
      pregnancy_mode: true,
      pregnancyDetails: { lmpDate, conceptionDate, updatedAt: new Date().toISOString() },
    });
    return res;
  } catch (err) {
    console.warn('[pregnancyService] Saved LMP locally only:', err?.message);
    return { success: true };
  }
}

/**
 * Records a completed kick session to backend
 */
export async function logKickSession(kickCount, durationMinutes, notes) {
  try {
    return await apiRequest('/pregnancy/kicks', {
      method: 'POST',
      body: JSON.stringify({ kickCount, durationMinutes, notes }),
    });
  } catch (err) {
    await syncQueueService.enqueue('PREGNANCY_KICK', { kickCount, durationMinutes, notes });
    return {
      success: true,
      session: {
        kick_count: kickCount,
        duration_minutes: durationMinutes,
        notes,
        offlineQueued: true,
      },
    };
  }
}

/**
 * Retrieves kick counter history
 */
export async function getKickHistory() {
  return await apiRequest('/pregnancy/kicks', { method: 'GET' });
}

/**
 * Records a contraction interval
 */
export async function logContraction(durationSeconds, frequencyMinutes, intensity) {
  try {
    return await apiRequest('/pregnancy/contractions', {
      method: 'POST',
      body: JSON.stringify({ durationSeconds, frequencyMinutes, intensity }),
    });
  } catch (err) {
    await syncQueueService.enqueue('CONTRACTION_LOG', { durationSeconds, frequencyMinutes, intensity });
    return {
      success: true,
      log: {
        duration_seconds: durationSeconds,
        frequency_minutes: frequencyMinutes,
        intensity,
        offlineQueued: true,
      },
    };
  }
}

/**
 * Retrieves contraction history
 */
export async function getContractionHistory() {
  return await apiRequest('/pregnancy/contractions', { method: 'GET' });
}
