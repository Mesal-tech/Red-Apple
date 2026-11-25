import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { SkeletonPulse } from '../components/DoctorCareSkeleton';
import AppBottomSheet from '../components/AppBottomSheet';
import cycleService from '../services/cycleService';
import { getCycleLogsSafe, getHealthProfileSafe } from '../utils/storage';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_ITEM_HEIGHT = 410;
const MONTH_PAGE_SIZE = 6;
const TRACKABLE_SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Acne', 'Tender breasts', 'Fatigue', 'Low energy', 'Cravings', 'Sleep changes', 'Appetite changes', 'Libido changes', 'Workout felt different'];
const FEELINGS = ['Okay', 'Calm', 'Low', 'Anxious', 'Irritable', 'Energized'];
const SYMPTOM_MARKERS = {
  Cramps: { icon: '⚡', background: '#FCE4EC', color: '#C43D64' },
  Headache: { icon: '🤕', background: '#E8EDFF', color: '#536AC7' },
  Bloating: { icon: '🫧', background: '#DDF6F1', color: '#238F83' },
  Acne: { icon: '✨', background: '#FFF0D8', color: '#B9781E' },
  'Tender breasts': { icon: '🌸', background: '#FBE5F0', color: '#B74F7D' },
  Fatigue: { icon: '😴', background: '#E9E7FB', color: '#665CAD' },
  'Low energy': { icon: '🔋', background: '#E4F3DD', color: '#53853E' },
  Cravings: { icon: '🍓', background: '#FFE7DF', color: '#C35A45' },
  'Sleep changes': { icon: '🌙', background: '#E7EDFA', color: '#55719E' },
  'Appetite changes': { icon: '🍽️', background: '#FFF0D8', color: '#A9762C' },
  'Libido changes': { icon: '💗', background: '#FBE3EA', color: '#BD4E6D' },
  'Workout felt different': { icon: '🏃', background: '#E0F1FA', color: '#3980A0' },
};
const FEELING_MARKERS = {
  Okay: { icon: '🙂', background: '#EDF1F5', color: '#637083' },
  Calm: { icon: '😌', background: '#DDF6F1', color: '#238F83' },
  Low: { icon: '😔', background: '#E9E7FB', color: '#665CAD' },
  Anxious: { icon: '😟', background: '#FFF0D8', color: '#A9762C' },
  Irritable: { icon: '😠', background: '#FCE4EC', color: '#C43D64' },
  Energized: { icon: '⚡', background: '#FFF0D8', color: '#B9781E' },
};

function cleanSymptomName(symptom) {
  return String(symptom || '').startsWith('Cramps (') ? 'Cramps' : String(symptom || '');
}

function toLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).split('T')[0].split('-').map(Number);
  if (year && month && day) return new Date(year, month - 1, day);
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKeyFor(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildMonthData(year, month, options) {
  const {
    today,
    todayZero,
    cycleLength,
    periodDuration,
    lastPeriodDate,
    currentCycleDay,
    loggedPeriodDates,
  } = options;
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  let periodDaysCount = 0;
  let fertileDaysCount = 0;
  let ovulationDayNum = null;
  const ovulationCycleDay = Math.max(cycleLength - 14, 1);
  const fertileStartCycleDay = Math.max(ovulationCycleDay - 5, 1);
  const fertileEndCycleDay = ovulationCycleDay + 1;

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ key: `pad-${year}-${month}-${index}`, empty: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = dateKeyFor(year, month, day);
    const daysFromToday = Math.round((date - todayZero) / DAY_MS);
    const daysFromLastPeriod = lastPeriodDate
      ? Math.round((date - lastPeriodDate) / DAY_MS)
      : null;
    const cycleDay = lastPeriodDate
      ? (((daysFromLastPeriod % cycleLength) + cycleLength) % cycleLength) + 1
      : (((((currentCycleDay || 1) - 1 + daysFromToday) % cycleLength) + cycleLength) % cycleLength) + 1;

    let type = 'normal';
    if (loggedPeriodDates.has(dateKey) || (cycleDay >= 1 && cycleDay <= periodDuration)) {
      type = 'period';
      periodDaysCount += 1;
    } else if (cycleDay === ovulationCycleDay) {
      type = 'ovulation';
      ovulationDayNum = day;
    } else if (cycleDay >= fertileStartCycleDay && cycleDay <= fertileEndCycleDay) {
      type = 'fertile';
      fertileDaysCount += 1;
    }

    cells.push({
      key: `day-${year}-${month}-${day}`,
      empty: false,
      dayNum: day,
      dateKey,
      isToday: date.toDateString() === today.toDateString(),
      type,
      cycleDay,
    });
  }

  while (cells.length < 42) {
    cells.push({ key: `pad-end-${year}-${month}-${cells.length}`, empty: true });
  }

  return {
    key: `${year}-${month}`,
    year,
    month,
    title: MONTHS[month],
    monthTitle: `${MONTHS[month]} ${year}`,
    cells,
    stats: { periodDaysCount, fertileDaysCount, ovulationDayNum },
  };
}

