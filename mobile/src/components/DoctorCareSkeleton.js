import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * High-performance smooth pulsing skeleton block.
 * Uses native driver for 60fps animations.
 */
export const SkeletonPulse = ({ className = '', style, children }) => {
  const { theme } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      className={className}
      style={[style, { backgroundColor: theme.skeleton, opacity: opacityAnim }]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Skeleton for the Upcoming Appointments Card
 */
export const UpcomingCardSkeleton = () => {
  const { theme } = useTheme();
  return (
    <View className="w-full rounded-3xl p-5 mb-6 shadow-sm" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1 }}>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center flex-1">
          <SkeletonPulse style={{ width: 56, height: 56, borderRadius: 28 }} />
          <View className="flex-1 ml-3.5">
            <SkeletonPulse style={{ width: '65%', height: 16, borderRadius: 6, marginBottom: 6 }} />
            <SkeletonPulse style={{ width: '45%', height: 12, borderRadius: 4 }} />
          </View>
        </View>
        <SkeletonPulse style={{ width: 62, height: 26, borderRadius: 13 }} />
      </View>

      <View className="flex-row items-center justify-between py-2.5 border-t mb-4" style={{ borderColor: theme.divider }}>
        <SkeletonPulse style={{ width: 90, height: 14, borderRadius: 4 }} />
        <SkeletonPulse style={{ width: 70, height: 14, borderRadius: 4 }} />
      </View>

      <SkeletonPulse style={{ width: '100%', height: 48, borderRadius: 24 }} />
    </View>
  );
};

/**
 * Skeleton for the Recent / Verified Specialists Card
 */
export const SpecialistsListSkeleton = ({ count = 3 }) => {
  const { theme } = useTheme();
  return (
    <View className="w-full rounded-3xl p-4 shadow-sm border mb-6" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx}>
          <View className="flex-row items-center py-2.5">
            <SkeletonPulse style={{ width: 48, height: 48, borderRadius: 24 }} />
            <View className="flex-1 ml-3.5">
              <SkeletonPulse style={{ width: '55%', height: 16, borderRadius: 4, marginBottom: 6 }} />
              <SkeletonPulse style={{ width: '40%', height: 13, borderRadius: 4 }} />
            </View>
            <View className="items-end">
              <SkeletonPulse style={{ width: 58, height: 15, borderRadius: 4, marginBottom: 6 }} />
              <SkeletonPulse style={{ width: 38, height: 12, borderRadius: 4 }} />
            </View>
          </View>
          {idx < count - 1 && <View className="h-[1px] my-2" style={{ backgroundColor: theme.divider }} />}
        </View>
      ))}
    </View>
  );
};

/**
 * Skeleton for the Time Slot selection grid in Doctor Booking Modal
 */
export const SlotsGridSkeleton = ({ count = 6 }) => {
  return (
    <View className="flex-row flex-wrap gap-2.5 justify-between my-3">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonPulse key={idx} className="w-[31%] h-11 rounded-xl" />
      ))}
    </View>
  );
};

/**
 * Skeleton for See All Specialists Horizontal Cards
 */
export const DoctorSeeAllSkeleton = ({ count = 4 }) => {
  const { theme } = useTheme();
  return (
    <View className="px-5 pt-2.5 gap-3.5">
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} className="flex-row rounded-[20px] p-3 border shadow-sm" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
          <SkeletonPulse className="w-[88px] h-[104px] rounded-2xl" />
          <View className="flex-1 ml-3 justify-center">
            <SkeletonPulse className="w-[65%] h-4 rounded mb-2" />
            <SkeletonPulse className="w-[45%] h-3 rounded mb-2.5" />
            <SkeletonPulse className="w-[80%] h-[11px] rounded mb-3.5" />
            <View className="flex-row items-center justify-between mt-0.5">
              <SkeletonPulse className="w-20 h-4 rounded" />
              <SkeletonPulse className="w-[95px] h-8 rounded-2xl" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

/**
 * Skeleton for Doctor Dashboard screen loading state
 */
export const DoctorDashboardSkeleton = () => {
  const { theme } = useTheme();
  return (
    <View className="px-4 pt-3">
      {/* Stat Cards Row */}
      <View className="flex-row gap-2.5 justify-between">
        {[1, 2, 3].map((key) => (
          <View key={key} className="flex-1 rounded-2xl p-3 border items-center" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
            <SkeletonPulse className="w-7 h-7 rounded-full mb-2" />
            <SkeletonPulse className="w-9 h-4.5 rounded mb-1.5" />
            <SkeletonPulse className="w-[75%] h-2.5 rounded" />
          </View>
        ))}
      </View>

      {/* Appointment Cards */}
      <View className="gap-3.5 mt-4.5">
        {[1, 2].map((idx) => (
          <View key={idx} className="rounded-[18px] p-4 border shadow-sm" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
            <View className="flex-row items-center mb-3.5">
              <SkeletonPulse className="w-11 h-11 rounded-full" />
              <View className="flex-1 ml-3">
                <SkeletonPulse className="w-[60%] h-4 rounded mb-1.5" />
                <SkeletonPulse className="w-[40%] h-3 rounded" />
              </View>
              <SkeletonPulse className="w-[75px] h-6 rounded-xl" />
            </View>
            <SkeletonPulse className="w-full h-[38px] rounded-lg mb-3" />
            <View className="flex-row justify-between items-center">
              <SkeletonPulse className="w-[100px] h-3.5 rounded" />
              <SkeletonPulse className="w-[110px] h-9 rounded-full" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
