import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
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
      <SafeAreaView
        className="flex-1 bg-gray-50"
        style={Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight } : {}}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

        {/* Header Bar */}
        <View className="flex-row items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center space-x-1 mb-1">
              <Ionicons name="lock-closed" size={14} color="#059669" />
              <Text className="text-xs font-semibold text-emerald-600 ml-1">Paystack Secure Checkout</Text>
            </View>
            <Text className="text-[15px] font-bold text-gray-900" numberOfLines={1}>
              Consultation with {doctorName}
            </Text>
            <Text className="text-base font-extrabold text-primary mt-0.5">
              ₦{Number(amount || 15000).toLocaleString()} NGN
            </Text>
          </View>
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Verifying Overlay */}
        {verifying && (
          <View className="absolute inset-0 bg-white/95 items-center justify-center z-50 px-8">
            <ActivityIndicator size="large" color="#DC2626" />
            <Text className="text-lg font-extrabold text-gray-900 mt-4">Verifying Payment...</Text>
            <Text className="text-sm text-gray-500 text-center mt-1.5 leading-5">
              Confirming your appointment with {doctorName}. Please hold on.
            </Text>
          </View>
        )}

        {/* Mock / Dev Interactive Simulator */}
        {isMockUrl && !verifying ? (
          <View className="flex-1 p-5 justify-center">
            <View className="bg-white rounded-[20px] p-6 max-w-[480px] w-full self-center shadow-lg border border-gray-200">
              <View className="flex-row items-center space-x-1.5 bg-emerald-50 self-start px-2.5 py-1 rounded-xl mb-3">
                <Ionicons name="shield-checkmark" size={20} color="#059669" />
                <Text className="text-xs font-bold text-emerald-600 ml-1">Paystack Sandbox Mode</Text>
              </View>
              <Text className="text-lg font-extrabold text-gray-900 mb-1.5">Red Apple Healthcare Checkout</Text>
              <Text className="text-[13px] text-gray-500 leading-[18px] mb-5">
                Select your payment method below and click "Confirm & Pay" to complete booking:
              </Text>

              <View className="gap-3 mb-6">
                <TouchableOpacity
                  className={`flex-row items-center p-3 rounded-[14px] border ${
                    selectedMethod === 'card' ? 'border-primary bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                  onPress={() => setSelectedMethod('card')}
                >
                  <View className="w-[38px] h-[38px] rounded-[10px] items-center justify-center mr-3 bg-blue-50">
                    <Ionicons name="card" size={20} color="#2563EB" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-800">Debit / Credit Card</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Mastercard, Visa, Verve</Text>
                  </View>
                  <Ionicons
                    name={selectedMethod === 'card' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedMethod === 'card' ? '#DC2626' : '#9CA3AF'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-row items-center p-3 rounded-[14px] border ${
                    selectedMethod === 'bank' ? 'border-primary bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                  onPress={() => setSelectedMethod('bank')}
                >
                  <View className="w-[38px] h-[38px] rounded-[10px] items-center justify-center mr-3 bg-emerald-50">
                    <Ionicons name="business" size={20} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-800">Bank Transfer</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Instant Virtual Account</Text>
                  </View>
                  <Ionicons
                    name={selectedMethod === 'bank' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedMethod === 'bank' ? '#DC2626' : '#9CA3AF'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-row items-center p-3 rounded-[14px] border ${
                    selectedMethod === 'ussd' ? 'border-primary bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                  onPress={() => setSelectedMethod('ussd')}
                >
                  <View className="w-[38px] h-[38px] rounded-[10px] items-center justify-center mr-3 bg-amber-50">
                    <Ionicons name="keypad" size={20} color="#D97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-800">USSD Banking</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">GTBank, Zenith, Access, UBA</Text>
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
                <View className="bg-gray-50 rounded-xl border border-gray-200 p-3 mb-4">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Ionicons name="card-outline" size={16} color="#6B7280" />
                    <Text className="text-sm font-bold text-gray-800 tracking-wider">•••• •••• •••• 4242</Text>
                    <Text className="text-xs font-extrabold text-blue-700">VISA</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[11px] text-gray-500 font-medium">Expires: 12/28</Text>
                    <Text className="text-[11px] text-gray-500 font-medium">CVV: •••</Text>
                  </View>
                </View>
              )}

              {/* Action Buttons: Pay vs Cancel */}
              <TouchableOpacity
                className="bg-primary rounded-[14px] py-3.5 items-center flex-row justify-center shadow-md"
                onPress={() => handleVerify(reference)}
              >
                <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white text-[15px] font-bold">
                  Confirm & Pay ₦{Number(amount || 15000).toLocaleString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-2.5 py-3 items-center rounded-[14px] bg-gray-100"
                onPress={onClose}
              >
                <Text className="text-gray-600 text-sm font-semibold">Cancel & Pay Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-2 py-2 items-center"
                onPress={() => handleVerify('mock_fail_' + reference)}
              >
                <Text className="text-gray-400 text-xs underline">Simulate Declined Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Live Paystack WebView */
          <View className="flex-1 relative">
            {loading && !verifying && (
              <View className="absolute inset-0 bg-white items-center justify-center z-10">
                <ActivityIndicator size="large" color="#DC2626" />
                <Text className="mt-3 text-sm text-gray-500 font-medium">Loading secure checkout...</Text>
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
              className="flex-1 bg-white"
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
