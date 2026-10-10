import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function MiniCalendarDatePicker({ selectedDate, onSelectDate, maxDate = new Date() }) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate || maxDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    const next = new Date(year, month + 1, 1);
    if (next <= maxDate) {
      setViewDate(next);
    }
  };

  const canGoNext = new Date(year, month + 1, 1) <= maxDate;

  const today = new Date();
  const isSelectedDate = (d) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === d
    );
  };

  const isTodayDate = (d) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d
    );
  };

  const isFutureDate = (d) => {
    const dateObj = new Date(year, month, d, 23, 59, 59);
    return dateObj > maxDate;
  };

  const gridCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    gridCells.push({ key: `pad-${i}`, empty: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({ key: `day-${d}`, dayNum: d });
  }

  const selectedFormatted = selectedDate
    ? selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <View style={calStyles.calendarContainer}>
      {/* Month Header with Navigation */}
      <View style={calStyles.monthNavRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={calStyles.monthNavBtn}
          onPress={prevMonth}
        >
          <Ionicons name="chevron-back" size={18} color="#374151" />
        </TouchableOpacity>

        <Text style={calStyles.monthNavTitle}>
          {monthNames[month]} {year}
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          style={[calStyles.monthNavBtn, !canGoNext && { opacity: 0.25 }]}
          onPress={nextMonth}
          disabled={!canGoNext}
        >
          <Ionicons name="chevron-forward" size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Weekday Letters */}
      <View style={calStyles.weekdayRow}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, idx) => (
          <View key={idx} style={calStyles.weekdayCol}>
            <Text style={calStyles.weekdayLetter}>{letter}</Text>
          </View>
        ))}
      </View>

      {/* Days Grid */}
      <View style={calStyles.daysGrid}>
        {gridCells.map((cell) => {
          if (cell.empty) {
            return <View key={cell.key} style={calStyles.dayCell} />;
          }

          const isSelected = isSelectedDate(cell.dayNum);
          const isToday = isTodayDate(cell.dayNum);
          const isFuture = isFutureDate(cell.dayNum);

          return (
            <TouchableOpacity
              key={cell.key}
              activeOpacity={0.7}
              disabled={isFuture}
              style={[
                calStyles.dayCell,
                isSelected && calStyles.dayCellSelected,
                !isSelected && isToday && calStyles.dayCellToday,
              ]}
              onPress={() => onSelectDate(new Date(year, month, cell.dayNum))}
            >
              <Text
                style={[
                  calStyles.dayNumText,
                  isSelected && calStyles.dayNumTextSelected,
                  isToday && !isSelected && calStyles.dayNumTextToday,
                  isFuture && calStyles.dayNumTextDisabled,
                ]}
              >
                {cell.dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Date Confirmation Pill */}
      {selectedFormatted ? (
        <View style={calStyles.selectedBadgeRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={calStyles.selectedBadgeText}>
            Selected: <Text style={{ fontWeight: '800' }}>{selectedFormatted}</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const calStyles = StyleSheet.create({
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
    marginTop: 10,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayLetter: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 18,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
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
  dayNumTextToday: {
    color: colors.primary,
    fontWeight: '800',
  },
  dayNumTextDisabled: {
    color: '#E5E7EB',
  },
  selectedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F5',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 10,
    alignSelf: 'center',
    gap: 6,
  },
  selectedBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
