import React from 'react';
import { Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function PrivacyPolicyDetailScreen({ onBack, navigation }) {
  const { theme, isDark } = useTheme();
  const handleBack = onBack || (() => navigation?.goBack?.());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />

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
            backgroundColor: theme.backgroundSecondary,
            borderWidth: 1,
            borderColor: theme.cardBorder,
          }}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textPrimary }}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textMuted, marginBottom: 20 }}>Last Updated: July 2026</Text>

        <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, marginTop: 16, marginBottom: 8 }}>
          1. Data Protection & Zero-Knowledge Architecture
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 24, color: theme.textSecondary, marginBottom: 16 }}>
          At Red Apple, your reproductive health data is protected using zero-knowledge encryption principles. Your sensitive cycle logs, symptom entries, and fertility notes are encrypted on your local device before transmission.
        </Text>

        <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, marginTop: 16, marginBottom: 8 }}>
          2. Information We Collect
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 24, color: theme.textSecondary, marginBottom: 16 }}>
          We collect essential account details (such as email address) and user-submitted reproductive health parameters required to deliver cycle forecasts, ovulation windows, and telemedicine connections.
        </Text>

        <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, marginTop: 16, marginBottom: 8 }}>
          3. How Your Information Is Used
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 24, color: theme.textSecondary, marginBottom: 16 }}>
          Your health data is exclusively processed to calculate personalized cycle insights and connect you with licensed healthcare professionals. We strictly prohibit selling your personal data to third-party advertisers.
        </Text>

        <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, marginTop: 16, marginBottom: 8 }}>
          4. Data Rights & Control
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 24, color: theme.textSecondary, marginBottom: 16 }}>
          You retain full ownership of your data. You may request a complete export of your encrypted health records or request permanent deletion of your account at any time through the app settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
