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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function LoginScreen({ onBack, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={styles.loginContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.loginScrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity activeOpacity={0.7} style={styles.loginBackButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <View style={styles.signUpPromptRow}>
            <Text style={styles.signUpPromptText}>Don't have an account?</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={onBack}>
              <Text style={styles.signUpLinkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputPill}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="mail@domain.com"
                placeholderTextColor="#A0A0A0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputPill}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor="#A0A0A0"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.7} style={styles.forgotPasswordButton}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.signInButton}
              onPress={onLoginSuccess}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.googleButton}
              onPress={onLoginSuccess}
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  loginScrollContent: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 32,
  },
  loginBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  signUpPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 36,
  },
  signUpPromptText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  signUpLinkText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444444',
    marginBottom: 8,
    marginTop: 12,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 28,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  signInButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  signInButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textLight,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.inputBorder,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 28,
    paddingVertical: 14,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
