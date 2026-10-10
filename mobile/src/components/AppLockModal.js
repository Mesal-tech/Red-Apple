import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Animated,
  StatusBar,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

export const PIN_STORAGE_KEY = '@redapple_app_lock_pin';

export default function AppLockModal({
  visible,
  mode = 'unlock', // 'unlock' | 'setup' | 'disable'
  onSuccess,
  onCancel,
}) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState('enter'); // 'enter' | 'confirm'
  const [errorMessage, setErrorMessage] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin('');
      setConfirmPin('');
      setStep('enter');
      setErrorMessage('');
    }
  }, [visible, mode]);

  const triggerShake = (msg) => {
    setErrorMessage(msg);
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => {
      setPin('');
    });
  };

  const handleKeyPress = async (digit) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMessage('');

    if (nextPin.length === 4) {
      if (mode === 'unlock') {
        const storedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
        if (storedPin && storedPin === nextPin) {
          onSuccess && onSuccess();
        } else {
          triggerShake('Incorrect PIN. Please try again.');
        }
      } else if (mode === 'setup') {
        if (step === 'enter') {
          setConfirmPin(nextPin);
          setPin('');
          setStep('confirm');
        } else if (step === 'confirm') {
          if (nextPin === confirmPin) {
            await AsyncStorage.setItem(PIN_STORAGE_KEY, nextPin);
            onSuccess && onSuccess(nextPin);
          } else {
            triggerShake('PINs do not match. Start again.');
            setStep('enter');
            setConfirmPin('');
          }
        }
      } else if (mode === 'disable') {
        const storedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
        if (storedPin && storedPin === nextPin) {
          await AsyncStorage.removeItem(PIN_STORAGE_KEY);
          onSuccess && onSuccess();
        } else {
          triggerShake('Incorrect PIN.');
        }
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMessage('');
    }
  };

  const getTitle = () => {
    if (mode === 'unlock') return 'Enter App PIN';
    if (mode === 'disable') return 'Enter PIN to Disable Lock';
    if (step === 'enter') return 'Create a 4-Digit PIN';
    return 'Confirm Your 4-Digit PIN';
  };

  const getSubtitle = () => {
    if (mode === 'unlock') return 'Your health records are encrypted and locked.';
    if (mode === 'disable') return 'Verify your PIN to turn off app lock.';
    if (step === 'enter') return 'Protect your cycle, health profile & consultations.';
    return 'Re-enter your PIN to confirm setup.';
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Top Cancel button only if in setup or disable mode */}
        <View style={styles.topBar}>
          {mode !== 'unlock' && (
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.lockIconCircle}>
            <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
          </View>

          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>

          {/* PIN DOTS */}
          <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.pinDot,
                    isFilled && styles.pinDotFilled,
                    Boolean(errorMessage) && styles.pinDotError,
                  ]}
                />
              );
            })}
          </Animated.View>

          {Boolean(errorMessage) && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
        </View>

        {/* NUMPAD */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['', '0', 'delete'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((item, cIdx) => {
                if (item === '') {
                  return <View key={cIdx} style={styles.keypadBtnPlaceholder} />;
                }
                if (item === 'delete') {
                  return (
                    <TouchableOpacity
                      key={cIdx}
                      style={styles.keypadBtn}
                      onPress={handleDelete}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="backspace-outline" size={26} color="#4B5563" />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={cIdx}
                    style={styles.keypadBtn}
                    onPress={() => handleKeyPress(item)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.keypadDigit}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  topBar: {
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 10,
  },
  lockIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    transform: [{ scale: 1.1 }],
  },
  pinDotError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 4,
  },
  keypad: {
    paddingHorizontal: 40,
    paddingBottom: 36,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keypadBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  keypadBtnPlaceholder: {
    width: 72,
    height: 72,
  },
  keypadDigit: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
});
