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
  useWindowDimensions,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGoogleAuth } from '../services/googleAuth';
import * as AppleAuthentication from 'expo-apple-authentication';
import TermsOfUseDetailScreen from './TermsOfUseDetailScreen';
import PrivacyPolicyDetailScreen from './PrivacyPolicyDetailScreen';

export default function SignUpScreen({ onBack, onNavigateLogin, onSignUpSuccess }) {
  const { register, loginApple, loginGoogle } = useAuth();
  const { showError, showSuccess } = useToast();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Platform.OS === 'web' ? Math.min(windowWidth, 480) : windowWidth;
  const headerHeight = Math.min(Math.round(screenWidth * (830 / 1200)), 280);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

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
      await register(email.trim(), password);
      showSuccess('Account created successfully!');
      if (onSignUpSuccess) {
        onSignUpSuccess();
      }
    } catch (err) {
      showError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
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
        showSuccess('Signed in with Apple!');
        if (onSignUpSuccess) onSignUpSuccess();
      }
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        showError(e.message || 'Apple authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
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
          <View style={[styles.headerContainer, { height: headerHeight }]}>
            <Image
              source={require('../../assets/top_wave_bg.png')}
              style={[styles.headerWaveBg, { height: headerHeight }]}
              resizeMode="stretch"
            />

            <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafeArea}>
              <View style={styles.topNavBar}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={onBack}
                  style={styles.backCircleBtn}
                >
                  <Ionicons name="chevron-back" size={20} color="#FFFFFF" style={{ marginRight: 2 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onNavigateLogin}
                  style={styles.signInHeaderBtn}
                >
                  <Ionicons name="log-in-outline" size={19} color="#000000" />
                  <Text style={styles.signInHeaderText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>

          {/* LOWER SECTION */}
          <View style={styles.darkSection}>

            {/* EMAIL INPUT */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.pillInputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color="rgba(255, 255, 255, 0.6)"
                  style={styles.inputLeftIcon}
                />
                <TextInput
                  style={styles.pillTextInput}
                  placeholder="amara@example.com"
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
              <Text style={styles.inputLabel}>Password (8+ Characters)</Text>
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

            {/* TERMS & PRIVACY CHECKBOX & LINKS */}
            <View style={styles.termsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.checkboxBox, agreeTerms && styles.checkboxBoxChecked]}
                onPress={() => setAgreeTerms(!agreeTerms)}
              >
                {agreeTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                <Text onPress={() => setAgreeTerms(!agreeTerms)}>I agree to the </Text>
                <Text
                  style={styles.termsLink}
                  onPress={() => setShowTermsModal(true)}
                >
                  Terms of Service
                </Text>
                <Text onPress={() => setAgreeTerms(!agreeTerms)}> and </Text>
                <Text
                  style={styles.termsLink}
                  onPress={() => setShowPrivacyModal(true)}
                >
                  Privacy Policy
                </Text>
                <Text onPress={() => setAgreeTerms(!agreeTerms)}>.</Text>
              </Text>
            </View>

            {/* SIGN UP PILL BUTTON */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.signUpPillButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* SOCIAL SIGN UP */}
            <View style={styles.socialContainer}>
              <Text style={styles.socialPromptText}>or sign up with</Text>

              <View style={styles.socialRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.socialPillBtn}
                  onPress={handleGoogleAuth}
                  disabled={loading}
                >
                  <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.socialPillBtn}
                  onPress={handleAppleAuth}
                  disabled={loading}
                >
                  <Ionicons name="logo-apple" size={19} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ALREADY HAVE ACCOUNT */}
            <View style={styles.bottomPromptRow}>
              <Text style={styles.bottomPromptText}>Already have an account?</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={onNavigateLogin}>
                <Text style={styles.bottomPromptLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* TERMS OF SERVICE MODAL */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <TermsOfUseDetailScreen onBack={() => setShowTermsModal(false)} />
      </Modal>

      {/* PRIVACY POLICY MODAL */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <PrivacyPolicyDetailScreen onBack={() => setShowPrivacyModal(false)} />
      </Modal>
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
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  glassmorphismOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  headerContainer: {
    width: '100%',
    position: 'relative',
  },
  headerWaveBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
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
  signInHeaderBtn: {
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
  signInHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },
  darkSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
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
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 7,
    marginLeft: 4,
  },
  pillInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 18,
    height: 52,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxBoxChecked: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  signUpPillButton: {
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
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  socialContainer: {
    alignItems: 'center',
    marginTop: 22,
  },
  socialPromptText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 14,
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
    marginTop: 24,
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
