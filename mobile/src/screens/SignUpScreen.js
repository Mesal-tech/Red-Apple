import React, { useState } from 'react';
import {
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useGoogleAuth } from '../services/googleAuth';
import GoogleLogo from '../components/GoogleLogo';
import * as AppleAuthentication from 'expo-apple-authentication';
import TermsOfUseDetailScreen from './TermsOfUseDetailScreen';
import PrivacyPolicyDetailScreen from './PrivacyPolicyDetailScreen';

export default function SignUpScreen({ onBack, onNavigateLogin, onSignUpSuccess, navigation }) {
  const { register, loginApple, loginGoogle } = useAuth();
  const { showError, showSuccess } = useToast();
  const { theme, isDarkMode: isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const { signInWithGoogle } = useGoogleAuth({
    onTokenSuccess: async (idToken) => {
      setLoading(true);
      try {
        await loginGoogle(idToken);
        showSuccess('Account registered with Google!');
        if (onSignUpSuccess) onSignUpSuccess();
      } catch (err) {
        showError(err.message || 'Google registration failed.');
      } finally {
        setLoading(false);
      }
    },
    onError: (msg) => {
      showError(msg);
    },
  });

  const handleRegister = async () => {
    if (!email.trim() || !email.includes('@')) {
      showError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters long.');
      return;
    }

    if (!agreeTerms) {
      showError('Please accept the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: email.trim(),
        password,
      });

      showSuccess('Account created successfully! Welcome!');
      if (onSignUpSuccess) {
        onSignUpSuccess();
      }
    } catch (err) {
      showError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        showError('Apple Sign-In is only available on iOS devices.');
        return;
      }

      setLoading(true);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        await loginApple(credential.identityToken, credential.fullName);
        showSuccess('Registered with Apple!');
        if (onSignUpSuccess) onSignUpSuccess();
      }
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        showError(e.message || 'Apple registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showError(err.message || 'Google registration failed.');
    }
  };

  const handleGoBack = () => {
    if (onBack) onBack();
    else if (navigation?.canGoBack && navigation.canGoBack()) navigation.goBack();
    else if (navigation?.navigate) navigation.navigate('Onboarding');
  };

  const handleGoLogin = () => {
    if (onNavigateLogin) onNavigateLogin();
    else if (navigation?.navigate) navigation.navigate('Login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 24,
              paddingBottom: 24,
              width: '100%',
              maxWidth: 480,
              alignSelf: 'center',
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Navigation Bar */}
            <View className="flex-row items-center pt-2 pb-4">
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleGoBack}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
              </TouchableOpacity>

              <Text className="ml-3 text-xs font-bold uppercase tracking-[2px]" style={{ color: theme.textMuted }}>Red Apple Health</Text>
            </View>

            {/* Header Identity */}
            <View className="mt-4 mb-6">
              <Text style={{ fontSize: 35, lineHeight: 41, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.8 }}>
                Create Your Account
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '400', color: theme.textSecondary, lineHeight: 24, marginTop: 8 }}>
                Create an account for personalized care.
              </Text>
            </View>

            {/* Form Fields */}
            <View className="gap-4">
              {/* Email Input */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, marginLeft: 4 }}>
                  Email Address
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 56,
                    backgroundColor: theme.inputBg,
                    borderRadius: 28,
                    borderWidth: 1,
                    borderColor: isDark ? theme.inputBorder : '#D7DCE0',
                    paddingHorizontal: 16,
                  }}
                >
                  <Ionicons name="mail-outline" size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: theme.textPrimary, fontWeight: '600', marginLeft: 12 }}
                    placeholder="name@example.com"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, marginLeft: 4 }}>
                  Create Password
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 56,
                    backgroundColor: theme.inputBg,
                    borderRadius: 28,
                    borderWidth: 1,
                    borderColor: isDark ? theme.inputBorder : '#D7DCE0',
                    paddingHorizontal: 16,
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: theme.textPrimary, fontWeight: '600', marginLeft: 12 }}
                    placeholder="At least 8 characters"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowPassword(!showPassword)}
                    className="p-1"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, color: theme.textMuted, marginLeft: 8, marginTop: 4 }}>
                  Minimum 8 characters with letters & numbers
                </Text>
              </View>

              {/* Terms of Service & Privacy Checkbox */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAgreeTerms(!agreeTerms)}
                className="flex-row items-start gap-2.5 mt-1 px-1"
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                    borderWidth: 1,
                    backgroundColor: agreeTerms ? '#DC2626' : theme.inputBg,
                    borderColor: agreeTerms ? '#DC2626' : theme.cardBorder,
                  }}
                >
                  {agreeTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>

                <View className="flex-1">
                  <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18, fontWeight: '500' }}>
                    I agree to the{' '}
                    <Text
                      className="text-red-600 font-bold underline"
                      onPress={() => setShowTermsModal(true)}
                    >
                      Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text
                      className="text-red-600 font-bold underline"
                      onPress={() => setShowPrivacyModal(true)}
                    >
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Primary Sign Up Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              className="h-[62px] rounded-full items-center justify-center mt-6 mb-5"
              style={{
                backgroundColor: !agreeTerms
                  ? (isDark ? '#3A4742' : '#D1D5DB')
                  : (isDark ? '#A52B39' : '#101B1A'),
                opacity: !agreeTerms ? 0.6 : 1,
              }}
              onPress={handleRegister}
              disabled={loading || !agreeTerms}
            >
              {loading ? (
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#FFFFFF" size="small" /></View>
              ) : (
                <>
                  <Text className="text-base font-bold text-white">Create Account</Text>
                  <View
                    className="absolute right-1.5 h-[49px] w-[49px] items-center justify-center rounded-full"
                    style={{
                      backgroundColor: !agreeTerms
                        ? (isDark ? '#26302C' : '#E5E7EB')
                        : (isDark ? '#DCEAE5' : '#FFFFFF'),
                    }}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={19}
                      color={!agreeTerms ? (isDark ? '#6B7280' : '#9CA3AF') : '#101B1A'}
                    />
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Social Authentication */}
            <View className="items-center my-4">
              <View className="flex-row items-center w-full my-2">
                <View style={{ flex: 1, height: 1, backgroundColor: theme.cardBorder }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted, paddingHorizontal: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Or register with
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: theme.cardBorder }} />
              </View>

              <View className="flex-row gap-3 w-full mt-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    height: 48,
                    backgroundColor: theme.card,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  onPress={handleGoogleAuth}
                  disabled={loading}
                >
                  <GoogleLogo size={18} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    height: 48,
                    backgroundColor: theme.card,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  onPress={handleAppleAuth}
                  disabled={loading}
                >
                  <Ionicons name="logo-apple" size={19} color={isDark ? '#FFFFFF' : '#000000'} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
          <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }} className="flex-row items-center justify-center gap-1.5">
            <Text style={{ fontSize: 14, color: theme.textMuted, fontWeight: '500' }}>Already have an account?</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={handleGoLogin}>
              <Text className="text-sm font-bold text-red-600">Sign In</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Terms of Use Modal */}
        <Modal
          visible={showTermsModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowTermsModal(false)}
        >
          <TermsOfUseDetailScreen onBack={() => setShowTermsModal(false)} />
        </Modal>

        {/* Privacy Policy Modal */}
        <Modal
          visible={showPrivacyModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPrivacyModal(false)}
        >
          <PrivacyPolicyDetailScreen onBack={() => setShowPrivacyModal(false)} />
        </Modal>
      </SafeAreaView>
    </View>
  );
}
