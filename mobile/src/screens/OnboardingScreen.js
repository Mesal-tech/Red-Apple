import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, StatusBar, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export default function OnboardingScreen({ onNavigateLogin, onNavigateSetup }) {
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = [
    {
      title: 'Every Cycle Stage\nGets Tracked.',
      subtitle: 'Real health data to empower your body',
      image: require('../../assets/hero_woman.png'),
    },
    {
      title: 'Predict Fertile\nWindows Accurately.',
      subtitle: 'Smart algorithms tailored to your body',
      image: require('../../assets/slide2_fertile.png'),
    },
    {
      title: 'Personalized Health\n& Pregnancy Care.',
      subtitle: 'Tailored insights for every step of your journey',
      image: require('../../assets/slide3_doctor.png'),
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
    <SafeAreaView style={styles.onboardingContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.heroSection}>
        <Text style={styles.headlineTitle}>{currentSlide.title}</Text>
        <Text style={styles.headlineSubtitle}>{currentSlide.subtitle}</Text>

        <View style={styles.paginationRow}>
          {slides.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              onPress={() => setSlideIndex(idx)}
              style={[
                styles.paginationDot,
                idx === slideIndex ? styles.paginationDotActive : styles.paginationDotInactive,
              ]}
            />
          ))}
        </View>

        <View style={styles.imageContainer}>
          <Image
            key={slideIndex}
            source={currentSlide.image}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>Red Apple</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryPillButton}
          onPress={onNavigateSetup}
        >
          <Text style={styles.primaryButtonText}>Start My Journey</Text>
          <Text style={styles.primaryButtonSubText}>New to Red Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.secondaryPillButton}
          onPress={onNavigateLogin}
        >
          <Text style={styles.secondaryButtonText}>I Have an Account</Text>
          <Text style={styles.secondaryButtonSubText}>Sign in to restore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.linkButton}
          onPress={() => alert('Partner Access')}
        >
          <Text style={styles.linkButtonText}>Partner Access</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  onboardingContainer: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  heroSection: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 52,
    justifyContent: 'flex-start',
  },
  headlineTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.textLight,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  headlineSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textLightSubtle,
    marginTop: 10,
    marginBottom: 16,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },
  paginationDotActive: {
    width: 28,
    backgroundColor: colors.textLight,
  },
  paginationDotInactive: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 1,
    marginTop: 4,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bottomSheet: {
    backgroundColor: colors.backgroundLight,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 2,
  },
  brandContainer: {
    marginBottom: 18,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.4,
  },
  primaryPillButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textLight,
  },
  primaryButtonSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLightSubtle,
    marginTop: 1,
  },
  secondaryPillButton: {
    width: '100%',
    backgroundColor: colors.backgroundSurface,
    borderWidth: 1,
    borderColor: '#E8E8EE',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  secondaryButtonSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#757575',
    marginTop: 1,
  },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
