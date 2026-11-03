import React, { useState, useRef, useEffect } from 'react';
import {
  Text,
  View,
  Image,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { requestAndScheduleNotifications } from '../utils/notifications';
import {
  saveHealthProfileSafe,
  saveActiveHealthModeSafe,
  saveOnboardingStatusSafe,
} from '../utils/storage';

const ITEM_HEIGHT = 58;

function getDaysInMonth(monthName, year) {
  const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthName);
  return new Date(year, (monthIdx >= 0 ? monthIdx : 0) + 1, 0).getDate();
}

/* ================= WHEEL COLUMN ================= */
function WheelColumn({ items, selectedValue, onSelect, unitText = '' }) {
  const { theme, isDarkMode } = useTheme();
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
    <View className="h-full overflow-hidden">
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
              className="h-[58px] items-center justify-center"
              onPress={() => handleItemPress(item, index)}
            >
              <Text
                className={`text-center ${isSelected ? 'text-lg font-bold' : 'text-base font-semibold'}`}
                style={{ color: isSelected ? (isDarkMode ? '#A8D0C3' : '#173D36') : theme.textMuted }}
              >
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
  const { theme, isDarkMode } = useTheme();
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
    <View className="w-full rounded-[28px] p-4 mt-2" style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, borderWidth: 1, borderRadius: 28 }}>
      {/* COLUMN LABELS */}
      <View className="flex-row px-2 mb-2">
        <Text className="text-xs font-bold text-center flex-[1.3]" style={{ color: theme.textSecondary }}>Month</Text>
        <Text className="text-xs font-bold text-center flex-[0.9]" style={{ color: theme.textSecondary }}>Day</Text>
        <Text className="text-xs font-bold text-center flex-[1.1]" style={{ color: theme.textSecondary }}>Year</Text>
      </View>

      {/* 3-COLUMN WHEEL WITH CONTINUOUS HIGHLIGHT BAND */}
      <View className="h-[174px] relative justify-center overflow-hidden">
        <View
          className="absolute left-0 right-0 h-[58px] rounded-full"
          style={{ backgroundColor: isDarkMode ? '#293A35' : '#E4ECEA', borderTopWidth: 1, borderBottomWidth: 1, borderTopColor: isDarkMode ? '#3E5A50' : '#C7D7D2', borderBottomColor: isDarkMode ? '#3E5A50' : '#C7D7D2' }}
          pointerEvents="none"
        />

        <View className="flex-row h-full">
          <View className="flex-[1.3]">
            <WheelColumn
              items={availableMonths}
              selectedValue={currentMonthName}
              onSelect={handleMonthChange}
            />
          </View>
          <View className="flex-[0.9]">
            <WheelColumn
              items={availableDays}
              selectedValue={selDay}
              onSelect={handleDayChange}
            />
          </View>
          <View className="flex-[1.1]">
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
  const { theme, isDarkMode } = useTheme();
  return (
    <View className="w-full rounded-[28px] p-4 mt-2" style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, borderWidth: 1, borderRadius: 28 }}>
      <View className="h-[174px] relative justify-center overflow-hidden items-center">
        <View
          className="absolute left-0 right-0 h-[58px] rounded-full"
          style={{ backgroundColor: isDarkMode ? '#293A35' : '#E4ECEA', borderTopWidth: 1, borderBottomWidth: 1, borderTopColor: isDarkMode ? '#3E5A50' : '#C7D7D2', borderBottomColor: isDarkMode ? '#3E5A50' : '#C7D7D2' }}
          pointerEvents="none"
        />
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

