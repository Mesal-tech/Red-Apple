import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function TermsOfUseDetailScreen({ onBack }) {
  return (
    <SafeAreaView style={styles.detailContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      <View style={styles.detailHeader}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Terms of Use</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.detailScrollContent}>
        <Text style={styles.docLastUpdated}>Last Updated: July 2026</Text>

        <Text style={styles.docSectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.docParagraph}>
          By creating an account or accessing the Red Apple platform, you agree to comply with and be bound by these Terms of Use and all applicable health regulatory guidelines.
        </Text>

        <Text style={styles.docSectionTitle}>2. Medical Disclaimer</Text>
        <Text style={styles.docParagraph}>
          Red Apple provides digital health tracking and educational insights. Content provided within the app is for informational purposes only and does not substitute professional medical advice, diagnosis, or treatment by a licensed physician.
        </Text>

        <Text style={styles.docSectionTitle}>3. Telemedicine Services</Text>
        <Text style={styles.docParagraph}>
          Telemedicine consultations booked through Red Apple are conducted by independent licensed healthcare practitioners. Users are responsible for providing accurate medical history during consultations.
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
