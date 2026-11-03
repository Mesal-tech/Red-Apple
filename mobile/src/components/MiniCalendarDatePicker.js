import React, { useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
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
    <View className="bg-white rounded-[18px] border border-gray-100 p-3.5 mt-2.5">
      {/* Month Header with Navigation */}
      <View className="flex-row items-center justify-between mb-2.5 px-1">
        <TouchableOpacity
          activeOpacity={0.7}
          className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
          onPress={prevMonth}
        >
          <Ionicons name="chevron-back" size={18} color="#374151" />
        </TouchableOpacity>

        <Text className="text-[15px] font-extrabold text-gray-900 tracking-tight">
          {monthNames[month]} {year}
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          className={`w-8 h-8 rounded-full bg-gray-100 items-center justify-center ${
            !canGoNext ? 'opacity-25' : ''
          }`}
          onPress={nextMonth}
          disabled={!canGoNext}
        >
          <Ionicons name="chevron-forward" size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Weekday Letters */}
      <View className="flex-row mb-1.5">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, idx) => (
          <View key={idx} className="flex-1 items-center py-1">
            <Text className="text-[11px] font-bold text-gray-400">{letter}</Text>
          </View>
        ))}
      </View>

      {/* Days Grid */}
      <View className="flex-row flex-wrap">
        {gridCells.map((cell) => {
          if (cell.empty) {
            return <View key={cell.key} className="w-[14.28%] h-9 items-center justify-center my-0.5 rounded-full" />;
          }

          const isSelected = isSelectedDate(cell.dayNum);
          const isToday = isTodayDate(cell.dayNum);
          const isFuture = isFutureDate(cell.dayNum);

          return (
            <TouchableOpacity
              key={cell.key}
              activeOpacity={0.7}
              disabled={isFuture}
              className={`w-[14.28%] h-9 items-center justify-center my-0.5 rounded-full ${
                isSelected ? 'bg-primary' : isToday ? 'border-[1.5px] border-primary' : ''
              }`}
              onPress={() => onSelectDate(new Date(year, month, cell.dayNum))}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  isSelected
                    ? 'text-white font-extrabold'
                    : isToday
                    ? 'text-primary font-extrabold'
                    : isFuture
                    ? 'text-gray-200'
                    : 'text-gray-800'
                }`}
              >
                {cell.dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Date Confirmation Pill */}
      {selectedFormatted ? (
        <View className="flex-row items-center justify-center bg-pink-50 rounded-xl py-1.5 px-3 mt-2.5 self-center space-x-1.5">
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text className="text-xs text-primary font-semibold ml-1">
            Selected: <Text className="font-extrabold">{selectedFormatted}</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}
