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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SkeletonPulse } from '../components/DoctorCareSkeleton';
import AppBottomSheet from '../components/AppBottomSheet';
import cycleService from '../services/cycleService';
import { getCycleLogsSafe, getHealthProfileSafe } from '../utils/storage';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_ITEM_HEIGHT = 363;
const MONTH_PAGE_SIZE = 6;

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
  const firstWeekday = new Date(year, month, 1).getDay();
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
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const [activeCycleProfile, setActiveCycleProfile] = useState({});
  const [cyclePrediction, setCyclePrediction] = useState({});
  const [cycleLogs, setCycleLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarMode, setCalendarMode] = useState('month');
  const [showCalendarHelp, setShowCalendarHelp] = useState(false);
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
      const [cachedProfile, logs] = await Promise.all([
        getHealthProfileSafe(),
        getCycleLogsSafe(),
      ]);
      const storedProfile = cachedProfile || user?.health_profile || {};
      const profile = {
        cycleLength: Number(storedProfile.cycleLength || 28),
        periodDuration: Number(storedProfile.periodDuration || 5),
        lastPeriodDate: storedProfile.lastPeriodDate || null,
      };
      setActiveCycleProfile(profile);
      const prediction = cycleService.computeLocalFertilityPrediction(
        profile.lastPeriodDate,
        profile.periodDuration,
        profile.cycleLength
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
    if (calendarMode === 'year') {
      const selectedMonth = new Date(Number(cell.dateKey.slice(0, 4)), Number(cell.dateKey.slice(5, 7)) - 1, 1);
      setMonthWindow({ start: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - MONTH_PAGE_SIZE, 1), count: MONTH_PAGE_SIZE * 2 });
      monthListReady.current = false;
      setMonthListVersion((version) => version + 1);
      setCalendarMode('month');
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
      if (offset >= MONTH_ITEM_HEIGHT * 2) monthListReady.current = true;
      return;
    }
    if (offset < MONTH_ITEM_HEIGHT && !loadingPreviousMonths.current) {
      loadingPreviousMonths.current = true;
      pendingMonthScrollOffset.current = offset + MONTH_PAGE_SIZE * MONTH_ITEM_HEIGHT;
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
    if (cell.empty) return <View key={cell.key} style={{ width: `${100 / 7}%`, height: compact ? 14 : 48 }} />;
    const isSelected = selectedDateKey === cell.dateKey;
    let backgroundColor = 'transparent';
    let foregroundColor = theme.textPrimary;
    if (cell.type === 'period') {
      backgroundColor = isDarkMode ? '#E64B75' : '#F4517D';
      foregroundColor = '#FFFFFF';
    } else if (cell.type === 'ovulation') {
      backgroundColor = isDarkMode ? '#3DC7B3' : '#24A99A';
      foregroundColor = '#FFFFFF';
    } else if (cell.type === 'fertile') {
      foregroundColor = isDarkMode ? '#5BD5C3' : '#168F83';
    }
    if (cell.isToday && cell.type === 'normal') foregroundColor = colors.primary;

    if (compact) {
      return (
        <View key={cell.key} style={{ width: `${100 / 7}%`, height: 14, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 8, lineHeight: 10, fontWeight: cell.type === 'normal' ? '500' : '800', color: foregroundColor }}>{cell.dayNum}</Text>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        key={cell.key}
        onPress={() => selectDay(cell)}
        accessibilityRole="button"
        accessibilityLabel={`${cell.dateKey}${cell.type === 'period' ? ', predicted period' : ''}`}
        accessibilityState={{ selected: isSelected }}
        hitSlop={4}
        android_ripple={{ color: isDarkMode ? '#FFFFFF22' : '#00000012', borderless: false }}
        style={{ width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor,
            borderWidth: (isSelected || cell.isToday) && !compact ? 2 : 0,
            borderColor: '#000000',
            borderStyle: cell.isToday ? 'solid' : 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: cell.isToday || cell.type !== 'normal' ? '800' : '500', color: foregroundColor }}>
            {cell.dayNum}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} accessibilityLabel="Close calendar" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', backgroundColor: theme.cardBorder, padding: 3, borderRadius: 24 }}>
            {['month', 'year'].map((mode) => {
              const active = calendarMode === mode;
              return (
                <TouchableOpacity key={mode} onPress={() => setCalendarMode(mode)} style={{ minWidth: 98, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 21, backgroundColor: active ? theme.card : 'transparent' }}>
                  <Text style={{ color: active ? theme.textPrimary : theme.textSecondary, fontSize: 14, fontWeight: active ? '800' : '600' }}>{mode === 'month' ? 'Month' : 'Year'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowCalendarHelp(true)}
          accessibilityRole="button"
          accessibilityLabel="Cycle calendar help"
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
        >
          <Ionicons name="help-circle-outline" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {calendarMode === 'month' && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 18, paddingBottom: 10 }}>
          {WEEKDAYS.map((day, index) => (
            <View key={`${day}-${index}`} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>{day}</Text>
            </View>
          ))}
        </View>
      )}

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }}>
          {calendarMode === 'month' ? (
            Array.from({ length: 2 }, (_, sectionIndex) => (
              <View key={`calendar-skeleton-${sectionIndex}`} style={{ paddingTop: 18, paddingBottom: 18, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                <SkeletonPulse style={{ width: 112, height: 18, borderRadius: 6, alignSelf: 'center', marginBottom: 18 }} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {Array.from({ length: 42 }, (_, dayIndex) => (
                    <View key={`skeleton-day-${dayIndex}`} style={{ width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' }}>
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
          getItemLayout={(_, index) => ({ length: MONTH_ITEM_HEIGHT, offset: MONTH_ITEM_HEIGHT * index, index })}
          renderItem={({ item: month }) => (
            <View style={{ height: MONTH_ITEM_HEIGHT, paddingTop: 18, paddingBottom: 18, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
              <Text style={{ height: 24, lineHeight: 24, textAlign: 'center', color: theme.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 14 }}>{month.monthTitle}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{month.cells.map((cell) => renderDay(cell))}</View>
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
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }}
        />
      ) : (
        <FlatList
          data={yearRows}
          keyExtractor={(row) => row.key}
          initialNumToRender={4}
          maxToRenderPerBatch={3}
          windowSize={4}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }}
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
            Pink days mark your period, teal days show the estimated fertile window, and the darker teal day marks predicted ovulation. Tap a date to select it. These are estimates based on the cycle details you have logged.
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
