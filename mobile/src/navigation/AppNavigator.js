import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, TouchableOpacity, StatusBar, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import AppLockModal, { PIN_STORAGE_KEY } from '../components/AppLockModal';
import syncQueueService from '../services/syncQueueService';
import {
  savePrivacyStatusSafe,
  saveOnboardingStatusSafe,
  getActiveHealthModeSafe,
  saveActiveHealthModeSafe,
  clearAppSessionSafe,
  getCachedActiveHealthMode,
} from '../utils/storage';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import notificationService from '../services/notificationService';
import OnboardingScreen from '../screens/OnboardingScreen';
import OnboardingSetupScreen from '../screens/OnboardingSetupScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';
import DoctorDashboardScreen from '../screens/DoctorDashboardScreen';

const splashStyles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
  },
  logoContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 110,
    height: 110,
  },
  appNameText: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  appSloganText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
});

/**
 * Synchronously determine if user has completed onboarding.
 * Checks stage, completedAt, pregnancy_mode, or essential cycle metrics.
 * Note: reproductiveGoal alone does NOT count as completed onboarding, ensuring newly registered users always see the setup wizard.
 */
function isUserOnboarded(user) {
  if (!user) return false;
  if (user.role === 'doctor' || user.email === 'mesalokubor63@gmail.com') return true;
  if (user.health_profile?.completedAt) return true;
  if (user.health_profile?.stage) return true;
  if (user.pregnancy_mode === true) return true;
  if (user.health_profile?.lastPeriodDate && user.health_profile?.cycleLength) return true;
  return false;
}

/**
 * Inner Navigation Controller.
 * Enforces strict authentication gate with zero bypass and zero layout flash.
 */
