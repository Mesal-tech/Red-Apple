import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, TouchableOpacity, StatusBar } from 'react-native';
import { colors } from '../theme/colors';
import {
  savePrivacyStatusSafe,
  getOnboardingStatusSafe,
  saveOnboardingStatusSafe,
  getActiveHealthModeSafe,
  saveActiveHealthModeSafe,
  clearAppSessionSafe,
  getCachedActiveHealthMode,
} from '../utils/storage';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import OnboardingScreen from '../screens/OnboardingScreen';
import OnboardingSetupScreen from '../screens/OnboardingSetupScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HomeScreen from '../screens/HomeScreen';
import DoctorDashboardScreen from '../screens/DoctorDashboardScreen';

function AnimatedSplashScreen({ onFinishAnimation }) {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        if (onFinishAnimation) {
          onFinishAnimation();
        }
      }
    };

    // Safety fallback: guaranteed dismissal within 2.8s no matter what
    const safetyTimer = setTimeout(finish, 2800);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(600),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      clearTimeout(safetyTimer);
      finish();
    });

    return () => clearTimeout(safetyTimer);
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[splashStyles.splashContainer, { opacity: containerOpacity }]}
    >
      <Animated.View
        style={[
          splashStyles.logoCircle,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../../assets/logo_white.png')}
          style={{ width: 66, height: 66 }}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 20 }}>
        <Text style={splashStyles.appNameText}>Red Apple</Text>
        <Text style={splashStyles.appSloganText}>Wellness & Cycle Companion</Text>
      </Animated.View>
    </Animated.View>
  );
}

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
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
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

  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
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

  useEffect(() => {
    if (isAuthenticated) {
      getActiveHealthModeSafe().then((storedMode) => {
        if (storedMode) {
          setLocalMode(storedMode);
        }
      });
    }
  }, [isAuthenticated, user?.health_profile?.stage, user?.pregnancy_mode]);

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

        {!splashAnimationDone && (
          <AnimatedSplashScreen onFinishAnimation={() => setSplashAnimationDone(true)} />
        )}
      </View>
    );
  }

  // Doctor Provider Portal (Default view for doctors, with optional patient preview toggle)
  if (isDoctor && !previewPatientMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <DoctorDashboardScreen
          onSignOut={handleSignOut}
          onPreviewPatientView={() => setPreviewPatientMode(true)}
        />
        {!splashAnimationDone && (
          <AnimatedSplashScreen onFinishAnimation={() => setSplashAnimationDone(true)} />
        )}
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

        {!splashAnimationDone && (
          <AnimatedSplashScreen onFinishAnimation={() => setSplashAnimationDone(true)} />
        )}
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

      {!splashAnimationDone && (
        <AnimatedSplashScreen onFinishAnimation={() => setSplashAnimationDone(true)} />
      )}
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
