import {
  getAuthSessionSafe,
  saveAuthSessionSafe,
  clearAuthSessionSafe,
} from '../utils/storage';
import { apiRequest } from './apiClient';

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
 * Completely wipe stored credentials on sign-out or session expiry.
 */
export async function clearStoredSession() {
  await clearAuthSessionSafe();
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
  });

  if (result.user) {
    await saveAuthSessionSafe(null, result.user);
  }

  return result.user;
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
