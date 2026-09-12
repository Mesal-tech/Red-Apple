import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingScreen({ onNavigateLogin, onNavigateSignUp }) {
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = [
    {
      titlePrefix: 'Every Cycle Stage\nGets ',
      accent: 'Tracked.',
      subtitle: 'Real health data to empower your body.\nPersonalized insights. Better life.',
    },
    {
      titlePrefix: 'Predict Fertile\nWindows ',
      accent: 'Accurately.',
      subtitle: 'Smart algorithms tailored to your body.\nPrecise timing. Deeper clarity.',
    },
    {
      titlePrefix: 'Personalized Health\n& Pregnancy ',
      accent: 'Care.',
      subtitle: 'Tailored insights for every step of your journey.\nAdvanced support. Better wellness.',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [slides.length]);

  const currentSlide = slides[slideIndex];

  return (
    <LinearGradient
      colors={['#880E18', '#540810', '#220306', '#0C0103']}
      locations={[0, 0.35, 0.72, 1]}
      style={styles.screenWrapper}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* TOP BRAND HEADER */}
        <View style={styles.topBrandHeader}>
          <View style={styles.logoRow}>
            <Image
              source={require('../../assets/logo_white.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <View style={styles.brandTitleCol}>
              <Text style={styles.brandMainTitle}>RedApple</Text>
              <Text style={styles.brandSubTitle}>WELLNESS & CARE</Text>
            </View>
          </View>
        </View>

        {/* LOWER CONTENT: TYPOGRAPHY & COPY */}
        <View style={styles.contentSection}>
          <Text style={styles.headlineTitle}>
            {currentSlide.titlePrefix}
            <Text style={styles.accentText}>{currentSlide.accent}</Text>
          </Text>

          <Text style={styles.headlineSubtitle}>{currentSlide.subtitle}</Text>

          {/* BOTTOM ACTION BAR */}
          <View style={styles.bottomBarRow}>
            {/* Primary Pill Button: Get Started / Sign Up */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.signUpPillButton}
              onPress={onNavigateSignUp || onNavigateLogin}
            >
              <Text style={styles.signUpButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Secondary Pill Button: Login */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.loginPillButton}
              onPress={onNavigateLogin}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  safeContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },

  /* TOP BRAND HEADER */
  topBrandHeader: {
    paddingTop: 12,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoImage: {
    width: 28,
    height: 28,
  },
  brandTitleCol: {
    flexDirection: 'column',
  },
  brandMainTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  brandSubTitle: {
    fontSize: 8.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 2,
    marginTop: -1,
  },
  /* TYPOGRAPHY & CONTENT SECTION */
  contentSection: {
    paddingBottom: 20,
  },
  headlineTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 42,
    letterSpacing: -0.6,
  },
  accentText: {
    color: '#EF4444', // Highlighted crimson accent matching reference design
  },
  headlineSubtitle: {
    fontSize: 14.5,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 28,
  },

  /* BOTTOM ACTION BAR */
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signUpPillButton: {
    flex: 1.2,
    height: 58,
    backgroundColor: '#DC2626',
    borderRadius: 29,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  signUpButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  loginPillButton: {
    flex: 0.8,
    height: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
