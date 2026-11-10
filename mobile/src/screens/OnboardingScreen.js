import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  PanResponder,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SLIDES = [
  {
    title: 'Your cycle,\nwith more clarity',
    description: 'Log your period, understand your cycle, and see your fertile window in one place.',
    kind: 'cycle',
  },
  {
    title: 'Care for every\nstage of life',
    description: 'Personalize Red Apple for cycle tracking, trying to conceive, pregnancy, or menopause.',
    kind: 'care',
  },
  {
    title: 'Guidance that\ngrows with you',
    description: 'Get relevant health insights, helpful reminders, and trusted articles for your journey.',
    kind: 'guidance',
  },
];

function Brand({ animStyle }) {
  return (
    <Animated.View className="flex-row items-center" style={animStyle}>
      <Image
        source={require('../../assets/logo_white.png')}
        resizeMode="contain"
        style={{ width: 33, height: 33, marginRight: 8 }}
      />
      <View>
        <Text className="text-xl font-extrabold tracking-tight text-white">RedApple</Text>
        <Text className="text-[8px] font-bold tracking-[2px] text-white/70">WELLNESS & CARE</Text>
      </View>
    </Animated.View>
  );
}

export default function OnboardingScreen({ onNavigateLogin, onNavigateSignUp, navigation }) {
  const { theme, isDarkMode } = useTheme();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [slideIndex, setSlideIndex] = useState(0);
  const slideIndexRef = useRef(0);
  slideIndexRef.current = slideIndex;

  const isAnimatingRef = useRef(false);
  const directionRef = useRef(1); // 1 = forward, -1 = backward

  // Initial screen mount animation
  const mountAnim = useRef(new Animated.Value(0)).current;

  // Slide transition animation (0 = entering, 1 = fully visible)
  const slideAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mountAnim]);

  const slide = SLIDES[slideIndex];
  const finished = slideIndex === SLIDES.length - 1;

  const goSignUp = () => (onNavigateSignUp ? onNavigateSignUp() : navigation?.navigate?.('SignUp'));
  const goLogin = () => (onNavigateLogin ? onNavigateLogin() : navigation?.navigate?.('Login'));

  const goToSlide = (targetIndex) => {
    if (
      isAnimatingRef.current ||
      targetIndex === slideIndexRef.current ||
      targetIndex < 0 ||
      targetIndex >= SLIDES.length
    ) {
      return;
    }

    const direction = targetIndex > slideIndexRef.current ? 1 : -1;
    directionRef.current = direction;
    isAnimatingRef.current = true;

    // Phase 1: Smooth Exit of current slide
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // Morph the indicator pill width smoothly
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      // Swap slide content
      setSlideIndex(targetIndex);

      // Phase 2: Dynamic Entry of new slide
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        isAnimatingRef.current = false;
      });
    });
  };

  const next = () => goToSlide(slideIndexRef.current + 1);
  const prev = () => goToSlide(slideIndexRef.current - 1);

  // Swipe gesture support for tactile navigation
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 24 && Math.abs(gestureState.dy) < 36;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -45) {
          next();
        } else if (gestureState.dx > 45) {
          prev();
        }
      },
    })
  ).current;

  const heroSize = Math.min(height * 0.65, width * 1.7, 760);

  // Brand entrance animation
  const brandTranslateY = mountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 0],
  });
  const brandOpacity = mountAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.5, 1],
  });

  // Hero Image animations (combination of mount + slide transitions)
  const heroScale = Animated.multiply(
    mountAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1.08, 1],
    }),
    slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1.06, 1],
    })
  );

  const heroOpacity = Animated.multiply(
    mountAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    slideAnim.interpolate({
      inputRange: [0, 0.35, 1],
      outputRange: [0.15, 0.7, 1],
    })
  );

  const heroTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [directionRef.current * 20, 0],
  });

  // Headline Text animations
  const titleTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [directionRef.current * 38, 0],
  });
  const titleTranslateY = mountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });
  const titleOpacity = Animated.multiply(
    mountAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    slideAnim.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0, 0.5, 1],
    })
  );

  // Description Text animations (staggered slightly behind title)
  const descTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [directionRef.current * 26, 0],
  });
  const descTranslateY = mountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
  const descOpacity = Animated.multiply(
    mountAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    slideAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.4, 1],
    })
  );

  // Bottom action buttons entrance
  const actionsTranslateY = mountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });
  const actionsOpacity = mountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }} {...panResponder.panHandlers}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>
        {/* HERO IMAGE CONTAINER WITH DEPTH GRADIENTS */}
        <View
          style={{
            height: heroSize + 28,
            maxHeight: '64%',
            overflow: 'hidden',
            backgroundColor: theme.background,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Animated.Image
            key={`hero-${slideIndex}`}
            source={
              slide.kind === 'care'
                ? require('../../assets/images/onboarding_done.png')
                : require('../../assets/images/onboarding_done_no_bg.png')
            }
            resizeMode="cover"
            style={{
              width: '100%',
              height: '100%',
              transform: [{ scale: heroScale }, { translateX: heroTranslateX }],
              opacity: heroOpacity,
            }}
          />

          {/* Top subtle vignette for Brand badge contrast */}
          <LinearGradient
            colors={['rgba(0,0,0,0.48)', 'transparent']}
            locations={[0, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130 }}
            pointerEvents="none"
          />

          {/* Bottom seamless blend into background */}
          <LinearGradient
            colors={
              isDarkMode
                ? ['transparent', 'rgba(20,24,23,0.85)', theme.background]
                : ['transparent', 'rgba(248,249,250,0.88)', theme.background]
            }
            locations={[0, 0.55, 1]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
            pointerEvents="none"
          />

          {/* Top Brand Logo */}
          <View className="absolute left-6 z-10" style={{ top: insets.top + 8 }}>
            <Brand animStyle={{ transform: [{ translateY: brandTranslateY }], opacity: brandOpacity }} />
          </View>
        </View>

        {/* BOTTOM CONTENT AREA */}
        <View className="flex-1 justify-end px-6 pb-4 pt-6">
          {/* ANIMATED HEADLINE & DESCRIPTION */}
          <View style={{ marginTop: 40 }}>
            <Animated.View
              style={{
                transform: [{ translateX: titleTranslateX }, { translateY: titleTranslateY }],
                opacity: titleOpacity,
              }}
            >
              <Text
                className="text-[35px] font-bold leading-[41px] tracking-[-0.8px]"
                style={{ color: theme.textPrimary }}
              >
                {slide.title}
              </Text>
            </Animated.View>

            <Animated.View
              style={{
                transform: [{ translateX: descTranslateX }, { translateY: descTranslateY }],
                opacity: descOpacity,
              }}
            >
              <Text className="mt-3 max-w-[340px] text-base leading-6" style={{ color: theme.textSecondary }}>
                {slide.description}
              </Text>
            </Animated.View>
          </View>

          {/* INDICATORS & ACTION BUTTONS */}
          <Animated.View
            style={{
              marginTop: 28,
              transform: [{ translateY: actionsTranslateY }],
              opacity: actionsOpacity,
            }}
          >
            {/* Step Indicators */}
            <View
              className="mb-5 flex-row items-center"
              accessibilityRole="tablist"
              accessibilityLabel={`Onboarding step ${slideIndex + 1} of ${SLIDES.length}`}
            >
              {SLIDES.map((_, index) => {
                const isSelected = index === slideIndex;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => goToSlide(index)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to step ${index + 1}`}
                    className="mr-1.5 justify-center"
                  >
                    <View
                      className={`h-[5px] rounded-full ${isSelected ? 'w-9' : 'w-3'}`}
                      style={{
                        backgroundColor: isSelected
                          ? isDarkMode
                            ? '#A52B39'
                            : '#173D36'
                          : isDarkMode
                          ? '#3A4742'
                          : '#D8E0DE',
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action Buttons */}
            {finished ? (
              <Animated.View style={{ gap: 10, opacity: slideAnim }}>
                <TouchableOpacity
                  onPress={goSignUp}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Sign up"
                  className="items-center justify-center rounded-full"
                  style={{
                    height: 62,
                    flexShrink: 0,
                    backgroundColor: isDarkMode ? '#A52B39' : '#101B1A',
                  }}
                >
                  <Text className="text-base font-bold text-white">Sign Up</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={goLogin}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in"
                  className="items-center justify-center rounded-full border"
                  style={{
                    height: 62,
                    flexShrink: 0,
                    backgroundColor: theme.inputBg,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <Text className="text-base font-bold" style={{ color: theme.textPrimary }}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <TouchableOpacity
                onPress={next}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Next introduction"
                className="h-[62px] items-center justify-center rounded-full"
                style={{ backgroundColor: isDarkMode ? '#A52B39' : '#101B1A' }}
              >
                <Text className="text-base font-bold text-white">Next</Text>
                <View
                  className="absolute right-1.5 h-[49px] w-[49px] items-center justify-center rounded-full"
                  style={{ backgroundColor: isDarkMode ? '#DCEAE5' : '#FFFFFF' }}
                >
                  <Ionicons name="arrow-forward" size={19} color="#101B1A" />
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
