import React, { useEffect, useRef, useState } from 'react';
import './global.css';
import { Image, View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootContent() {
  const { isDarkMode, theme } = useTheme();
  const [showBrandSplash, setShowBrandSplash] = useState(true);
  const nativeSplashHidden = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowBrandSplash(false), 1100);
    return () => clearTimeout(timer);
  }, []);

  const hideNativeSplash = () => {
    if (nativeSplashHidden.current) return;
    nativeSplashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  };

  return (
    <>
      <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: theme.background }}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        <AppNavigator />
      </View>
      {showBrandSplash && (
        <LinearGradient
          colors={['#F04452', '#C81E3A']}
          start={{ x: 0.12, y: 0 }}
          end={{ x: 0.88, y: 1 }}
          onLayout={hideNativeSplash}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}
        >
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <Image
            source={require('./assets/splash-wordmark.png')}
            resizeMode="contain"
            accessibilityLabel="Red Apple"
            style={{ width: '84%', height: 96 }}
          />
        </LinearGradient>
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <ThemeProvider>
        <RootContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

