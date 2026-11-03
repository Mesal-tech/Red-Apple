import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import AppLockModal, { PIN_STORAGE_KEY } from '../components/AppLockModal';
import syncQueueService from '../services/syncQueueService';
import {
  savePrivacyStatusSafe,
  getOnboardingStatusSafe,
  saveOnboardingStatusSafe,
  getActiveHealthModeSafe,
  saveActiveHealthModeSafe,
  clearAppSessionSafe,
  getCachedActiveHealthMode,
  getHealthProfileSafe,
} from '../utils/storage';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import notificationService from '../services/notificationService';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import OnboardingScreen from '../screens/OnboardingScreen';
import OnboardingSetupScreen from '../screens/OnboardingSetupScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import MainTabNavigator from './MainTabNavigator';
import DoctorDashboardScreen from '../screens/DoctorDashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CycleCalendarScreen from '../screens/CycleCalendarScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import PrivacyPolicyDetailScreen from '../screens/PrivacyPolicyDetailScreen';
import TermsOfUseDetailScreen from '../screens/TermsOfUseDetailScreen';

const Stack = createNativeStackNavigator();

/**
 * Synchronously determine if user has completed onboarding.
 * Checks stage, completedAt, pregnancy_mode, or essential cycle metrics.
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
 * Authenticated Application Stack: includes MainTabs, dedicated ProfileScreen,
 * dedicated CycleCalendarScreen and dedicated AIAssistantScreen.
 */
