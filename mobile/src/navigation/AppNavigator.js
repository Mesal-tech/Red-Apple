import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  getPrivacyStatusSafe,
  savePrivacyStatusSafe,
  getOnboardingStatusSafe,
  saveOnboardingStatusSafe,
  clearAppSessionSafe,
} from '../utils/storage';
import PrivacyScreen from '../screens/PrivacyScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import OnboardingSetupScreen from '../screens/OnboardingSetupScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';

function AnimatedSplashScreen({ onFinishAnimation }) {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onFinishAnimation) {
        onFinishAnimation();
      }
    });
  }, []);

  return (
    <Animated.View style={[splashStyles.splashContainer, { opacity: containerOpacity }]}>
      <Animated.View
        style={[
          splashStyles.logoCircle,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Ionicons name="nutrition" size={60} color="#FFFFFF" />
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

export default function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const [isPrivacyAccepted, setIsPrivacyAccepted] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('onboarding'); // 'onboarding' | 'setup' | 'login' | 'home'

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    const privacyAccepted = await getPrivacyStatusSafe();
    const onboardingCompleted = await getOnboardingStatusSafe();

    setIsPrivacyAccepted(privacyAccepted);

    if (privacyAccepted && onboardingCompleted) {
      setCurrentScreen('home');
    } else if (privacyAccepted) {
      setCurrentScreen('onboarding');
    }

    setLoading(false);
  };

  const handleAcceptPrivacy = async () => {
    await savePrivacyStatusSafe();
    setIsPrivacyAccepted(true);
  };

  const handleCompleteSetupOrLogin = async () => {
    await savePrivacyStatusSafe();
    await saveOnboardingStatusSafe();
    setCurrentScreen('home');
  };

  const handleSignOut = async () => {
    await clearAppSessionSafe();
    setIsPrivacyAccepted(false);
    setCurrentScreen('onboarding');
  };

  return (
    <View style={{ flex: 1 }}>
      {!isPrivacyAccepted ? (
        <PrivacyScreen onAccept={handleAcceptPrivacy} />
      ) : currentScreen === 'home' ? (
        <HomeScreen onSignOut={handleSignOut} />
      ) : currentScreen === 'setup' ? (
        <OnboardingSetupScreen
          onBack={() => setCurrentScreen('onboarding')}
          onComplete={handleCompleteSetupOrLogin}
        />
      ) : currentScreen === 'login' ? (
        <LoginScreen
          onBack={() => setCurrentScreen('onboarding')}
          onLoginSuccess={handleCompleteSetupOrLogin}
        />
      ) : (
        <OnboardingScreen
          onNavigateLogin={() => setCurrentScreen('login')}
          onNavigateSetup={() => setCurrentScreen('setup')}
        />
      )}

      {(!splashAnimationDone || loading) && (
        <AnimatedSplashScreen
          onFinishAnimation={() => setSplashAnimationDone(true)}
        />
      )}
    </View>
  );
}