/* ================= LIFE STAGE OPTION CARD ================= */
function BentoCard({
  icon,
  title,
  subtitle,
  isSelected,
  onPress,
  isFullWidth = false,
  delay = 0,
}) {
  const { theme, isDarkMode } = useTheme();
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
      className={`rounded-[24px] p-4 border justify-between ${isFullWidth ? 'w-full flex-row items-center' : 'w-[48%]'}`}
      style={{
        backgroundColor: isSelected ? (isDarkMode ? '#263C35' : '#EAF1EF') : theme.inputBg,
        borderColor: isSelected ? (isDarkMode ? '#6B9D8C' : '#173D36') : theme.inputBorder,
        borderWidth: 1,
        borderRadius: 24,
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
        ],
      }}
      onPress={onPress}
    >
      {isFullWidth ? (
        <>
          <Ionicons
            name={icon}
            size={28}
            color={isSelected ? (isDarkMode ? '#A8D0C3' : '#173D36') : theme.textSecondary}
          />

          <View className="flex-1 ml-3">
            <Text
              className="text-sm font-bold leading-snug"
              style={{ color: isSelected ? (isDarkMode ? '#C4DED5' : '#173D36') : theme.textPrimary }}
              numberOfLines={2}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                className="text-xs mt-0.5 leading-snug"
                style={{ color: isSelected ? (isDarkMode ? '#A8C8BC' : '#365B52') : theme.textSecondary }}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          {isSelected && (
            <View className="w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: isDarkMode ? '#4C8375' : '#173D36' }}>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            </View>
          )}
        </>
      ) : (
        <>
          <View className="flex-row items-center justify-between w-full mb-3">
            <Ionicons
              name={icon}
              size={28}
              color={isSelected ? (isDarkMode ? '#A8D0C3' : '#173D36') : theme.textSecondary}
            />
            {isSelected && (
              <View className="w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: isDarkMode ? '#4C8375' : '#173D36' }}>
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              </View>
            )}
          </View>

          <View className="w-full">
            <Text
              className="text-sm font-bold leading-snug"
              style={{ color: isSelected ? (isDarkMode ? '#C4DED5' : '#173D36') : theme.textPrimary }}
              numberOfLines={2}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                className="text-xs mt-0.5 leading-snug"
                style={{ color: isSelected ? (isDarkMode ? '#A8C8BC' : '#365B52') : theme.textSecondary }}
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
  const { theme, isDarkMode } = useTheme();
  const content = COMPLETION_CONTENT[stage] || COMPLETION_CONTENT.cycle;

  return (
    <View className="items-center w-full px-2">
      <StaggerItem delay={0} style={{ width: '100%', height: 224, alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 16 }}>
        <Image
          source={require('../../assets/images/onboarding_done.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
        <LinearGradient
          colors={isDarkMode ? ['rgba(20,24,23,0)', 'rgba(20,24,23,0.8)', theme.background] : ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.75)', '#FFFFFF']}
          locations={[0, 0.5, 1]}
          className="absolute left-0 right-0 bottom-0 h-16"
          pointerEvents="none"
        />
      </StaggerItem>

      <StaggerItem delay={90} style={{ width: '100%' }}>
        <Text className="text-[32px] leading-[38px] font-extrabold mb-2 tracking-tight" style={{ color: theme.textPrimary }}>{content.title}</Text>
      </StaggerItem>

      <StaggerItem delay={160} style={{ width: '100%' }}>
        <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>{content.subtitle}</Text>
      </StaggerItem>

      <View className="w-full gap-2.5 px-2">
        {content.perks.map((perk, idx) => (
          <StaggerItem key={idx} delay={230 + idx * 80}>
            <View className="flex-row items-center rounded-[24px] p-3.5 gap-3" style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, borderWidth: 1, borderRadius: 24 }}>
              <Ionicons name="checkmark-circle" size={18} color={isDarkMode ? '#75B09C' : '#173D36'} />
              <Text className="text-sm font-semibold flex-1" style={{ color: theme.textPrimary }}>{perk}</Text>
            </View>
          </StaggerItem>
        ))}
      </View>
    </View>
  );
}

/* ================= MAIN ONBOARDING SETUP ================= */
export default function OnboardingSetupScreen({
  onBack,
  onComplete,
  initialStage,
  isChangingMode = false,
}) {
  const { updateProfile } = useAuth();
  const { showError, showSuccess } = useToast();
  const { theme, isDarkMode } = useTheme();

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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'left', 'right', 'bottom']}>
        {/* HEADER: BACK, PROGRESS, CLOSE */}
        <View className="flex-row items-center justify-between px-6 pt-2 pb-2">
          <View className="flex-1 flex-row items-center justify-center mx-3 gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                className="flex-1 h-[5px] rounded-full"
                style={{ backgroundColor: i <= step ? (isDarkMode ? '#A52B39' : '#173D36') : (isDarkMode ? '#38433F' : '#D8E0DE') }}
              />
            ))}
          </View>
        </View>

        {/* SCROLLABLE MAIN CONTENT */}
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* ================= STEP 1: PRIMARY GOAL ================= */}
          {step === 1 && (
            <View className="w-full">
              <StaggerItem delay={0}>
                <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>What is your current primary goal?</Text>
              </StaggerItem>
              <StaggerItem delay={50}>
                <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>
                  Select your life stage to customize your daily insights and medical tools.
                </Text>
              </StaggerItem>

              <View className="flex-row flex-wrap justify-between gap-3">
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
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>How many days does your period usually last?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>Bleeding usually lasts between 4–7 days.</Text>
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
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>How many days does your cycle usually last?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>
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
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>When did your last period start?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>Select the first day of bleeding from your most recent period.</Text>
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
                <View className="w-full">
                  <CompletionStep stage={selectedStage} />
                </View>
              )}
            </>
          )}

          {/* ================= BRANCH B: PREGNANCY ================= */}
          {selectedStage === 'pregnancy' && (
            <>
              {step === 2 && (
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>How would you like to calculate your pregnancy?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>Pick the option that matches your doctor's advice.</Text>
                  </StaggerItem>

                  <View className="flex-row flex-wrap justify-between gap-3">
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
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>
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
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>We'll track your pregnancy progress week by week.</Text>
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
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>Tell us about your baby</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>Personalizes health articles and developmental milestones.</Text>
                  </StaggerItem>

                  <StaggerItem delay={90}>
                    <Text className="text-xs font-bold tracking-wide mb-3 px-1" style={{ color: theme.textSecondary }}>IS THIS YOUR FIRST PREGNANCY?</Text>
                  </StaggerItem>
                  <View className="flex-row flex-wrap justify-between gap-3">
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
                    <Text className="text-xs font-bold tracking-wide mb-3 px-1 mt-6" style={{ color: theme.textSecondary }}>ARE YOU EXPECTING MULTIPLES?</Text>
                  </StaggerItem>
                  <View className="flex-row flex-wrap justify-between gap-3">
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
                <View className="w-full">
                  <CompletionStep stage="pregnancy" />
                </View>
              )}
            </>
          )}

          {/* ================= BRANCH C: PERIMENOPAUSE ================= */}
          {selectedStage === 'perimenopause' && (
            <>
              {step === 2 && (
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>How are your periods shifting?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>Select the option that best reflects your recent cycles.</Text>
                  </StaggerItem>

                  <View className="flex-row flex-wrap justify-between gap-3">
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
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>Which symptoms are you noticing most?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>Select all that apply. Tap each card to toggle.</Text>
                  </StaggerItem>

                  <View className="flex-row flex-wrap justify-between gap-3">
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
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>When did these shifts begin?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>Helps map your hormonal trajectory over time.</Text>
                  </StaggerItem>

                  <View className="flex-row flex-wrap justify-between gap-3">
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
                <View className="w-full">
                  <CompletionStep stage="perimenopause" />
                </View>
              )}
            </>
          )}

          {/* ================= BRANCH D: POSTMENOPAUSE ================= */}
          {selectedStage === 'postmenopause' && (
            <>
              {step === 2 && (
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>Time since your last period?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>Menopause is clinically confirmed after 12 consecutive months.</Text>
                  </StaggerItem>

                  <View className="flex-row flex-wrap justify-between gap-3">
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
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>Top wellness priorities?</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>Select all areas you want Red Apple to monitor and support.</Text>
                  </StaggerItem>

                  <View className="flex-row flex-wrap justify-between gap-3">
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
                <View className="w-full">
                  <StaggerItem delay={0}>
                    <Text className="text-[32px] font-extrabold leading-[38px] tracking-tight mb-2" style={{ color: theme.textPrimary }}>Hormone Therapy (HRT)</Text>
                  </StaggerItem>
                  <StaggerItem delay={50}>
                    <Text className="text-base leading-6 mb-6" style={{ color: theme.textSecondary }}>Are you taking hormone pills, patches, or creams?</Text>
                  </StaggerItem>

                  <View className="flex-row flex-wrap justify-between gap-3">
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
                <View className="w-full">
                  <CompletionStep stage="postmenopause" />
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* BOTTOM ACTION BAR */}
        <View className="px-6 pb-4 pt-3 gap-2" style={{ backgroundColor: theme.background }}>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={submitting}
            className="h-[62px] rounded-full items-center justify-center"
            style={{ backgroundColor: isDarkMode ? '#A52B39' : '#101B1A' }}
            onPress={handleNextStep}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-base font-bold text-white">
                {step === TOTAL_STEPS ? 'Complete Setup' : 'Next'}
              </Text>
            )}
            {!submitting && <View className="absolute right-1.5 h-[49px] w-[49px] items-center justify-center rounded-full" style={{ backgroundColor: isDarkMode ? '#DCEAE5' : '#FFFFFF' }}><Ionicons name="arrow-forward" size={19} color="#101B1A" /></View>}
          </TouchableOpacity>

          {step > 1 && step < TOTAL_STEPS && (
            <TouchableOpacity activeOpacity={0.7} className="py-2 items-center justify-center" onPress={handleNextStep}>
              <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>I'm not sure, skip this</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
