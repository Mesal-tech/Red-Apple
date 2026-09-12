import React, { useState } from 'react';
import {
  StyleSheet,
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

export default function ForgotPasswordModal({ visible, onClose, onSuccess }) {
  const { forgotPassword, resetPassword } = useAuth();

  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP & New Password
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
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.modalTitle}>
                {step === 1 ? 'Reset Password' : 'Enter Verification Code'}
              </Text>
              <Text style={styles.modalSubTitle}>
                {step === 1
                  ? "Enter your email and we'll send a 6-digit recovery code."
                  : `Enter the code sent to ${email}`}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Feedback Banners */}
          {!!errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#D32F2F" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {!!successMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#2E7D32" style={{ marginRight: 6 }} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8 }}>
            {step === 1 ? (
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Account Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={19} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. name@example.com"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.actionBtn}
                  onPress={handleRequestOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.actionBtnText}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="shield-checkmark-outline" size={19} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="123456"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    editable={!loading}
                  />
                </View>

                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={19} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="At least 8 characters"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={19}
                      color="#777"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={19} color="#777" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Repeat new password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.actionBtn}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.actionBtnText}>Update Password & Log In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.resendBtn}
                  onPress={() => setStep(1)}
                  disabled={loading}
                >
                  <Text style={styles.resendBtnText}>Back to Email</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  successText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  resendBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
