import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { requestAndScheduleNotifications } from '../utils/notifications';

const ITEM_HEIGHT = 50;

function VerticalWheelPicker({ items, selectedValue, onSelect, unitText = '' }) {
  const scrollViewRef = useRef(null);
  const selectedIndex = items.findIndex((item) => item === selectedValue);

  useEffect(() => {
    if (selectedIndex >= 0 && scrollViewRef.current) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
        }
      }, 50);
    }
  }, [selectedIndex]);

  const handleScroll = (event) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / ITEM_HEIGHT);
    if (index >= 0 && index < items.length) {
      if (items[index] !== selectedValue) {
        onSelect(items[index]);
      }
    }
  };

  const handleItemPress = (item, index) => {
    onSelect(item);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    }
  };

  return (
    <View style={styles.wheelContainer}>
      <View style={styles.wheelHighlightBand} pointerEvents="none" />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT,
        }}
      >
        {items.map((item, index) => {
          const isSelected = item === selectedValue;
          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.8}
              style={styles.wheelItem}
              onPress={() => handleItemPress(item, index)}
            >
              <Text style={[styles.wheelItemText, isSelected && styles.wheelItemTextSelected]}>
                {item} {isSelected && unitText ? unitText : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function OnboardingSetupScreen({ onBack, onComplete }) {
  const [step, setStep] = useState(1);
  const [enablingNotifications, setEnablingNotifications] = useState(false);

  const [periodDays, setPeriodDays] = useState(5);
  const [cycleDays, setCycleDays] = useState(28);

  const today = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysList = Array.from({ length: 31 }, (_, i) => i + 1);

  const currentYear = today.getFullYear();
  const yearsList = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const periodDaysList = Array.from({ length: 14 }, (_, i) => i + 1);
  const cycleDaysList = Array.from({ length: 25 }, (_, i) => i + 20);

  const [selectedMonth, setSelectedMonth] = useState(months[today.getMonth()]);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const handleNextStep = async () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      setEnablingNotifications(true);
      try {
        await requestAndScheduleNotifications();
      } catch (e) {
        console.warn('Notification error:', e);
      } finally {
        setEnablingNotifications(false);
        onComplete();
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerIconButton} onPress={handlePrevStep}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.progressBarContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                i <= step ? styles.progressSegmentActive : styles.progressSegmentInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.7} style={styles.headerIconButton} onPress={onBack}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.questionTitle}>How many days does your period usually last?</Text>
            <Text style={styles.questionSubtitle}>Bleeding usually lasts between 4-7 days.</Text>

            <VerticalWheelPicker
              items={periodDaysList}
              selectedValue={periodDays}
              onSelect={setPeriodDays}
              unitText="Days"
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.questionTitle}>How many days does your cycle usually last?</Text>
            <Text style={styles.questionSubtitle}>
              The duration between two periods start dates, usually 23-35 days.
            </Text>

            <VerticalWheelPicker
              items={cycleDaysList}
              selectedValue={cycleDays}
              onSelect={setCycleDays}
              unitText="Days"
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.questionTitle}>What's the start date of your last period?</Text>
            <Text style={styles.questionSubtitle}>Select the date when your last period started.</Text>

            <View style={styles.tripleWheelRow}>
              <View style={styles.wheelCol}>
                <Text style={styles.wheelColLabel}>Month</Text>
                <VerticalWheelPicker
                  items={months}
                  selectedValue={selectedMonth}
                  onSelect={setSelectedMonth}
                />
              </View>

              <View style={styles.wheelCol}>
                <Text style={styles.wheelColLabel}>Day</Text>
                <VerticalWheelPicker
                  items={daysList}
                  selectedValue={selectedDay}
                  onSelect={setSelectedDay}
                />
              </View>

              <View style={styles.wheelCol}>
                <Text style={styles.wheelColLabel}>Year</Text>
                <VerticalWheelPicker
                  items={yearsList}
                  selectedValue={selectedYear}
                  onSelect={setSelectedYear}
                />
              </View>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.notificationCard}>
              <View style={styles.bellIconCircle}>
                <Ionicons name="notifications" size={32} color="#FF9800" />
              </View>

              <View style={styles.notificationBanner}>
                <View style={styles.notificationHeaderRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={styles.notificationAppName}>Red Apple • Now</Text>
                </View>
                <Text style={styles.notificationMessage}>Your period is expected to start in 2 days.</Text>
              </View>
            </View>

            <Text style={styles.questionTitleCentered}>
              Stay prepared with timely reminders and accurate predictions.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={enablingNotifications}
          style={styles.primaryButton}
          onPress={handleNextStep}
        >
          {enablingNotifications ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {step === 4 ? 'Turn on Notifications' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>

        {step < 4 && (
          <TouchableOpacity activeOpacity={0.7} style={styles.notSureButton} onPress={handleNextStep}>
            <Text style={styles.notSureText}>I'm not sure</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 4-Segment Broken Progress Bar */
  progressBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  progressSegmentActive: {
    backgroundColor: colors.primary,
  },
  progressSegmentInactive: {
    backgroundColor: '#EBEBEF',
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  questionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  questionSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  questionTitleCentered: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    marginTop: 32,
    marginBottom: 12,
  },

  /* Custom Vertical Wheel Picker Styles */
  wheelContainer: {
    height: ITEM_HEIGHT * 3,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  wheelHighlightBand: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#FFF0F5',
    borderWidth: 1,
    borderColor: '#FFD6E3',
    borderRadius: 24,
    zIndex: 0,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  wheelItemText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#B0A8B5',
  },
  wheelItemTextSelected: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
  },

  /* 3-Column Date Wheel */
  tripleWheelRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  wheelCol: {
    flex: 1,
    alignItems: 'center',
  },
  wheelColLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },

  /* Step 4 Notification Card */
  notificationCard: {
    width: '100%',
    backgroundColor: '#FFF0F5',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD6E3',
    marginTop: 16,
  },
  bellIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  notificationBanner: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  notificationAppName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  notificationMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },

  /* Bottom Actions */
  bottomActions: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textLight,
  },
  notSureButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  notSureText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
