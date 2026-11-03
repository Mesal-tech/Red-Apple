import React, { useRef, useState } from 'react';
import { Animated, Image, StatusBar, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const SLIDES = [
  { title: 'Your cycle,\nwith more clarity', description: 'Log your period, understand your cycle, and see your fertile window in one place.', kind: 'cycle' },
  { title: 'Care for every\nstage of life', description: 'Personalize Red Apple for cycle tracking, trying to conceive, pregnancy, or menopause.', kind: 'care' },
  { title: 'Guidance that\ngrows with you', description: 'Get relevant health insights, helpful reminders, and trusted articles for your journey.', kind: 'guidance' },
];

function Brand() {
  return <View className="flex-row items-center">
    <Image source={require('../../assets/logo_white.png')} resizeMode="contain" style={{ width: 33, height: 33, marginRight: 8 }} />
    <View><Text className="text-xl font-extrabold tracking-tight text-white">RedApple</Text><Text className="text-[8px] font-bold tracking-[2px] text-white/70">WELLNESS & CARE</Text></View>
  </View>;
}

export default function OnboardingScreen({ onNavigateLogin, onNavigateSignUp, navigation }) {
  const { theme, isDarkMode } = useTheme();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [slideIndex, setSlideIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const slide = SLIDES[slideIndex];
  const goSignUp = () => onNavigateSignUp ? onNavigateSignUp() : navigation?.navigate?.('SignUp');
  const goLogin = () => onNavigateLogin ? onNavigateLogin() : navigation?.navigate?.('Login');
  const next = () => {
    if (slideIndex === SLIDES.length - 1) return;
    Animated.timing(fade, { toValue: 0.25, duration: 100, useNativeDriver: true }).start(() => {
      setSlideIndex(slideIndex + 1);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };
  const heroSize = Math.min(height * 0.65, width * 1.7, 760);
  const finished = slideIndex === SLIDES.length - 1;
  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
    <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <View style={{ height: heroSize + 28, maxHeight: '64%', overflow: 'hidden', backgroundColor: theme.background }}>
          <Image source={slide.kind === 'care' ? require('../../assets/images/onboarding_done.png') : require('../../assets/images/onboarding_done.jpg')} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          <LinearGradient colors={['rgba(0,0,0,0.46)', 'transparent']} locations={[0, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130 }} />
          <LinearGradient colors={isDarkMode ? ['transparent', 'rgba(20,24,23,0.82)', theme.background] : ['transparent', 'rgba(255,255,255,0.84)', '#FFFFFF']} locations={[0, 0.58, 1]} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 112 }} />
          <View className="absolute left-6" style={{ top: insets.top + 8 }}><Brand /></View>
        </View>
        <View className="flex-1 justify-end px-6 pb-4 pt-6">
          <View style={{ marginTop: 40 }}>
            <Text className="text-[35px] font-bold leading-[41px] tracking-[-0.8px]" style={{ color: theme.textPrimary }}>{slide.title}</Text>
            <Text className="mt-3 max-w-[340px] text-base leading-6" style={{ color: theme.textSecondary }}>{slide.description}</Text>
          </View>
          <View style={{ marginTop: 28 }}>
            <View className="mb-5 flex-row items-center" accessibilityRole="progressbar" accessibilityLabel={`Onboarding step ${slideIndex + 1} of ${SLIDES.length}`} accessibilityValue={{ min: 1, max: SLIDES.length, now: slideIndex + 1 }}>
              {SLIDES.map((_, index) => <View key={index} className={`mr-1.5 h-[5px] rounded-full ${index === slideIndex ? 'w-9' : 'w-3'}`} style={{ backgroundColor: index === slideIndex ? (isDarkMode ? '#A52B39' : '#173D36') : (isDarkMode ? '#3A4742' : '#D8E0DE') }} />)}
            </View>
            {finished ? (
              <View style={{ gap: 10 }}>
                <TouchableOpacity onPress={goSignUp} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Sign up" className="items-center justify-center rounded-full" style={{ height: 62, flexShrink: 0, backgroundColor: isDarkMode ? '#A52B39' : '#101B1A' }}>
                  <Text className="text-base font-bold text-white">Sign Up</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={goLogin} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Sign in" className="items-center justify-center rounded-full border" style={{ height: 62, flexShrink: 0, backgroundColor: theme.inputBg, borderColor: theme.cardBorder }}>
                  <Text className="text-base font-bold" style={{ color: theme.textPrimary }}>Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={next} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Next introduction" className="h-[62px] items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? '#A52B39' : '#101B1A' }}>
                <Text className="text-base font-bold text-white">Next</Text>
                <View className="absolute right-1.5 h-[49px] w-[49px] items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? '#DCEAE5' : '#FFFFFF' }}><Ionicons name="arrow-forward" size={19} color="#101B1A" /></View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  </View>;
}
