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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import {
  getHealthProfileSafe,
  saveHealthProfileSafe,
} from '../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen({
  onClose,
  onOpenSettings,
  currentMode = 'cycle',
  cyclePrediction = null,
  activeCycleProfile = null,
  cycleLogs = [],
  onBookDoctor = null,
  onLogSymptoms = null,
}) {
  const { user } = useAuth();

  // User identity
  const isDoctor =
    user?.role === 'doctor' || user?.email?.toLowerCase() === 'mesalokubor63@gmail.com';
  const displayName = isDoctor
    ? (user?.name && user?.name !== 'mesalokubor63' ? user.name : 'Dr. Mesal Okubor')
    : (user?.name || 'Amara Okonkwo');
  const displayEmail = user?.email || (isDoctor ? 'mesalokubor63@gmail.com' : 'amara@redapple.health');
  const displayHandle = isDoctor ? '@dr.mesal' : '@amara.health';
  const memberSince = user?.created_at
    ? `Member since ${new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : 'Member since Jan 2026';

  // Snapchat-style dual segmented tab: 'vitals' | 'records'
  const [activeTab, setActiveTab] = useState('vitals');

  // Cycle & Reproductive parameters
  const [cycleLength, setCycleLength] = useState(
    activeCycleProfile?.cycleLength || 28
  );
  const [periodLength, setPeriodLength] = useState(
    activeCycleProfile?.periodDuration || 5
  );

  // Clinical Biometrics (persisted locally)
  const [biometrics, setBiometrics] = useState({
    bloodGroup: 'O+',
    genotype: 'AA',
    heightCm: 168,
    weightKg: 62,
    bloodPressure: '118/76',
  });

  // Clinical History & Allergies
  const [clinicalHistory, setClinicalHistory] = useState({
    allergies: 'Penicillin (Mild rash) • No known food allergies',
    conditions: 'Cycle Regularity Tracking • Normal Pap Smear (2025)',
    emergencyContact: 'Dr. Mesal Okubor / Next of Kin (+234 803 123 4567)',
  });

  // Wearables banner dismiss
  const [hideWearablesBanner, setHideWearablesBanner] = useState(false);

  // Interactive Modals
  const [showCycleParamModal, setShowCycleParamModal] = useState(false);
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [showAllergiesModal, setShowAllergiesModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Temporary modal editing state
  const [tempBiometrics, setTempBiometrics] = useState(biometrics);
  const [tempClinicalHistory, setTempClinicalHistory] = useState(clinicalHistory);

  // Refresh & Export states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load stored profile data on mount
  useEffect(() => {
    async function loadStoredHealthData() {
      try {
        const stored = await getHealthProfileSafe();
        if (stored) {
          if (stored.cycleLength) setCycleLength(Number(stored.cycleLength));
          if (stored.periodDuration) setPeriodLength(Number(stored.periodDuration));
          if (stored.biometrics) {
            setBiometrics((prev) => ({ ...prev, ...stored.biometrics }));
          }
          if (stored.clinicalHistory) {
            setClinicalHistory((prev) => ({ ...prev, ...stored.clinicalHistory }));
          }
        }
      } catch (err) {
        console.warn('[ProfileScreen] Failed to load stored profile:', err);
      }
    }
    loadStoredHealthData();
  }, []);

  // Sync cycle lengths if props change
  useEffect(() => {
    if (activeCycleProfile?.cycleLength) {
      setCycleLength(Number(activeCycleProfile.cycleLength));
    }
    if (activeCycleProfile?.periodDuration) {
      setPeriodLength(Number(activeCycleProfile.periodDuration));
    }
  }, [activeCycleProfile]);

  // Derived BMI calculation
  const bmiValue = useMemo(() => {
    const h = biometrics.heightCm / 100;
    if (h <= 0) return '22.0';
    return (biometrics.weightKg / (h * h)).toFixed(1);
  }, [biometrics.heightCm, biometrics.weightKg]);

  const bmiCategory = useMemo(() => {
    const val = parseFloat(bmiValue);
    if (val < 18.5) return 'Underweight';
    if (val < 25) return 'Normal & Healthy';
    if (val < 30) return 'Overweight';
    return 'Obese';
  }, [bmiValue]);

  // Dynamic calculations for predictions
  const displayCurrentDay = cyclePrediction?.currentCycleDay || 14;
  const currentPhase = cyclePrediction?.currentPhase || 'Follicular';

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = String(dateStr).split('T')[0].split('-');
      const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    } catch {
      return dateStr;
    }
  };

  const nextPeriodDateStr = cyclePrediction?.nextPeriodStartDate
    ? formatShortDate(cyclePrediction.nextPeriodStartDate)
    : 'Sep 30';

  const fertileWindowStr =
    cyclePrediction?.fertileWindowStart && cyclePrediction?.fertileWindowEnd
      ? `${formatShortDate(cyclePrediction.fertileWindowStart)}–${formatShortDate(cyclePrediction.fertileWindowEnd)}`
      : 'Sep 14–20';

  // Days until next period
  const daysUntilNextPeriod = useMemo(() => {
    if (!cyclePrediction?.nextPeriodStartDate) return 14;
    try {
      const parts = String(cyclePrediction.nextPeriodStartDate).split('T')[0].split('-');
      const target = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(cyclePrediction.nextPeriodStartDate);
      const today = new Date();
      const diffMs = target.getTime() - today.getTime();
      return Math.max(Math.round(diffMs / (1000 * 60 * 60 * 24)), 0);
    } catch {
      return 14;
    }
  }, [cyclePrediction?.nextPeriodStartDate]);

  // Save cycle parameters to storage
  const handleSaveCycleParams = async () => {
    try {
      const currentStored = (await getHealthProfileSafe()) || {};
      const updated = {
        ...currentStored,
        cycleLength,
        periodDuration: periodLength,
      };
      await saveHealthProfileSafe(updated);
      setShowCycleParamModal(false);
      Alert.alert('Saved', 'Cycle parameters updated successfully.');
    } catch (err) {
      setShowCycleParamModal(false);
    }
  };

  // Save biometrics to storage
  const handleSaveBiometrics = async () => {
    try {
      const currentStored = (await getHealthProfileSafe()) || {};
      const updated = {
        ...currentStored,
        biometrics: tempBiometrics,
      };
      await saveHealthProfileSafe(updated);
      setBiometrics(tempBiometrics);
      setShowBiometricsModal(false);
      Alert.alert('Vitals Updated', 'Clinical biometrics updated in your encrypted vault.');
    } catch (err) {
      setShowBiometricsModal(false);
    }
  };

  // Save clinical history to storage
  const handleSaveClinicalHistory = async () => {
    try {
      const currentStored = (await getHealthProfileSafe()) || {};
      const updated = {
        ...currentStored,
        clinicalHistory: tempClinicalHistory,
      };
      await saveHealthProfileSafe(updated);
      setClinicalHistory(tempClinicalHistory);
      setShowAllergiesModal(false);
      Alert.alert('Records Saved', 'Medical alerts and emergency contacts updated.');
    } catch (err) {
      setShowAllergiesModal(false);
    }
  };

  // Handle Export Data
  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      Alert.alert(
        'Export Generated',
        'Your comprehensive encrypted health summary (PDF) has been prepared. You can securely share it with your healthcare provider.'
      );
    }, 1200);
  };

  // Handle Share Health Pass
  const handleShareHealthPass = async () => {
    try {
      await Share.share({
        title: `${displayName}'s Emergency Health Pass`,
        message: `RedApple Emergency Medical Pass\nPatient: ${displayName}\nBlood Group: ${biometrics.bloodGroup} (Genotype: ${biometrics.genotype})\nAllergies: ${clinicalHistory.allergies}\nICE Contact: ${clinicalHistory.emergencyContact}\nEncrypted Patient ID: #RA-849204`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((res) => setTimeout(res, 600));
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* SNAPCHAT-STYLE TOP HEADER BAR */}
      <View style={styles.topNavBar}>
        {/* Back / Close button */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.navRoundBtn}
          onPress={onClose}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>

        {/* Center Title */}
        <View style={styles.navCenterBadge}>
          <Text style={styles.navCenterTitle}>My Health Profile</Text>
        </View>

        {/* Right Action Icons (QR Health Pass & Settings Gear) */}
        <View style={styles.navRightActions}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.navShareBtn}
            onPress={() => setShowQrModal(true)}
          >
            <Ionicons name="qr-code-outline" size={19} color="#111827" />
            <Text style={styles.navShareBtnText}>Pass</Text>
          </TouchableOpacity>

          {/* Open Dedicated Settings Screen */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.navRoundBtn}
            onPress={() => onOpenSettings && onOpenSettings()}
          >
            <Ionicons name="settings-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, '#FA4A14']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {/* SNAPCHAT-INSPIRED HERO BANNER & AVATAR SECTION */}
        <View style={styles.heroSection}>
          {/* Subtle light background banner backdrop */}
          <View style={styles.heroBannerBackdrop}>
            <View style={styles.heroBackdropPatternCircle} />
            <View style={styles.heroBackdropPatternCircleSmall} />
          </View>

          {/* Centered Avatar with Camera Edit Badge */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircleLarge}>
              <Text style={styles.avatarLetter}>{displayName.charAt(0)}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.avatarCameraBadge}
              onPress={() => Alert.alert('Update Photo', 'Take a new photo or select from gallery.')}
            >
              <Ionicons name="camera" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* User Name & Verified Badge */}
          <View style={styles.userNameRow}>
            <Text style={styles.heroDisplayName}>{displayName}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={17} color="#059669" />
            </View>
          </View>

          {/* Handle & Patient ID */}
          <Text style={styles.heroHandleText}>
            {displayHandle} • Patient ID #RA-8492
          </Text>

          {/* DUAL-PILL SEGMENTED SWITCH: [ Health Vitals ] | [ Medical Records ] */}
          <View style={styles.segmentedTrack}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.segmentPill,
                activeTab === 'vitals' && styles.segmentPillActive,
              ]}
              onPress={() => setActiveTab('vitals')}
            >
              <Ionicons
                name={activeTab === 'vitals' ? 'pulse' : 'pulse-outline'}
                size={16}
                color={activeTab === 'vitals' ? colors.primary : '#6B7280'}
              />
              <Text
                style={[
                  styles.segmentPillText,
                  activeTab === 'vitals' && styles.segmentPillTextActive,
                ]}
              >
                Health Vitals
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.segmentPill,
                activeTab === 'records' && styles.segmentPillActive,
              ]}
              onPress={() => setActiveTab('records')}
            >
              <Ionicons
                name={activeTab === 'records' ? 'document-text' : 'document-text-outline'}
                size={16}
                color={activeTab === 'records' ? colors.primary : '#6B7280'}
              />
              <Text
                style={[
                  styles.segmentPillText,
                  activeTab === 'records' && styles.segmentPillTextActive,
                ]}
              >
                Medical Records
              </Text>
            </TouchableOpacity>
          </View>

          {/* HORIZONTAL BADGE CHIPS ROW (Snapchat Style) */}
          <View style={styles.badgeChipsRow}>
            <View style={styles.badgeChip}>
              <Text style={styles.badgeChipEmoji}>🩸</Text>
              <Text style={styles.badgeChipText}>
                Day {displayCurrentDay} • {currentPhase}
              </Text>
            </View>

            <View style={styles.badgeChip}>
              <Text style={styles.badgeChipEmoji}>🧬</Text>
              <Text style={styles.badgeChipText}>
                {biometrics.bloodGroup} • {biometrics.genotype}
              </Text>
            </View>

            <View style={styles.badgeChip}>
              <Text style={styles.badgeChipEmoji}>📊</Text>
              <Text style={styles.badgeChipText}>{cycleLength}d Regular</Text>
            </View>

            <View style={styles.badgeChip}>
              <Text style={styles.badgeChipEmoji}>🛡️</Text>
              <Text style={styles.badgeChipText}>HIPAA Vault</Text>
            </View>
          </View>
        </View>

        {/* REDAPPLE CARE+ MEMBERSHIP HIGHLIGHT CARD (Snapchat+ Gold Inspired) */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.carePlusCard}
          onPress={() =>
            Alert.alert(
              'RedApple Care+',
              'Your subscription is active. You have 24/7 priority OB-GYN consultations, unlimited cycle prediction updates, and full encrypted health record vaults.'
            )
          }
        >
          <View style={styles.carePlusTopRow}>
            <View style={styles.carePlusBadgeGroup}>
              <View style={styles.carePlusIconCircle}>
                <Ionicons name="sparkles" size={17} color="#D97706" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.carePlusTitle}>RedApple Care+</Text>
                  <View style={styles.carePlusTag}>
                    <Text style={styles.carePlusTagText}>ACTIVE</Text>
                  </View>
                </View>
                <Text style={styles.carePlusSub}>
                  Priority 24/7 OB-GYN access & encrypted record vault
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D97706" />
          </View>
        </TouchableOpacity>

        {/* ========================================================================= */}
        {/* TAB 1: HEALTH VITALS & DAILY RHYTHM                                       */}
        {/* ========================================================================= */}
        {activeTab === 'vitals' && (
          <View style={styles.tabContentContainer}>
            {/* Wearable Sensors Banner (Snapchat "Find Friends" Banner style) */}
            {!hideWearablesBanner && (
              <View style={styles.promptCard}>
                <View style={styles.promptIconBox}>
                  <Ionicons name="watch-outline" size={22} color="#008080" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.promptTitle}>Sync Health Wearables</Text>
                  <Text style={styles.promptSub}>
                    Connect Apple Health or Google Fit for automatic resting heart rate & temperature.
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.promptActionBtn}
                  onPress={() => Alert.alert('Sensors Connected', 'Apple Health & Google Fit sync enabled.')}
                >
                  <Text style={styles.promptActionBtnText}>Sync</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{ padding: 4, marginLeft: 6 }}
                  onPress={() => setHideWearablesBanner(true)}
                >
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            )}

            {/* SECTION: REPRODUCTIVE & CYCLE HEALTH VITALS */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>REPRODUCTIVE HEALTH VITALS</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowCycleParamModal(true)}
              >
                <Text style={styles.sectionActionText}>Adjust</Text>
              </TouchableOpacity>
            </View>

            {/* Bento Grid: 4 Core Vitals */}
            <View style={styles.vitalsGrid}>
              {/* Card 1: Cycle Length */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.vitalCard}
                onPress={() => setShowCycleParamModal(true)}
              >
                <View style={[styles.vitalIconSquare, { backgroundColor: '#FFE5E9' }]}>
                  <Ionicons name="sync" size={20} color={colors.primary} />
                </View>
                <Text style={styles.vitalMetricValue}>{cycleLength} Days</Text>
                <Text style={styles.vitalMetricLabel}>Cycle Length</Text>
                <Text style={styles.vitalMetricSub}>Regular (21–35d)</Text>
              </TouchableOpacity>

              {/* Card 2: Period Duration */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.vitalCard}
                onPress={() => setShowCycleParamModal(true)}
              >
                <View style={[styles.vitalIconSquare, { backgroundColor: '#FFF0F5' }]}>
                  <Ionicons name="water" size={20} color={colors.primary} />
                </View>
                <Text style={styles.vitalMetricValue}>{periodLength} Days</Text>
                <Text style={styles.vitalMetricLabel}>Bleeding Flow</Text>
                <Text style={styles.vitalMetricSub}>Normal Duration</Text>
              </TouchableOpacity>

              {/* Card 3: Next Expected Period */}
              <View style={styles.vitalCard}>
                <View style={[styles.vitalIconSquare, { backgroundColor: '#E0F2F1' }]}>
                  <Ionicons name="calendar" size={20} color="#008080" />
                </View>
                <Text style={styles.vitalMetricValue}>{nextPeriodDateStr}</Text>
                <Text style={styles.vitalMetricLabel}>Next Period</Text>
                <Text style={styles.vitalMetricSub}>In {daysUntilNextPeriod} days</Text>
              </View>

              {/* Card 4: Fertile Window */}
              <View style={styles.vitalCard}>
                <View style={[styles.vitalIconSquare, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="leaf" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.vitalMetricValue}>{fertileWindowStr}</Text>
                <Text style={styles.vitalMetricLabel}>Fertile Window</Text>
                <Text style={styles.vitalMetricSub}>High Fertility</Text>
              </View>
            </View>

            {/* SECTION: CLINICAL BIOMETRICS & PHYSICAL HEALTH */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>CLINICAL BIOMETRICS</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setTempBiometrics(biometrics);
                  setShowBiometricsModal(true);
                }}
              >
                <Text style={styles.sectionActionText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardGroup}>
              {/* Row 1: Blood Group & Genotype */}
              <View style={[styles.cardItemRow, styles.rowBorder]}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#FFE5E9' }]}>
                    <Ionicons name="heart" size={17} color={colors.primary} />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Blood Group & Genotype</Text>
                    <Text style={styles.cardItemDetail}>
                      Group {biometrics.bloodGroup} Positive • Genotype {biometrics.genotype}
                    </Text>
                  </View>
                </View>
                <View style={styles.metricPillGray}>
                  <Text style={styles.metricPillGrayText}>{biometrics.bloodGroup}</Text>
                </View>
              </View>

              {/* Row 2: Height & Weight */}
              <View style={[styles.cardItemRow, styles.rowBorder]}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#E0F2F1' }]}>
                    <Ionicons name="body" size={17} color="#008080" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Height & Weight</Text>
                    <Text style={styles.cardItemDetail}>
                      {biometrics.heightCm} cm • {biometrics.weightKg} kg
                    </Text>
                  </View>
                </View>
                <View style={styles.metricPillGray}>
                  <Text style={styles.metricPillGrayText}>{biometrics.weightKg} kg</Text>
                </View>
              </View>

              {/* Row 3: Body Mass Index (BMI) */}
              <View style={[styles.cardItemRow, styles.rowBorder]}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="speedometer" size={17} color="#D97706" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Body Mass Index (BMI)</Text>
                    <Text style={styles.cardItemDetail}>
                      {bmiValue} kg/m² • {bmiCategory}
                    </Text>
                  </View>
                </View>
                <View style={styles.metricPillGreen}>
                  <Text style={styles.metricPillGreenText}>Normal</Text>
                </View>
              </View>

              {/* Row 4: Blood Pressure */}
              <View style={styles.cardItemRow}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#EDE7F6' }]}>
                    <Ionicons name="fitness" size={17} color="#7C3AED" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Blood Pressure Baseline</Text>
                    <Text style={styles.cardItemDetail}>{biometrics.bloodPressure} mmHg (Optimal)</Text>
                  </View>
                </View>
                <View style={styles.metricPillGreen}>
                  <Text style={styles.metricPillGreenText}>Optimal</Text>
                </View>
              </View>
            </View>

            {/* SECTION: HEALTH COUNTDOWNS (Snapchat Countdowns Style) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>HEALTH COUNTDOWNS</Text>
            </View>

            <View style={styles.countdownContainer}>
              <View style={styles.countdownItem}>
                <View style={[styles.countdownIcon, { backgroundColor: '#FFE5E9' }]}>
                  <Ionicons name="water" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.countdownTitle}>Next Period Countdown</Text>
                  <Text style={styles.countdownSub}>Predicted start {nextPeriodDateStr}</Text>
                </View>
                <View style={styles.countdownPillRed}>
                  <Text style={styles.countdownPillRedText}>{daysUntilNextPeriod} days</Text>
                </View>
              </View>

              <View style={styles.countdownItem}>
                <View style={[styles.countdownIcon, { backgroundColor: '#E0F2F1' }]}>
                  <Ionicons name="leaf" size={18} color="#008080" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.countdownTitle}>Fertile Window Tracker</Text>
                  <Text style={styles.countdownSub}>{fertileWindowStr}</Text>
                </View>
                <View style={styles.countdownPillGreen}>
                  <Text style={styles.countdownPillGreenText}>Track</Text>
                </View>
              </View>

              <View style={styles.countdownItem}>
                <View style={[styles.countdownIcon, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="medical" size={18} color="#7C3AED" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.countdownTitle}>OB-GYN Annual Wellness</Text>
                  <Text style={styles.countdownSub}>Routine gynecological check</Text>
                </View>
                <View style={styles.countdownPillPurple}>
                  <Text style={styles.countdownPillPurpleText}>42 days</Text>
                </View>
              </View>
            </View>

            {/* SECTION: RECENT HEALTH ACTIVITY (Snapchat "Post to..." Style) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>RECENT HEALTH ACTIVITY</Text>
              {onLogSymptoms && (
                <TouchableOpacity activeOpacity={0.7} onPress={onLogSymptoms}>
                  <Text style={styles.sectionActionText}>+ Log Symptoms</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.cardGroup}>
              <View style={[styles.cardItemRow, styles.rowBorder]}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#E0F2F1' }]}>
                    <Ionicons name="happy" size={18} color="#008080" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Daily Feeling & Symptoms</Text>
                    <Text style={styles.cardItemDetail}>Normal flow • Calm mood • Hydrated</Text>
                  </View>
                </View>
                <Text style={styles.cardTimestamp}>Today</Text>
              </View>

              <View style={styles.cardItemRow}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#EDE7F6' }]}>
                    <Ionicons name="sparkles" size={18} color="#7C3AED" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Cycle Phase Transition</Text>
                    <Text style={styles.cardItemDetail}>Entered {currentPhase} Phase • Day {displayCurrentDay}</Text>
                  </View>
                </View>
                <Text style={styles.cardTimestamp}>Active</Text>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MEDICAL RECORDS & CLINICAL CARE                                    */}
        {/* ========================================================================= */}
        {activeTab === 'records' && (
          <View style={styles.tabContentContainer}>
            {/* ASSIGNED SPECIALIST & CARE CIRCLE (Snapchat Communities Style) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>ASSIGNED TELEMEDICINE SPECIALIST</Text>
              {onBookDoctor && (
                <TouchableOpacity activeOpacity={0.7} onPress={onBookDoctor}>
                  <Text style={styles.sectionActionText}>Consult</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.specialistCard}>
              <View style={styles.specialistTopRow}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                  }}
                  style={styles.specialistAvatar}
                />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.specialistName}>Dr. Mesal Okubor</Text>
                    <Ionicons name="checkmark-circle" size={15} color="#059669" />
                  </View>
                  <Text style={styles.specialistCreds}>MBBS, FWACS, FMCOG</Text>
                  <Text style={styles.specialistRole}>
                    Obstetrician & Gynecologist • Lead Consultant
                  </Text>
                </View>
              </View>

              {/* Consultation Note Summary */}
              <View style={styles.specialistNoteBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#008080" />
                <Text style={styles.specialistNoteText}>
                  "Reproductive vitals stable. Normal follicular transition. Continue daily prenatal vitamins."
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.specialistActionBtn}
                onPress={() => {
                  if (onBookDoctor) {
                    onBookDoctor();
                  } else {
                    Alert.alert('Consultation', 'Redirecting to Dr. Mesal Okubor appointment schedule.');
                  }
                }}
              >
                <Ionicons name="videocam" size={16} color="#FFFFFF" />
                <Text style={styles.specialistActionBtnText}>Book Video Consultation</Text>
              </TouchableOpacity>
            </View>

            {/* ACTIVE PRESCRIPTIONS & SUPPLEMENTS */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>ACTIVE PRESCRIPTIONS & SUPPLEMENTS</Text>
            </View>

            <View style={styles.cardGroup}>
              <View style={[styles.cardItemRow, styles.rowBorder]}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#FFE5E9' }]}>
                    <Ionicons name="medical" size={17} color={colors.primary} />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Folic Acid 400 mcg</Text>
                    <Text style={styles.cardItemDetail}>1 tablet daily (Morning) • Reproductive Support</Text>
                  </View>
                </View>
                <View style={styles.metricPillGreen}>
                  <Text style={styles.metricPillGreenText}>Active</Text>
                </View>
              </View>

              <View style={[styles.cardItemRow, styles.rowBorder]}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#E0F2F1' }]}>
                    <Ionicons name="nutrition" size={17} color="#008080" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Prenatal Multi-Nutrient</Text>
                    <Text style={styles.cardItemDetail}>1 capsule daily with food • Vitality & Iron</Text>
                  </View>
                </View>
                <View style={styles.metricPillGreen}>
                  <Text style={styles.metricPillGreenText}>Active</Text>
                </View>
              </View>

              <View style={styles.cardItemRow}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#EDE7F6' }]}>
                    <Ionicons name="water" size={17} color="#7C3AED" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Omega-3 DHA 200 mg</Text>
                    <Text style={styles.cardItemDetail}>1 softgel daily • Hormonal Balance</Text>
                  </View>
                </View>
                <View style={styles.metricPillGreen}>
                  <Text style={styles.metricPillGreenText}>Active</Text>
                </View>
              </View>
            </View>

            {/* MEDICAL HISTORY, ALLERGIES & ICE */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>ALLERGIES & CLINICAL ALERTS</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setTempClinicalHistory(clinicalHistory);
                  setShowAllergiesModal(true);
                }}
              >
                <Text style={styles.sectionActionText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardGroup}>
              {/* Allergies */}
              <View style={[styles.cardItemRow, styles.rowBorder]}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="alert-circle" size={17} color="#DC2626" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.cardItemHeading}>Known Allergies</Text>
                    <Text style={styles.cardItemDetail}>{clinicalHistory.allergies}</Text>
                  </View>
                </View>
              </View>

              {/* Monitored Conditions */}
              <View style={[styles.cardItemRow, styles.rowBorder]}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="shield-checkmark" size={17} color="#16A34A" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.cardItemHeading}>Monitored Conditions</Text>
                    <Text style={styles.cardItemDetail}>{clinicalHistory.conditions}</Text>
                  </View>
                </View>
              </View>

              {/* Emergency Contact */}
              <View style={styles.cardItemRow}>
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="call" size={17} color="#2563EB" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.cardItemHeading}>Emergency (ICE) Contact</Text>
                    <Text style={styles.cardItemDetail}>{clinicalHistory.emergencyContact}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* DOCUMENT VAULT & CLINICAL EXPORT */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>DOCUMENT VAULT & EXPORT</Text>
            </View>

            <View style={styles.cardGroup}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.cardItemRow, styles.rowBorder]}
                onPress={handleExportData}
                disabled={isExporting}
              >
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#FFE5E9' }]}>
                    <Ionicons name="document-text" size={17} color={colors.primary} />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Comprehensive Health Summary (PDF)</Text>
                    <Text style={styles.cardItemDetail}>Encrypted medical summary for doctors</Text>
                  </View>
                </View>
                <Ionicons name="download-outline" size={18} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.cardItemRow}
                onPress={() => Alert.alert('Diagnostic Report', 'Pelvic Ultrasound (Verified): Normal ovaries and uterine baseline.')}
              >
                <View style={styles.cardItemLeft}>
                  <View style={[styles.circleIconSmall, { backgroundColor: '#E0F2F1' }]}>
                    <Ionicons name="images" size={17} color="#008080" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardItemHeading}>Pelvic Ultrasound Report</Text>
                    <Text style={styles.cardItemDetail}>Normal Scan • Verified by Dr. Mesal</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* QUICK LINK CARD TO SETTINGS */}
        <View style={{ paddingHorizontal: 18, marginTop: 14 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.settingsRedirectCard}
            onPress={() => onOpenSettings && onOpenSettings()}
          >
            <View style={styles.settingsRedirectLeft}>
              <View style={styles.settingsRedirectIcon}>
                <Ionicons name="settings" size={20} color="#4B5563" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.settingsRedirectTitle}>Settings & Preferences</Text>
                <Text style={styles.settingsRedirectSub}>
                  Manage tracking mode, alerts, passcode lock & privacy
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* BRAND SEAL & PRIVACY GUARANTEE */}
        <View style={styles.brandSealContainer}>
          <View style={styles.brandLogoBox}>
            <Ionicons name="flower" size={22} color={colors.primary} />
          </View>
          <Text style={styles.brandSealName}>RedApple Health Profile</Text>
          <Text style={styles.brandSealVersion}>
            Encrypted Patient Vault • {memberSince}
          </Text>
          <Text style={styles.brandSealGuarantee}>
            Zero-Knowledge Protected • HIPAA & NDPR Compliant
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: CYCLE PARAMETERS EDIT                                            */}
      {/* ========================================================================= */}
      <Modal
        visible={showCycleParamModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCycleParamModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowCycleParamModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Adjust Cycle Parameters</Text>
            <Text style={styles.modalSubtitle}>
              Customize your cycle length and period flow duration for pinpoint predictions.
            </Text>

            {/* Cycle Length */}
            <View style={styles.modalInputRow}>
              <Text style={styles.modalInputLabel}>Average Cycle Length</Text>
              <View style={styles.counterBox}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.counterBtn}
                  onPress={() => setCycleLength(Math.max(cycleLength - 1, 21))}
                >
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterValText}>{cycleLength} days</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.counterBtn}
                  onPress={() => setCycleLength(Math.min(cycleLength + 1, 45))}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Period Length */}
            <View style={styles.modalInputRow}>
              <Text style={styles.modalInputLabel}>Period Duration</Text>
              <View style={styles.counterBox}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.counterBtn}
                  onPress={() => setPeriodLength(Math.max(periodLength - 1, 2))}
                >
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterValText}>{periodLength} days</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.counterBtn}
                  onPress={() => setPeriodLength(Math.min(periodLength + 1, 10))}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.modalPrimaryBtn}
              onPress={handleSaveCycleParams}
            >
              <Text style={styles.modalPrimaryBtnText}>Save Parameters</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CLINICAL BIOMETRICS EDIT                                         */}
      {/* ========================================================================= */}
      <Modal
        visible={showBiometricsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBiometricsModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowBiometricsModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Clinical Biometrics</Text>
            <Text style={styles.modalSubtitle}>
              Update your physical vitals to keep clinical calculations accurate.
            </Text>

            {/* Height & Weight Inputs */}
            <View style={styles.formRowTwoCol}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.formFieldLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.formTextInput}
                  value={String(tempBiometrics.heightCm)}
                  onChangeText={(val) =>
                    setTempBiometrics({ ...tempBiometrics, heightCm: Number(val) || 168 })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.formFieldLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.formTextInput}
                  value={String(tempBiometrics.weightKg)}
                  onChangeText={(val) =>
                    setTempBiometrics({ ...tempBiometrics, weightKg: Number(val) || 62 })
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Blood Group Options */}
            <Text style={[styles.formFieldLabel, { marginTop: 12 }]}>Blood Group</Text>
            <View style={styles.chipPickerRow}>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[
                    styles.chipPickerItem,
                    tempBiometrics.bloodGroup === bg && styles.chipPickerItemActive,
                  ]}
                  onPress={() => setTempBiometrics({ ...tempBiometrics, bloodGroup: bg })}
                >
                  <Text
                    style={[
                      styles.chipPickerText,
                      tempBiometrics.bloodGroup === bg && styles.chipPickerTextActive,
                    ]}
                  >
                    {bg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Genotype Options */}
            <Text style={[styles.formFieldLabel, { marginTop: 12 }]}>Genotype</Text>
            <View style={styles.chipPickerRow}>
              {['AA', 'AS', 'SS', 'AC'].map((gt) => (
                <TouchableOpacity
                  key={gt}
                  style={[
                    styles.chipPickerItem,
                    tempBiometrics.genotype === gt && styles.chipPickerItemActive,
                  ]}
                  onPress={() => setTempBiometrics({ ...tempBiometrics, genotype: gt })}
                >
                  <Text
                    style={[
                      styles.chipPickerText,
                      tempBiometrics.genotype === gt && styles.chipPickerTextActive,
                    ]}
                  >
                    {gt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.modalPrimaryBtn, { marginTop: 20 }]}
              onPress={handleSaveBiometrics}
            >
              <Text style={styles.modalPrimaryBtnText}>Update Biometrics</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ALLERGIES & ICE EDIT                                             */}
      {/* ========================================================================= */}
      <Modal
        visible={showAllergiesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAllergiesModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowAllergiesModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Allergies & Clinical Alerts</Text>
            <Text style={styles.modalSubtitle}>
              Keep your emergency clinical contacts and medical sensitivities up to date.
            </Text>

            <Text style={styles.formFieldLabel}>Known Allergies & Sensitivities</Text>
            <TextInput
              style={[styles.formTextInput, { height: 64, textAlignVertical: 'top' }]}
              multiline={true}
              value={tempClinicalHistory.allergies}
              onChangeText={(text) =>
                setTempClinicalHistory({ ...tempClinicalHistory, allergies: text })
              }
            />

            <Text style={[styles.formFieldLabel, { marginTop: 12 }]}>
              Monitored Conditions & History
            </Text>
            <TextInput
              style={[styles.formTextInput, { height: 64, textAlignVertical: 'top' }]}
              multiline={true}
              value={tempClinicalHistory.conditions}
              onChangeText={(text) =>
                setTempClinicalHistory({ ...tempClinicalHistory, conditions: text })
              }
            />

            <Text style={[styles.formFieldLabel, { marginTop: 12 }]}>
              Emergency (ICE) Contact Name & Phone
            </Text>
            <TextInput
              style={styles.formTextInput}
              value={tempClinicalHistory.emergencyContact}
              onChangeText={(text) =>
                setTempClinicalHistory({ ...tempClinicalHistory, emergencyContact: text })
              }
            />

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.modalPrimaryBtn, { marginTop: 20 }]}
              onPress={handleSaveClinicalHistory}
            >
              <Text style={styles.modalPrimaryBtnText}>Save Medical Alerts</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: EMERGENCY QR HEALTH PASS CARD                                    */}
      {/* ========================================================================= */}
      <Modal
        visible={showQrModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQrModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowQrModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.qrModalCard}>
            {/* Header */}
            <View style={styles.qrHeaderRow}>
              <View style={styles.qrShieldBadge}>
                <Ionicons name="shield-checkmark" size={18} color="#059669" />
                <Text style={styles.qrShieldBadgeText}>Verified Health Pass</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQrModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Patient Header */}
            <Text style={styles.qrPatientName}>{displayName}</Text>
            <Text style={styles.qrPatientMeta}>ID: #RA-849204 • Blood Type {biometrics.bloodGroup}</Text>

            {/* QR Visual Card Box */}
            <View style={styles.qrBoxVisual}>
              <Ionicons name="qr-code" size={140} color="#111827" />
              <Text style={styles.qrScanInstruction}>
                Scan in clinical emergency for encrypted medical pass
              </Text>
            </View>

            {/* Vital Highlights on QR */}
            <View style={styles.qrVitalsSummaryBox}>
              <View style={styles.qrVitalMini}>
                <Text style={styles.qrVitalMiniLabel}>BLOOD GROUP</Text>
                <Text style={styles.qrVitalMiniVal}>{biometrics.bloodGroup} Positive</Text>
              </View>
              <View style={styles.qrVitalMini}>
                <Text style={styles.qrVitalMiniLabel}>GENOTYPE</Text>
                <Text style={styles.qrVitalMiniVal}>{biometrics.genotype}</Text>
              </View>
              <View style={styles.qrVitalMini}>
                <Text style={styles.qrVitalMiniLabel}>ALLERGIES</Text>
                <Text style={styles.qrVitalMiniVal} numberOfLines={1}>
                  {clinicalHistory.allergies.split(' • ')[0]}
                </Text>
              </View>
            </View>

            {/* Share / Export Pass */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.modalPrimaryBtn}
              onPress={handleShareHealthPass}
            >
              <Ionicons name="share-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalPrimaryBtnText}>Share Emergency Health Pass</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* TOP NAVIGATION BAR */
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  navRoundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenterBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenterTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 5,
  },
  navShareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },

  scrollContent: {
    paddingBottom: 50,
  },

  /* HERO BANNER & AVATAR (SNAPCHAT STYLE) */
  heroSection: {
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  heroBannerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#FFF0F5',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroBackdropPatternCircle: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 229, 233, 0.6)',
  },
  heroBackdropPatternCircleSmall: {
    position: 'absolute',
    top: 10,
    right: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 205, 210, 0.4)',
  },
  avatarContainer: {
    marginTop: 40,
    position: 'relative',
    alignSelf: 'center',
  },
  avatarCircleLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFE5E9',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarLetter: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  heroDisplayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  heroHandleText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },

  /* DUAL-PILL SEGMENTED SWITCH */
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 16,
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
  },
  segmentPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentPillTextActive: {
    fontWeight: '800',
    color: '#111827',
  },

  /* BADGE CHIPS ROW */
  badgeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    paddingVertical: 5,
    paddingHorizontal: 11,
    gap: 5,
  },
  badgeChipEmoji: {
    fontSize: 12,
  },
  badgeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  /* SNAPCHAT+ STYLE LUXURY MEMBERSHIP CARD */
  carePlusCard: {
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  carePlusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carePlusBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  carePlusIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carePlusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  carePlusTag: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 10,
  },
  carePlusTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D97706',
  },
  carePlusSub: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 2,
  },

  /* TAB CONTENT CONTAINER */
  tabContentContainer: {
    paddingHorizontal: 18,
  },

  /* PROMPT / SENSOR CARD (SNAPCHAT "FIND FRIENDS" STYLE) */
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
  },
  promptIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  promptSub: {
    fontSize: 11,
    color: '#115E59',
    marginTop: 1,
  },
  promptActionBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  promptActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* SECTION HEADERS */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.5,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  /* BENTO GRID VITALS */
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  vitalCard: {
    width: (SCREEN_WIDTH - 36 - 12) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  vitalIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  vitalMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  vitalMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 2,
  },
  vitalMetricSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  /* CARD GROUP */
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  cardItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  circleIconSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardItemHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cardItemDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardTimestamp: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  metricPillGray: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  metricPillGrayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  metricPillGreen: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  metricPillGreenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  /* COUNTDOWNS (SNAPCHAT STYLE) */
  countdownContainer: {
    gap: 10,
    marginBottom: 16,
  },
  countdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  countdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  countdownSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  countdownPillRed: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  countdownPillRedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  countdownPillGreen: {
    backgroundColor: '#CCFBF1',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  countdownPillGreenText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },
  countdownPillPurple: {
    backgroundColor: '#F3E8FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  countdownPillPurpleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7E22CE',
  },

  /* ASSIGNED SPECIALIST CARD (TAB 2) */
  specialistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  specialistTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specialistAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0F2F1',
  },
  specialistName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  specialistCreds: {
    fontSize: 12,
    fontWeight: '600',
    color: '#008080',
    marginTop: 1,
  },
  specialistRole: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  specialistNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  specialistNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#134E4A',
    lineHeight: 17,
  },
  specialistActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008080',
    borderRadius: 18,
    paddingVertical: 11,
    marginTop: 14,
    gap: 8,
  },
  specialistActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* SETTINGS REDIRECT CARD */
  settingsRedirectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    padding: 16,
  },
  settingsRedirectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsRedirectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRedirectTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  settingsRedirectSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  /* BRAND SEAL */
  brandSealContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  brandLogoBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandSealName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  brandSealVersion: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  brandSealGuarantee: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4,
  },

  /* MODAL OVERLAYS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 4,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  counterValText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 12,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingVertical: 14,
    marginTop: 18,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* FORM INPUTS IN MODALS */
  formRowTwoCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  formTextInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  chipPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipPickerItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipPickerItemActive: {
    backgroundColor: colors.primary,
  },
  chipPickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  chipPickerTextActive: {
    color: '#FFFFFF',
  },

  /* QR HEALTH PASS MODAL */
  qrModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  qrShieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 6,
  },
  qrShieldBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  qrPatientName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginTop: 4,
  },
  qrPatientMeta: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  qrBoxVisual: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    padding: 20,
    marginVertical: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrScanInstruction: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
  },
  qrVitalsSummaryBox: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    padding: 12,
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  qrVitalMini: {
    alignItems: 'center',
    flex: 1,
  },
  qrVitalMiniLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
  },
  qrVitalMiniVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
});
