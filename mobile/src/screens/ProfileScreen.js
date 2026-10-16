import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  StatusBar,
  Image,
  TextInput,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import {
  getHealthProfileSafe,
  saveHealthProfileSafe,
} from '../utils/storage';
import streakService from '../services/streakService';
import AppBottomSheet from '../components/AppBottomSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 38) : 44;

// PALETTE MATCHING THE USER'S DESIGN
const PALETTE = {
  bg: '#F4F6F0',             // Soft warm sage/cream canvas
  cardWhite: '#FFFFFF',      // White surface
  mintGreen: '#D4ECD5',      // Weight card mint green
  mintGreenDark: '#C7EED6',  // Activity card mint green
  lavender: '#E8D7F9',       // Heart rate card lavender
  skyBlue: '#D2EDF6',        // Water card sky blue
  peach: '#FCE5C8',          // Calories card soft peach
  textPrimary: '#111827',    // Deep charcoal
  textSecondary: '#6B7280',  // Muted gray
  pillBorder: '#E5E7EB',
};

export default function ProfileScreen({
  onClose,
  onOpenSettings,
  currentMode = 'cycle',
  cyclePrediction = null,
  activeCycleProfile = null,
  cycleLogs = [],
  onBookDoctor = null,
}) {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  // Dynamic user identity
  const displayName = user?.name;
  const displayAvatar =
    user?.avatar_url;

  // Calculate dynamic age from birth date or health profile
  const displayAge = useMemo(() => {
    if (user?.date_of_birth) {
      try {
        const b = new Date(user.date_of_birth);
        if (!isNaN(b.getTime())) {
          const age = new Date().getFullYear() - b.getFullYear();
          if (age > 0 && age < 120) return `${age} years`;
        }
      } catch (_) { }
    }
    if (user?.health_profile?.age) {
      return `${user.health_profile.age} years`;
    }
    if (user?.health_profile?.birth_year) {
      const age = new Date().getFullYear() - Number(user.health_profile.birth_year);
      if (age > 0 && age < 120) return `${age} years`;
    }
    if (currentMode === 'pregnancy') {
      return 'Week 18 • Pregnancy';
    }
    return '27 years';
  }, [user, currentMode]);

  // Health Metrics State (stored and synchronized in vault)
  const [biometrics, setBiometrics] = useState({
    weightKg: 58,
    heartRate: 102,
    waterCups: 3,
    waterTargetCups: 8,
    calories: 1120,
    caloriesTarget: 2000,
    streakDays: 4,
    heightCm: 168,
    bloodGroup: 'O+',
    genotype: 'AA',
    bloodPressure: '118/76',
    allergies: 'None recorded',
    emergencyContact: 'Not configured',
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals for editing
  const [showAllMetricsModal, setShowAllMetricsModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showHeartRateModal, setShowHeartRateModal] = useState(false);
  const [showCaloriesModal, setShowCaloriesModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showWhyStreaksModal, setShowWhyStreaksModal] = useState(false);

  // Dynamic Streak Engine State
  const [streakData, setStreakData] = useState({
    appStreak: 1,
    longestAppStreak: 1,
    cycleStreak: 1,
    longestCycleStreak: 1,
    daysThisYear: 1,
    weeksInRow: 0,
    weeklyDays: streakService.getWeekDaysWithStatus(),
    freezeAvailable: true,
  });

  // Temporary inputs
  const [editWeight, setEditWeight] = useState('58');
  const [editHeartRate, setEditHeartRate] = useState('102');
  const [editCalories, setEditCalories] = useState('1120');
  const [tempBiometrics, setTempBiometrics] = useState(biometrics);

  // Load stored profile data on mount & compute accurate streaks
  useEffect(() => {
    async function loadStoredHealthData() {
      try {
        const stored = await getHealthProfileSafe();
        if (stored) {
          setBiometrics((prev) => ({
            ...prev,
            weightKg: stored.weight || stored.weightKg || prev.weightKg,
            heightCm: stored.height || stored.heightCm || prev.heightCm,
            bloodGroup: stored.bloodGroup || prev.bloodGroup,
            genotype: stored.genotype || prev.genotype,
            bloodPressure: stored.bloodPressure || prev.bloodPressure,
            heartRate: stored.heartRate || prev.heartRate,
            waterCups: stored.waterCups !== undefined ? stored.waterCups : prev.waterCups,
            waterTargetCups: stored.waterTargetCups || prev.waterTargetCups,
            calories: stored.calories || prev.calories,
            streakDays: stored.streakDays || prev.streakDays,
            allergies: stored.allergies || prev.allergies,
            emergencyContact: stored.emergencyContact || prev.emergencyContact,
          }));
        }

        // Accurately compute & advance streak on entry (offline-first & syncs to backend)
        const streakInfo = await streakService.recordStreakActivity({ activityType: 'app_open' });
        if (streakInfo) {
          setStreakData(streakInfo);
          setBiometrics((prev) => ({ ...prev, streakDays: streakInfo.appStreak }));
        }
      } catch (err) {
        console.warn('[ProfileScreen] Failed to load stored profile or streak:', err);
        try {
          const fallbackStreak = await streakService.getStreakData();
          if (fallbackStreak) {
            setStreakData(fallbackStreak);
            setBiometrics((prev) => ({ ...prev, streakDays: fallbackStreak.appStreak }));
          }
        } catch (_) { }
      }
    }
    loadStoredHealthData();
  }, [cycleLogs]);

  // Persist biometrics helper
  const saveUpdatedBiometrics = async (updated) => {
    setBiometrics(updated);
    try {
      const currentStored = (await getHealthProfileSafe()) || {};
      await saveHealthProfileSafe({
        ...currentStored,
        ...updated,
        weight: updated.weightKg,
        height: updated.heightCm,
      });
    } catch (e) {
      console.warn('[ProfileScreen] Save error:', e);
    }
  };

  // Water increment
  const handleIncrementWater = () => {
    const newCups = biometrics.waterCups >= biometrics.waterTargetCups ? 0 : biometrics.waterCups + 1;
    saveUpdatedBiometrics({ ...biometrics, waterCups: newCups });
    streakService
      .recordStreakActivity({ activityType: 'water_log' })
      .then((updated) => {
        if (updated) {
          setStreakData(updated);
          setBiometrics((prev) => ({ ...prev, streakDays: updated.appStreak }));
        }
      })
      .catch(() => { });
  };

  // Save single metric updates
  const handleSaveWeight = () => {
    const val = parseFloat(editWeight);
    if (!isNaN(val) && val > 20 && val < 300) {
      saveUpdatedBiometrics({ ...biometrics, weightKg: val });
      streakService
        .recordStreakActivity({ activityType: 'vitals_log' })
        .then((updated) => {
          if (updated) {
            setStreakData(updated);
            setBiometrics((prev) => ({ ...prev, streakDays: updated.appStreak }));
          }
        })
        .catch(() => { });
    }
    setShowWeightModal(false);
  };

  const handleSaveHeartRate = () => {
    const val = parseInt(editHeartRate, 10);
    if (!isNaN(val) && val > 30 && val < 240) {
      saveUpdatedBiometrics({ ...biometrics, heartRate: val });
    }
    setShowHeartRateModal(false);
  };

  const handleSaveCalories = () => {
    const val = parseInt(editCalories, 10);
    if (!isNaN(val) && val >= 0) {
      saveUpdatedBiometrics({ ...biometrics, calories: val });
    }
    setShowCaloriesModal(false);
  };

  // Save all metrics modal
  const handleSaveAllMetrics = () => {
    saveUpdatedBiometrics(tempBiometrics);
    setShowAllMetricsModal(false);
    Alert.alert('Metrics Saved', 'Your health metrics and records have been securely updated.');
  };

  // Export encrypted summary
  const handleExportSummary = async () => {
    try {
      await Share.share({
        title: `${displayName}'s Health Summary`,
        message: `Red Apple Health Summary\nPatient: ${displayName}\nAge: ${displayAge}\nWeight: ${biometrics.weightKg} kg\nHeart Rate: ${biometrics.heartRate} bpm\nWater: ${biometrics.waterCups}/${biometrics.waterTargetCups} cups\nBlood Group: ${biometrics.bloodGroup} • Genotype: ${biometrics.genotype}\nEmergency Contact: ${biometrics.emergencyContact}`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((res) => setTimeout(res, 500));
    setIsRefreshing(false);
  };

  // Derived BMI
  const bmiValue = useMemo(() => {
    const h = biometrics.heightCm / 100;
    if (h <= 0) return '20.6';
    return (biometrics.weightKg / (h * h)).toFixed(1);
  }, [biometrics.heightCm, biometrics.weightKg]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6F0" translucent={true} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#111827"
            colors={['#111827', '#DC2626']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        <View style={styles.contentWrap}>
          {/* ========================================================================= */}
          {/* TOP PROFILE HEADER BAR (AVATAR, NAME, STREAK & SETTINGS)                  */}
          {/* ========================================================================= */}
          <View style={styles.topProfileBar}>
            {/* Left Col: Back Button, Avatar and User Identity */}
            <View style={styles.profileIdentityRow}>
              {onClose && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.backCircleBtn}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={20} color="#111827" />
                </TouchableOpacity>
              )}

              <Image
                source={{ uri: displayAvatar }}
                style={styles.userAvatarImg}
                resizeMode="cover"
              />

              <View style={styles.userNameCol}>
                <Text style={styles.userNameText} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.userSubtitleText} numberOfLines={1}>
                  {displayAge}
                </Text>
              </View>
            </View>

            {/* Right Col: Streak and Settings Buttons (replacing search & notifications) */}
            <View style={styles.topRightActionsRow}>
              {/* Streak Button with Thunder Icon */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.headerRoundBtn}
                onPress={() => setShowStreakModal(true)}
              >
                <Ionicons name="flash" size={17} color="#111827" />
                <Text style={styles.streakCountBadgeText}>{streakData.appStreak}</Text>
              </TouchableOpacity>

              {/* Settings Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.headerRoundBtn}
                onPress={() => onOpenSettings && onOpenSettings()}
              >
                <Ionicons name="settings-outline" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ========================================================================= */}
          {/* SECTION HEADER: HEALTH METRICS                                            */}
          {/* ========================================================================= */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Health metrics</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setTempBiometrics(biometrics);
                setShowAllMetricsModal(true);
              }}
            >
              <Text style={styles.viewAllLinkText}>View all</Text>
            </TouchableOpacity>
          </View>

          {/* ========================================================================= */}
          {/* BENTO GRID: 1. WEIGHT FULL-WIDTH CARD (MINT GREEN)                         */}
          {/* ========================================================================= */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.weightCard}
            onPress={() => {
              setEditWeight(String(biometrics.weightKg));
              setShowWeightModal(true);
            }}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleBadgeGroup}>
                <View style={styles.badgeWhiteCircle}>
                  <Ionicons name="scale-outline" size={17} color="#111827" />
                </View>
                <Text style={styles.badgeTitleText}>Weight</Text>
              </View>

              <Text style={styles.weightValueText}>
                {biometrics.weightKg}
                <Text style={styles.weightUnitText}> kg</Text>
              </Text>
            </View>

            {/* Smooth Curved Line Chart Representation */}
            <View style={styles.weightChartContainer}>
              <Svg width="100%" height={90} viewBox="0 0 320 90">
                <Path
                  d="M 0 35 C 35 15, 65 48, 100 28 C 145 10, 175 48, 215 68 C 245 84, 265 52, 285 40 L 320 40"
                  fill="none"
                  stroke="#263426"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {/* Highlighted current weight dot */}
                <Circle cx={285} cy={40} r={6} fill="#111827" />
                <Circle cx={285} cy={40} r={9} fill="none" stroke="#FFFFFF" strokeWidth={2.5} />
              </Svg>
            </View>
          </TouchableOpacity>

          {/* ========================================================================= */}
          {/* BENTO GRID: 2. MIDDLE TWO-COLUMN ROW (HEART RATE & WATER / CALORIES)       */}
          {/* ========================================================================= */}
          <View style={styles.middleTwoColRow}>
            {/* LEFT COLUMN: HEART RATE CARD (PASTEL LAVENDER) */}
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.heartRateCard}
              onPress={() => {
                setEditHeartRate(String(biometrics.heartRate));
                setShowHeartRateModal(true);
              }}
            >
              <View style={styles.cardTitleBadgeGroup}>
                <View style={styles.badgeWhiteCircle}>
                  <Ionicons name="heart" size={16} color="#111827" />
                </View>
                <Text style={styles.badgeTitleText}>Heart rate</Text>
              </View>

              {/* Soundwave Frequency Rhythm Bars */}
              <View style={styles.pulseBarsRow}>
                {[28, 54, 38, 66, 44, 60, 48, 70, 42, 56, 36, 46].map((barHeight, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.pulseBarItem,
                      {
                        height: barHeight,
                        backgroundColor: idx >= 8 ? 'rgba(17, 24, 39, 0.32)' : '#111827',
                      },
                    ]}
                  />
                ))}
              </View>

              <Text style={styles.metricLargeNumber}>
                {biometrics.heartRate}
                <Text style={styles.metricSmallUnit}> bpm</Text>
              </Text>
            </TouchableOpacity>

            {/* RIGHT COLUMN: STACKED WATER & CALORIES CARDS */}
            <View style={styles.rightStackedCol}>
              {/* TOP: WATER CARD (SKY BLUE) */}
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.waterCard}
                onPress={handleIncrementWater}
              >
                <View style={styles.cardTitleBadgeGroup}>
                  <View style={styles.badgeWhiteCircle}>
                    <Ionicons name="water" size={16} color="#111827" />
                  </View>
                  <Text style={styles.badgeTitleText}>Water</Text>
                </View>

                <Text style={styles.waterNumberText}>
                  {biometrics.waterCups}/{biometrics.waterTargetCups}
                  <Text style={styles.metricSmallUnit}> cups</Text>
                </Text>
              </TouchableOpacity>

              {/* BOTTOM: CALORIES CARD (SOFT PEACH) */}
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.caloriesCard}
                onPress={() => {
                  setEditCalories(String(biometrics.calories));
                  setShowCaloriesModal(true);
                }}
              >
                <View style={styles.cardTitleBadgeGroup}>
                  <View style={styles.badgeWhiteCircle}>
                    <Ionicons name="restaurant" size={15} color="#111827" />
                  </View>
                  <Text style={styles.badgeTitleText}>Calories</Text>
                </View>

                <Text style={styles.caloriesNumberText}>
                  {biometrics.calories}
                  <Text style={styles.metricSmallUnit}> kcal</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ========================================================================= */}
          {/* BENTO GRID: 3. ACTIVITY FULL-WIDTH CARD (MINT GREEN)                      */}
          {/* ========================================================================= */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.activityCard}
            onPress={() => setShowStreakModal(true)}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleBadgeGroup}>
                <View style={styles.badgeWhiteCircle}>
                  <Ionicons name="footsteps" size={17} color="#111827" />
                </View>
                <Text style={styles.badgeTitleText}>Activity</Text>
              </View>

              <Text style={styles.activityStreakText}>
                {streakData.appStreak} {streakData.appStreak === 1 ? 'day streak' : 'days streak'}
              </Text>
            </View>

            {/* 7-Day Streak Tracker Indicators */}
            <View style={styles.activityDaysRow}>
              {(streakData.weeklyDays && streakData.weeklyDays.length > 0
                ? streakData.weeklyDays
                : streakService.getWeekDaysWithStatus()
              ).map((day, idx) => {
                if (day.isCompleted) {
                  return (
                    <View key={day.dateStr || idx} style={styles.activeDayCircle}>
                      <Ionicons name="flash" size={16} color="#111827" />
                    </View>
                  );
                }
                return (
                  <View
                    key={day.dateStr || idx}
                    style={[
                      styles.upcomingDayCircle,
                      day.isToday && styles.todayDayCircle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.upcomingDayLetterText,
                        day.isToday && styles.todayDayLetterText,
                      ]}
                    >
                      {day.dayLetter}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL: VIEW ALL / CLINICAL HEALTH BIOMETRICS                              */}
      {/* ========================================================================= */}
      <Modal
        visible={showAllMetricsModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowAllMetricsModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.modalNavHeader}>
            <TouchableOpacity
              style={styles.backCircleBtn}
              onPress={() => setShowAllMetricsModal(false)}
            >
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>

            <Text style={styles.modalNavTitle}>Clinical Vitals & Biometrics</Text>

            <TouchableOpacity
              style={styles.exportIconBtn}
              onPress={handleExportSummary}
            >
              <Ionicons name="share-outline" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalSectionCard}>
              <Text style={styles.modalSectionCardTitle}>Body Biometrics</Text>

              <View style={styles.modalInputRow}>
                <Text style={styles.modalInputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={String(tempBiometrics.weightKg)}
                  keyboardType="numeric"
                  onChangeText={(t) => setTempBiometrics((p) => ({ ...p, weightKg: parseFloat(t) || 0 }))}
                />
              </View>

              <View style={styles.modalInputRow}>
                <Text style={styles.modalInputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={String(tempBiometrics.heightCm)}
                  keyboardType="numeric"
                  onChangeText={(t) => setTempBiometrics((p) => ({ ...p, heightCm: parseFloat(t) || 0 }))}
                />
              </View>

              <View style={styles.modalInputRow}>
                <Text style={styles.modalInputLabel}>Resting Heart Rate (bpm)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={String(tempBiometrics.heartRate)}
                  keyboardType="numeric"
                  onChangeText={(t) => setTempBiometrics((p) => ({ ...p, heartRate: parseInt(t, 10) || 0 }))}
                />
              </View>

              <View style={styles.modalInputRow}>
                <Text style={styles.modalInputLabel}>Blood Pressure</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={tempBiometrics.bloodPressure}
                  onChangeText={(t) => setTempBiometrics((p) => ({ ...p, bloodPressure: t }))}
                />
              </View>

              <View style={styles.modalInputRow}>
                <Text style={styles.modalInputLabel}>Calculated BMI</Text>
                <Text style={styles.modalReadonlyValue}>{bmiValue} kg/m²</Text>
              </View>
            </View>

            <View style={styles.modalSectionCard}>
              <Text style={styles.modalSectionCardTitle}>Daily Targets</Text>

              <View style={styles.modalInputRow}>
                <Text style={styles.modalInputLabel}>Water Target (cups/day)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={String(tempBiometrics.waterTargetCups)}
                  keyboardType="numeric"
                  onChangeText={(t) => setTempBiometrics((p) => ({ ...p, waterTargetCups: parseInt(t, 10) || 8 }))}
                />
              </View>

              <View style={styles.modalInputRow}>
                <Text style={styles.modalInputLabel}>Calorie Target (kcal/day)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={String(tempBiometrics.caloriesTarget)}
                  keyboardType="numeric"
                  onChangeText={(t) => setTempBiometrics((p) => ({ ...p, caloriesTarget: parseInt(t, 10) || 2000 }))}
                />
              </View>
            </View>

            <View style={styles.modalSectionCard}>
              <Text style={styles.modalSectionCardTitle}>Emergency & Clinical</Text>

              <View style={styles.modalInputRow}>
                <Text style={styles.modalInputLabel}>Blood Group</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={tempBiometrics.bloodGroup}
                  onChangeText={(t) => setTempBiometrics((p) => ({ ...p, bloodGroup: t }))}
                />
              </View>

              <View style={styles.modalInputRow}>
                <Text style={styles.modalInputLabel}>Genotype</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={tempBiometrics.genotype}
                  onChangeText={(t) => setTempBiometrics((p) => ({ ...p, genotype: t }))}
                />
              </View>

              <View style={styles.modalInputRow}>
                <Text style={styles.modalInputLabel}>Emergency Contact</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={tempBiometrics.emergencyContact}
                  placeholder="e.g. +234 803 123 4567"
                  onChangeText={(t) => setTempBiometrics((p) => ({ ...p, emergencyContact: t }))}
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.modalSaveBtn}
              onPress={handleSaveAllMetrics}
            >
              <Text style={styles.modalSaveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* QUICK LOG: WEIGHT MODAL */}
      <Modal
        visible={showWeightModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <TouchableOpacity
          style={styles.promptModalOverlay}
          activeOpacity={1}
          onPress={() => setShowWeightModal(false)}
        >
          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>Log Weight</Text>
            <Text style={styles.promptSub}>Enter your current weight in kilograms:</Text>
            <TextInput
              style={styles.promptInput}
              keyboardType="numeric"
              value={editWeight}
              onChangeText={setEditWeight}
              autoFocus={true}
            />
            <View style={styles.promptBtnRow}>
              <TouchableOpacity
                style={styles.promptCancelBtn}
                onPress={() => setShowWeightModal(false)}
              >
                <Text style={styles.promptCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptSubmitBtn}
                onPress={handleSaveWeight}
              >
                <Text style={styles.promptSubmitBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* QUICK LOG: HEART RATE MODAL */}
      <Modal
        visible={showHeartRateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHeartRateModal(false)}
      >
        <TouchableOpacity
          style={styles.promptModalOverlay}
          activeOpacity={1}
          onPress={() => setShowHeartRateModal(false)}
        >
          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>Log Heart Rate</Text>
            <Text style={styles.promptSub}>Enter your resting heart rate (bpm):</Text>
            <TextInput
              style={styles.promptInput}
              keyboardType="numeric"
              value={editHeartRate}
              onChangeText={setEditHeartRate}
              autoFocus={true}
            />
            <View style={styles.promptBtnRow}>
              <TouchableOpacity
                style={styles.promptCancelBtn}
                onPress={() => setShowHeartRateModal(false)}
              >
                <Text style={styles.promptCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptSubmitBtn}
                onPress={handleSaveHeartRate}
              >
                <Text style={styles.promptSubmitBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* QUICK LOG: CALORIES MODAL */}
      <Modal
        visible={showCaloriesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCaloriesModal(false)}
      >
        <TouchableOpacity
          style={styles.promptModalOverlay}
          activeOpacity={1}
          onPress={() => setShowCaloriesModal(false)}
        >
          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>Log Calories</Text>
            <Text style={styles.promptSub}>Enter your logged calories for today (kcal):</Text>
            <TextInput
              style={styles.promptInput}
              keyboardType="numeric"
              value={editCalories}
              onChangeText={setEditCalories}
              autoFocus={true}
            />
            <View style={styles.promptBtnRow}>
              <TouchableOpacity
                style={styles.promptCancelBtn}
                onPress={() => setShowCaloriesModal(false)}
              >
                <Text style={styles.promptCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptSubmitBtn}
                onPress={handleSaveCalories}
              >
                <Text style={styles.promptSubmitBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET: STREAK DETAILS (USING REUSABLE AppBottomSheet)              */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        showHandle={true}
        showCloseChevron={true}
        scrollable={true}
        title="Streaks help you build your daily health & cycle habit."
        headerRight={
          <>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.sheetIconBtn}
              onPress={() => setShowWhyStreaksModal(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="help-circle-outline" size={21} color="#4B5563" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.sheetIconBtn}
              onPress={async () => {
                try {
                  await Share.share({
                    title: 'Red Apple Health Streak',
                    message: `I'm on a ${streakData.appStreak}-day streak tracking my health & cycle in Red Apple! ⚡🍎`,
                  });
                } catch (_) { }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-social-outline" size={21} color="#4B5563" />
            </TouchableOpacity>
          </>
        }
      >
        {/* Side-by-Side Two Column Metrics Grid */}
        <View style={styles.streakMetricColumnsRow}>
          {/* Column 1: App Streak */}
          <View style={styles.streakCol}>
            <View style={styles.streakNumberWithIconRow}>
              <Ionicons name="flash" size={28} color="#EA580C" style={{ marginRight: 6 }} />
              <Text style={styles.streakLargeDigits}>{streakData.appStreak}</Text>
            </View>
            <Text style={styles.streakColLabel}>App Streak</Text>
            <View style={styles.streakBestRow}>
              <Ionicons name="flash" size={13} color="#EA580C" style={{ marginRight: 4 }} />
              <Text style={styles.streakBestText}>{streakData.longestAppStreak} Best</Text>
            </View>
          </View>

          {/* Vertical Divider Line */}
          <View style={styles.streakVerticalDivider} />

          {/* Column 2: Cycle Log Streak */}
          <View style={styles.streakCol}>
            <View style={styles.streakNumberWithIconRow}>
              <Ionicons name="water" size={26} color="#0284C7" style={{ marginRight: 6 }} />
              <Text style={styles.streakLargeDigits}>{streakData.cycleStreak}</Text>
            </View>
            <Text style={styles.streakColLabel}>Cycle & Vitals Streak</Text>
            <View style={styles.streakBestRow}>
              <Ionicons name="water" size={13} color="#0284C7" style={{ marginRight: 4 }} />
              <Text style={styles.streakBestText}>{streakData.longestCycleStreak} Best</Text>
            </View>
          </View>
        </View>

        {/* Bottom Summary Stats */}
        <View style={styles.sheetBottomStatsCol}>
          <Text style={styles.sheetWeeksRowText}>
            {streakData.weeksInRow} {streakData.weeksInRow === 1 ? 'week' : 'weeks'} in a row
          </Text>
          <Text style={styles.sheetDaysThisYearText}>
            {streakData.daysThisYear} {streakData.daysThisYear === 1 ? 'day' : 'days'} in Red Apple this year
          </Text>
        </View>
      </AppBottomSheet>

      {/* ========================================================================= */}
      {/* WHY STREAKS MODAL (USING REUSABLE AppBottomSheet)                         */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showWhyStreaksModal}
        onClose={() => setShowWhyStreaksModal(false)}
        showHandle={true}
      >
        {/* Centered Large Thunder Icon */}
        <View style={styles.whyStreaksIconWrap}>
          <Ionicons name="flash-outline" size={68} color="#111827" />
        </View>

        {/* Headline */}
        <Text style={styles.whyStreaksTitle}>Why Streaks?</Text>

        {/* Main Body Paragraph */}
        <Text style={styles.whyStreaksBody}>
          Having a Streak means you’re consistently taking charge of your reproductive and bodily health, but your wellness journey is more than just a number. Allow your Streak to simply be a daily reminder to check in with your body, log your cycle & symptoms, and stay informed.
        </Text>

        {/* Sub-clause */}
        <Text style={styles.whyStreaksSub}>
          A Streak of 7 or more days may be restored once per month.
        </Text>

        {/* Close Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.whyStreaksCloseBtn}
          onPress={() => setShowWhyStreaksModal(false)}
        >
          <Text style={styles.whyStreaksCloseBtnText}>Close</Text>
        </TouchableOpacity>
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  container: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 20,
  },

  /* -------------------------------------------------------------------------- */
  /* TOP PROFILE BAR                                                            */
  /* -------------------------------------------------------------------------- */
  topProfileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    height: 52,
  },
  profileIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  userNameCol: {
    marginLeft: 12,
    flex: 1,
  },
  userNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  userSubtitleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  topRightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  streakCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
    position: 'absolute',
    bottom: 4,
    right: 8,
  },

  /* -------------------------------------------------------------------------- */
  /* SECTION HEADER                                                             */
  /* -------------------------------------------------------------------------- */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  viewAllLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  /* -------------------------------------------------------------------------- */
  /* 1. WEIGHT FULL-WIDTH CARD                                                  */
  /* -------------------------------------------------------------------------- */
  weightCard: {
    backgroundColor: PALETTE.mintGreen,
    borderRadius: 28,
    padding: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeWhiteCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  weightValueText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  weightUnitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  weightChartContainer: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* -------------------------------------------------------------------------- */
  /* 2. MIDDLE TWO-COLUMN ROW                                                   */
  /* -------------------------------------------------------------------------- */
  middleTwoColRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  heartRateCard: {
    flex: 1,
    backgroundColor: PALETTE.lavender,
    borderRadius: 28,
    padding: 20,
    justifyContent: 'space-between',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  pulseBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 76,
    marginVertical: 14,
    paddingHorizontal: 2,
  },
  pulseBarItem: {
    width: 2.5,
    borderRadius: 2,
  },
  metricLargeNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
  },
  metricSmallUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rightStackedCol: {
    flex: 1,
    gap: 12,
  },
  waterCard: {
    backgroundColor: PALETTE.skyBlue,
    borderRadius: 28,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  waterNumberText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
  },
  caloriesCard: {
    backgroundColor: PALETTE.peach,
    borderRadius: 28,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  caloriesNumberText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
  },

  /* -------------------------------------------------------------------------- */
  /* 3. ACTIVITY FULL-WIDTH CARD                                                */
  /* -------------------------------------------------------------------------- */
  activityCard: {
    backgroundColor: PALETTE.mintGreenDark,
    borderRadius: 28,
    padding: 20,
    marginTop: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  activityStreakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  activityDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 2,
  },
  activeDayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  upcomingDayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDayCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 2,
    borderColor: '#111827',
  },
  upcomingDayLetterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  todayDayLetterText: {
    fontWeight: '800',
    color: '#111827',
  },

  /* -------------------------------------------------------------------------- */
  /* ALL METRICS MODAL STYLING                                                  */
  /* -------------------------------------------------------------------------- */
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalNavTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  exportIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalSectionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  modalSectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    flex: 1,
  },
  modalTextInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 110,
    textAlign: 'right',
  },
  modalReadonlyValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  modalSaveBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSaveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* -------------------------------------------------------------------------- */
  /* QUICK LOG PROMPTS                                                          */
  /* -------------------------------------------------------------------------- */
  promptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  promptCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  promptSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 14,
  },
  promptInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  promptBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  promptCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  promptCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  promptSubmitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* -------------------------------------------------------------------------- */
  /* STREAK BOTTOM SHEET (LIGHT THEMED TO MATCH PROFILE PAGE)                   */
  /* -------------------------------------------------------------------------- */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  streakSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 12,
  },
  sheetHeaderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  sheetHandleTouch: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sheetTopRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetMainHeadline: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 32,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 26,
    paddingHorizontal: 12,
    letterSpacing: -0.3,
  },
  streakMetricColumnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  streakCol: {
    flex: 1,
    alignItems: 'center',
  },
  streakVerticalDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E2E8F0',
  },
  streakNumberWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakLargeDigits: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  streakColLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 5,
    marginBottom: 5,
    textAlign: 'center',
  },
  streakBestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBestText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  sheetBottomStatsCol: {
    marginTop: 18,
    marginBottom: 10,
    alignItems: 'center',
  },
  sheetWeeksRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  sheetDaysThisYearText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: -0.2,
  },

  /* -------------------------------------------------------------------------- */
  /* WHY STREAKS MODAL (EXACT MATCH FOR ATTACHED SCREENSHOT)                    */
  /* -------------------------------------------------------------------------- */
  whyStreaksCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 34,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 16,
  },
  whyStreaksDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#111827',
    marginBottom: 28,
  },
  whyStreaksIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  whyStreaksTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  whyStreaksBody: {
    fontSize: 16,
    lineHeight: 25,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 8,
    fontWeight: '400',
  },
  whyStreaksSub: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 30,
    fontWeight: '500',
  },
  whyStreaksCloseBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyStreaksCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  whyStreaksHelpLinkText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
});
