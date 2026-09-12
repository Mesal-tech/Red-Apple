import { Linking, Platform } from 'react-native';
import { useEffect, useCallback, useRef } from 'react';
import Constants from 'expo-constants';

// Safe lazy resolution of WebBrowser to avoid native module missing crashes
let WebBrowser = null;
try {
  WebBrowser = require('expo-web-browser');
  if (WebBrowser && typeof WebBrowser.maybeCompleteAuthSession === 'function') {
    WebBrowser.maybeCompleteAuthSession();
  }
} catch (e) {
  // ExpoWebBrowser native module not linked in current runtime, will fallback to Linking
}

// Module-level caches that survive screen unmounts and remounts across logouts
const consumedUrls = new Set();
const consumedTokens = new Set();
let isAwaitingAuthRedirect = false;

/**
 * Call on logout to invalidate any cached intent or redirect tokens.
 */
export function clearGoogleAuthSession() {
  isAwaitingAuthRedirect = false;
  Linking.getInitialURL()
    .then((url) => {
      if (url) consumedUrls.add(url);
    })
    .catch(() => {});
}

/**
 * Calculates the exact return URL:
 * In Expo Go, this MUST be `exp://<hostUri>/--/oauthredirect` so Android switches back to Expo Go!
 * In standalone/custom builds, it uses `redapple://oauthredirect`.
 */
function getAppReturnUrl() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '';
  if (hostUri) {
    return `exp://${hostUri}/--/oauthredirect`;
  }
  const scheme = Constants.expoConfig?.scheme || 'redapple';
  return `${scheme}://oauthredirect`;
}

/**
 * Robust Google OAuth integration supporting Expo Go and standalone builds.
 */
export function useGoogleAuth({ onTokenSuccess, onError }) {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  const clientId = webClientId;

  // Handle deep link redirect
  const handleUrl = useCallback(
    (event) => {
      const url = event?.url;
      if (!url) return;

      // Prevent processing the same intent/URL twice
      if (consumedUrls.has(url)) return;
      consumedUrls.add(url);

      try {
        const hashIndex = url.indexOf('#');
        const queryIndex = url.indexOf('?');
        const paramsString =
          hashIndex !== -1
            ? url.substring(hashIndex + 1)
            : queryIndex !== -1
            ? url.substring(queryIndex + 1)
            : '';

        if (paramsString) {
          const params = {};
          paramsString.split('&').forEach((pair) => {
            const [k, v] = pair.split('=');
            if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
          });

          if (params.id_token) {
            // Check if this token was already used
            if (consumedTokens.has(params.id_token)) {
              return;
            }
            consumedTokens.add(params.id_token);
            isAwaitingAuthRedirect = false;
            onTokenSuccess?.(params.id_token);
            return;
          }

          if (params.error) {
            isAwaitingAuthRedirect = false;
            onError?.(params.error_description || params.error);
          }
        }
      } catch (err) {
        isAwaitingAuthRedirect = false;
        onError?.(err.message || 'Failed to parse authentication response.');
      }
    },
    [onTokenSuccess, onError]
  );

  useEffect(() => {
    // 1. Listen for incoming URLs while app is in background
    const subscription = Linking.addEventListener('url', handleUrl);

    // 2. Check if the app was reopened from an intent ONLY if we are actively expecting auth
    if (isAwaitingAuthRedirect) {
      Linking.getInitialURL()
        .then((initialUrl) => {
          if (initialUrl && !consumedUrls.has(initialUrl)) {
            handleUrl({ url: initialUrl });
          }
        })
        .catch(() => {});
    }

    return () => {
      subscription.remove();
    };
  }, [handleUrl]);

  const signInWithGoogle = async () => {
    if (!clientId) {
      throw new Error(
        'Google Sign-In requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in mobile/.env'
      );
    }

    isAwaitingAuthRedirect = true;

    const redirectUri =
      process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI ||
      'http://192.168.1.234.nip.io:5000/api/auth/google/callback';
    const appReturnUrl = getAppReturnUrl();
    const nonce = Math.random().toString(36).substring(2, 15);

    // prompt=select_account forces Google to show the account picker every time
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `response_type=id_token&` +
      `scope=${encodeURIComponent('openid email profile')}&` +
      `prompt=select_account&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${encodeURIComponent(appReturnUrl)}&` +
      `nonce=${encodeURIComponent(nonce)}`;

    try {
      if (WebBrowser && typeof WebBrowser.openAuthSessionAsync === 'function') {
        const res = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        if (res.type === 'success' && res.url) {
          handleUrl({ url: res.url });
          return;
        }
        if (res.type === 'cancel' || res.type === 'dismiss') {
          isAwaitingAuthRedirect = false;
          return;
        }
      }
    } catch (browserErr) {
      // Fall through to Linking
    }

    // Fallback: standard system browser via React Native Linking
    const canOpen = await Linking.canOpenURL(authUrl).catch(() => true);
    if (canOpen) {
      await Linking.openURL(authUrl);
    } else {
      isAwaitingAuthRedirect = false;
      throw new Error('Unable to open web browser on this device.');
    }
  };

  return {
    signInWithGoogle,
    isReady: true,
  };
}
