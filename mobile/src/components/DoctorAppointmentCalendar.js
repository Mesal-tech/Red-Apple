import React, { useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
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
    <View className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs mb-4">
      {/* HEADER: MONTH & YEAR NAVIGATOR */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center">
          <Text className="text-lg font-black text-gray-900">
            {MONTH_NAMES[month]} {year}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <TouchableOpacity
            activeOpacity={0.7}
            className={`w-9 h-9 rounded-full bg-gray-50 items-center justify-center border border-gray-200 ${
              !canGoPrev ? 'opacity-40 bg-gray-100' : ''
            }`}
            onPress={prevMonth}
            disabled={!canGoPrev}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={canGoPrev ? '#111827' : '#D1D5DB'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center border border-gray-200"
            onPress={nextMonth}
          >
            <Ionicons name="chevron-forward" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      {/* WEEKDAY NAMES ROW */}
      <View className="flex-row justify-around pb-2.5 border-b border-gray-100 mb-2.5">
        {WEEKDAY_NAMES.map((name, idx) => (
          <Text
            key={name}
            className={`w-9 text-center text-xs font-bold ${
              idx >= 5 ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {name}
          </Text>
        ))}
      </View>

      {/* DAYS GRID */}
      <View className="flex-row flex-wrap">
        {cells.map((cell) => {
          if (cell.empty) {
            return <View key={cell.key} className="w-[14.28%] h-11" />;
          }

          return (
            <TouchableOpacity
              key={cell.key}
              activeOpacity={0.8}
              className={`w-[14.28%] h-11 items-center justify-center rounded-full relative ${
                cell.isSelected
                  ? 'bg-primary shadow-xs'
                  : cell.isToday
                  ? 'border-2 border-primary'
                  : ''
              }`}
              onPress={() => {
                if (!cell.disabled && onSelectDate) {
                  onSelectDate(cell.dateObj);
                }
              }}
              disabled={cell.disabled}
            >
              <Text
                className={`text-sm font-bold ${
                  cell.isSelected
                    ? 'text-white font-black'
                    : cell.disabled
                    ? 'text-gray-300'
                    : cell.isToday
                    ? 'text-primary font-black'
                    : cell.isSunday
                    ? 'text-gray-400'
                    : 'text-gray-800'
                }`}
              >
                {cell.dayNum}
              </Text>

              {/* Indicator dot: primary for active days, none for past */}
              {!cell.disabled && !cell.isSelected && !cell.isSunday && (
                <View className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
