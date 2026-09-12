import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { requestAndScheduleNotifications } from '../utils/notifications';
import {
  saveHealthProfileSafe,
  saveActiveHealthModeSafe,
  saveOnboardingStatusSafe,
} from '../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;
const ITEM_HEIGHT = 58;

function getDaysInMonth(monthName, year) {
  const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthName);
  return new Date(year, (monthIdx >= 0 ? monthIdx : 0) + 1, 0).getDate();
}

/* ================= WHEEL COLUMN ================= */
function WheelColumn({ items, selectedValue, onSelect, unitText = '' }) {
  const scrollViewRef = useRef(null);
  const selectedIndex = items.findIndex((item) => item === selectedValue);

  useEffect(() => {
    if (selectedIndex >= 0 && scrollViewRef.current) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
        }
      }, 40);
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
    <View style={styles.wheelColContainer}>
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
              activeOpacity={0.75}
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCyclePeriodBounds(today) {
  const now = today.getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  return {
    minDate: new Date(now - 180 * ONE_DAY), // up to 6 months ago
    maxDate: today,                        // strictly today, never future
    defaultDate: new Date(now - 14 * ONE_DAY), // ~14 days ago
  };
}

function getPregnancyDateBounds(calcMethod, today) {
  const now = today.getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (calcMethod === 'dueDate') {
    return {
      minDate: today,
      maxDate: new Date(now + 280 * ONE_DAY), // max 40 weeks into future
      defaultDate: new Date(now + 196 * ONE_DAY), // ~28 weeks ahead
    };
  }

  if (calcMethod === 'lmp') {
    return {
      minDate: new Date(now - 294 * ONE_DAY), // max 42 weeks ago
      maxDate: new Date(now - 14 * ONE_DAY),  // at least 2 weeks ago
      defaultDate: new Date(now - 70 * ONE_DAY), // ~10 weeks ago
    };
  }

  if (calcMethod === 'conception') {
    return {
      minDate: new Date(now - 270 * ONE_DAY), // max 38 weeks ago
      maxDate: new Date(now - 10 * ONE_DAY),  // at least 10 days ago
      defaultDate: new Date(now - 56 * ONE_DAY), // ~8 weeks ago
    };
  }

  // IVF
  return {
    minDate: new Date(now - 266 * ONE_DAY),
    maxDate: new Date(now - 9 * ONE_DAY),
    defaultDate: new Date(now - 42 * ONE_DAY), // ~6 weeks ago
  };
}

