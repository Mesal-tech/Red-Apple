import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function PrivacyPolicyDetailScreen({ onBack }) {
  return (
    <SafeAreaView style={styles.detailContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      <View style={styles.detailHeader}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.detailScrollContent}>
        <Text style={styles.docLastUpdated}>Last Updated: July 2026</Text>

        <Text style={styles.docSectionTitle}>1. Data Protection & Zero-Knowledge Architecture</Text>
        <Text style={styles.docParagraph}>
          At Red Apple, your reproductive health data is protected using zero-knowledge encryption principles. Your sensitive cycle logs, symptom entries, and fertility notes are encrypted on your local device before transmission.
        </Text>

        <Text style={styles.docSectionTitle}>2. Information We Collect</Text>
        <Text style={styles.docParagraph}>
          We collect essential account details (such as email address) and user-submitted reproductive health parameters required to deliver cycle forecasts, ovulation windows, and telemedicine connections.
        </Text>

        <Text style={styles.docSectionTitle}>3. How Your Information Is Used</Text>
        <Text style={styles.docParagraph}>
          Your health data is exclusively processed to calculate personalized cycle insights and connect you with licensed healthcare professionals. We strictly prohibit selling your personal data to third-party advertisers.
        </Text>

        <Text style={styles.docSectionTitle}>4. Data Rights & Control</Text>
        <Text style={styles.docParagraph}>
          You retain full ownership of your data. You may request a complete export of your encrypted health records or request permanent deletion of your account at any time through the app settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  detailContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  docLastUpdated: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 20,
  },
  docSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  docParagraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444444',
    marginBottom: 16,
  },
});
