import React from 'react';
import { Text, View } from 'react-native';

export default function FunctionalCycleRing({ currentDay, totalDays }) {
  const percentage = Math.min(Math.max(currentDay / totalDays, 0), 1);
  const totalDegrees = percentage * 360;

  const rightDeg = Math.min(totalDegrees, 180);
  const leftDeg = Math.max(totalDegrees - 180, 0);

  return (
    <View className="w-[104px] h-[104px] rounded-full items-center justify-center relative">
      <View className="w-[104px] h-[104px] rounded-full border-[7px] border-red-100 absolute" />

      <View className="w-[52px] h-[104px] absolute right-0 top-0 overflow-hidden">
        <View
          className="w-[52px] h-[104px] rounded-r-full border-[7px] border-primary border-l-0"
          style={{
            transform: [{ rotate: `${rightDeg}deg` }],
            transformOrigin: 'left center',
          }}
        />
      </View>

      {totalDegrees > 180 && (
        <View className="w-[52px] h-[104px] absolute left-0 top-0 overflow-hidden">
          <View
            className="w-[52px] h-[104px] rounded-l-full border-[7px] border-primary border-r-0"
            style={{
              transform: [{ rotate: `${leftDeg}deg` }],
              transformOrigin: 'right center',
            }}
          />
        </View>
      )}

      <View className="w-[86px] h-[86px] rounded-full bg-white items-center justify-center shadow-xs">
        <Text className="text-3xl font-black text-primary">{currentDay}</Text>
        <Text className="text-[11px] font-bold text-gray-400">of {totalDays}</Text>
      </View>
    </View>
  );
}