/* ================= CONSTRAINED DATE WHEEL PICKER ================= */
function ConstrainedDateWheelPicker({
  selectedDate,
  onDateChange,
  minDate,
  maxDate,
}) {
  const selYear = selectedDate.getFullYear();
  const selMonth = selectedDate.getMonth();
  const selDay = selectedDate.getDate();

  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();

  // 1. Available Years
  const years = [];
  for (let y = minYear; y <= maxYear; y++) {
    years.push(y);
  }

  // 2. Available Months for selected year
  const minMonth = selYear === minYear ? minDate.getMonth() : 0;
  const maxMonth = selYear === maxYear ? maxDate.getMonth() : 11;
  const availableMonths = [];
  for (let m = minMonth; m <= maxMonth; m++) {
    availableMonths.push(MONTH_NAMES[m]);
  }

  // 3. Available Days for selected year and month
  const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
  const minDay = (selYear === minYear && selMonth === minDate.getMonth()) ? minDate.getDate() : 1;
  const maxDay = (selYear === maxYear && selMonth === maxDate.getMonth()) ? Math.min(maxDate.getDate(), daysInMonth) : daysInMonth;
  const availableDays = [];
  for (let d = minDay; d <= maxDay; d++) {
    availableDays.push(d);
  }

  // Clamping handler when year changes
  const handleYearChange = (newYear) => {
    const newMinM = newYear === minYear ? minDate.getMonth() : 0;
    const newMaxM = newYear === maxYear ? maxDate.getMonth() : 11;
    const clampedMonth = Math.max(newMinM, Math.min(newMaxM, selMonth));

    const maxDays = new Date(newYear, clampedMonth + 1, 0).getDate();
    const newMinD = (newYear === minYear && clampedMonth === minDate.getMonth()) ? minDate.getDate() : 1;
    const newMaxD = (newYear === maxYear && clampedMonth === maxDate.getMonth()) ? Math.min(maxDate.getDate(), maxDays) : maxDays;
    const clampedDay = Math.max(newMinD, Math.min(newMaxD, selDay));

    onDateChange(new Date(newYear, clampedMonth, clampedDay));
  };

  // Clamping handler when month changes
  const handleMonthChange = (monthName) => {
    const newMonth = MONTH_NAMES.indexOf(monthName);
    const maxDays = new Date(selYear, newMonth + 1, 0).getDate();
    const newMinD = (selYear === minYear && newMonth === minDate.getMonth()) ? minDate.getDate() : 1;
    const newMaxD = (selYear === maxYear && newMonth === maxDate.getMonth()) ? Math.min(maxDate.getDate(), maxDays) : maxDays;
    const clampedDay = Math.max(newMinD, Math.min(newMaxD, selDay));

    onDateChange(new Date(selYear, newMonth, clampedDay));
  };

  // Day change
  const handleDayChange = (newDay) => {
    onDateChange(new Date(selYear, selMonth, newDay));
  };

  const currentMonthName = MONTH_NAMES[selMonth];

  return (
    <View style={styles.datePickerDirectWrapper}>
      {/* COLUMN LABELS */}
      <View style={styles.dateColsHeader}>
        <Text style={[styles.dateColLabel, { flex: 1.3 }]}>Month</Text>
        <Text style={[styles.dateColLabel, { flex: 0.9 }]}>Day</Text>
        <Text style={[styles.dateColLabel, { flex: 1.1 }]}>Year</Text>
      </View>

      {/* 3-COLUMN WHEEL WITH CONTINUOUS HIGHLIGHT BAND */}
      <View style={styles.unifiedWheelContainer}>
        <View style={styles.unifiedHighlightBand} pointerEvents="none" />

        <View style={styles.unifiedColsRow}>
          <View style={{ flex: 1.3 }}>
            <WheelColumn
              items={availableMonths}
              selectedValue={currentMonthName}
              onSelect={handleMonthChange}
            />
          </View>
          <View style={{ flex: 0.9 }}>
            <WheelColumn
              items={availableDays}
              selectedValue={selDay}
              onSelect={handleDayChange}
            />
          </View>
          <View style={{ flex: 1.1 }}>
            <WheelColumn
              items={years}
              selectedValue={selYear}
              onSelect={handleYearChange}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/* ================= SINGLE WHEEL PICKER (DIRECT) ================= */
function SingleWheelPickerCard({ items, selectedValue, onSelect, unitText = '' }) {
  return (
    <View style={styles.singleWheelDirectWrapper}>
      <View style={styles.singleWheelContainer}>
        <View style={styles.unifiedHighlightBand} pointerEvents="none" />
        <WheelColumn
          items={items}
          selectedValue={selectedValue}
          onSelect={onSelect}
          unitText={unitText}
        />
      </View>
    </View>
  );
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/* ================= STAGGERED ENTRANCE COMPONENT ================= */
function StaggerItem({ delay = 0, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ================= BENTO SQUIRCLE CARD (LIGHT THEME) ================= */
function BentoCard({
  icon,
  title,
  subtitle,
  isSelected,
  onPress,
  isFullWidth = false,
  delay = 0,
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <AnimatedTouchable
      activeOpacity={0.85}
      style={[
        styles.bentoCard,
        isFullWidth ? styles.bentoCardFullWidth : styles.bentoCardHalfWidth,
        isSelected ? styles.bentoCardSelected : styles.bentoCardUnselected,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
      onPress={onPress}
    >
      {isFullWidth ? (
        <>
          <Ionicons
            name={icon}
            size={28}
            color="#1C1C1E"
          />

          <View style={styles.bentoBottomColFullWidth}>
            <Text
              style={[styles.bentoTitle, isSelected && styles.bentoTitleSelected]}
              numberOfLines={2}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.bentoSubtitle, isSelected && styles.bentoSubtitleSelected]}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          {isSelected && (
            <View style={styles.bentoCheckCircle}>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.bentoTopRow}>
            <Ionicons
              name={icon}
              size={28}
              color="#1C1C1E"
            />
            {isSelected && (
              <View style={styles.bentoCheckCircle}>
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.bentoBottomCol}>
            <Text
              style={[styles.bentoTitle, isSelected && styles.bentoTitleSelected]}
              numberOfLines={2}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.bentoSubtitle, isSelected && styles.bentoSubtitleSelected]}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </AnimatedTouchable>
  );
}

/* ================= ONBOARDING COMPLETION CONTENT & COMPONENT ================= */
const COMPLETION_CONTENT = {
  pregnancy: {
    title: "You're all set for this journey",
    subtitle: "Your pregnancy companion is ready. We'll guide you through each milestone, from weekly baby growth to getting ready for birth.",
    perks: ['Weekly baby growth milestones', 'Caring doctor-backed guidance'],
  },
  cycle: {
    title: 'Your cycle guide is ready',
    subtitle: "We've personalized your daily tracker. Get accurate forecasts, understand your body's signs, and stay in tune with your rhythm.",
    perks: ['Smart period & cycle forecasts', 'Fertile days & ovulation window', 'Symptom pattern insights'],
  },
  ttc: {
    title: 'Your fertility plan is ready',
    subtitle: 'Track your best days for getting pregnant with personalized fertile windows, temperature logs, and cycle tips.',
    perks: ['Peak fertile day alerts', 'Best timing for conception', 'Helpful pregnancy tips'],
  },
  perimenopause: {
    title: 'Care for your body changes',
    subtitle: 'Your private space to understand your cycle shifts and navigate this transition with comfort and peace of mind.',
    perks: ['Cycle shift trends', 'Symptom & mood tracking', 'Practical relief tips'],
  },
  postmenopause: {
    title: 'Supporting your everyday vitality',
    subtitle: 'Tools to help you protect your bone strength, heart health, daily energy, and feel your best in this chapter.',
    perks: ['Heart & vitality tracking', 'Bone health & checkup reminders', 'Healthy living tips'],
  },
};

function CompletionStep({ stage }) {
  const content = COMPLETION_CONTENT[stage] || COMPLETION_CONTENT.cycle;

  return (
    <View style={styles.completionContainer}>
      <StaggerItem delay={0} style={styles.illustrationWrapper}>
        <Image
          source={require('../../assets/images/onboarding_done.png')}
          style={styles.completionIllustration}
          resizeMode="contain"
        />
        <LinearGradient
          colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.75)', '#FFFFFF']}
          locations={[0, 0.5, 1]}
          style={styles.illustrationFadeOverlay}
          pointerEvents="none"
        />
      </StaggerItem>

      <StaggerItem delay={90}>
        <Text style={styles.completionTitle}>{content.title}</Text>
      </StaggerItem>

      <StaggerItem delay={160}>
        <Text style={styles.completionSubtitle}>{content.subtitle}</Text>
      </StaggerItem>

      <View style={styles.completionPerksContainer}>
        {content.perks.map((perk, idx) => (
          <StaggerItem key={idx} delay={230 + idx * 80}>
            <View style={styles.completionPerkPill}>
              <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
              <Text style={styles.completionPerkText}>{perk}</Text>
            </View>
          </StaggerItem>
        ))}
      </View>
    </View>
  );
}

/* ================= MAIN ONBOARDING SETUP (LIGHT THEME) ================= */
export default function OnboardingSetupScreen({
  onBack,
  onComplete,
  initialStage,
  isChangingMode = false,
}) {
  const { updateProfile } = useAuth();
  const { showError, showSuccess } = useToast();

  // Step 1: Life Stage
  const [selectedStage, setSelectedStage] = useState(initialStage || 'cycle');
  const [step, setStep] = useState(isChangingMode && initialStage ? 2 : 1);
  const [submitting, setSubmitting] = useState(false);

  // Branch A: Cycle / TTC
  const [periodDays, setPeriodDays] = useState(5);
  const [cycleDays, setCycleDays] = useState(28);

  const today = useRef(new Date()).current;
  const cycleBounds = getCyclePeriodBounds(today);
  const [cyclePeriodDate, setCyclePeriodDate] = useState(cycleBounds.defaultDate);

  const periodDaysList = Array.from({ length: 14 }, (_, i) => i + 1);
  const cycleDaysList = Array.from({ length: 25 }, (_, i) => i + 20);

  // Branch B: Pregnancy
  const [pregnancyCalcMethod, setPregnancyCalcMethod] = useState('lmp');
  const [pregnancyDate, setPregnancyDate] = useState(() => getPregnancyDateBounds('lmp', today).defaultDate);
  const [isFirstBaby, setIsFirstBaby] = useState(true);
  const [multipleType, setMultipleType] = useState('single');

  const pregBounds = getPregnancyDateBounds(pregnancyCalcMethod, today);

  const handleSelectPregnancyCalcMethod = (method) => {
    setPregnancyCalcMethod(method);
    setPregnancyDate(getPregnancyDateBounds(method, today).defaultDate);
  };

  // Branch C: Perimenopause
  const [periCyclePattern, setPeriCyclePattern] = useState('irregular');
  const [periSymptoms, setPeriSymptoms] = useState(['hot_flashes', 'sleep']);
  const [periOnsetTimeline, setPeriOnsetTimeline] = useState('1_2_years');

  // Branch D: Postmenopause
  const [postYearsSincePeriod, setPostYearsSincePeriod] = useState('2_5_years');
  const [postPriorities, setPostPriorities] = useState(['bone_density', 'cardio']);
  const [hrtStatus, setHrtStatus] = useState('considering');

  const TOTAL_STEPS = 5;

  const togglePeriSymptom = (id) => {
    setPeriSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const togglePostPriority = (id) => {
    setPostPriorities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNextStep = async () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      await handleFinishOnboarding();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const handleFinishOnboarding = async () => {
    setSubmitting(true);

    try {
      const formattedDate = formatLocalDate(cyclePeriodDate);

      const healthProfile = {
        stage: selectedStage,
        completedAt: new Date().toISOString(),
        cycleLength: cycleDays,
        periodDuration: periodDays,
        lastPeriodDate: formattedDate,
      };

      if (selectedStage === 'pregnancy') {
        const formattedPregDate = formatLocalDate(pregnancyDate);
        healthProfile.pregnancyDetails = {
          calculationMethod: pregnancyCalcMethod,
          referenceDate: formattedPregDate,
          isFirstBaby,
          multipleType,
        };
      } else if (selectedStage === 'perimenopause') {
        healthProfile.perimenopauseDetails = {
          cyclePattern: periCyclePattern,
          symptoms: periSymptoms,
          onsetTimeline: periOnsetTimeline,
        };
      } else if (selectedStage === 'postmenopause') {
        healthProfile.postmenopauseDetails = {
          yearsSinceLastPeriod: postYearsSincePeriod,
          priorities: postPriorities,
          hrtStatus,
        };
      }

      // Sync backend
      try {
        await updateProfile({
          pregnancy_mode: selectedStage === 'pregnancy',
          health_profile: healthProfile,
        });
      } catch (apiErr) {
        console.warn('[Onboarding] Server profile warning:', apiErr.message);
      }

      // Persist local storage
      await saveHealthProfileSafe(healthProfile);
      await saveActiveHealthModeSafe(selectedStage);
      await saveOnboardingStatusSafe();

      // Notifications permission
      try {
        await requestAndScheduleNotifications();
      } catch (notifErr) {
        console.warn('[Onboarding] Notification error:', notifErr.message);
      }

      showSuccess('Profile setup complete!');
      onComplete(healthProfile, selectedStage);
    } catch (err) {
      showError(err.message || 'Failed to save health profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* AMBIENT RADIAL RED GLOW: (WAY MORE WHITE THAN RED) */}
      <View style={styles.radialGlowWrapper} pointerEvents="none">
        <LinearGradient
          colors={['rgba(220, 38, 38, 0.16)', 'rgba(251, 113, 133, 0.06)', 'rgba(255, 255, 255, 0)']}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.radialGlowDisc}
        />
      </View>

      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* HEADER: BACK, PROGRESS, CLOSE */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} style={styles.headerIconButton} onPress={handlePrevStep}>
            <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
          </TouchableOpacity>

          <View style={styles.progressBarContainer}>
            {[1, 2, 3, 4, 5].map((i) => (
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
            <Ionicons name="close" size={22} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        {/* SCROLLABLE MAIN CONTENT */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ================= STEP 1: PRIMARY GOAL (BENTO 2x2 + FULL) ================= */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <StaggerItem delay={0}>
                <Text style={styles.questionTitle}>What is your current primary goal?</Text>
              </StaggerItem>
              <StaggerItem delay={50}>
                <Text style={styles.questionSubtitle}>
                  Select your life stage to customize your daily insights and medical tools.
                </Text>
              </StaggerItem>

              <View style={styles.bentoGrid}>
                <BentoCard
                  icon="water-outline"
                  title="Track my cycle"
                  subtitle="Period & Fertile Days"
                  isSelected={selectedStage === 'cycle'}
                  onPress={() => setSelectedStage('cycle')}
                  delay={100}
                />

                <BentoCard
                  icon="heart-outline"
                  title="Track pregnancy"
                  subtitle="Expecting Mother"
                  isSelected={selectedStage === 'pregnancy'}
                  onPress={() => setSelectedStage('pregnancy')}
                  delay={160}
                />

                <BentoCard
                  icon="leaf-outline"
                  title="Menopause transition"
                  subtitle="Cycle shifts in your 40s+"
                  isSelected={selectedStage === 'perimenopause'}
                  onPress={() => setSelectedStage('perimenopause')}
                  delay={220}
                />

                <BentoCard
                  icon="shield-checkmark-outline"
                  title="Life after menopause"
                  subtitle="Long-term health & vitality"
                  isSelected={selectedStage === 'postmenopause'}
                  onPress={() => setSelectedStage('postmenopause')}
                  delay={280}
                />

                <BentoCard
                  icon="sparkles-outline"
                  title="Trying for a baby"
                  subtitle="Fertile window alerts & conception planning"
                  isSelected={selectedStage === 'ttc'}
                  onPress={() => setSelectedStage('ttc')}
                  isFullWidth={true}
                  delay={340}
                />
              </View>
            </View>
          )}

          {/* ================= BRANCH A: CYCLE & TTC ================= */}
          {(selectedStage === 'cycle' || selectedStage === 'ttc') && (
            <>
              {step === 2 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>How many days does your period usually last?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>Bleeding usually lasts between 4–7 days.</Text>
                  </StaggerItem>

                  <StaggerItem delay={110}>
                    <SingleWheelPickerCard
                      items={periodDaysList}
                      selectedValue={periodDays}
                      onSelect={setPeriodDays}
                      unitText="Days"
                    />
                  </StaggerItem>
                </View>
              )}

              {step === 3 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>How many days does your cycle usually last?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>
                      Duration from the first day of one period to the next (typically 23–35 days).
                    </Text>
                  </StaggerItem>

                  <StaggerItem delay={110}>
                    <SingleWheelPickerCard
                      items={cycleDaysList}
                      selectedValue={cycleDays}
                      onSelect={setCycleDays}
                      unitText="Days"
                    />
                  </StaggerItem>
                </View>
              )}

              {step === 4 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>When did your last period start?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>Select the first day of bleeding from your most recent period.</Text>
                  </StaggerItem>

                  <StaggerItem delay={110}>
                    <ConstrainedDateWheelPicker
                      selectedDate={cyclePeriodDate}
                      onDateChange={setCyclePeriodDate}
                      minDate={cycleBounds.minDate}
                      maxDate={cycleBounds.maxDate}
                    />
                  </StaggerItem>
                </View>
              )}

              {step === 5 && (
                <View style={styles.stepContainer}>
                  <CompletionStep stage={selectedStage} />
                </View>
              )}
            </>
          )}

          {/* ================= BRANCH B: PREGNANCY ================= */}
          {selectedStage === 'pregnancy' && (
            <>
              {step === 2 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>How would you like to calculate your pregnancy?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>Pick the option that matches your doctor's advice.</Text>
                  </StaggerItem>

                  <View style={styles.bentoGrid}>
                    <BentoCard
                      icon="calendar-outline"
                      title="First Day of Last Period"
                      subtitle="Most common starting date (LMP)"
                      isSelected={pregnancyCalcMethod === 'lmp'}
                      onPress={() => handleSelectPregnancyCalcMethod('lmp')}
                      delay={100}
                    />
                    <BentoCard
                      icon="time-outline"
                      title="Estimated Due Date"
                      subtitle="Date from your doctor or scan"
                      isSelected={pregnancyCalcMethod === 'dueDate'}
                      onPress={() => handleSelectPregnancyCalcMethod('dueDate')}
                      delay={160}
                    />
                    <BentoCard
                      icon="heart-outline"
                      title="Conception Date"
                      subtitle="Day baby was conceived"
                      isSelected={pregnancyCalcMethod === 'conception'}
                      onPress={() => handleSelectPregnancyCalcMethod('conception')}
                      delay={220}
                    />
                    <BentoCard
                      icon="medical-outline"
                      title="IVF Transfer Date"
                      subtitle="Day embryo was transferred"
                      isSelected={pregnancyCalcMethod === 'ivf'}
                      onPress={() => handleSelectPregnancyCalcMethod('ivf')}
                      delay={280}
                    />
                  </View>
                </View>
              )}

              {step === 3 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>
                      {pregnancyCalcMethod === 'dueDate'
                        ? 'What is your estimated due date?'
                        : pregnancyCalcMethod === 'conception'
                        ? 'What was your conception date?'
                        : pregnancyCalcMethod === 'ivf'
                        ? 'When was your IVF embryo transfer?'
                        : 'First day of your last period?'}
                    </Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>We'll track your pregnancy progress week by week.</Text>
                  </StaggerItem>

                  <StaggerItem delay={110}>
                    <ConstrainedDateWheelPicker
                      selectedDate={pregnancyDate}
                      onDateChange={setPregnancyDate}
                      minDate={pregBounds.minDate}
                      maxDate={pregBounds.maxDate}
                    />
                  </StaggerItem>
                </View>
              )}

              {step === 4 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>Tell us about your baby</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>Personalizes health articles and developmental milestones.</Text>
                  </StaggerItem>

                  <StaggerItem delay={90}>
                    <Text style={styles.sectionDividerLabel}>IS THIS YOUR FIRST PREGNANCY?</Text>
                  </StaggerItem>
                  <View style={styles.bentoGrid}>
                    <BentoCard
                      icon="happy-outline"
                      title="First Baby"
                      subtitle="First pregnancy journey"
                      isSelected={isFirstBaby === true}
                      onPress={() => setIsFirstBaby(true)}
                      delay={130}
                    />
                    <BentoCard
                      icon="people-outline"
                      title="I Have Children"
                      subtitle="Experienced mother"
                      isSelected={isFirstBaby === false}
                      onPress={() => setIsFirstBaby(false)}
                      delay={180}
                    />
                  </View>

                  <StaggerItem delay={220}>
                    <Text style={[styles.sectionDividerLabel, { marginTop: 24 }]}>ARE YOU EXPECTING MULTIPLES?</Text>
                  </StaggerItem>
                  <View style={styles.bentoGrid}>
                    <BentoCard
                      icon="person-outline"
                      title="Single Baby"
                      subtitle="One little miracle"
                      isSelected={multipleType === 'single'}
                      onPress={() => setMultipleType('single')}
                      delay={260}
                    />
                    <BentoCard
                      icon="people-outline"
                      title="Twins"
                      subtitle="Double the joy"
                      isSelected={multipleType === 'twins'}
                      onPress={() => setMultipleType('twins')}
                      delay={310}
                    />
                    <BentoCard
                      icon="star-outline"
                      title="Triplets or more"
                      subtitle="Three or more blessings"
                      isSelected={multipleType === 'triplets_plus'}
                      onPress={() => setMultipleType('triplets_plus')}
                      isFullWidth={true}
                      delay={360}
                    />
                  </View>
                </View>
              )}

              {step === 5 && (
                <View style={styles.stepContainer}>
                  <CompletionStep stage="pregnancy" />
                </View>
              )}
            </>
          )}

          {/* ================= BRANCH C: PERIMENOPAUSE ================= */}
          {selectedStage === 'perimenopause' && (
            <>
              {step === 2 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>How are your periods shifting?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>Select the option that best reflects your recent cycles.</Text>
                  </StaggerItem>

                  <View style={styles.bentoGrid}>
                    <BentoCard
                      icon="shuffle-outline"
                      title="Becoming Irregular"
                      subtitle="Fluctuates by 7+ days"
                      isSelected={periCyclePattern === 'irregular'}
                      onPress={() => setPeriCyclePattern('irregular')}
                      delay={100}
                    />
                    <BentoCard
                      icon="play-skip-forward-outline"
                      title="Skipping Months"
                      subtitle="Missed or spaced cycles"
                      isSelected={periCyclePattern === 'skipping'}
                      onPress={() => setPeriCyclePattern('skipping')}
                      delay={160}
                    />
                    <BentoCard
                      icon="water-outline"
                      title="Flow Changes"
                      subtitle="Heavier or much lighter"
                      isSelected={periCyclePattern === 'flow_changes'}
                      onPress={() => setPeriCyclePattern('flow_changes')}
                      delay={220}
                    />
                    <BentoCard
                      icon="flame-outline"
                      title="Regular with Symptoms"
                      subtitle="Hot flashes or mood shifts"
                      isSelected={periCyclePattern === 'regular_with_symptoms'}
                      onPress={() => setPeriCyclePattern('regular_with_symptoms')}
                      delay={280}
                    />
                  </View>
                </View>
              )}

              {step === 3 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>Which symptoms are you noticing most?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>Select all that apply. Tap each card to toggle.</Text>
                  </StaggerItem>

                  <View style={styles.bentoGrid}>
                    <BentoCard
                      icon="flame-outline"
                      title="Hot Flashes"
                      subtitle="Sudden heat & flushes"
                      isSelected={periSymptoms.includes('hot_flashes')}
                      onPress={() => togglePeriSymptom('hot_flashes')}
                      delay={90}
                    />
                    <BentoCard
                      icon="water-outline"
                      title="Night Sweats"
                      subtitle="Waking up drenched"
                      isSelected={periSymptoms.includes('night_sweats')}
                      onPress={() => togglePeriSymptom('night_sweats')}
                      delay={140}
                    />
                    <BentoCard
                      icon="moon-outline"
                      title="Sleep Disruptions"
                      subtitle="Insomnia & restless rest"
                      isSelected={periSymptoms.includes('sleep')}
                      onPress={() => togglePeriSymptom('sleep')}
                      delay={190}
                    />
                    <BentoCard
                      icon="heart-half-outline"
                      title="Mood Shifts"
                      subtitle="Anxiety & irritability"
                      isSelected={periSymptoms.includes('mood')}
                      onPress={() => togglePeriSymptom('mood')}
                      delay={240}
                    />
                    <BentoCard
                      icon="sparkles-outline"
                      title="Brain Fog"
                      subtitle="Memory & focus lapses"
                      isSelected={periSymptoms.includes('brain_fog')}
                      onPress={() => togglePeriSymptom('brain_fog')}
                      delay={290}
                    />
                    <BentoCard
                      icon="body-outline"
                      title="Joint & Body Aches"
                      subtitle="Fatigue & stiffness"
                      isSelected={periSymptoms.includes('joint_aches')}
                      onPress={() => togglePeriSymptom('joint_aches')}
                      delay={340}
                    />
                  </View>
                </View>
              )}

              {step === 4 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>When did these shifts begin?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>Helps map your hormonal trajectory over time.</Text>
                  </StaggerItem>

                  <View style={styles.bentoGrid}>
                    <BentoCard
                      icon="time-outline"
                      title="Last 6 Months"
                      subtitle="Just recently noticing"
                      isSelected={periOnsetTimeline === 'recent'}
                      onPress={() => setPeriOnsetTimeline('recent')}
                      delay={100}
                    />
                    <BentoCard
                      icon="calendar-outline"
                      title="1 to 2 Years Ago"
                      subtitle="Gradual transitions"
                      isSelected={periOnsetTimeline === '1_2_years'}
                      onPress={() => setPeriOnsetTimeline('1_2_years')}
                      delay={160}
                    />
                    <BentoCard
                      icon="hourglass-outline"
                      title="3+ Years Ago"
                      subtitle="Extended transition"
                      isSelected={periOnsetTimeline === '3_plus_years'}
                      onPress={() => setPeriOnsetTimeline('3_plus_years')}
                      delay={220}
                    />
                    <BentoCard
                      icon="help-circle-outline"
                      title="Not Sure"
                      subtitle="Starting to track today"
                      isSelected={periOnsetTimeline === 'not_sure'}
                      onPress={() => setPeriOnsetTimeline('not_sure')}
                      delay={280}
                    />
                  </View>
                </View>
              )}

              {step === 5 && (
                <View style={styles.stepContainer}>
                  <CompletionStep stage="perimenopause" />
                </View>
              )}
            </>
          )}

          {/* ================= BRANCH D: POSTMENOPAUSE ================= */}
          {selectedStage === 'postmenopause' && (
            <>
              {step === 2 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>Time since your last period?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>Menopause is clinically confirmed after 12 consecutive months.</Text>
                  </StaggerItem>

                  <View style={styles.bentoGrid}>
                    <BentoCard
                      icon="ribbon-outline"
                      title="12 to 24 Months"
                      subtitle="Early postmenopause"
                      isSelected={postYearsSincePeriod === '1_2_years'}
                      onPress={() => setPostYearsSincePeriod('1_2_years')}
                      delay={100}
                    />
                    <BentoCard
                      icon="shield-checkmark-outline"
                      title="2 to 5 Years"
                      subtitle="Established wellness"
                      isSelected={postYearsSincePeriod === '2_5_years'}
                      onPress={() => setPostYearsSincePeriod('2_5_years')}
                      delay={160}
                    />
                    <BentoCard
                      icon="star-outline"
                      title="5+ Years"
                      subtitle="Long-term vitality"
                      isSelected={postYearsSincePeriod === '5_plus_years'}
                      onPress={() => setPostYearsSincePeriod('5_plus_years')}
                      delay={220}
                    />
                    <BentoCard
                      icon="medical-outline"
                      title="Surgical"
                      subtitle="Ovaries or womb removed"
                      isSelected={postYearsSincePeriod === 'surgical'}
                      onPress={() => setPostYearsSincePeriod('surgical')}
                      delay={280}
                    />
                  </View>
                </View>
              )}

              {step === 3 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>Top wellness priorities?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>Select all areas you want Red Apple to monitor and support.</Text>
                  </StaggerItem>

                  <View style={styles.bentoGrid}>
                    <BentoCard
                      icon="shield-outline"
                      title="Bone Strength"
                      subtitle="Protecting against bone thinning"
                      isSelected={postPriorities.includes('bone_density')}
                      onPress={() => togglePostPriority('bone_density')}
                      delay={90}
                    />
                    <BentoCard
                      icon="heart-outline"
                      title="Heart & Cardio"
                      subtitle="Blood pressure & circulation"
                      isSelected={postPriorities.includes('cardio')}
                      onPress={() => togglePostPriority('cardio')}
                      delay={140}
                    />
                    <BentoCard
                      icon="rose-outline"
                      title="Pelvic Health"
                      subtitle="Bladder control & comfort"
                      isSelected={postPriorities.includes('pelvic')}
                      onPress={() => togglePostPriority('pelvic')}
                      delay={190}
                    />
                    <BentoCard
                      icon="fitness-outline"
                      title="Metabolism"
                      subtitle="Energy & body balance"
                      isSelected={postPriorities.includes('metabolism')}
                      onPress={() => togglePostPriority('metabolism')}
                      delay={240}
                    />
                    <BentoCard
                      icon="moon-outline"
                      title="Deep Sleep"
                      subtitle="Restful, restorative nights"
                      isSelected={postPriorities.includes('energy')}
                      onPress={() => togglePostPriority('energy')}
                      delay={290}
                    />
                    <BentoCard
                      icon="bulb-outline"
                      title="Brain Fog & Focus"
                      subtitle="Clearer thinking & memory"
                      isSelected={postPriorities.includes('mental_health')}
                      onPress={() => togglePostPriority('mental_health')}
                      delay={340}
                    />
                  </View>
                </View>
              )}

              {step === 4 && (
                <View style={styles.stepContainer}>
                  <StaggerItem delay={0}>
                    <Text style={styles.questionTitle}>Hormone Therapy (HRT)</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text style={styles.questionSubtitle}>Are you taking hormone pills, patches, or creams?</Text>
                  </StaggerItem>

                  <View style={styles.bentoGrid}>
                    <BentoCard
                      icon="medkit-outline"
                      title="Taking HRT"
                      subtitle="Prescribed hormone therapy"
                      isSelected={hrtStatus === 'taking_hrt'}
                      onPress={() => setHrtStatus('taking_hrt')}
                      delay={100}
                    />
                    <BentoCard
                      icon="chatbubbles-outline"
                      title="Considering HRT"
                      subtitle="Discussing with my doctor"
                      isSelected={hrtStatus === 'considering'}
                      onPress={() => setHrtStatus('considering')}
                      delay={160}
                    />
                    <BentoCard
                      icon="nutrition-outline"
                      title="Not Taking HRT"
                      subtitle="Managing through lifestyle & food"
                      isSelected={hrtStatus === 'not_taking'}
                      onPress={() => setHrtStatus('not_taking')}
                      isFullWidth={true}
                      delay={220}
                    />
                  </View>
                </View>
              )}

              {step === 5 && (
                <View style={styles.stepContainer}>
                  <CompletionStep stage="postmenopause" />
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* BOTTOM ACTION BAR (SIGNATURE CRIMSON PILL BUTTON) */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={submitting}
            style={styles.primaryPillButton}
            onPress={handleNextStep}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryPillButtonText}>
                {step === TOTAL_STEPS ? 'Complete Setup' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>

          {step > 1 && step < TOTAL_STEPS && (
            <TouchableOpacity activeOpacity={0.7} style={styles.skipButton} onPress={handleNextStep}>
              <Text style={styles.skipButtonText}>I'm not sure, skip this</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ================= CLEAN LIGHT THEMED STYLES ================= */
const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  radialGlowWrapper: {
    position: 'absolute',
    top: -SCREEN_WIDTH * 0.35,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: (SCREEN_WIDTH * 1.5) / 2,
    overflow: 'hidden',
  },
  radialGlowDisc: {
    width: '100%',
    height: '100%',
  },
  safeContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    gap: 12,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8EE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  progressBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressSegmentActive: {
    backgroundColor: colors.primary,
  },
  progressSegmentInactive: {
    backgroundColor: '#E5E7EB',
  },

  /* SCROLL CONTENT */
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepContainer: {
    width: '100%',
  },
  questionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    lineHeight: 38,
    letterSpacing: -0.5,
    paddingTop: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  questionSubtitle: {
    fontSize: 14.5,
    fontWeight: '400',
    color: '#6E6266',
    lineHeight: 21,
    marginBottom: 26,
  },
  questionTitleCentered: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    lineHeight: 32,
    marginTop: 28,
    marginBottom: 8,
  },
  questionSubtitleCentered: {
    fontSize: 14.5,
    fontWeight: '400',
    color: '#6E6266',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 12,
  },

  sectionDividerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  /* BENTO GRID LAYOUT */
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    justifyContent: 'space-between',
    width: '100%',
  },
  bentoCard: {
    borderRadius: 26,
    padding: 18,
    minHeight: 162,
    justifyContent: 'space-between',
  },
  bentoCardHalfWidth: {
    width: CARD_WIDTH,
  },
  bentoCardFullWidth: {
    width: '100%',
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 16,
  },

  /* LIGHT THEME CARD STATES (UNSELECTED vs SELECTED) */
  bentoCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#ECECF0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bentoCardSelected: {
    backgroundColor: '#EDEDF2',
    borderWidth: 1.5,
    borderColor: '#E2E4E8',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  bentoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  bentoTopRowFullWidth: {
    width: 'auto',
  },
  bentoCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bentoBottomCol: {
    marginTop: 18,
  },
  bentoBottomColFullWidth: {
    marginTop: 0,
    flex: 1,
  },
  bentoTitle: {
    fontSize: 16.5,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  bentoTitleSelected: {
    color: '#1C1C1E',
  },
  bentoSubtitle: {
    fontSize: 12.5,
    fontWeight: '400',
    color: '#6E6266',
    lineHeight: 16,
  },
  bentoSubtitleSelected: {
    color: '#6E6266',
  },

  /* UNIFIED DATE WHEEL (DIRECT ON SCREEN) */
  datePickerDirectWrapper: {
    width: '100%',
    marginTop: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateColsHeader: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  dateColLabel: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  unifiedWheelContainer: {
    height: ITEM_HEIGHT * 3,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  unifiedHighlightBand: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#EDEDF2',
    borderRadius: 29,
    zIndex: 0,
  },
  unifiedColsRow: {
    flexDirection: 'row',
    width: '100%',
    height: ITEM_HEIGHT * 3,
    alignItems: 'center',
    zIndex: 1,
  },
  wheelColContainer: {
    height: ITEM_HEIGHT * 3,
    justifyContent: 'center',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#A0A0AB',
  },
  wheelItemTextSelected: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1C1C1E',
  },

  /* SINGLE WHEEL PICKER (DIRECT ON SCREEN) */
  singleWheelDirectWrapper: {
    width: '100%',
    marginTop: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  singleWheelContainer: {
    height: ITEM_HEIGHT * 3,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },

  /* COMPLETION SCREEN (LIGHT THEME) */
  completionContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 12,
  },
  illustrationWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  completionIllustration: {
    width: Math.min(SCREEN_WIDTH * 0.70, 260),
    height: Math.min(SCREEN_WIDTH * 0.70, 260),
  },
  illustrationFadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  completionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  completionSubtitle: {
    fontSize: 14.5,
    fontWeight: '400',
    color: '#6E6266',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  completionPerksContainer: {
    width: '100%',
    gap: 10,
    paddingHorizontal: 4,
  },
  completionPerkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#ECECF0',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  completionPerkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  /* BOTTOM ACTIONS (SIGNATURE CRIMSON PILL BUTTON) */
  bottomActions: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 26,
    paddingTop: 12,
    alignItems: 'center',
  },
  primaryPillButton: {
    width: '100%',
    height: 58,
    backgroundColor: colors.primary,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryPillButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  skipButton: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textDecorationLine: 'underline',
  },
});
