import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

/**
 * Reusable App Bottom Sheet Component
 *
 * Modeled after the Red Apple streak details bottom sheet:
 * - Crisp light-themed card (#FFFFFF) with rounded top corners (32px)
 * - Semi-transparent backdrop overlay extending over the status bar (statusBarTranslucent)
 * - Draggable & scrollable: Users can drag/scroll content up, and pull down to dismiss
 * - Dynamic bottom safe-area insets so bottom text/actions never clip behind the Android navigation bar
 * - Keyboard avoiding behavior and flexible header actions
 */
export default function AppBottomSheet({
  visible = false,
  onClose,
  title = null,
  subtitle = null,
  showHandle = true,
  showCloseChevron = false,
  headerLeft = null,
  headerRight = null,
  scrollable = true, // Default to true so user can drag and scroll content freely
  height = null,
  maxHeight = '92%',
  dismissOnBackdropPress = true,
  avoidKeyboard = true,
  animationType = 'slide',
  overlayStyle = null,
  cardStyle = null,
  contentStyle = null,
  footer = null,
  footerStyle = null,
  noPadding = false,
  showsVerticalScrollIndicator = false,
  children,
}) {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  let insets = { bottom: 0, top: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch (_) {}

  let isDarkMode = false;
  let theme = {
    background: '#FFFFFF',
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    statusBar: 'dark-content',
  };
  try {
    const themeContext = useTheme();
    if (themeContext) {
      isDarkMode = themeContext.isDarkMode;
      theme = themeContext.theme;
    }
  } catch (_) {}

  // Calculate safe bottom padding ensuring bottom content sits above Android navigation bar and iOS home indicator
  const safeBottomPadding = insets?.bottom > 0
    ? insets.bottom + 12
    : (Platform.OS === 'ios' ? 28 : 16);

  // Resolve percentage string to concrete numeric pixels
  const resolveDimension = (val, fallback = null) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.endsWith('%')) {
      const pct = parseFloat(val) / 100;
      if (!isNaN(pct)) return Math.round(SCREEN_HEIGHT * pct);
    }
    return fallback;
  };

  const resolvedMaxHeight = resolveDimension(maxHeight, Math.round(SCREEN_HEIGHT * 0.94));
  const hasFixedHeight = height !== null && height !== undefined;
  const resolvedHeight = hasFixedHeight ? resolveDimension(height, null) : null;

  // Pan animation for drag-to-dismiss gesture on header / drag handle
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger downward drag on header when moving vertically downwards
        return gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.8) {
          Animated.timing(translateY, {
            toValue: 600,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (onClose) onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const renderHeader = () => {
    const hasHeaderRow = showCloseChevron || headerLeft || headerRight;

    return (
      <View
        className={`w-full mb-1 ${noPadding ? 'px-5' : ''}`}
        {...panResponder.panHandlers}
      >
        {/* Top Centered Pill Drag Handle */}
        {showHandle && (
          <View className="w-full py-1.5 items-center justify-center">
            <View
              className="w-11 h-[5px] rounded-[3px]"
              style={{ backgroundColor: isDarkMode ? '#525252' : '#D1D5DB' }}
            />
          </View>
        )}

        {/* Optional Action Bar Row (Chevron left, custom actions right) */}
        {hasHeaderRow && (
          <View className="flex-row items-center justify-between h-10 mb-1">
            <View className="flex-row items-center">
              {headerLeft ? (
                headerLeft
              ) : showCloseChevron ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  className="py-1 px-1"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="chevron-down" size={26} color={isDarkMode ? '#FFFFFF' : '#374151'} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View className="flex-row items-center space-x-3">
              {headerRight || null}
            </View>
          </View>
        )}

        {/* Optional Title & Subtitle */}
        {title && (
          <Text
            className="text-[22px] font-extrabold leading-7 text-center mt-1 mb-1.5 px-2 tracking-tight"
            style={{ color: theme.textPrimary }}
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            className="text-sm font-medium leading-5 text-center mb-3 px-3.5"
            style={{ color: theme.textSecondary }}
          >
            {subtitle}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType={animationType}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      {/* Ensure Android status bar is completely transparent */}
      {visible && (
        <StatusBar
          barStyle={theme.statusBar}
          backgroundColor="transparent"
          translucent={true}
        />
      )}

      <View
        className="flex-1 bg-slate-900/60 justify-end"
        style={overlayStyle}
      >
        <TouchableWithoutFeedback
          onPress={dismissOnBackdropPress ? onClose : undefined}
          accessible={false}
        >
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={avoidKeyboard}
          className="w-full justify-end"
          pointerEvents="box-none"
        >
          <Animated.View
            className={`rounded-t-[32px] border-t border-l border-r shadow-2xl overflow-hidden ${
              noPadding ? '' : 'px-[22px] pt-2.5'
            }`}
            style={[
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              },
              { maxHeight: resolvedMaxHeight },
              resolvedHeight ? { height: resolvedHeight } : null,
              { transform: [{ translateY }] },
              noPadding ? { paddingHorizontal: 0 } : null,
              cardStyle,
            ]}
          >
            <View
              className="w-full"
              style={{
                width: '100%',
                flex: hasFixedHeight ? 1 : undefined,
                flexShrink: 1,
                maxHeight: resolvedMaxHeight,
              }}
            >
              {renderHeader()}

              {scrollable ? (
                <ScrollView
                  showsVerticalScrollIndicator={showsVerticalScrollIndicator}
                  bounces={true}
                  overScrollMode="always"
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  style={{
                    width: '100%',
                    flex: hasFixedHeight ? 1 : undefined,
                    flexGrow: hasFixedHeight ? 1 : 0,
                    flexShrink: 1,
                    maxHeight: resolvedMaxHeight,
                  }}
                  contentContainerStyle={[
                    { width: '100%', flexGrow: 1, paddingBottom: footer ? 0 : safeBottomPadding },
                    contentStyle,
                  ]}
                >
                  {children}
                </ScrollView>
              ) : (
                <View
                  className="w-full"
                  style={[
                    {
                      width: '100%',
                      flex: hasFixedHeight ? 1 : undefined,
                      flexShrink: 1,
                      paddingBottom: footer ? 0 : safeBottomPadding,
                      maxHeight: resolvedMaxHeight,
                    },
                    contentStyle,
                  ]}
                >
                  {children}
                </View>
              )}

              {footer && (
                <View
                  className={`w-full bg-white border-t border-gray-100 pt-3 ${noPadding ? 'px-5' : ''}`}
                  style={[
                    { paddingBottom: safeBottomPadding },
                    footerStyle,
                  ]}
                >
                  {footer}
                </View>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export { AppBottomSheet };
