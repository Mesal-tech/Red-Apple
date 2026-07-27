import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import PrivacyPolicyDetailScreen from './PrivacyPolicyDetailScreen';
import TermsOfUseDetailScreen from './TermsOfUseDetailScreen';

export default function PrivacyScreen({ onAccept }) {
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null); // 'privacy' | 'terms' | null

  const isValid = check1 && check2;

  const handleAcceptAll = () => {
    setCheck1(true);
    setCheck2(true);
  };

  if (activeDoc === 'privacy') {
    return <PrivacyPolicyDetailScreen onBack={() => setActiveDoc(null)} />;
  }

  if (activeDoc === 'terms') {
    return <TermsOfUseDetailScreen onBack={() => setActiveDoc(null)} />;
  }

  return (
    <SafeAreaView style={styles.privacyContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      <ScrollView contentContainerStyle={styles.privacyScrollContent}>
        <Text style={styles.privacyTitle}>Privacy first</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.checkboxRow}
          onPress={() => setCheck1(!check1)}
        >
          <View style={[styles.checkbox, check1 && styles.checkboxSelected]}>
            {check1 && <Ionicons name="checkmark" size={16} color={colors.textLight} />}
          </View>
          <Text style={styles.checkboxText}>
            I agree to{' '}
            <Text style={styles.linkText} onPress={() => setActiveDoc('privacy')}>
              Privacy Policy
            </Text>{' '}
            and{' '}
            <Text style={styles.linkText} onPress={() => setActiveDoc('terms')}>
              Terms of Use
            </Text>
            .
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.checkboxRow}
          onPress={() => setCheck2(!check2)}
        >
          <View style={[styles.checkbox, check2 && styles.checkboxSelected]}>
            {check2 && <Ionicons name="checkmark" size={16} color={colors.textLight} />}
          </View>
          <View style={styles.checkboxTextContainer}>
            <Text style={styles.checkboxText}>
              I agree to processing of my health data for providing me Red Apple platform services.
            </Text>
            <Text style={styles.subLinkText}>
              Learn more in{' '}
              <Text style={styles.linkText} onPress={() => setActiveDoc('privacy')}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.privacyBottomActions}>
        <TouchableOpacity activeOpacity={0.7} onPress={handleAcceptAll}>
          <Text style={styles.acceptAllText}>Accept all</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={isValid ? 0.85 : 1}
          disabled={!isValid}
          style={[styles.nextButton, isValid ? styles.nextButtonActive : styles.nextButtonDisabled]}
          onPress={onAccept}
        >
          <Text style={[styles.nextButtonText, isValid ? styles.nextTextActive : styles.nextTextDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  privacyContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  privacyScrollContent: {
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 24,
  },
  privacyTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: -0.5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
    gap: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#222222',
    fontWeight: '400',
  },
  subLinkText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#222222',
    marginTop: 4,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  privacyBottomActions: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
  },
  acceptAllText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 20,
  },
  nextButton: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  nextButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '800',
  },
  nextTextDisabled: {
    color: colors.textLight,
  },
  nextTextActive: {
    color: colors.textLight,
  },
});
