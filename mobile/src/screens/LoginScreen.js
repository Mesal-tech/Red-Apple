import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGoogleAuth } from '../services/googleAuth';
import ForgotPasswordModal from './ForgotPasswordModal';
import * as AppleAuthentication from 'expo-apple-authentication';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = SCREEN_WIDTH * (830 / 1200);

export default function LoginScreen({ onBack, onNavigateSignUp, onLoginSuccess }) {
  const { login, loginApple, loginGoogle } = useAuth();
  const { showError, showSuccess } = useToast();

  const [email, setEmail] = useState('amara@redapple.health');
  const [password, setPassword] = useState('Amara@2026');
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
      showSuccess('Logged in successfully!');
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
      showError(err.message);
    }
  };

  return (
    <LinearGradient
      colors={['#880E18', '#540810', '#220306', '#0C0103']}
      locations={[0, 0.35, 0.72, 1]}
      style={styles.screenWrapper}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* LIGHT GLASSMORPHISM TRANSLUCENT OVERLAY */}
      <View style={styles.glassmorphismOverlay} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER CONTAINER WITH EXACT SWIRL WAVE BACKGROUND */}
          <View style={styles.headerContainer}>
            <Image
              source={require('../../assets/top_wave_bg.png')}
              style={styles.headerWaveBg}
              resizeMode="stretch"
            />

            <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafeArea}>
              {/* TOP NAV BAR */}
              <View style={styles.topNavBar}>
                {/* ANGLE LEFT WITH CIRCULAR BACKGROUND */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={onBack}
                  style={styles.backCircleBtn}
                >
                  <Ionicons name="chevron-back" size={20} color="#FFFFFF" style={{ marginRight: 2 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onNavigateSignUp}
                  style={styles.signUpHeaderBtn}
                >
                  <Ionicons name="person-outline" size={19} color="#000000" />
                  <Text style={styles.signUpHeaderText}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {/* TITLE "Sign In" */}
              <View style={styles.titleWrapper}>
                <Text style={styles.signInTitle}>Sign In</Text>
              </View>
            </SafeAreaView>
          </View>

          {/* LOWER DARK SECTION */}
          <View style={styles.darkSection}>

            {/* EMAIL INPUT */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.pillInputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color="rgba(255, 255, 255, 0.6)"
                  style={styles.inputLeftIcon}
                />
                <TextInput
                  style={styles.pillTextInput}
                  placeholder="name@example.com"
                  placeholderTextColor="rgba(255, 255, 255, 0.45)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
            </View>

            {/* PASSWORD INPUT */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowForgotModal(true)}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pillInputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color="rgba(255, 255, 255, 0.6)"
                  style={styles.inputLeftIcon}
                />
                <TextInput
                  style={styles.pillTextInput}
                  placeholder="••••••••••••"
                  placeholderTextColor="rgba(255, 255, 255, 0.45)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={19}
                    color="rgba(255, 255, 255, 0.65)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* SIGN IN PILL BUTTON */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.signInPillButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.signInButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* SOCIAL SIGN IN */}
            <View style={styles.socialContainer}>
              <Text style={styles.socialPromptText}>or Sign In with</Text>

              <View style={styles.socialRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.socialPillBtn}
                  onPress={handleGoogleLogin}
                  disabled={loading}
                >
                  <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.socialPillBtn}
                  onPress={handleAppleLogin}
                  disabled={loading}
                >
                  <Ionicons name="logo-apple" size={19} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* DON'T HAVE ACCOUNT LINK */}
            <View style={styles.bottomPromptRow}>
              <Text style={styles.bottomPromptText}>Don't have an account?</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={onNavigateSignUp}>
                <Text style={styles.bottomPromptLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FORGOT PASSWORD MODAL */}
      <ForgotPasswordModal
        visible={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onSuccess={() => {
          if (onLoginSuccess) onLoginSuccess();
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: 'transparent',
    paddingBottom: 40,
  },
  glassmorphismOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  headerContainer: {
    width: '100%',
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  headerWaveBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: HEADER_HEIGHT,
  },
  headerSafeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 52,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'android' ? 12 : 6,
  },
  backCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0C0103',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  signUpHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  signUpHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },
  titleWrapper: {
    alignItems: 'center',
    marginBottom: 6,
  },
  signInTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  darkSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  errorAlertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.25)',
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  errorAlertText: {
    color: '#FFCDD2',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginLeft: 4,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  pillInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 18,
    height: 54,
  },
  inputLeftIcon: {
    marginRight: 12,
  },
  pillTextInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  signInPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 28,
    height: 54,
    gap: 8,
    marginTop: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  socialContainer: {
    alignItems: 'center',
    marginTop: 26,
  },
  socialPromptText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 16,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  socialPillBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  socialCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPromptRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 6,
  },
  bottomPromptText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  bottomPromptLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});
