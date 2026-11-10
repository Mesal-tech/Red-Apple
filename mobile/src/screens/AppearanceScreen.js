import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function AppearanceScreen({ onBack, navigation }) {
  const {
    theme,
    isDarkMode,
    themeMode,
    setThemeMode,
  } = useTheme();

  const handleBack = onBack || (() => navigation?.goBack?.());
  const activeTheme = themeMode; // 'system' | 'light' | 'dark'
  const primaryAccent = '#DC2626';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.cardBorder,
          backgroundColor: theme.card,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
            backgroundColor: theme.subtleSurface,
            borderWidth: 1,
            borderColor: theme.cardBorder,
          }}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary }}>
          Appearance
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Label: THEME */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: theme.textMuted,
            marginBottom: 16,
          }}
        >
          Theme
        </Text>

        {/* 3-Card Theme Selector */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          {/* 1. SYSTEM CARD (Default) */}
          <TouchableOpacity
            type="button"
            activeOpacity={0.85}
            onPress={() => setThemeMode('system')}
            style={{ flex: 1, alignItems: 'center' }}
            accessibilityRole="radio"
            accessibilityState={{ selected: activeTheme === 'system' }}
            accessibilityLabel="System theme"
          >
            <View
              style={{
                width: '100%',
                aspectRatio: 1 / 1.42,
                borderRadius: 18,
                overflow: 'hidden',
                flexDirection: 'row',
                borderWidth: activeTheme === 'system' ? 2.5 : 1,
                borderColor: activeTheme === 'system' ? primaryAccent : theme.cardBorder,
                backgroundColor: theme.card,
              }}
            >
              {/* Left half: Light preview */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  padding: 8,
                  justifyContent: 'space-between',
                  borderRightWidth: 1,
                  borderRightColor: '#E2E8F0',
                }}
              >
                <View style={{ width: '100%' }}>
                  <View
                    style={{
                      height: 22,
                      borderRadius: 6,
                      backgroundColor: primaryAccent,
                      width: '100%',
                    }}
                  />
                  <View
                    style={{
                      height: 4,
                      width: '80%',
                      borderRadius: 2,
                      backgroundColor: '#E2E8F0',
                      marginTop: 7,
                    }}
                  />
                  <View
                    style={{
                      height: 4,
                      width: '60%',
                      borderRadius: 2,
                      backgroundColor: '#E2E8F0',
                      marginTop: 4,
                    }}
                  />
                </View>
                <View
                  style={{
                    height: 18,
                    width: '100%',
                    borderRadius: 6,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                />
              </View>

              {/* Right half: Dark preview */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#101321',
                  padding: 8,
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ width: '100%' }}>
                  <View
                    style={{
                      height: 22,
                      borderRadius: 6,
                      backgroundColor: primaryAccent,
                      width: '100%',
                    }}
                  />
                  <View
                    style={{
                      height: 4,
                      width: '80%',
                      borderRadius: 2,
                      backgroundColor: '#25283E',
                      marginTop: 7,
                    }}
                  />
                  <View
                    style={{
                      height: 4,
                      width: '60%',
                      borderRadius: 2,
                      backgroundColor: '#25283E',
                      marginTop: 4,
                    }}
                  />
                </View>
                <View
                  style={{
                    height: 18,
                    width: '100%',
                    borderRadius: 6,
                    backgroundColor: '#181B2D',
                  }}
                />
              </View>
            </View>

            {/* Radio + Label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 7 }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: activeTheme === 'system' ? primaryAccent : (isDarkMode ? '#4A5568' : '#CBD5E1'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeTheme === 'system' && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: primaryAccent,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: '700',
                  color: activeTheme === 'system' ? theme.textPrimary : theme.textSecondary,
                }}
              >
                System
              </Text>
            </View>
          </TouchableOpacity>

          {/* 2. LIGHT CARD */}
          <TouchableOpacity
            type="button"
            activeOpacity={0.85}
            onPress={() => setThemeMode('light')}
            style={{ flex: 1, alignItems: 'center' }}
            accessibilityRole="radio"
            accessibilityState={{ selected: activeTheme === 'light' }}
            accessibilityLabel="Light theme"
          >
            <View
              style={{
                width: '100%',
                aspectRatio: 1 / 1.42,
                borderRadius: 18,
                overflow: 'hidden',
                backgroundColor: '#F8F7F4',
                padding: 8,
                justifyContent: 'space-between',
                borderWidth: activeTheme === 'light' ? 2.5 : 1,
                borderColor: activeTheme === 'light' ? primaryAccent : theme.cardBorder,
              }}
            >
              <View style={{ width: '100%' }}>
                <View
                  style={{
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: primaryAccent,
                    width: '100%',
                  }}
                />
                <View
                  style={{
                    height: 4,
                    width: '80%',
                    borderRadius: 2,
                    backgroundColor: '#E7E5DE',
                    marginTop: 7,
                  }}
                />
                <View
                  style={{
                    height: 4,
                    width: '60%',
                    borderRadius: 2,
                    backgroundColor: '#E7E5DE',
                    marginTop: 4,
                  }}
                />
              </View>
              <View
                style={{
                  height: 18,
                  width: '100%',
                  borderRadius: 6,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E7E5DE',
                }}
              />
            </View>

            {/* Radio + Label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 7 }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: activeTheme === 'light' ? primaryAccent : (isDarkMode ? '#4A5568' : '#CBD5E1'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeTheme === 'light' && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: primaryAccent,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: '700',
                  color: activeTheme === 'light' ? theme.textPrimary : theme.textSecondary,
                }}
              >
                Light
              </Text>
            </View>
          </TouchableOpacity>

          {/* 3. DARK CARD */}
          <TouchableOpacity
            type="button"
            activeOpacity={0.85}
            onPress={() => setThemeMode('dark')}
            style={{ flex: 1, alignItems: 'center' }}
            accessibilityRole="radio"
            accessibilityState={{ selected: activeTheme === 'dark' }}
            accessibilityLabel="Dark theme"
          >
            <View
              style={{
                width: '100%',
                aspectRatio: 1 / 1.42,
                borderRadius: 18,
                overflow: 'hidden',
                backgroundColor: '#101321',
                padding: 8,
                justifyContent: 'space-between',
                borderWidth: activeTheme === 'dark' ? 2.5 : 1,
                borderColor: activeTheme === 'dark' ? primaryAccent : theme.cardBorder,
              }}
            >
              <View style={{ width: '100%' }}>
                <View
                  style={{
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: primaryAccent,
                    width: '100%',
                  }}
                />
                <View
                  style={{
                    height: 4,
                    width: '80%',
                    borderRadius: 2,
                    backgroundColor: '#25283E',
                    marginTop: 7,
                  }}
                />
                <View
                  style={{
                    height: 4,
                    width: '60%',
                    borderRadius: 2,
                    backgroundColor: '#25283E',
                    marginTop: 4,
                  }}
                />
              </View>
              <View
                style={{
                  height: 18,
                  width: '100%',
                  borderRadius: 6,
                  backgroundColor: '#181B2D',
                }}
              />
            </View>

            {/* Radio + Label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 7 }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: activeTheme === 'dark' ? primaryAccent : (isDarkMode ? '#4A5568' : '#CBD5E1'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeTheme === 'dark' && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: primaryAccent,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: '700',
                  color: activeTheme === 'dark' ? theme.textPrimary : theme.textSecondary,
                }}
              >
                Dark
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Caption matching Tovira */}
        <Text
          style={{
            fontSize: 13.5,
            lineHeight: 20,
            color: theme.textSecondary,
            marginTop: 24,
          }}
        >
          System matches your phone&apos;s setting and switches automatically.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
