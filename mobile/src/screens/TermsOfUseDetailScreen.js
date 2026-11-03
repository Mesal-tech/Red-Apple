import React from 'react';
import { Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function TermsOfUseDetailScreen({ onBack, navigation }) {
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
        <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textPrimary }}>Terms of Use</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textMuted, marginBottom: 20 }}>Last Updated: July 2026</Text>

        <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, marginTop: 16, marginBottom: 8 }}>
          1. Acceptance of Terms
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 24, color: theme.textSecondary, marginBottom: 16 }}>
          By creating an account or accessing the Red Apple platform, you agree to comply with and be bound by these Terms of Use and all applicable health regulatory guidelines.
        </Text>

        <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, marginTop: 16, marginBottom: 8 }}>
          2. Medical Disclaimer
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 24, color: theme.textSecondary, marginBottom: 16 }}>
          Red Apple provides digital health tracking and educational insights. Content provided within the app is for informational purposes only and does not substitute professional medical advice, diagnosis, or treatment by a licensed physician.
        </Text>

        <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, marginTop: 16, marginBottom: 8 }}>
          3. Telemedicine Services
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 24, color: theme.textSecondary, marginBottom: 16 }}>
          Telemedicine consultations booked through Red Apple are conducted by independent licensed healthcare practitioners. Users are responsible for providing accurate medical history during consultations.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
