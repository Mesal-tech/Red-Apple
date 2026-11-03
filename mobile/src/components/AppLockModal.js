import React, { useState, useEffect, useRef } from 'react';
import {
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
      <SafeAreaView className="flex-1 bg-white justify-between">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

        {/* Top Cancel button only if in setup or disable mode */}
        <View className="h-12 px-5 justify-center">
          {mode !== 'unlock' && (
            <TouchableOpacity onPress={onCancel} className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          )}
        </View>

        <View className="items-center px-8 mt-2.5">
          <View className="w-[76px] h-[76px] rounded-full bg-red-50 items-center justify-center mb-5">
            <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
          </View>

          <Text className="text-[22px] font-extrabold text-gray-900 text-center mb-2">{getTitle()}</Text>
          <Text className="text-sm text-gray-500 text-center leading-5 mb-8">{getSubtitle()}</Text>

          {/* PIN DOTS */}
          <Animated.View className="flex-row gap-5 mb-4" style={{ transform: [{ translateX: shakeAnim }] }}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              const hasError = Boolean(errorMessage);
              return (
                <View
                  key={idx}
                  className={`w-[18px] h-[18px] rounded-full border-2 ${
                    hasError
                      ? 'border-red-500 bg-red-100'
                      : isFilled
                      ? 'border-primary bg-primary scale-110'
                      : 'border-gray-300 bg-white'
                  }`}
                />
              );
            })}
          </Animated.View>

          {Boolean(errorMessage) && (
            <Text className="text-[13px] text-red-500 font-semibold mt-1">{errorMessage}</Text>
          )}
        </View>

        {/* NUMPAD */}
        <View className="px-10 pb-9 gap-4">
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['', '0', 'delete'],
          ].map((row, rIdx) => (
            <View key={rIdx} className="flex-row justify-between">
              {row.map((item, cIdx) => {
                if (item === '') {
                  return <View key={cIdx} className="w-[72px] h-[72px]" />;
                }
                if (item === 'delete') {
                  return (
                    <TouchableOpacity
                      key={cIdx}
                      className="w-[72px] h-[72px] rounded-full bg-gray-50 items-center justify-center border border-gray-200"
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
                    className="w-[72px] h-[72px] rounded-full bg-gray-50 items-center justify-center border border-gray-200"
                    onPress={() => handleKeyPress(item)}
                    activeOpacity={0.6}
                  >
                    <Text className="text-[26px] font-bold text-gray-900">{item}</Text>
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
