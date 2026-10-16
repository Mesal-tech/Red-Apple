import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null); // { id, message, type: 'error' | 'success' | 'info' }

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [translateY, opacity, scale]);

  const showToast = useCallback(
    ({ title, message, type = 'error', duration = 3800 }) => {
      if (!message) return;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast({ id: Date.now(), title, message, type });

      // Spring down with gooey/liquid bounce feel
      translateY.setValue(-100);
      opacity.setValue(0);
      scale.setValue(0.85);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 6.5,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [translateY, opacity, scale, hideToast]
  );

  const showError = useCallback(
    (message, duration) => showToast({ message, type: 'error', duration }),
    [showToast]
  );

  const showSuccess = useCallback(
    (message, duration) => showToast({ message, type: 'success', duration }),
    [showToast]
  );

  const showInfo = useCallback(
    (message, duration) => showToast({ message, type: 'info', duration }),
    [showToast]
  );

  const getToastConfig = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          iconColor: '#C81E3A',
          borderColor: 'rgba(16, 185, 129, 0.45)',
          glowColor: 'rgba(16, 185, 129, 0.15)',
          badgeBg: 'rgba(16, 185, 129, 0.16)',
        };
      case 'info':
        return {
          icon: 'information-circle',
          iconColor: '#38BDF8',
          borderColor: 'rgba(56, 189, 248, 0.45)',
          glowColor: 'rgba(56, 189, 248, 0.15)',
          badgeBg: 'rgba(56, 189, 248, 0.16)',
        };
      case 'error':
      default:
        return {
          icon: 'alert-circle',
          iconColor: '#EF4444',
          borderColor: 'rgba(239, 68, 68, 0.5)',
          glowColor: 'rgba(220, 38, 38, 0.25)',
          badgeBg: 'rgba(239, 68, 68, 0.16)',
        };
    }
  };

  const topOffset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 16) + 8;
  const config = toast ? getToastConfig(toast.type) : getToastConfig('error');

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showInfo, hideToast }}>
      {children}

      {toast && (
        <Animated.View
          style={[
            styles.toastWrapper,
            {
              top: topOffset,
              opacity,
              transform: [{ translateY }, { scale }],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hideToast}
            style={[
              styles.toastPill,
              {
                borderColor: config.borderColor,
                shadowColor: config.glowColor,
              },
            ]}
          >
            <View style={[styles.iconBadge, { backgroundColor: config.badgeBg }]}>
              <Ionicons name={config.icon} size={20} color={config.iconColor} />
            </View>

            <View style={{ flex: 1, justifyContent: 'center' }}>
              {toast.title ? (
                <Text style={styles.toastTitle}>{toast.title}</Text>
              ) : null}
              <Text style={styles.toastMessage} numberOfLines={3}>
                {toast.message}
              </Text>
            </View>

            <TouchableOpacity
              onPress={hideToast}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 999,
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#180407',
    borderWidth: 1.2,
    borderRadius: 26,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#CBD5E1',
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 6,
  },
});
