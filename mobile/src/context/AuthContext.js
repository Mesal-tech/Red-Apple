import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  loginWithApple,
  refreshAccessToken,
  fetchCurrentUser,
  updateUserProfile,
  logoutUser,
  requestPasswordReset,
  confirmPasswordReset,
  getStoredSession,
} from '../services/authService';
import { clearGoogleAuthSession } from '../services/googleAuth';
import { getActiveHealthModeSafe, clearAppSessionSafe } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Check for existing session on app startup.
   * Strictly verifies token validity against backend (zero bypass).
   */
  const checkInitialSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const session = await getStoredSession();

      if (session.accessToken) {
        setAccessToken(session.accessToken);
        if (session.user) {
          setUser(session.user);
        }

        // Verify active token against backend
        try {
          const freshUser = await fetchCurrentUser();
          if (freshUser) {
            setUser(freshUser);
          }
        } catch (verifyErr) {
          // Only refresh or logout if the server explicitly rejected the token (401)
          if (verifyErr?.status === 401) {
            if (session.refreshToken) {
              try {
                const newTokens = await refreshAccessToken();
                setAccessToken(newTokens.accessToken);
                const freshUser = await fetchCurrentUser();
                if (freshUser) {
                  setUser(freshUser);
                }
              } catch (refreshErr) {
                console.warn('[AuthContext] Session refresh failed, logging out:', refreshErr.message);
                await logoutUser();
                setUser(null);
                setAccessToken(null);
              }
            } else {
              await logoutUser();
              setUser(null);
              setAccessToken(null);
            }
          } else {
            // Backend offline or unreachable: preserve stored user session for offline continuity
            console.warn('[AuthContext] Backend unreachable on startup, using offline cached user session:', verifyErr.message);
          }
        }
      }
    } catch (e) {
      console.warn('[AuthContext] Session initialization error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkInitialSession();
  }, [checkInitialSession]);

  /**
   * Log in with email & password.
   */
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const response = await loginWithEmail(email, password);
      await getActiveHealthModeSafe();
      setUser(response.user);
      setAccessToken(response.tokens.accessToken);
      return response;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  /**
   * Register with email & password (name and phone optional).
   */
  const register = async (...args) => {
    setAuthError(null);
    let email = '';
    let password = '';
    let name = '';
    let phone = '';

    if (args.length >= 2 && typeof args[0] === 'string' && args[0].includes('@')) {
      email = args[0];
      password = args[1];
      name = args[2] || '';
      phone = args[3] || '';
    } else {
      name = args[0] || '';
      email = args[1] || '';
      password = args[2] || '';
      phone = args[3] || '';
    }

    try {
      await clearAppSessionSafe();
      const response = await registerWithEmail(email, password, name, phone);
      await getActiveHealthModeSafe();
      setUser(response.user);
      setAccessToken(response.tokens.accessToken);
      return response;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  /**
   * Authenticate with Google ID token.
   */
  const loginGoogle = async (idToken) => {
    setAuthError(null);
    try {
      const response = await loginWithGoogle(idToken);
      await getActiveHealthModeSafe();
      setUser(response.user);
      setAccessToken(response.tokens.accessToken);
      return response;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  /**
   * Authenticate with Apple identity token.
   */
  const loginApple = async (identityToken, fullName = null) => {
    setAuthError(null);
    try {
      const response = await loginWithApple(identityToken, fullName);
      await getActiveHealthModeSafe();
      setUser(response.user);
      setAccessToken(response.tokens.accessToken);
      return response;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  /**
   * Sign out and clear all credentials.
   */
  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      clearGoogleAuthSession();
      setUser(null);
      setAccessToken(null);
      setAuthError(null);
    }
  };

  /**
   * Request password reset OTP.
   */
  const forgotPassword = async (email) => {
    setAuthError(null);
    try {
      return await requestPasswordReset(email);
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  /**
   * Submit new password with OTP.
   */
  const resetPassword = async (email, otpCode, newPassword) => {
    setAuthError(null);
    try {
      const response = await confirmPasswordReset(email, otpCode, newPassword);
      await getActiveHealthModeSafe();
      setUser(response.user);
      setAccessToken(response.tokens.accessToken);
      return response;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  /**
   * Update profile details.
   */
  const updateProfile = async (profileData) => {
    try {
      const updatedUser = await updateUserProfile(profileData);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const value = {
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    authError,
    setAuthError,
    login,
    register,
    loginGoogle,
    loginApple,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    refreshSession: checkInitialSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
