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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useGoogleAuth } from '../services/googleAuth';
import GoogleLogo from '../components/GoogleLogo';
import ForgotPasswordModal from './ForgotPasswordModal';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function LoginScreen({ onBack, onNavigateSignUp, onLoginSuccess, navigation }) {
  const { login, loginApple, loginGoogle } = useAuth();
  const { showError, showSuccess } = useToast();
  const { theme, isDarkMode: isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { signInWithGoogle } = useGoogleAuth({
    onTokenSuccess: async (idToken) => {
      setLoading(true);
      try {
        await loginGoogle(idToken);
        showSuccess('Welcome back!');
        if (onLoginSuccess) onLoginSuccess();
      } catch (err) {
        showError(err.message || 'Google sign-in failed.');
      } finally {
        setLoading(false);
      }
    },
    onError: (msg) => {
      showError(msg);
    },
  });

  const handleLogin = async () => {
    if (!email.trim()) {
      showError('Please enter your email address.');
      return;
    }

    if (!password) {
      showError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      await login(email.trim(), password);
      showSuccess('Welcome back to Red Apple!');
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      showError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        showError('Apple Sign-In is only available on supported iOS devices.');
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
        showSuccess('Logged in with Apple!');
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        showError(e.message || 'Apple authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showError(err.message || 'Google sign-in failed.');
    }
  };

  const handleGoBack = () => {
    if (onBack) onBack();
    else if (navigation?.canGoBack && navigation.canGoBack()) navigation.goBack();
    else if (navigation?.navigate) navigation.navigate('Onboarding');
  };

  const handleGoSignUp = () => {
    if (onNavigateSignUp) onNavigateSignUp();
    else if (navigation?.navigate) navigation.navigate('SignUp');
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
            </View>

            {/* Header Identity */}
            <View className="mt-4 mb-6">
              <Text style={{ fontSize: 35, lineHeight: 41, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.8 }}>
                Welcome Back
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '400', color: theme.textSecondary, lineHeight: 24, marginTop: 8 }}>
                Sign in to continue your health journey.
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
                <View className="flex-row items-center justify-between mb-1.5 px-1">
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary }}>Password</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowForgotModal(true)}
                  >
                    <Text className="text-xs font-bold text-red-600">Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

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
                    placeholder="Enter your password"
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
              </View>
            </View>

            {/* Primary Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              className="h-[62px] rounded-full items-center justify-center mt-6 mb-5"
              style={{ backgroundColor: isDark ? '#A52B39' : '#101B1A' }}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#FFFFFF" size="small" /></View>
              ) : (
                <>
                  <Text className="text-base font-bold text-white">Sign In</Text>
                  <View className="absolute right-1.5 h-[49px] w-[49px] items-center justify-center rounded-full" style={{ backgroundColor: isDark ? '#DCEAE5' : '#FFFFFF' }}><Ionicons name="arrow-forward" size={19} color="#101B1A" /></View>
                </>
              )}
            </TouchableOpacity>

            {/* Social Authentication */}
            <View className="items-center my-4">
              <View className="flex-row items-center w-full my-2">
                <View style={{ flex: 1, height: 1, backgroundColor: theme.cardBorder }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted, paddingHorizontal: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Or continue with
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
                  onPress={handleGoogleLogin}
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
                  onPress={handleAppleLogin}
                  disabled={loading}
                >
                  <Ionicons name="logo-apple" size={19} color={isDark ? '#FFFFFF' : '#000000'} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
          <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }} className="flex-row items-center justify-center gap-1.5">
            <Text style={{ fontSize: 14, color: theme.textMuted, fontWeight: '500' }}>Don't have an account?</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={handleGoSignUp}>
              <Text className="text-sm font-bold text-red-600">Create Account</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          visible={showForgotModal}
          onClose={() => setShowForgotModal(false)}
          onSuccess={() => {
            if (onLoginSuccess) onLoginSuccess();
          }}
        />
      </SafeAreaView>
    </View>
  );
}
