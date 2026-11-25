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
  showCloseChevron = true,
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
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isLargeScreen = SCREEN_WIDTH >= 820;
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
  const maxCardHeight = isLargeScreen
    ? Math.min(resolvedMaxHeight, SCREEN_HEIGHT - 80)
    : resolvedMaxHeight;
  const hasFixedHeight = height !== null && height !== undefined;
  const resolvedHeight = hasFixedHeight ? resolveDimension(height, null) : null;

  // Pan animation for drag-to-dismiss gesture on header / drag handle
  const translateY = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        // Let scrollable content scroll normally. At its top edge, a downward pull
        // belongs to the sheet and dismisses it, even when the drag starts on content.
        const contentIsAtTop = scrollOffset.current <= 1;
        return gestureState.dy > 6
          && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
          && (!scrollable || contentIsAtTop);
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
      >
        {/* Top Centered Pill Drag Handle */}
        {showHandle && !isLargeScreen && (
          <View className="w-full py-1.5 items-center justify-center">
            <View
              className="w-11 h-[5px] rounded-[3px]"
              style={{ backgroundColor: isDarkMode ? '#525252' : '#D1D5DB' }}
            />
          </View>
        )}

        {/* Action bar keeps a close chevron available on every sheet. */}
        {hasHeaderRow && (
          <View className="flex-row items-center justify-between h-10 mb-1">
            <View className="flex-row items-center">
              {headerLeft || null}
            </View>

            <View className="flex-row items-center space-x-3">
              {headerRight || null}
              {showCloseChevron ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close bottom sheet"
                  activeOpacity={0.72}
                  onPress={onClose}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#303936' : '#F3F4F6',
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={isLargeScreen ? 'close' : 'chevron-down'} size={22} color={isDarkMode ? '#FFFFFF' : '#374151'} />
                </TouchableOpacity>
              ) : null}
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
        className={`flex-1 bg-slate-900/60 ${isLargeScreen ? 'justify-center' : 'justify-end'}`}
        style={[{
          justifyContent: isLargeScreen ? 'center' : 'flex-end',
          backgroundColor: 'rgba(15, 23, 42, 0.62)',
          paddingHorizontal: isLargeScreen ? 24 : 0,
          paddingVertical: isLargeScreen ? 40 : 0,
        }, overlayStyle]}
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
          className={`w-full ${isLargeScreen ? 'items-center justify-center' : 'justify-end'}`}
          style={isLargeScreen ? { alignItems: 'center', justifyContent: 'center' } : undefined}
          pointerEvents="box-none"
        >
          <Animated.View
            {...(!isLargeScreen ? panResponder.panHandlers : {})}
            className={`${isLargeScreen ? 'rounded-[32px] border' : 'rounded-t-[32px] border-t border-l border-r'} shadow-2xl overflow-hidden ${
              noPadding ? '' : 'px-[22px] pt-2.5'
            }`}
            style={[
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                width: isLargeScreen ? Math.min(SCREEN_WIDTH - 48, 680) : '100%',
                alignSelf: 'center',
                borderWidth: isLargeScreen ? 1 : undefined,
                borderRadius: isLargeScreen ? 24 : undefined,
                paddingHorizontal: noPadding ? 0 : (isLargeScreen ? 28 : 22),
                paddingTop: noPadding ? 0 : (isLargeScreen ? 20 : 10),
                paddingBottom: noPadding ? 0 : (isLargeScreen ? 24 : 0),
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: isLargeScreen ? 0.24 : 0.2,
                shadowRadius: isLargeScreen ? 32 : 18,
                elevation: isLargeScreen ? 20 : 12,
              },
              { maxHeight: maxCardHeight },
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
                maxHeight: maxCardHeight,
              }}
            >
              {renderHeader()}

              {scrollable ? (
                <ScrollView
                  showsVerticalScrollIndicator={showsVerticalScrollIndicator}
                  onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
                  scrollEventThrottle={16}
                  bounces={true}
                  overScrollMode="always"
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  style={{
                    width: '100%',
                    flex: hasFixedHeight ? 1 : undefined,
                    flexGrow: hasFixedHeight ? 1 : 0,
                    flexShrink: 1,
                    maxHeight: maxCardHeight,
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
                      maxHeight: maxCardHeight,
                    },
                    contentStyle,
                  ]}
                >
                  {children}
                </View>
              )}

              {footer && (
                <View
                  className="bg-white border-t border-gray-100 pt-3"
                  style={[
                    {
                      alignSelf: 'stretch',
                      flexShrink: 0,
                      marginHorizontal: isLargeScreen && noPadding ? 20 : 0,
                      marginBottom: isLargeScreen && noPadding ? 16 : 0,
                      borderRadius: isLargeScreen && noPadding ? 18 : 0,
                      overflow: 'hidden',
                      paddingHorizontal: noPadding ? 16 : 0,
                      paddingBottom: safeBottomPadding,
                    },
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
