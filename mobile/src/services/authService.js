import {
  getAuthSessionSafe,
  saveAuthSessionSafe,
  clearAuthSessionSafe,
  clearAppSessionSafe,
} from '../utils/storage';
import { apiRequest, uploadFileRequest } from './apiClient';

/**
 * Persist tokens and user record securely in storage.
 */
export async function storeSession(tokens, user) {
  await saveAuthSessionSafe(tokens, user);
}

/**
 * Retrieve active tokens and user record from storage.
 */
export async function getStoredSession() {
  return await getAuthSessionSafe();
}

/**
 * Completely wipe stored credentials and cached data on sign-out or session expiry.
 */
export async function clearStoredSession() {
  await clearAppSessionSafe();
}

/**
 * Authenticate with email & password.
 */
export async function loginWithEmail(email, password) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  if (result.tokens && result.user) {
    await storeSession(result.tokens, result.user);
  }

  return result;
}

/**
 * Register account with name, email, and password.
 */
export async function registerWithEmail(email, password, name = '', phone = '') {
  let userEmail = email;
  let userPassword = password;
  let userName = name;
  let userPhone = phone;

  // Handle legacy signature (name, email, password, phone) gracefully
  if (typeof email === 'string' && !email.includes('@') && typeof password === 'string' && password.includes('@')) {
    userName = email;
    userEmail = password;
    userPassword = name;
  }

  const result = await apiRequest('/auth/register', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      email: userEmail.trim().toLowerCase(),
      password: userPassword,
      name: userName ? userName.trim() : undefined,
      phone: userPhone ? userPhone.trim() : undefined,
    }),
  });

  if (result.tokens && result.user) {
    await storeSession(result.tokens, result.user);
  }

  return result;
}

/**
 * Authenticate with verified Google ID token.
 */
export async function loginWithGoogle(idToken) {
  const result = await apiRequest('/auth/google', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ idToken }),
  });

  if (result.tokens && result.user) {
    await storeSession(result.tokens, result.user);
  }

  return result;
}

/**
 * Authenticate with verified Apple Identity token.
 */
export async function loginWithApple(identityToken, fullName = null) {
  const result = await apiRequest('/auth/apple', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ identityToken, fullName }),
  });

  if (result.tokens && result.user) {
    await storeSession(result.tokens, result.user);
  }

  return result;
}

/**
 * Refresh expired access token with valid refresh token.
 */
export async function refreshAccessToken() {
  const { refreshToken } = await getStoredSession();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const result = await apiRequest('/auth/refresh', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ refreshToken }),
  });

  if (result.tokens) {
    await saveAuthSessionSafe(result.tokens);
  }

  return result.tokens;
}

/**
 * Fetch authenticated user profile.
 */
export async function fetchCurrentUser() {
  const result = await apiRequest('/auth/me');
  if (result.user) {
    await saveAuthSessionSafe(null, result.user);
  }
  return result.user;
}

/**
 * Update authenticated user profile.
 */
export async function updateUserProfile(profileData) {
  const result = await apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }, 45000);

  if (result.user) {
    await saveAuthSessionSafe(null, result.user);
  }

  return result.user;
}

/** Upload a user-selected avatar image to backend-managed object storage. */
export async function uploadUserAvatar(asset) {
  const supportedMimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  const originalName = asset.fileName || asset.uri || '';
  const extension = originalName.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  const declaredMimeType = (asset.mimeType || '').toLowerCase().replace('image/jpg', 'image/jpeg');
  const normalizedMimeType = ['image/jpeg', 'image/png', 'image/webp'].includes(declaredMimeType)
    ? declaredMimeType
    : (supportedMimeTypes[extension] || declaredMimeType || 'image/jpeg');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(normalizedMimeType)) {
    const error = new Error('Choose a JPG, PNG, or WebP photo.');
    error.code = 'UNSUPPORTED_IMAGE_TYPE';
    throw error;
  }
  if (asset.fileSize > 5 * 1024 * 1024) {
    const error = new Error('That photo is too large. Choose a photo smaller than 5 MB.');
    error.code = 'PHOTO_TOO_LARGE';
    throw error;
  }

  const fileName = asset.fileName || `avatar.${normalizedMimeType === 'image/jpeg' ? 'jpg' : normalizedMimeType.split('/')[1]}`;
  const result = await uploadFileRequest('/auth/avatar', { ...asset, fileName, mimeType: normalizedMimeType }, 60000);
  return result.avatarUrl;
}

/**
 * Request password reset OTP.
 */
export async function requestPasswordReset(email) {
  return await apiRequest('/auth/forgot-password', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

/**
 * Confirm password reset with OTP code.
 */
export async function confirmPasswordReset(email, otpCode, newPassword) {
  const result = await apiRequest('/auth/reset-password', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otpCode: otpCode.trim(),
      newPassword,
    }),
  });

  if (result.tokens && result.user) {
    await storeSession(result.tokens, result.user);
  }

  return result;
}

/**
 * Sign out and invalidate backend refresh token.
 */
export async function logoutUser() {
  try {
    const { refreshToken } = await getStoredSession();
    if (refreshToken) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
  } finally {
    await clearStoredSession();
  }
}

/** Permanently delete the authenticated account and clear its local credentials. */
export async function deleteAccountUser() {
  try {
    return await apiRequest('/auth/account', { method: 'DELETE' });
  } finally {
    await clearStoredSession();
  }
}
