import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { verifyConsultationPayment } from '../services/paymentService';

export default function PaystackCheckoutModal({
  visible,
  authorizationUrl,
  reference,
  amount,
  doctorName = 'Consulting Specialist',
  onSuccess,
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const webViewRef = useRef(null);

  const [selectedMethod, setSelectedMethod] = useState('card');

  if (!visible) return null;

  const isMockUrl = !authorizationUrl || authorizationUrl.includes('mock_') || authorizationUrl.includes('sandbox');

  const handleVerify = async (refToVerify) => {
    try {
      setVerifying(true);
      const res = await verifyConsultationPayment(refToVerify || reference);
      setVerifying(false);
      if (res.success && res.verified) {
        onSuccess(res.booking, res.payment);
      } else {
        Alert.alert('Payment Status', res.message || 'Payment was declined or cancelled.');
        onClose();
      }
    } catch (err) {
      setVerifying(false);
      Alert.alert('Verification Error', err.message || 'Failed to verify transaction.');
      onClose();
    }
  };

  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    if (!url) return;

    // Detect callback or redirect containing transaction reference
    if (
      url.includes('callback') ||
      url.includes('trxref=') ||
      url.includes('reference=') ||
      url.includes('checkout.paystack.com/success')
    ) {
      let matchedRef = reference;
      try {
        const urlObj = new URL(url);
        matchedRef = urlObj.searchParams.get('reference') || urlObj.searchParams.get('trxref') || reference;
      } catch (e) {
        const match = url.match(/[?&](reference|trxref)=([^&]+)/);
        if (match) matchedRef = decodeURIComponent(match[2]);
      }
      handleVerify(matchedRef);
    } else if (url.includes('checkout.paystack.com/cancel') || url.includes('cancelled')) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.securityBadge}>
              <Ionicons name="lock-closed" size={14} color="#059669" />
              <Text style={styles.securityText}>Paystack Secure Checkout</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Consultation with {doctorName}
            </Text>
            <Text style={styles.amountText}>
              ₦{Number(amount || 15000).toLocaleString()} NGN
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Verifying Overlay */}
        {verifying && (
          <View style={styles.verifyingOverlay}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.verifyingTitle}>Verifying Payment...</Text>
            <Text style={styles.verifyingSubtitle}>
              Confirming your appointment with {doctorName}. Please hold on.
            </Text>
          </View>
        )}

        {/* Mock / Dev Interactive Simulator */}
        {isMockUrl && !verifying ? (
          <View style={styles.mockContainer}>
            <View style={styles.mockCard}>
              <View style={styles.mockBadge}>
                <Ionicons name="shield-checkmark" size={20} color="#059669" />
                <Text style={styles.mockBadgeText}>Paystack Sandbox Mode</Text>
              </View>
              <Text style={styles.mockTitle}>Red Apple Healthcare Checkout</Text>
              <Text style={styles.mockDesc}>
                Select your payment method below and click "Confirm & Pay" to complete booking:
              </Text>

              <View style={styles.paymentMethodsList}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    selectedMethod === 'card' && styles.methodButtonActive,
                  ]}
                  onPress={() => setSelectedMethod('card')}
                >
                  <View style={[styles.methodIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="card" size={20} color="#2563EB" />
                  </View>
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodName}>Debit / Credit Card</Text>
                    <Text style={styles.methodSub}>Mastercard, Visa, Verve</Text>
                  </View>
                  <Ionicons
                    name={selectedMethod === 'card' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedMethod === 'card' ? '#DC2626' : '#9CA3AF'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    selectedMethod === 'bank' && styles.methodButtonActive,
                  ]}
                  onPress={() => setSelectedMethod('bank')}
                >
                  <View style={[styles.methodIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="business" size={20} color="#059669" />
                  </View>
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodName}>Bank Transfer</Text>
                    <Text style={styles.methodSub}>Instant Virtual Account</Text>
                  </View>
                  <Ionicons
                    name={selectedMethod === 'bank' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedMethod === 'bank' ? '#DC2626' : '#9CA3AF'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    selectedMethod === 'ussd' && styles.methodButtonActive,
                  ]}
                  onPress={() => setSelectedMethod('ussd')}
                >
                  <View style={[styles.methodIcon, { backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="keypad" size={20} color="#D97706" />
                  </View>
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodName}>USSD Banking</Text>
                    <Text style={styles.methodSub}>GTBank, Zenith, Access, UBA</Text>
                  </View>
                  <Ionicons
                    name={selectedMethod === 'ussd' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedMethod === 'ussd' ? '#DC2626' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              </View>

              {/* Card preview if card selected */}
              {selectedMethod === 'card' && (
                <View style={styles.cardInputSim}>
                  <View style={styles.cardSimRow}>
                    <Ionicons name="card-outline" size={16} color="#6B7280" />
                    <Text style={styles.cardSimNumber}>•••• •••• •••• 4242</Text>
                    <Text style={styles.cardSimBrand}>VISA</Text>
                  </View>
                  <View style={styles.cardSimMetaRow}>
                    <Text style={styles.cardSimMeta}>Expires: 12/28</Text>
                    <Text style={styles.cardSimMeta}>CVV: •••</Text>
                  </View>
                </View>
              )}

              {/* Action Buttons: Pay vs Cancel */}
              <TouchableOpacity
                style={styles.simulateSuccessBtn}
                onPress={() => handleVerify(reference)}
              >
                <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.simulateSuccessText}>
                  Confirm & Pay ₦{Number(amount || 15000).toLocaleString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelPaymentBtn}
                onPress={onClose}
              >
                <Text style={styles.cancelPaymentText}>Cancel & Pay Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.simulateFailBtn}
                onPress={() => handleVerify('mock_fail_' + reference)}
              >
                <Text style={styles.simulateFailText}>Simulate Declined Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Live Paystack WebView */
          <View style={styles.webviewWrapper}>
            {loading && !verifying && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#DC2626" />
                <Text style={styles.loadingText}>Loading secure checkout...</Text>
              </View>
            )}
            <WebView
              ref={webViewRef}
              source={{ uri: authorizationUrl }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onNavigationStateChange={handleNavigationStateChange}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              style={styles.webview}
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webviewWrapper: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    paddingHorizontal: 32,
  },
  verifyingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 16,
  },
  verifyingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  mockContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  mockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  mockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  mockTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  mockDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 20,
  },
  paymentMethodsList: {
    gap: 12,
    marginBottom: 24,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  methodIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  methodSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  methodButtonActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  cardInputSim: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 16,
  },
  cardSimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardSimNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 1,
  },
  cardSimBrand: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  cardSimMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardSimMeta: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  simulateSuccessBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  simulateSuccessText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelPaymentBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  cancelPaymentText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  simulateFailBtn: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  simulateFailText: {
    color: '#9CA3AF',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
