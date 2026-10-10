import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DoctorAppointmentCalendar({
  selectedDate,
  onSelectDate,
  minDate = new Date(),
}) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate || minDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMinDate = new Date(minDate);
  startOfMinDate.setHours(0, 0, 0, 0);

  const prevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    // Don't allow navigating before current month
    if (prev.getFullYear() >= today.getFullYear() && prev.getMonth() >= today.getMonth()) {
      setViewDate(prev);
    }
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const canGoPrev = !(year === today.getFullYear() && month === today.getMonth());

  // Generate day grid cells
  const cells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ key: `pad-${i}`, empty: true });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    dateObj.setHours(0, 0, 0, 0);

    const isPast = dateObj < startOfMinDate;
    const isSunday = dateObj.getDay() === 0;
    const isToday = dateObj.getTime() === today.getTime();
    const isSelected =
      selectedDate &&
      dateObj.getFullYear() === selectedDate.getFullYear() &&
      dateObj.getMonth() === selectedDate.getMonth() &&
      dateObj.getDate() === selectedDate.getDate();

    cells.push({
      key: `day-${d}`,
      dayNum: d,
      dateObj,
      isPast,
      isSunday,
      isToday,
      isSelected,
      disabled: isPast,
    });
  }

  return (
    <View style={styles.calendarContainer}>
      {/* HEADER: MONTH & YEAR NAVIGATOR */}
      <View style={styles.calendarHeaderRow}>
        <View style={styles.monthTitleWrapper}>
          <Text style={styles.calendarMonthText}>
            {MONTH_NAMES[month]} {year}
          </Text>
        </View>

        <View style={styles.navButtonsRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.calendarNavBtn, !canGoPrev && styles.calendarNavBtnDisabled]}
            onPress={prevMonth}
            disabled={!canGoPrev}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={canGoPrev ? '#111827' : '#D1D5DB'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.calendarNavBtn}
            onPress={nextMonth}
          >
            <Ionicons name="chevron-forward" size={18} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      {/* WEEKDAY NAMES ROW */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_NAMES.map((name, idx) => (
          <Text
            key={name}
            style={[styles.weekdayLabel, idx >= 5 && styles.weekendLabel]}
          >
            {name}
          </Text>
        ))}
      </View>

      {/* DAYS GRID */}
      <View style={styles.daysGrid}>
        {cells.map((cell) => {
          if (cell.empty) {
            return <View key={cell.key} style={styles.emptyDayCell} />;
          }

          return (
            <TouchableOpacity
              key={cell.key}
              activeOpacity={0.8}
              style={[
                styles.dayCell,
                cell.isSelected && styles.dayCellSelected,
                cell.isToday && !cell.isSelected && styles.dayCellToday,
              ]}
              onPress={() => {
                if (!cell.disabled && onSelectDate) {
                  onSelectDate(cell.dateObj);
                }
              }}
              disabled={cell.disabled}
            >
              <Text
                style={[
                  styles.dayNumText,
                  cell.isSunday && styles.sundayText,
                  cell.isToday && styles.todayText,
                  cell.isSelected && styles.dayNumTextSelected,
                  cell.disabled && styles.disabledText,
                ]}
              >
                {cell.dayNum}
              </Text>

              {/* Indicator dot: green for active days, none for past */}
              {!cell.disabled && !cell.isSelected && !cell.isSunday && (
                <View style={styles.availableDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calendarNavBtnDisabled: {
    opacity: 0.4,
    backgroundColor: '#F3F4F6',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  weekdayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  weekendLabel: {
    color: '#9CA3AF',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDayCell: {
    width: '14.28%',
    height: 40,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#DC2626',
  },
  dayNumText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  dayNumTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  todayText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  sundayText: {
    color: '#9CA3AF',
  },
  disabledText: {
    color: '#D1D5DB',
  },
  availableDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C81E3A',
  },
});
