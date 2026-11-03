import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppBottomSheet from './AppBottomSheet';
import streakService from '../services/streakService';
import { useTheme } from '../context/ThemeContext';

/**
 * Reusable Streak Modal Component
 * Displays streak breakdown (App streak, Cycle log streak, consistency, year-to-date)
 * and includes a "Why Streaks?" educational bottom sheet.
 */
export default function StreakModal({
  visible = false,
  onClose,
  initialStreakData = null,
}) {
  const { isDarkMode, theme } = useTheme();
  const [streakData, setStreakData] = useState({
    appStreak: 1,
    cycleStreak: 1,
    longestAppStreak: 1,
    longestCycleStreak: 1,
    weeksInRow: 1,
    daysThisYear: 1,
    ...(initialStreakData || {}),
  });

  const [showWhyStreaksModal, setShowWhyStreaksModal] = useState(false);

  useEffect(() => {
    if (initialStreakData) {
      setStreakData((prev) => ({ ...prev, ...initialStreakData }));
    }
  }, [initialStreakData]);

  useEffect(() => {
    if (visible && typeof streakService?.getStreakData === 'function') {
      let isMounted = true;
      streakService
        .getStreakData()
        .then((data) => {
          if (isMounted && data) {
            setStreakData((prev) => ({
              ...prev,
              appStreak: data.appStreak ?? prev.appStreak,
              cycleStreak: data.cycleStreak ?? prev.cycleStreak,
              longestAppStreak: data.longestAppStreak ?? prev.longestAppStreak,
              longestCycleStreak: data.longestCycleStreak ?? prev.longestCycleStreak,
              weeksInRow: data.weeksInRow ?? prev.weeksInRow,
              daysThisYear: data.daysThisYear ?? prev.daysThisYear,
            }));
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [visible]);

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Red Apple Health Streak',
        message: `I'm on a ${streakData.appStreak}-day streak tracking my health in Red Apple! ⚡🍎`,
      });
    } catch (_) {}
  };

  return (
    <>
      {/* Bottom Sheet: Streak Details */}
      <AppBottomSheet
        visible={visible}
        onClose={onClose}
        showHandle={true}
        showCloseChevron={true}
        scrollable={true}
        title="Streaks help you build your daily health habit."
        headerRight={
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              activeOpacity={0.75}
              className="p-1"
              onPress={() => setShowWhyStreaksModal(true)}
              accessibilityLabel="Why Streaks?"
            >
              <Ionicons name="help-circle-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              className="p-1"
              onPress={handleShare}
              accessibilityLabel="Share streak"
            >
              <Ionicons name="share-social-outline" size={21} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        }
      >
        <View
          className="flex-row items-center justify-around py-5 border-b"
          style={{ borderBottomColor: theme.cardBorder }}
        >
          {/* App Streak Column */}
          <View className="items-center">
            <View className="flex-row items-center gap-1">
              <Ionicons name="flash" size={24} color="#EA580C" />
              <Text className="text-3xl font-black" style={{ color: theme.textPrimary }}>{streakData.appStreak}</Text>
            </View>
            <Text className="text-xs font-bold mt-1" style={{ color: theme.textSecondary }}>App Streak</Text>
            <Text className="text-[11px] font-semibold text-orange-600 mt-0.5">
              {streakData.longestAppStreak} Best
            </Text>
          </View>

          <View className="w-[1px] h-12" style={{ backgroundColor: theme.cardBorder }} />

          {/* Cycle Streak Column */}
          <View className="items-center">
            <View className="flex-row items-center gap-1">
              <Ionicons name="water" size={24} color="#0284C7" />
              <Text className="text-3xl font-black" style={{ color: theme.textPrimary }}>{streakData.cycleStreak}</Text>
            </View>
            <Text className="text-xs font-bold mt-1" style={{ color: theme.textSecondary }}>Cycle Log Streak</Text>
            <Text className="text-[11px] font-semibold text-sky-600 mt-0.5">
              {streakData.longestCycleStreak} Best
            </Text>
          </View>
        </View>

        <View className="py-4 items-center gap-1">
          <Text className="text-xs font-bold" style={{ color: theme.textPrimary }}>
            {streakData.weeksInRow} {streakData.weeksInRow === 1 ? 'week' : 'weeks'} in a row
          </Text>
          <Text className="text-[11px]" style={{ color: theme.textMuted }}>
            {streakData.daysThisYear} days in Red Apple this year
          </Text>
        </View>
      </AppBottomSheet>

      {/* Why Streaks Explanation Bottom Sheet */}
      <AppBottomSheet
        visible={showWhyStreaksModal}
        onClose={() => setShowWhyStreaksModal(false)}
        showHandle={true}
      >
        <View className="items-center py-4 px-2">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: isDarkMode ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7' }}
          >
            <Ionicons name="flash-outline" size={36} color="#D97706" />
          </View>
          <Text className="text-lg font-black mb-2" style={{ color: theme.textPrimary }}>Why Streaks?</Text>
          <Text className="text-xs text-center leading-relaxed mb-6" style={{ color: theme.textSecondary }}>
            Having a Streak means you’re consistently taking charge of your reproductive and bodily health. It serves as a gentle daily reminder to check in with your body, log your cycle, and stay informed.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            className="py-3 px-8 rounded-full"
            style={{ backgroundColor: isDarkMode ? '#FFFFFF' : '#111827' }}
            onPress={() => setShowWhyStreaksModal(false)}
          >
            <Text className="text-xs font-bold" style={{ color: isDarkMode ? '#111827' : '#FFFFFF' }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>
    </>
  );
}
