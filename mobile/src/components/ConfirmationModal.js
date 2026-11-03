import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Reusable Confirmation Modal Component
 *
 * Designed to replace standard OS Alert.alert with a sleek, modern,
 * fully styled modal matching Red Apple's aesthetic.
 *
 * Props:
 * - visible: boolean
 * - onClose: () => void
 * - onConfirm: () => void | Promise<void>
 * - title: string
 * - message: string
 * - confirmText: string (default: 'Confirm')
 * - cancelText: string (default: 'Cancel')
 * - isDestructive: boolean (default: false - sets red accent for destructive actions)
 * - icon: string (Ionicons name, e.g. 'alert-circle', 'calendar-outline', 'trash-outline')
 * - iconColor: string (optional override)
 * - iconBg: string (optional override)
 * - loading: boolean (optional external loading indicator)
 * - dismissOnBackdropPress: boolean (default: true)
 * - children: React.ReactNode (optional extra content inserted between message and actions)
 */
export default function ConfirmationModal({
  visible = false,
  onClose,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  icon = null,
  iconColor = null,
  iconBg = null,
  confirmBg = null,
  loading: externalLoading = false,
  dismissOnBackdropPress = true,
  children = null,
}) {
  const { isDarkMode, theme } = useTheme();
  const [internalLoading, setInternalLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isLoading = externalLoading || internalLoading;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          bounciness: 6,
          speed: 14,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      setInternalLoading(false);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleConfirm = async () => {
    if (isLoading) return;
    try {
      if (onConfirm) {
        const res = onConfirm();
        if (res && typeof res.then === 'function') {
          setInternalLoading(true);
          await res;
        }
      }
    } catch (err) {
      console.warn('[ConfirmationModal] Error executing onConfirm:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  if (!visible) return null;

  // Resolve default icon styling based on destructive flag
  const defaultIcon = icon || (isDestructive ? 'alert-circle-outline' : 'help-circle-outline');
  const resolvedIconColor = iconColor || (isDestructive ? '#DC2626' : (isDarkMode ? '#FFFFFF' : '#111827'));
  const resolvedIconBg = iconBg || (isDestructive ? (isDarkMode ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2') : (isDarkMode ? '#363636' : '#F1F5F9'));
  const resolvedConfirmBg = confirmBg || '#DC2626';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        {/* Backdrop Dismiss Touch */}
        <TouchableWithoutFeedback
          onPress={() => {
            if (dismissOnBackdropPress && !isLoading && onClose) {
              onClose();
            }
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </TouchableWithoutFeedback>

        {/* Modal Dialog Card */}
        <Animated.View
          style={{
            width: Math.min(SCREEN_WIDTH - 48, 380),
            backgroundColor: theme.card,
            borderRadius: 28,
            borderWidth: isDarkMode ? 1 : 0,
            borderColor: theme.cardBorder,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 22,
            alignItems: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: isDarkMode ? 0.4 : 0.18,
            shadowRadius: 24,
            elevation: 12,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* Top Circular Icon */}
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: resolvedIconBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            }}
          >
            <Ionicons name={defaultIcon} size={28} color={resolvedIconColor} />
          </View>

          {/* Title */}
          {title ? (
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: theme.textPrimary,
                textAlign: 'center',
                letterSpacing: -0.3,
                marginTop: 12,
              }}
            >
              {title}
            </Text>
          ) : null}

          {/* Message / Description */}
          {message ? (
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: '500',
                color: theme.textSecondary,
                textAlign: 'center',
                lineHeight: 20,
                marginTop: 8,
                paddingHorizontal: 4,
              }}
            >
              {message}
            </Text>
          ) : null}

          {/* Optional Injected Content */}
          {children}

          {/* Action Buttons */}
          <View style={{ width: '100%', marginTop: 22, gap: 8 }}>
            {/* Primary Confirm Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isLoading}
              onPress={handleConfirm}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 24,
                backgroundColor: resolvedConfirmBg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    letterSpacing: -0.2,
                  }}
                >
                  {confirmText}
                </Text>
              )}
            </TouchableOpacity>

            {/* Secondary Cancel Button */}
            {cancelText ? (
              <TouchableOpacity
                activeOpacity={0.75}
                disabled={isLoading}
                onPress={() => {
                  if (onCancel) {
                    onCancel();
                  } else if (onClose) {
                    onClose();
                  }
                }}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDarkMode ? '#363636' : '#F8FAFC',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: '700',
                    color: theme.textSecondary,
                  }}
                >
                  {cancelText}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