function AuthenticatedAppStack({
  handleSignOut,
  activeMode,
  onActiveModeChange,
  user,
  setSetupCompletedOverride,
}) {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="MainTabs">
        {(props) => (
          <MainTabNavigator
            {...props}
            onSignOut={handleSignOut}
            initialMode={activeMode}
            healthProfile={user?.health_profile}
            onRedoSetup={() => setSetupCompletedOverride(false)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Profile">
        {(props) => (
          <ProfileScreen
            {...props}
            currentMode={activeMode}
            onActiveModeChange={onActiveModeChange}
            onSignOut={handleSignOut}
            onBookDoctor={() => props.navigation.navigate('MainTabs', { screen: 'Telemed' })}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="CycleCalendar">
        {(props) => (
          <CycleCalendarScreen
            {...props}
            onNavigateAIAssistant={(dateKey) => {
              props.navigation.navigate('MainTabs', {
                screen: 'AICompanion',
                params: { selectedDateKey: dateKey },
              });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />

      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyDetailScreen} />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseDetailScreen} />
    </Stack.Navigator>
  );
}

const AuthStack = createNativeStackNavigator();

/**
 * Unauthenticated Authentication Stack.
 * Native stack transitions between Onboarding, Login, and SignUp.
 */
function UnauthenticatedStack({ initialRoute = 'Onboarding' }) {
  return (
    <AuthStack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Onboarding">
        {(props) => (
          <OnboardingScreen
            {...props}
            onNavigateLogin={() => props.navigation.navigate('Login')}
            onNavigateSignUp={() => props.navigation.navigate('SignUp')}
          />
        )}
      </AuthStack.Screen>

      <AuthStack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            onBack={() => props.navigation.navigate('Onboarding')}
            onNavigateSignUp={() => props.navigation.navigate('SignUp')}
          />
        )}
      </AuthStack.Screen>

      <AuthStack.Screen name="SignUp">
        {(props) => (
          <SignUpScreen
            {...props}
            onBack={() => props.navigation.navigate('Onboarding')}
            onNavigateLogin={() => props.navigation.navigate('Login')}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
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
  const [localOnboarded, setLocalOnboarded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkInitialOnboarding() {
      try {
        const [isCompleted, healthProfile] = await Promise.all([
          getOnboardingStatusSafe(),
          getHealthProfileSafe(),
        ]);
        if (isMounted) {
          const hasLocalData =
            !!isCompleted ||
            !!(healthProfile && (healthProfile.stage || healthProfile.completedAt || healthProfile.lastPeriodDate));
          if (hasLocalData) {
            setLocalOnboarded(true);
            setAuthScreen('login');
          }
        }
      } catch (e) {
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }
    checkInitialOnboarding();
    return () => {
      isMounted = false;
    };
  }, []);

  const isDoctor = user?.role === 'doctor' || user?.email === 'mesalokubor63@gmail.com';

  const hasOnboarded = setupCompletedOverride !== null
    ? setupCompletedOverride
    : (isUserOnboarded(user) || localOnboarded);

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
      } catch (e) {}
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

      if (Platform.OS !== 'web') {
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

          if (Notifications?.getLastNotificationResponseAsync) {
            Notifications.getLastNotificationResponseAsync()
              .then((response) => {
                if (response?.notification?.request?.content?.data) {
                  const data = response.notification.request.content.data;
                  if (data?.screen === 'DoctorCareScreen' && isDoctor) {
                    setPreviewPatientMode(false);
                  }
                }
              })
              .catch(() => {});
          }
        } catch (e) {}
      }
    }

    return () => {
      if (notifReceivedSub?.remove) notifReceivedSub.remove();
      if (notifResponseSub?.remove) notifResponseSub.remove();
    };
  }, [isAuthenticated, user?.health_profile, activeMode]);

  const handleCompleteSetup = async (healthProfile, stage) => {
    await savePrivacyStatusSafe();
    await saveOnboardingStatusSafe();
    setLocalOnboarded(true);
    if (stage) {
      await saveActiveHealthModeSafe(stage);
      setLocalMode(stage);
    }
    setSetupCompletedOverride(true);
  };

  const handleActiveModeChange = (mode) => setLocalMode(mode);

  const handleSignOut = async () => {
    setSetupCompletedOverride(null);
    setLocalMode(null);
    setPreviewPatientMode(false);
    await logout();
    await clearAppSessionSafe();
    setAuthScreen('login');
  };

  const { isDarkMode, theme } = useTheme();

  // Loading Splash Screen (Zero flash of onboarding screens while checking session)
  if (authLoading || initialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent={true} />
        <View className="w-28 h-28 items-center justify-center">
          <Image
            source={require('../../assets/icon.png')}
            className="w-24 h-24 rounded-3xl"
            resizeMode="contain"
          />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.5, marginTop: 16 }}>Red Apple</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginTop: 4 }}>Intelligent Women's Health</Text>
      </View>
    );
  }

  // Unauthenticated Stack
  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <UnauthenticatedStack initialRoute={localOnboarded ? 'Login' : 'Onboarding'} />
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

  // Doctor Provider Portal
  if (isDoctor && !previewPatientMode) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
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
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View className="bg-slate-800 pt-10 pb-2.5 px-4 flex-row items-center justify-between z-50">
          <View className="flex-row items-center">
            <Text className="text-xs font-bold text-slate-100">
              🩺 Viewing Patient Experience
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPreviewPatientMode(false)}
            className="bg-emerald-600 py-1.5 px-3.5 rounded-full"
            activeOpacity={0.8}
          >
            <Text className="text-xs font-bold text-white">
              Return to Clinic
            </Text>
          </TouchableOpacity>
        </View>

        <AuthenticatedAppStack
          handleSignOut={handleSignOut}
          activeMode={activeMode}
          onActiveModeChange={handleActiveModeChange}
          user={user}
          setSetupCompletedOverride={setSetupCompletedOverride}
        />
        {renderAppLock()}
      </View>
    );
  }

  // Standard Patient Authenticated Stack
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {!hasOnboarded ? (
        <OnboardingSetupScreen
          onBack={handleSignOut}
          onComplete={handleCompleteSetup}
        />
      ) : (
        <AuthenticatedAppStack
          handleSignOut={handleSignOut}
          activeMode={activeMode}
          onActiveModeChange={handleActiveModeChange}
          user={user}
          setSetupCompletedOverride={setSetupCompletedOverride}
        />
      )}

      {renderAppLock()}
    </View>
  );
}

const defaultNavigationFonts = {
  regular: {
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
    fontWeight: 'normal',
  },
  medium: {
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif-medium' }),
    fontWeight: 'normal',
  },
  bold: {
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
    fontWeight: '600',
  },
  heavy: {
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
    fontWeight: '700',
  },
};

export default function AppNavigator() {
  const { isDarkMode, theme } = useTheme();
  const baseTheme = (isDarkMode ? DarkTheme : DefaultTheme) || {};

  const navigationTheme = {
    ...baseTheme,
    dark: isDarkMode,
    colors: {
      ...(baseTheme.colors || {}),
      background: theme.background,
      card: theme.card,
      text: theme.textPrimary,
      border: theme.cardBorder,
      primary: colors.primary,
    },
    fonts: baseTheme.fonts || defaultNavigationFonts,
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <ToastProvider>
        <AuthProvider>
          <MainNavigation />
        </AuthProvider>
      </ToastProvider>
    </NavigationContainer>
  );
}
