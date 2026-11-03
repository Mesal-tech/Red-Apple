import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function AdditionalAnalyticsMetrics({
  stats = null,
  prediction = null,
  cycleLength = 28,
  periodDuration = 5,
}) {
  const avgPeriod = stats?.averagePeriodDuration || periodDuration || 5;

  const formatWindow = (startStr, endStr) => {
    if (!startStr || !endStr) return '';
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sMonth = months[s.getMonth()];
      const eMonth = months[e.getMonth()];
      if (sMonth === eMonth) {
        return `${sMonth} ${s.getDate()} – ${e.getDate()}`;
      }
      return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`;
    } catch {
      return '';
    }
  };

  const fertileWindowDisplay = React.useMemo(() => {
    if (prediction?.fertileWindowStart && prediction?.fertileWindowEnd) {
      const formatted = formatWindow(prediction.fertileWindowStart, prediction.fertileWindowEnd);
      if (formatted) return formatted;
    }
    const nextPeriod = prediction?.nextPeriodStartDate ? new Date(prediction.nextPeriodStartDate) : null;
    if (nextPeriod && !isNaN(nextPeriod.getTime())) {
      const ovDayDate = new Date(nextPeriod.getTime() - 14 * 24 * 60 * 60 * 1000);
      const fStart = new Date(ovDayDate.getTime() - 5 * 24 * 60 * 60 * 1000);
      const fEnd = new Date(ovDayDate.getTime() + 1 * 24 * 60 * 60 * 1000);
      return formatWindow(fStart, fEnd);
    }
    return 'Calculating...';
  }, [prediction]);

  const lutealPhaseDays = Math.max(cycleLength - 14, 12);

  // Dynamically generate flow pills matching user's period duration
  const flowDays = [];
  for (let i = 1; i <= Math.min(avgPeriod, 7); i++) {
    let pillClass = 'flex-1 bg-primary py-1.5 rounded-lg items-center';
    if (i === 3) pillClass = 'flex-1 bg-red-400 py-1.5 rounded-lg items-center';
    if (i > 3) pillClass = 'flex-1 bg-red-200 py-1.5 rounded-lg items-center';
    flowDays.push(
      <View key={i} className={pillClass}>
        <Text className="text-[11px] font-extrabold text-white">D{i}</Text>
      </View>
    );
  }

  return (
    <View className="gap-4 mx-4 mb-5">
      {/* 1. Period Duration & Flow */}
      <View className="bg-white rounded-3xl p-[18px] border border-red-50 shadow-sm">
        <View className="flex-row items-center justify-between flex-wrap gap-2 mb-2.5">
          <View className="flex-row items-center space-x-2">
            <Ionicons name="water" size={20} color={colors.primary} />
            <Text className="text-base font-black text-gray-900 ml-1">Period Duration & Flow</Text>
          </View>
        </View>

        <Text className="text-[13px] text-gray-600 leading-[19px] mb-3.5">
          Your period typically lasts <Text className="font-extrabold text-gray-900">{avgPeriod} days</Text>. Flow starts heavy on Days 1–2 and naturally lightens through Day {avgPeriod}.
        </Text>

        <View className="flex-row justify-between mb-3.5">
          <View className="items-start">
            <Text className="text-[17px] font-black text-gray-900">{avgPeriod} Days</Text>
            <Text className="text-xs font-semibold text-gray-400 mt-0.5">Avg. Duration</Text>
          </View>
          <View className="items-start">
            <Text className="text-[17px] font-black text-gray-900">Days 1-2</Text>
            <Text className="text-xs font-semibold text-gray-400 mt-0.5">Heavy Flow</Text>
          </View>
          <View className="items-start">
            <Text className="text-[17px] font-black text-gray-900">{avgPeriod > 2 ? `Days 3-${avgPeriod}` : 'Day 2'}</Text>
            <Text className="text-xs font-semibold text-gray-400 mt-0.5">Light Flow</Text>
          </View>
        </View>

        <View className="flex-row gap-1.5 mt-1">{flowDays}</View>
      </View>

      {/* 2. Fertility & Ovulation */}
      <View className="bg-white rounded-3xl p-[18px] border border-red-50 shadow-sm">
        <View className="flex-row items-center justify-between flex-wrap gap-2 mb-2.5">
          <View className="flex-row items-center space-x-2">
            <Ionicons name="leaf" size={20} color="#00A88F" />
            <Text className="text-base font-black text-gray-900 ml-1">Fertility & Ovulation</Text>
          </View>
        </View>

        <View className="flex-row justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[10px] font-extrabold text-gray-400 tracking-wider mb-1">LUTEAL PHASE</Text>
            <Text className="text-[17px] font-black text-gray-900">{lutealPhaseDays} Days</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-extrabold text-gray-400 tracking-wider mb-1">NEXT FERTILE WINDOW</Text>
            <Text className="text-[17px] font-black text-gray-900">{fertileWindowDisplay}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
