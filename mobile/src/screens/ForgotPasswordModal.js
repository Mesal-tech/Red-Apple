import React, { useState } from 'react';
import {
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ForgotPasswordModal({ visible, onClose, onSuccess }) {
  const { forgotPassword, resetPassword } = useAuth();
  const { theme, isDark } = useTheme();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
    onClose();
  };

  const handleRequestOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setStep(2);
      setSuccessMessage(res.message || 'Reset code sent to your email.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    try {
      await resetPassword(email.trim(), otpCode.trim(), newPassword);
      setSuccessMessage('Password reset successfully!');
      setTimeout(() => {
        handleClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
      >
        <View
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 20,
            borderTopWidth: 1,
            borderTopColor: theme.cardBorder,
            maxHeight: '85%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.cardBorder,
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Ionicons name="key-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary }}>
                {step === 1 ? 'Reset Password' : 'Enter Verification Code'}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                {step === 1
                  ? "Enter your email and we'll send a 6-digit recovery code."
                  : `Enter the code sent to ${email}`}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={handleClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Feedback Banners */}
          {!!errorMessage && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                marginBottom: 14,
              }}
            >
              <Ionicons name="alert-circle" size={17} color="#DC2626" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444', marginLeft: 8, flex: 1 }}>
                {errorMessage}
              </Text>
            </View>
          )}

          {!!successMessage && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                marginBottom: 14,
              }}
            >
              <Ionicons name="checkmark-circle" size={17} color="#10B981" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#10B981', marginLeft: 8, flex: 1 }}>
                {successMessage}
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 4 }}>
            {step === 1 ? (
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, marginLeft: 2 }}>
                  Account Email
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 52,
                    backgroundColor: theme.backgroundSecondary,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    paddingHorizontal: 14,
                    marginBottom: 20,
                  }}
                >
                  <Ionicons name="mail-outline" size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: theme.textPrimary, marginLeft: 10, paddingVertical: 10 }}
                    placeholder="e.g. name@example.com"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={{
                    height: 52,
                    backgroundColor: colors.primary,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={handleRequestOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, marginLeft: 2 }}>
                  6-Digit Verification Code
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 52,
                    backgroundColor: theme.backgroundSecondary,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    paddingHorizontal: 14,
                    marginBottom: 14,
                  }}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: theme.textPrimary, marginLeft: 10, paddingVertical: 10 }}
                    placeholder="123456"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    editable={!loading}
                  />
                </View>

                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, marginLeft: 2 }}>
                  New Password
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 52,
                    backgroundColor: theme.backgroundSecondary,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    paddingHorizontal: 14,
                    marginBottom: 14,
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: theme.textPrimary, marginLeft: 10, paddingVertical: 10 }}
                    placeholder="At least 8 characters"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, marginLeft: 2 }}>
                  Confirm New Password
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 52,
                    backgroundColor: theme.backgroundSecondary,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    paddingHorizontal: 14,
                    marginBottom: 20,
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: theme.textPrimary, marginLeft: 10, paddingVertical: 10 }}
                    placeholder="Repeat new password"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={{
                    height: 52,
                    backgroundColor: colors.primary,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Update Password & Log In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{ paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setStep(1)}
                  disabled={loading}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textMuted }}>Back to Email</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