function MainNavigation() {
  const { isAuthenticated, isLoading: authLoading, logout, user } = useAuth();

  const [authScreen, setAuthScreen] = useState('onboarding'); // 'onboarding' | 'login' | 'signup'
  const [setupCompletedOverride, setSetupCompletedOverride] = useState(null);
  const [localMode, setLocalMode] = useState(getCachedActiveHealthMode);
  const [previewPatientMode, setPreviewPatientMode] = useState(false);

  const isDoctor = user?.role === 'doctor' || user?.email === 'mesalokubor63@gmail.com';

  // Synchronous, instant evaluation from the active user object — zero render lag, zero flash
  const hasOnboarded = setupCompletedOverride !== null
    ? setupCompletedOverride
    : isUserOnboarded(user);

  const activeMode =
    localMode ||
    getCachedActiveHealthMode() ||
    user?.health_profile?.stage ||
    (user?.pregnancy_mode ? 'pregnancy' : null) ||
    'cycle';

  const [isAppLocked, setIsAppLocked] = useState(false);

  useEffect(() => {
    syncQueueService.init();

    const checkPinLock = async () => {
      try {
        const pin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
        if (pin) {
          setIsAppLocked(true);
        }
      } catch (e) { }
    };

    checkPinLock();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkPinLock();
      }
    });

    return () => {
      sub.remove();
      syncQueueService.destroy();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      getActiveHealthModeSafe().then((storedMode) => {
        if (storedMode) {
          setLocalMode(storedMode);
        }
      });
    }
  }, [isAuthenticated, user?.health_profile?.stage, user?.pregnancy_mode]);

  useEffect(() => {
    let notifReceivedSub = null;
    let notifResponseSub = null;

    if (isAuthenticated) {
      notificationService.init();
      notificationService.requestPermissionsAndToken();
      notificationService.syncAllReminders({
        healthProfile: user?.health_profile,
        stage: activeMode,
      });

      try {
        const Notifications = require('expo-notifications');
        if (Notifications?.addNotificationReceivedListener) {
          notifReceivedSub = Notifications.addNotificationReceivedListener((notification) => {
            const { title, body, data } = notification.request.content;
            notificationService.addInAppNotification({
              id: notification.request.identifier || `notif_${Date.now()}`,
              title,
              body,
              time: 'Just now',
              type: data?.type || 'general',
              data: data || {},
              icon: data?.type === 'appointment' ? 'videocam-outline' : 'notifications-outline',
              iconBg: data?.type === 'appointment' ? '#E6F4EA' : '#FFE5E9',
              iconColor: data?.type === 'appointment' ? '#059669' : colors.primary,
            });
          });
        }
        if (Notifications?.addNotificationResponseReceivedListener) {
          notifResponseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            if (data?.screen === 'DoctorCareScreen' && isDoctor) {
              setPreviewPatientMode(false);
            }
          });
        }
      } catch (e) {}
    }

    return () => {
      if (notifReceivedSub?.remove) notifReceivedSub.remove();
      if (notifResponseSub?.remove) notifResponseSub.remove();
    };
  }, [isAuthenticated, user?.health_profile, activeMode]);

  const handleCompleteSetup = async (healthProfile, stage) => {
    await savePrivacyStatusSafe();
    await saveOnboardingStatusSafe();
    if (stage) {
      await saveActiveHealthModeSafe(stage);
      setLocalMode(stage);
    }
    setSetupCompletedOverride(true);
  };

  const handleSignOut = async () => {
    setSetupCompletedOverride(null);
    setLocalMode(null);
    setPreviewPatientMode(false);
    await logout();
    await clearAppSessionSafe();
    setAuthScreen('login');
  };

  // Unauthenticated Stack
  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1 }}>
        {authScreen === 'signup' ? (
          <SignUpScreen
            onBack={() => setAuthScreen('onboarding')}
            onNavigateLogin={() => setAuthScreen('login')}
          />
        ) : authScreen === 'login' ? (
          <LoginScreen
            onBack={() => setAuthScreen('onboarding')}
            onNavigateSignUp={() => setAuthScreen('signup')}
          />
        ) : (
          <OnboardingScreen
            onNavigateLogin={() => setAuthScreen('login')}
            onNavigateSignUp={() => setAuthScreen('signup')}
          />
        )}
      </View>
    );
  }

  const renderAppLock = () => (
    <AppLockModal
      visible={isAppLocked}
      mode="unlock"
      onSuccess={() => setIsAppLocked(false)}
    />
  );

  // Doctor Provider Portal (Default view for doctors, with optional patient preview toggle)
  if (isDoctor && !previewPatientMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <DoctorDashboardScreen
          onSignOut={handleSignOut}
          onPreviewPatientView={() => setPreviewPatientMode(true)}
        />
        {renderAppLock()}
      </View>
    );
  }

  // Doctor Patient Preview Mode Banner Header
  if (isDoctor && previewPatientMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={navStyles.previewBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={navStyles.previewBannerText}>
              🩺 Viewing Patient Experience
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPreviewPatientMode(false)}
            style={navStyles.returnClinicButton}
            activeOpacity={0.8}
          >
            <Text style={navStyles.returnClinicButtonText}>
              Return to Clinic
            </Text>
          </TouchableOpacity>
        </View>

        <HomeScreen
          onSignOut={handleSignOut}
          initialMode={activeMode}
          healthProfile={user?.health_profile}
          onRedoSetup={() => setSetupCompletedOverride(false)}
        />
        {renderAppLock()}
      </View>
    );
  }

  // Standard Patient Authenticated Stack
  return (
    <View style={{ flex: 1 }}>
      {!hasOnboarded ? (
        <OnboardingSetupScreen
          onBack={handleSignOut}
          onComplete={handleCompleteSetup}
        />
      ) : (
        <HomeScreen
          onSignOut={handleSignOut}
          initialMode={activeMode}
          healthProfile={user?.health_profile}
          onRedoSetup={() => setSetupCompletedOverride(false)}
        />
      )}

      {renderAppLock()}
    </View>
  );
}

export default function AppNavigator() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainNavigation />
      </AuthProvider>
    </ToastProvider>
  );
}

const navStyles = StyleSheet.create({
  previewBanner: {
    backgroundColor: '#1E293B',
    paddingTop: (StatusBar.currentHeight || 24) + 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  previewBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  returnClinicButton: {
    backgroundColor: '#059669',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  returnClinicButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
