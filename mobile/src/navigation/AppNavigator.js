import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, AppState, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import ResponsiveScreenFrame from '../components/ResponsiveScreenFrame';
import { BREAKPOINTS } from '../utils/responsive';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ThemeContext, { useTheme } from '../context/ThemeContext';
import OnboardingScreen from '../screens/OnboardingScreen';
import OnboardingSetupScreen from '../screens/OnboardingSetupScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import MainTabNavigator, { WideAppSidebar } from './MainTabNavigator';
import DoctorDashboardScreen from '../screens/DoctorDashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CycleCalendarScreen from '../screens/CycleCalendarScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import PrivacyPolicyDetailScreen from '../screens/PrivacyPolicyDetailScreen';
import TermsOfUseDetailScreen from '../screens/TermsOfUseDetailScreen';
import AppearanceScreen from '../screens/AppearanceScreen';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

/**
 * Synchronously determine if user has completed onboarding.
 * Checks stage, completedAt, pregnancy_mode, or essential cycle metrics.
 */
function isUserOnboarded(user) {
  if (!user) return false;
  if (user.role === 'doctor' || user.email === '') return true;
  if (user.health_profile?.completedAt) return true;
  if (user.health_profile?.stage) return true;
  if (user.pregnancy_mode === true) return true;
  if (user.health_profile?.lastPeriodDate && user.health_profile?.cycleLength) return true;
  return false;
}

function ResponsiveAuthenticatedScreen({ navigation, currentRoute, isWide, user, children }) {
  const { theme } = useTheme();
  if (!isWide) return <ResponsiveScreenFrame>{children}</ResponsiveScreenFrame>;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.background }}>
      <WideAppSidebar navigation={navigation} currentRoute={currentRoute} user={user} />
      <View style={{ flex: 1, minWidth: 0, alignItems: 'center', backgroundColor: theme.background }}>
        <ResponsiveScreenFrame>{children}</ResponsiveScreenFrame>
      </View>
    </View>
  );
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
  const themeContext = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINTS.tablet;
  const theme = themeContext.theme;
  const responsiveThemeContext = themeContext;

  return (
    <ThemeContext.Provider value={responsiveThemeContext}>
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
            user={user}
            onSignOut={handleSignOut}
            initialMode={activeMode}
            healthProfile={user?.health_profile}
            onRedoSetup={() => setSetupCompletedOverride(false)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Profile">
        {(props) => (
          <ResponsiveAuthenticatedScreen navigation={props.navigation} currentRoute="Profile" isWide={isWide} user={user}>
            <ProfileScreen
              {...props}
              wideLayout={isWide}
              currentMode={activeMode}
              onActiveModeChange={onActiveModeChange}
              onSignOut={handleSignOut}
              onBookDoctor={() => props.navigation.navigate('MainTabs', { screen: 'Telemed' })}
            />
          </ResponsiveAuthenticatedScreen>
        )}
      </Stack.Screen>

      <Stack.Screen name="CycleCalendar">
        {(props) => (
          <ResponsiveAuthenticatedScreen navigation={props.navigation} currentRoute="Home" isWide={isWide} user={user}>
            <CycleCalendarScreen
              {...props}
              onNavigateAIAssistant={(dateKey) => {
                props.navigation.navigate('MainTabs', {
                  screen: 'AICompanion',
                  params: { selectedDateKey: dateKey },
                });
              }}
            />
          </ResponsiveAuthenticatedScreen>
        )}
      </Stack.Screen>

      <Stack.Screen name="AIAssistant">
        {(props) => <ResponsiveAuthenticatedScreen navigation={props.navigation} currentRoute="AICompanion" isWide={isWide} user={user}><AIAssistantScreen {...props} /></ResponsiveAuthenticatedScreen>}
      </Stack.Screen>

      <Stack.Screen name="PrivacyPolicy">
        {(props) => <ResponsiveAuthenticatedScreen navigation={props.navigation} currentRoute="Profile" isWide={isWide} user={user}><PrivacyPolicyDetailScreen {...props} /></ResponsiveAuthenticatedScreen>}
      </Stack.Screen>
      <Stack.Screen name="TermsOfUse">
        {(props) => <ResponsiveAuthenticatedScreen navigation={props.navigation} currentRoute="Profile" isWide={isWide} user={user}><TermsOfUseDetailScreen {...props} /></ResponsiveAuthenticatedScreen>}
      </Stack.Screen>
      <Stack.Screen name="Appearance">
        {(props) => <ResponsiveAuthenticatedScreen navigation={props.navigation} currentRoute="Profile" isWide={isWide} user={user}><AppearanceScreen {...props} /></ResponsiveAuthenticatedScreen>}
      </Stack.Screen>
    </Stack.Navigator>
    </ThemeContext.Provider>
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

  const isDoctor = user?.role === 'doctor' || user?.email === '';

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
      } catch (e) { }
    };

    checkPinLock();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkPinLock();
        if (Platform.OS !== 'web') {
          try { require('expo-notifications').setBadgeCountAsync(0); } catch (_) {}
        }
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
    } else {
      setLocalMode(null);
      setLocalOnboarded(false);
      setSetupCompletedOverride(null);
      setIsAppLocked(false);
      setPreviewPatientMode(false);
    }
  }, [isAuthenticated, user?.health_profile?.stage, user?.pregnancy_mode]);

  useEffect(() => {
    let notifReceivedSub = null;
    let notifResponseSub = null;
    let cleanupNotificationRoutes = null;

    if (isAuthenticated) {
      notificationService.init();
      notificationService.registerForPush();
      notificationService.syncAllReminders({
        healthProfile: user?.health_profile,
        stage: activeMode,
      });

      if (Platform.OS !== 'web') {
        try {
          const Notifications = require('expo-notifications');
          cleanupNotificationRoutes = notificationService.initListeners(navigationRef);
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
              .catch(() => { });
          }
        } catch (e) { }
      }
    }

    return () => {
      if (notifReceivedSub?.remove) notifReceivedSub.remove();
      if (notifResponseSub?.remove) notifResponseSub.remove();
      if (cleanupNotificationRoutes) cleanupNotificationRoutes();
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
    setLocalOnboarded(false);
    setIsAppLocked(false);
    setPreviewPatientMode(false);
    await logout();
    await clearAppSessionSafe();
    setAuthScreen('login');
  };

  const { isDarkMode, theme } = useTheme();

  // Loading Splash Screen (Zero flash of onboarding screens while checking session)
  if (authLoading || initialLoading) {
    return (
      <LinearGradient
        colors={['#F04452', '#C81E3A']}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.88, y: 1 }}
        style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <Image
          source={require('../../assets/splash-wordmark.png')}
          resizeMode="contain"
          accessibilityLabel="Red Apple"
          style={{ width: '90%', maxWidth: 330, height: 82 }}
        />
      </LinearGradient>
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
        <ResponsiveScreenFrame style={{ maxWidth: 960 }}>
          <OnboardingSetupScreen
            onBack={handleSignOut}
            onComplete={handleCompleteSetup}
          />
        </ResponsiveScreenFrame>
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
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <ToastProvider>
        <AuthProvider>
          <MainNavigation />
        </AuthProvider>
      </ToastProvider>
    </NavigationContainer>
  );
}
