import * as FileSystem from 'expo-file-system/legacy';

const SESSION_FILE = FileSystem.documentDirectory + 'red_apple_session_v1.json';

export const PRIVACY_KEY = '@red_apple_privacy_accepted';
export const ONBOARDING_KEY = '@red_apple_onboarding_completed';

let inMemorySession = {
  privacyAccepted: false,
  onboardingCompleted: false,
};

async function readSessionFile() {
  try {
    const fileInfo = await FileSystem.getInfoAsync(SESSION_FILE);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(SESSION_FILE);
      const parsed = JSON.parse(content);
      inMemorySession = { ...inMemorySession, ...parsed };
      return inMemorySession;
    }
  } catch (e) {}

  return inMemorySession;
}

async function writeSessionFile(data) {
  inMemorySession = { ...inMemorySession, ...data };
  try {
    await FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(inMemorySession));
  } catch (e) {}
}

export async function getPrivacyStatusSafe() {
  const session = await readSessionFile();
  return session.privacyAccepted === true;
}

export async function savePrivacyStatusSafe() {
  await writeSessionFile({ privacyAccepted: true });
}

export async function getOnboardingStatusSafe() {
  const session = await readSessionFile();
  return session.onboardingCompleted === true;
}

export async function saveOnboardingStatusSafe() {
  await writeSessionFile({ privacyAccepted: true, onboardingCompleted: true });
}

export async function clearAppSessionSafe() {
  inMemorySession = { privacyAccepted: false, onboardingCompleted: false };
  try {
    await FileSystem.deleteAsync(SESSION_FILE, { idempotent: true });
  } catch (e) {}
}

export async function getPostmenopauseDataSafe() {
  const session = await readSessionFile();
  return session.postmenopauseData || null;
}

export async function savePostmenopauseDataSafe(data) {
  await writeSessionFile({ postmenopauseData: data });
}