export default function CycleCalendarScreen({ navigation, route }) {
  const { width: viewportWidth } = useWindowDimensions();
  const isWideScreen = viewportWidth >= 1100;
  const monthItemHeight = isWideScreen ? 330 : MONTH_ITEM_HEIGHT;
  const contentMaxWidth = isWideScreen ? 1240 : undefined;
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { isDarkMode, theme } = useTheme();
  const [activeCycleProfile, setActiveCycleProfile] = useState({});
  const [cyclePrediction, setCyclePrediction] = useState({});
  const [cycleLogs, setCycleLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarMode, setCalendarMode] = useState('month');
  const [showCalendarHelp, setShowCalendarHelp] = useState(false);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [painIntensity, setPainIntensity] = useState(3);
  const [selectedFeeling, setSelectedFeeling] = useState('Okay');
  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState('Medium');
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [monthWindow, setMonthWindow] = useState(() => {
    const now = new Date();
    const requestedParts = route?.params?.selectedDateKey?.split('-').map(Number);
    const requestedDate = requestedParts?.length === 3 && requestedParts.every(Number.isFinite)
      ? new Date(requestedParts[0], requestedParts[1] - 1, requestedParts[2])
      : now;
    return { start: new Date(requestedDate.getFullYear(), requestedDate.getMonth() - MONTH_PAGE_SIZE, 1), count: MONTH_PAGE_SIZE * 2 };
  });
  const [monthListVersion, setMonthListVersion] = useState(0);
  const [isLoadingMoreMonths, setIsLoadingMoreMonths] = useState(false);
  const monthListRef = useRef(null);
  const pendingMonthScrollOffset = useRef(null);
  const loadingPreviousMonths = useRef(false);
  const loadingNextMonths = useRef(false);
  const monthListReady = useRef(false);
  const [selectedDateKey, setSelectedDateKey] = useState(
    route?.params?.selectedDateKey || dateKeyFor(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  );

  const loadCycleData = async () => {
    setIsLoading(true);
    try {
      const [cachedProfile, history] = await Promise.all([
        getHealthProfileSafe(),
        cycleService.getCycleHistory(),
      ]);
      const logs = history?.logs || await getCycleLogsSafe();
      const storedProfile = cachedProfile || user?.health_profile || {};
      const profile = {
        cycleLength: Number(storedProfile.cycleLength || 28),
        periodDuration: Number(storedProfile.periodDuration || 5),
        lastPeriodDate: storedProfile.lastPeriodDate || null,
      };
      const personalizedProfile = cycleService.getPersonalizedCycleProfile(logs, profile);
      setActiveCycleProfile(personalizedProfile);
      const prediction = cycleService.computeLocalFertilityPrediction(
        personalizedProfile.lastPeriodDate,
        personalizedProfile.periodDuration,
        personalizedProfile.cycleLength
      );
      if (prediction) setCyclePrediction(prediction);
      if (Array.isArray(logs)) setCycleLogs(logs);
    } catch (error) {
      console.warn('[CycleCalendarScreen] Failed to load cycle data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCycleData();
  }, [user?.id]);

  const cycleMonths = useMemo(() => {
    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const cycleLength = Math.max(activeCycleProfile.cycleLength || 28, 1);
    const periodDuration = Math.max(activeCycleProfile.periodDuration || 5, 1);
    const lastPeriodDate = toLocalDate(activeCycleProfile.lastPeriodDate);
    const loggedPeriodDates = new Set();
    cycleLogs.forEach((log) => {
      const date = log.date || (log.logged_at ? log.logged_at.split('T')[0] : null);
      if (log.isPeriodDay && date) loggedPeriodDates.add(date);
    });
    const options = {
      today,
      todayZero,
      cycleLength,
      periodDuration,
      lastPeriodDate,
      currentCycleDay: cyclePrediction.currentCycleDay || 1,
      loggedPeriodDates,
    };

    const start = new Date(monthWindow.start.getFullYear(), monthWindow.start.getMonth(), 1);
    return Array.from({ length: monthWindow.count }, (_, offset) => {
      const date = new Date(start.getFullYear(), start.getMonth() + offset, 1);
      return buildMonthData(date.getFullYear(), date.getMonth(), options);
    });
  }, [monthWindow, activeCycleProfile, cycleLogs, cyclePrediction.currentCycleDay]);

  const cycleLogsByDate = useMemo(() => {
    const byDate = new Map();
    cycleLogs.forEach((log) => {
      const date = log.date || log.startDate || (log.logged_at ? log.logged_at.split('T')[0] : null);
      if (date) byDate.set(String(date).split('T')[0], log);
    });
    return byDate;
  }, [cycleLogs]);

  const selectedLog = cycleLogsByDate.get(selectedDateKey);
  const selectedSymptomsForDisplay = (selectedLog?.symptoms || []).map(cleanSymptomName);
  const selectedDate = toLocalDate(selectedDateKey);
  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    : selectedDateKey;

  const yearMonths = useMemo(() => {
    if (calendarMode !== 'year') return [];
    const currentYear = new Date().getFullYear();
    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const cycleLength = Math.max(activeCycleProfile.cycleLength || 28, 1);
    const periodDuration = Math.max(activeCycleProfile.periodDuration || 5, 1);
    const lastPeriodDate = toLocalDate(activeCycleProfile.lastPeriodDate);
    const loggedPeriodDates = new Set();
    cycleLogs.forEach((log) => {
      const date = log.date || (log.logged_at ? log.logged_at.split('T')[0] : null);
      if (log.isPeriodDay && date) loggedPeriodDates.add(date);
    });
    const options = {
      today,
      todayZero,
      cycleLength,
      periodDuration,
      lastPeriodDate,
      currentCycleDay: cyclePrediction.currentCycleDay || 1,
      loggedPeriodDates,
    };
    return [currentYear, currentYear + 1].map((year) => ({
      year,
      months: Array.from({ length: 12 }, (_, month) => buildMonthData(year, month, options)),
    }));
  }, [calendarMode, activeCycleProfile, cycleLogs, cyclePrediction.currentCycleDay]);

  const yearRows = useMemo(() => yearMonths.flatMap((year) => {
    const rows = [{ key: `year-${year.year}`, type: 'year', year: year.year }];
    for (let index = 0; index < year.months.length; index += 3) {
      const months = year.months.slice(index, index + 3);
      rows.push({ key: `year-months-${year.year}-${index}`, type: 'months', months });
    }
    return rows;
  }), [yearMonths]);

  const selectDay = (cell) => {
    setSelectedDateKey(cell.dateKey);
    const saved = cycleLogsByDate.get(cell.dateKey);
    const savedSymptoms = saved?.symptoms || [];
    setSelectedSymptoms(savedSymptoms.map(cleanSymptomName));
    const savedCramps = savedSymptoms.find((symptom) => symptom.startsWith('Cramps (intensity '));
    setPainIntensity(Number(savedCramps?.match(/(\d+)\/10/)?.[1] || 3));
    setSelectedFeeling(saved?.feeling || 'Okay');
    setIsPeriodDay(Boolean(saved?.isPeriodDay));
    setSelectedFlow(saved?.flowIntensity && saved.flowIntensity !== 'None' ? saved.flowIntensity : 'Medium');
    if (calendarMode === 'year') {
      const selectedMonth = new Date(Number(cell.dateKey.slice(0, 4)), Number(cell.dateKey.slice(5, 7)) - 1, 1);
      setMonthWindow({ start: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - MONTH_PAGE_SIZE, 1), count: MONTH_PAGE_SIZE * 2 });
      monthListReady.current = false;
      setMonthListVersion((version) => version + 1);
      setCalendarMode('month');
    }
  };

  const openSelectedLogSheet = () => {
    const saved = cycleLogsByDate.get(selectedDateKey);
    const savedSymptoms = saved?.symptoms || [];
    setSelectedSymptoms(savedSymptoms.map(cleanSymptomName));
    const savedCramps = savedSymptoms.find((symptom) => symptom.startsWith('Cramps (intensity '));
    setPainIntensity(Number(savedCramps?.match(/(\d+)\/10/)?.[1] || 3));
    setSelectedFeeling(saved?.feeling || 'Okay');
    setIsPeriodDay(Boolean(saved?.isPeriodDay));
    setSelectedFlow(saved?.flowIntensity && saved.flowIntensity !== 'None' ? saved.flowIntensity : 'Medium');
    setShowLogSheet(true);
  };

  const saveSelectedLog = async () => {
    setIsSavingLog(true);
    try {
      await cycleService.logCycleSymptom({
        date: selectedDateKey,
        feeling: selectedFeeling,
        symptoms: selectedSymptoms.map((symptom) => symptom === 'Cramps' ? `Cramps (intensity ${painIntensity}/10)` : symptom),
        isPeriodDay,
        flowIntensity: isPeriodDay ? selectedFlow : 'None',
      });
      const updated = await getCycleLogsSafe();
      setCycleLogs(Array.isArray(updated) ? updated : []);
      setShowLogSheet(false);
      showSuccess('Your check-in was saved.');
    } catch (error) {
      console.warn('[CycleCalendarScreen] Unable to save cycle entry:', error);
      showError('We couldn’t save this check-in. Please try again.');
    } finally {
      setIsSavingLog(false);
    }
  };

  const loadMoreMonths = () => {
    if (loadingNextMonths.current) return;
    loadingNextMonths.current = true;
    setIsLoadingMoreMonths(true);
    setMonthWindow((window) => ({ ...window, count: window.count + MONTH_PAGE_SIZE }));
  };

  const handleMonthListScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.y;
    if (!monthListReady.current) {
      if (offset >= monthItemHeight * 2) monthListReady.current = true;
      return;
    }
    if (offset < monthItemHeight && !loadingPreviousMonths.current) {
      loadingPreviousMonths.current = true;
      pendingMonthScrollOffset.current = offset + MONTH_PAGE_SIZE * monthItemHeight;
      setMonthWindow((window) => ({
        start: new Date(window.start.getFullYear(), window.start.getMonth() - MONTH_PAGE_SIZE, 1),
        count: window.count + MONTH_PAGE_SIZE,
      }));
    }
  };

  const handleMonthListContentSizeChange = () => {
    if (loadingNextMonths.current) {
      loadingNextMonths.current = false;
      setIsLoadingMoreMonths(false);
    }
    if (pendingMonthScrollOffset.current !== null) {
      monthListRef.current?.scrollToOffset({ offset: pendingMonthScrollOffset.current, animated: false });
      pendingMonthScrollOffset.current = null;
      loadingPreviousMonths.current = false;
    }
  };

  const renderDay = (cell, compact = false) => {
    if (cell.empty) return <View key={cell.key} style={{ width: `${100 / 7}%`, height: compact ? 14 : isWideScreen ? 44 : 56 }} />;
    const isSelected = selectedDateKey === cell.dateKey;
    const saved = cycleLogsByDate.get(cell.dateKey);
    const symptoms = (saved?.symptoms || []).map(cleanSymptomName);
    const marker = symptoms.map((symptom) => SYMPTOM_MARKERS[symptom]).find(Boolean)
      || (saved?.feeling ? FEELING_MARKERS[saved.feeling] : null);
    const phaseIcon = cell.type === 'period' ? 'water-outline' : cell.type === 'ovulation' ? 'sparkles-outline' : cell.type === 'fertile' ? 'leaf-outline' : null;
    const bubbleColor = marker?.background
      || (cell.type === 'period' ? '#FCE4EC' : cell.type === 'ovulation' ? '#FFF0D8' : cell.type === 'fertile' ? '#DDF6F1' : (isDarkMode ? '#2A2D32' : '#F1F3F6'));
    const phaseColor = cell.type === 'period' ? '#C43D64' : cell.type === 'ovulation' ? '#B9781E' : '#238F83';

    if (compact) {
      return (
        <View key={cell.key} style={{ width: `${100 / 7}%`, height: 14, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: marker?.background || (cell.type === 'normal' ? 'transparent' : bubbleColor), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 8, lineHeight: 10, fontWeight: cell.type === 'normal' ? '500' : '800', color: marker?.color || (cell.type === 'normal' ? theme.textSecondary : phaseColor) }}>{cell.dayNum}</Text>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        key={cell.key}
        onPress={() => selectDay(cell)}
        accessibilityRole="button"
        accessibilityLabel={`${cell.dateKey}${cell.type === 'period' ? ', predicted period' : cell.type === 'ovulation' ? ', predicted ovulation' : cell.type === 'fertile' ? ', fertile window' : ''}${symptoms.length ? `, ${symptoms.join(', ')}` : saved?.feeling ? `, feeling ${saved.feeling}` : ''}`}
        accessibilityState={{ selected: isSelected }}
        hitSlop={4}
        android_ripple={{ color: isDarkMode ? '#FFFFFF22' : '#00000012', borderless: false }}
        style={{ width: `${100 / 7}%`, height: isWideScreen ? 44 : 56, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ height: isWideScreen ? 15 : 17, fontSize: isWideScreen ? 10 : 11, lineHeight: isWideScreen ? 13 : 15, fontWeight: isSelected || cell.isToday ? '800' : '600', color: cell.isToday ? colors.primary : theme.textPrimary }}>{cell.dayNum}</Text>
          <View style={{ width: isWideScreen ? 25 : 31, height: isWideScreen ? 25 : 31, borderRadius: 16, backgroundColor: bubbleColor, borderWidth: isSelected ? 2 : cell.isToday ? 1 : 0, borderColor: isSelected ? colors.primary : colors.primary + '99', alignItems: 'center', justifyContent: 'center' }}>
            {marker ? (
              <Text style={{ fontSize: 16, lineHeight: 20 }}>{marker.icon}</Text>
            ) : phaseIcon ? (
              <Ionicons name={phaseIcon} size={14} color={phaseColor} />
            ) : (
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isDarkMode ? '#42464D' : '#E5E8ED' }} />
            )}
            {symptoms.length > 1 && <View style={{ position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 7, lineHeight: 9, fontWeight: '800' }}>+{symptoms.length - 1}</Text></View>}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} accessibilityLabel="Close calendar" style={{ width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 19, fontWeight: '900' }}>Cycle calendar</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>Your cycle, symptoms & patterns</Text>
        </View>
        <TouchableOpacity onPress={() => setCalendarMode((mode) => mode === 'month' ? 'year' : 'month')} accessibilityRole="button" accessibilityLabel={calendarMode === 'month' ? 'Show year overview' : 'Show month calendar'} style={{ width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, marginRight: 8 }}>
          <Ionicons name={calendarMode === 'month' ? 'grid-outline' : 'calendar-outline'} size={19} color={theme.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowCalendarHelp(true)} accessibilityRole="button" accessibilityLabel="Cycle calendar help" style={{ width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}>
          <Ionicons name="help-circle-outline" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {calendarMode === 'month' && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 18, paddingBottom: 7, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
          {WEEKDAYS.map((day, index) => (
            <View key={`${day}-${index}`} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 10, fontWeight: '700' }}>{day}</Text>
            </View>
          ))}
        </View>
      )}

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }}>
          {calendarMode === 'month' ? (
            Array.from({ length: 2 }, (_, sectionIndex) => (
                  <View key={`calendar-skeleton-${sectionIndex}`} style={{ paddingTop: 12, paddingBottom: 12, backgroundColor: theme.card, borderRadius: 24, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 10 }}>
                <SkeletonPulse style={{ width: 112, height: 18, borderRadius: 6, alignSelf: 'center', marginBottom: 18 }} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {Array.from({ length: 42 }, (_, dayIndex) => (
                      <View key={`skeleton-day-${dayIndex}`} style={{ width: `${100 / 7}%`, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                      {dayIndex % 7 !== 0 && dayIndex % 6 !== 0 ? (
                        <View style={{ width: 12 + (dayIndex % 3) * 2, height: 4, borderRadius: 2, backgroundColor: theme.skeleton, opacity: 0.8 }} />
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View style={{ paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
              <SkeletonPulse style={{ width: 54, height: 22, borderRadius: 6, alignSelf: 'center', marginBottom: 20 }} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {Array.from({ length: 12 }, (_, monthIndex) => (
                  <View key={`skeleton-mini-month-${monthIndex}`} style={{ width: '31%', marginBottom: 22 }}>
                    <View style={{ width: '56%', height: 7, borderRadius: 4, backgroundColor: theme.skeleton, alignSelf: 'center', marginBottom: 8, opacity: 0.8 }} />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {Array.from({ length: 42 }, (_, dayIndex) => (
                        <View key={`skeleton-mini-day-${monthIndex}-${dayIndex}`} style={{ width: `${100 / 7}%`, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                          {dayIndex % 7 !== 0 && dayIndex % 6 !== 0 ? (
                            <View style={{ width: 5, height: 2, borderRadius: 1, backgroundColor: theme.skeleton, opacity: 0.8 }} />
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : calendarMode === 'month' ? (
        <FlatList
          key={`month-list-${monthListVersion}`}
          ref={monthListRef}
          data={cycleMonths}
          keyExtractor={(month) => month.key}
          extraData={selectedDateKey}
          initialScrollIndex={MONTH_PAGE_SIZE}
          getItemLayout={(_, index) => ({ length: monthItemHeight, offset: monthItemHeight * index, index })}
          renderItem={({ item: month }) => (
            <View style={{ height: monthItemHeight, paddingVertical: 7, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
              <View style={{ flex: 1, paddingTop: isWideScreen ? 8 : 12, paddingHorizontal: 8, backgroundColor: theme.card, borderRadius: 24, borderWidth: 1, borderColor: theme.cardBorder }}>
                <Text style={{ height: isWideScreen ? 24 : 26, lineHeight: isWideScreen ? 24 : 26, textAlign: 'center', color: theme.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 4 }}>{month.monthTitle}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{month.cells.map((cell) => renderDay(cell))}</View>
              </View>
            </View>
          )}
          onScroll={handleMonthListScroll}
          onContentSizeChange={handleMonthListContentSizeChange}
          onEndReached={loadMoreMonths}
          onEndReachedThreshold={0.6}
          ListFooterComponent={isLoadingMoreMonths ? (
            <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}
          scrollEventThrottle={16}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, flexGrow: 1 }}
        />
      ) : (
        <FlatList
          data={yearRows}
          keyExtractor={(row) => row.key}
          initialNumToRender={4}
          maxToRenderPerBatch={3}
          windowSize={4}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}
          renderItem={({ item }) => item.type === 'year' ? (
            <Text style={{ textAlign: 'center', color: theme.textPrimary, fontSize: 22, fontWeight: '800', paddingTop: 18, paddingBottom: 18, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>{item.year}</Text>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 }}>
              {item.months.map((month) => (
                <View key={month.key} style={{ width: '31%' }}>
                  <TouchableOpacity onPress={() => { setMonthWindow({ start: new Date(month.year, month.month - MONTH_PAGE_SIZE, 1), count: MONTH_PAGE_SIZE * 2 }); monthListReady.current = false; setMonthListVersion((version) => version + 1); setCalendarMode('month'); }}>
                    <Text style={{ color: theme.textPrimary, textAlign: 'center', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>{month.title}</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {month.cells.map((cell) => renderDay(cell, true))}
                  </View>
                </View>
              ))}
            </View>
          )}
        />
      )}

      <View style={{ width: isWideScreen ? '100%' : undefined, maxWidth: contentMaxWidth, alignSelf: isWideScreen ? 'center' : 'stretch', marginHorizontal: isWideScreen ? 0 : 18, marginTop: 2, marginBottom: 9, padding: 13, borderRadius: 22, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' }}>Selected day</Text>
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '900', marginTop: 2 }}>{selectedDateLabel}</Text>
          </View>
          <TouchableOpacity onPress={openSelectedLogSheet} accessibilityRole="button" accessibilityLabel={`${selectedLog ? 'Edit' : 'Add'} check-in for ${selectedDateKey}`} style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={selectedLog ? 'create-outline' : 'add'} size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {selectedLog ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingRight: 4 }}>
            {selectedLog.isPeriodDay && <View style={{ alignItems: 'center', width: 58, marginRight: 6 }}><View style={{ width: 31, height: 31, borderRadius: 16, backgroundColor: '#FCE4EC', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="water" size={15} color="#C43D64" /></View><Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 9, marginTop: 4 }}>Period</Text></View>}
            <View style={{ alignItems: 'center', width: 58, marginRight: 6 }}><View style={{ width: 31, height: 31, borderRadius: 16, backgroundColor: FEELING_MARKERS[selectedLog.feeling]?.background || '#EDF1F5', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 16 }}>{FEELING_MARKERS[selectedLog.feeling]?.icon || '🙂'}</Text></View><Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 9, marginTop: 4 }}>{selectedLog.feeling || 'Okay'}</Text></View>
            {selectedSymptomsForDisplay.map((symptom, index) => {
              const marker = SYMPTOM_MARKERS[symptom] || FEELING_MARKERS.Okay;
              return <View key={`${symptom}-${index}`} style={{ alignItems: 'center', width: 58, marginRight: 6 }}><View style={{ width: 31, height: 31, borderRadius: 16, backgroundColor: marker.background, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 16 }}>{marker.icon}</Text></View><Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 9, marginTop: 4 }}>{symptom}</Text></View>;
            })}
            {!selectedLog.isPeriodDay && !selectedSymptomsForDisplay.length && <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No symptoms recorded. Tap + to add a check-in.</Text>}
          </ScrollView>
        ) : (
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No check-in logged. Add how you feel and any symptoms for this day.</Text>
        )}
      </View>

      <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center', paddingHorizontal: 18, paddingBottom: 9, backgroundColor: theme.background }}>
        <TouchableOpacity onPress={openSelectedLogSheet} accessibilityRole="button" accessibilityLabel={`${selectedLog ? 'Edit' : 'Log'} symptoms for ${selectedDateKey}`} activeOpacity={0.85} style={{ minHeight: 50, maxWidth: isWideScreen ? 360 : undefined, alignSelf: isWideScreen ? 'flex-end' : 'stretch', paddingHorizontal: 20, borderRadius: 17, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={selectedLog ? 'create-outline' : 'add-circle-outline'} size={19} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{selectedLog ? 'Edit check-in' : `Log check-in · ${selectedDateKey}`}</Text>
        </TouchableOpacity>
      </View>

      <AppBottomSheet visible={showLogSheet} onClose={() => setShowLogSheet(false)} showHandle scrollable maxHeight="88%">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 21, fontWeight: '900' }}>Daily check-in</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20 }}>{selectedDateKey} · Log how you feel and what you notice</Text>
          <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 10 }}>Was this a period day?</Text>
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            {[['No', false], ['Yes', true]].map(([label, value]) => (
              <TouchableOpacity key={label} onPress={() => setIsPeriodDay(value)} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, marginRight: 9, backgroundColor: isPeriodDay === value ? colors.primary : theme.subtleSurface }}>
                <Text style={{ color: isPeriodDay === value ? '#FFFFFF' : theme.textPrimary, fontWeight: '700' }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {isPeriodDay && (
            <>
              <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 10 }}>Flow</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                {['Spotting', 'Light', 'Medium', 'Heavy'].map((flow) => (
                  <TouchableOpacity key={flow} onPress={() => setSelectedFlow(flow)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, marginRight: 8, marginBottom: 8, backgroundColor: selectedFlow === flow ? (isDarkMode ? '#483753' : '#F3E8FF') : theme.subtleSurface, borderWidth: selectedFlow === flow ? 1 : 0, borderColor: colors.primary }}>
                    <Text style={{ color: theme.textPrimary, fontWeight: selectedFlow === flow ? '800' : '600', fontSize: 13 }}>{flow}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 10 }}>How are you feeling?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 }}>
            {FEELINGS.map((feeling) => (
              <TouchableOpacity key={feeling} onPress={() => setSelectedFeeling(feeling)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, marginRight: 8, marginBottom: 8, backgroundColor: selectedFeeling === feeling ? FEELING_MARKERS[feeling].background : theme.subtleSurface, borderWidth: selectedFeeling === feeling ? 1 : 0, borderColor: colors.primary }}>
                <Text style={{ fontSize: 14, marginRight: 5 }}>{FEELING_MARKERS[feeling].icon}</Text>
                <Text style={{ color: theme.textPrimary, fontWeight: selectedFeeling === feeling ? '800' : '600', fontSize: 13 }}>{feeling}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 10 }}>Any symptoms?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
            {TRACKABLE_SYMPTOMS.map((symptom) => {
              const active = selectedSymptoms.includes(symptom);
              const marker = SYMPTOM_MARKERS[symptom];
              return <TouchableOpacity key={symptom} onPress={() => setSelectedSymptoms((current) => active ? current.filter((item) => item !== symptom) : [...current, symptom])} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, marginRight: 8, marginBottom: 8, backgroundColor: active ? (isDarkMode ? '#483753' : '#F3E8FF') : theme.subtleSurface, borderWidth: active ? 1 : 0, borderColor: colors.primary }}>
                <Text style={{ fontSize: 14, marginRight: 5 }}>{marker.icon}</Text>
                <Text style={{ color: theme.textPrimary, fontWeight: active ? '800' : '600', fontSize: 13 }}>{symptom}</Text>
              </TouchableOpacity>;
            })}
          </View>
          {selectedSymptoms.includes('Cramps') && (
            <View style={{ marginBottom: 18 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 9 }}>Cramp intensity · {painIntensity}/10</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <TouchableOpacity key={value} onPress={() => setPainIntensity(value)} style={{ width: 29, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: painIntensity === value ? colors.primary : theme.subtleSurface }}>
                    <Text style={{ color: painIntensity === value ? '#FFFFFF' : theme.textPrimary, fontWeight: '700', fontSize: 12 }}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <TouchableOpacity disabled={isSavingLog} onPress={saveSelectedLog} style={{ minHeight: 52, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: isSavingLog ? 0.65 : 1 }}>
            {isSavingLog ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Save check-in</Text>}
          </TouchableOpacity>
        </ScrollView>
      </AppBottomSheet>

      <AppBottomSheet
        visible={showCalendarHelp}
        onClose={() => setShowCalendarHelp(false)}
        showHandle
        scrollable={false}
        maxHeight="60%"
      >
        <View style={{ alignItems: 'center', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: isDarkMode ? '#3A1E22' : '#FFF2D1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="calendar-outline" size={36} color={isDarkMode ? '#FF8A98' : '#D97706'} />
          </View>
          <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>Understanding your cycle calendar</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 20 }}>
            Pink days mark your period, teal days show an estimated fertile window, and the darker teal day marks estimated ovulation. Predictions use your logged cycles when available and can still be wrong. They are not reliable contraception. Tap a date to select it and log what you notice.
          </Text>
          <TouchableOpacity
            onPress={() => setShowCalendarHelp(false)}
            activeOpacity={0.85}
            style={{ minWidth: 132, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: isDarkMode ? '#FFFFFF' : '#111827', paddingHorizontal: 24, paddingVertical: 13 }}
          >
            <Text style={{ color: isDarkMode ? '#161616' : '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>
    </SafeAreaView>
  );
}
