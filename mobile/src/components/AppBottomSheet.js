import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  let insets = { bottom: 0, top: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch (_) {}

  // Calculate safe bottom padding ensuring bottom content sits above Android navigation bar and iOS home indicator
  const safeBottomPadding = Math.max(insets?.bottom || 0, Platform.OS === 'ios' ? 34 : 28) + 16;

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
      <View style={[styles.headerContainer, noPadding && { paddingHorizontal: 20 }]} {...panResponder.panHandlers}>
        {/* Top Centered Pill Drag Handle */}
        {showHandle && (
          <View style={styles.dragHandleTouchArea}>
            <View style={styles.dragHandle} />
          </View>
        )}

        {/* Optional Action Bar Row (Chevron left, custom actions right) */}
        {hasHeaderRow && (
          <View style={styles.headerActionsRow}>
            <View style={styles.headerLeftCol}>
              {headerLeft ? (
                headerLeft
              ) : showCloseChevron ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={styles.chevronTouch}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="chevron-down" size={26} color="#374151" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.headerRightCol}>
              {headerRight || null}
            </View>
          </View>
        )}

        {/* Optional Title & Subtitle */}
        {title && <Text style={styles.sheetTitle}>{title}</Text>}
        {subtitle && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}
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
      {/* Ensure Android status bar blends with the translucent dark scrim */}
      {visible && (
        <StatusBar
          barStyle="light-content"
          backgroundColor="rgba(15, 23, 42, 0.45)"
          translucent={true}
        />
      )}

      <TouchableOpacity
        style={[styles.sheetOverlay, overlayStyle]}
        activeOpacity={1}
        onPress={dismissOnBackdropPress ? onClose : undefined}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={avoidKeyboard}
          style={styles.keyboardAvoid}
        >
          <Animated.View
            style={[
              styles.sheetCard,
              { maxHeight },
              noPadding && { paddingHorizontal: 0 },
              { transform: [{ translateY }] },
              cardStyle,
            ]}
          >
            <View
              style={styles.cardInnerTouch}
              onStartShouldSetResponder={() => true}
            >
              {renderHeader()}

              {scrollable ? (
                <ScrollView
                  showsVerticalScrollIndicator={showsVerticalScrollIndicator}
                  bounces={true}
                  overScrollMode="always"
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  style={styles.scrollViewFlex}
                  contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: footer ? 16 : safeBottomPadding },
                    contentStyle,
                  ]}
                >
                  {children}
                </ScrollView>
              ) : (
                <View
                  style={[
                    styles.staticContent,
                    { paddingBottom: footer ? 16 : safeBottomPadding },
                    contentStyle,
                  ]}
                >
                  {children}
                </View>
              )}

              {footer && (
                <View
                  style={[
                    styles.sheetFooter,
                    { paddingBottom: safeBottomPadding },
                    noPadding && { paddingHorizontal: 20 },
                    footerStyle,
                  ]}
                >
                  {footer}
                </View>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Semi-transparent dark scrim extending over the status bar
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 22,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 16,
    overflow: 'hidden',
  },
  cardInnerTouch: {
    width: '100%',
    maxHeight: '100%',
  },
  scrollViewFlex: {
    flexShrink: 1,
  },
  sheetFooter: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  headerContainer: {
    width: '100%',
    marginBottom: 4,
  },
  dragHandleTouchArea: {
    width: '100%',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: 4,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chevronTouch: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 28,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 8,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  staticContent: {
    width: '100%',
  },
  scrollContent: {
    width: '100%',
    flexGrow: 1,
  },
});

export { AppBottomSheet };
