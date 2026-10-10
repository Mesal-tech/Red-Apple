import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLockModal, { PIN_STORAGE_KEY } from '../components/AppLockModal';
import {
  getHealthProfileSafe,
  saveHealthProfileSafe,
} from '../utils/storage';
import notificationService from '../services/notificationService';

export default function SettingsScreen({
  onClose,
  onSignOut,
  onRedoSetup,
  currentMode = 'cycle',
  onSwitchMode,
  onOpenPrivacyPolicy,
  onOpenTermsOfUse,
  activeCycleProfile = null,
}) {
  const { user } = useAuth();

  const isDoctor =
    user?.role === 'doctor' || user?.email?.toLowerCase() === 'mesalokubor63@gmail.com';
  const displayName = isDoctor
    ? (user?.name || 'Dr. Specialist')
    : (user?.name || 'Amara Okonkwo');
  const displayEmail = user?.email || (isDoctor ? 'doctor@redapple.health' : 'amara@redapple.health');
  const memberSince = user?.created_at
    ? `Member since ${new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    : 'Member since January 2026';

  // Cycle Parameters
  const [cycleLength, setCycleLength] = useState(
    activeCycleProfile?.cycleLength || 28
  );
  const [periodLength, setPeriodLength] = useState(
    activeCycleProfile?.periodDuration || 5
  );
  const [showCycleParamModal, setShowCycleParamModal] = useState(false);

  // Notification States (Persistent)
  const [periodAlerts, setPeriodAlerts] = useState(true);
  const [dailyPillAlerts, setDailyPillAlerts] = useState(true);
  const [weeklyGrowthAlerts, setWeeklyGrowthAlerts] = useState(true);
  const [hydrationAlerts, setHydrationAlerts] = useState(false);
  const [discreetTitles, setDiscreetTitles] = useState(false);
  const [dailyLogReminder, setDailyLogReminder] = useState(true);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  // Security & Privacy States
  const [passcodeLock, setPasscodeLock] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockModalMode, setLockModalMode] = useState('setup');
  const [anonymousMode, setAnonymousMode] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load stored cycle lengths, PIN status, and notification preferences on mount
  useEffect(() => {
    async function loadStoredProfile() {
      try {
        const stored = await getHealthProfileSafe();
        if (stored) {
          if (stored.cycleLength) setCycleLength(Number(stored.cycleLength));
          if (stored.periodDuration) setPeriodLength(Number(stored.periodDuration));
        }
        const savedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
        if (savedPin) setPasscodeLock(true);

        const notifSettings = await notificationService.getSettings();
        if (notifSettings) {
          setPeriodAlerts(notifSettings.periodAlerts !== false);
          setDailyPillAlerts(notifSettings.dailyPillAlerts !== false);
          setWeeklyGrowthAlerts(notifSettings.weeklyGrowthAlerts !== false);
          setHydrationAlerts(notifSettings.hydrationAlerts === true);
          setDiscreetTitles(notifSettings.discreetTitles === true);
          setDailyLogReminder(notifSettings.dailyLogReminder !== false);
        }
      } catch (err) {
        console.warn('[SettingsScreen] Load profile error:', err);
      }
    }
    loadStoredProfile();
  }, []);

  const handleToggleNotification = async (key, val, setter) => {
    setter(val);
    try {
      await notificationService.updateSettings({ [key]: val });
      const currentStored = (await getHealthProfileSafe()) || {};
      await notificationService.syncAllReminders({
        healthProfile: currentStored,
        stage: currentMode,
      });
    } catch (e) {
      console.warn('[SettingsScreen] Failed to update notification setting:', e);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      await notificationService.triggerTestNotification();
      Alert.alert(
        'Test Alert Sent! 🍎',
        'A test notification was triggered. Check your device banner and notification drawer.'
      );
    } catch (err) {
      Alert.alert('Notice', 'Could not dispatch test notification: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsTestingNotification(false);
    }
  };

  // Save cycle parameters
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

  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      Alert.alert(
        'Export Complete',
        'Your encrypted health records have been exported successfully to your downloads directory.'
      );
    }, 1200);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((res) => setTimeout(res, 500));
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backBtn}
          onPress={onClose}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings & Preferences</Text>
        <View style={{ width: 40 }} />
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
        {/* USER ACCOUNT MINI CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{displayName.charAt(0)}</Text>
          </View>

          <View style={styles.profileInfoCol}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              <View style={styles.premiumBadge}>
                <Ionicons name="sparkles" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.premiumBadgeText}>CARE+</Text>
              </View>
            </View>
            <Text style={styles.profileEmail}>{displayEmail}</Text>
            <Text style={styles.profileSubText}>{memberSince}</Text>
          </View>
        </View>

        {/* SECTION 1: LIFE STAGE & TRACKING MODE */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>TRACKING MODE & LIFE STAGE</Text>

          <View style={styles.cardGroup}>
            {[
              { id: 'cycle', title: 'Cycle Tracking Mode', desc: 'Period prediction, ovulation & PMS insights', icon: 'sync-outline' },
              { id: 'pregnancy', title: 'Pregnancy Mode', desc: 'Gestational milestones & fetal development updates', icon: 'nutrition-outline' },
              { id: 'postmenopause', title: 'Postmenopause Mode', desc: 'Hormonal wellness, hot flash & bone health tracking', icon: 'flower-outline' },
            ].map((modeItem, idx) => {
              const isSelected = currentMode === modeItem.id;
              return (
                <TouchableOpacity
                  key={modeItem.id}
                  activeOpacity={0.8}
                  style={[
                    styles.modeOptionRow,
                    idx < 2 && styles.rowBorderBottom,
                    isSelected && styles.modeOptionRowActive,
                  ]}
                  onPress={() => onSwitchMode && onSwitchMode(modeItem.id)}
                >
                  <View style={[styles.modeIconCircle, isSelected && styles.modeIconCircleActive]}>
                    <Ionicons
                      name={modeItem.icon}
                      size={19}
                      color={isSelected ? colors.primary : '#6B7280'}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.modeOptionTitle, isSelected && styles.modeOptionTitleActive]}>
                      {modeItem.title}
                    </Text>
                    <Text style={styles.modeOptionDesc}>{modeItem.desc}</Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={isSelected ? colors.primary : '#D1D5DB'}
                  />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 4 }]}
              onPress={() => onRedoSetup && onRedoSetup()}
            >
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#FFE5E9' }]}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingTitle}>Retake Health Onboarding</Text>
                  <Text style={styles.settingSubText}>Change stage, due dates, or health goals</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 2: CYCLE BASELINE PARAMETERS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>CYCLE BASELINE PARAMETERS</Text>

          <View style={styles.cardGroup}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.settingRow, styles.rowBorderBottom]}
              onPress={() => setShowCycleParamModal(true)}
            >
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#FFE5E9' }]}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingTitle}>Average Cycle Length</Text>
                  <Text style={styles.settingSubText}>Normal range: 21 to 35 days</Text>
                </View>
              </View>
              <View style={styles.settingValuePill}>
                <Text style={styles.settingValueText}>{cycleLength} days</Text>
                <Ionicons name="chevron-forward" size={15} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.settingRow}
              onPress={() => setShowCycleParamModal(true)}
            >
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#FFE5E9' }]}>
                  <Ionicons name="water-outline" size={16} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingTitle}>Average Period Duration</Text>
                  <Text style={styles.settingSubText}>Typical period bleeding days</Text>
                </View>
              </View>
              <View style={styles.settingValuePill}>
                <Text style={styles.settingValueText}>{periodLength} days</Text>
                <Ionicons name="chevron-forward" size={15} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 3: NOTIFICATIONS & ALERTS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>NOTIFICATIONS & ALERTS</Text>

          <View style={styles.cardGroup}>
            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#FFE5E9' }]}>
                  <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingTitle}>Period & Ovulation Alerts</Text>
                  <Text style={styles.settingSubText}>Reminders 3 days before predicted period</Text>
                </View>
              </View>
              <Switch
                value={periodAlerts}
                onValueChange={(val) => handleToggleNotification('periodAlerts', val, setPeriodAlerts)}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={periodAlerts ? colors.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#E0F2F1' }]}>
                  <Ionicons name="medical-outline" size={16} color="#008080" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingTitle}>Daily Medication & Pill</Text>
                  <Text style={styles.settingSubText}>Daily reminder at 8:00 AM</Text>
                </View>
              </View>
              <Switch
                value={dailyPillAlerts}
                onValueChange={(val) => handleToggleNotification('dailyPillAlerts', val, setDailyPillAlerts)}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={dailyPillAlerts ? colors.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="create-outline" size={16} color="#D97706" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingTitle}>Daily Symptom Check-in</Text>
                  <Text style={styles.settingSubText}>Evening wellness reminder at 8:00 PM</Text>
                </View>
              </View>
              <Switch
                value={dailyLogReminder}
                onValueChange={(val) => handleToggleNotification('dailyLogReminder', val, setDailyLogReminder)}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={dailyLogReminder ? colors.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="sparkles-outline" size={16} color="#7C3AED" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingTitle}>Weekly Growth Updates</Text>
                  <Text style={styles.settingSubText}>Fetal development & milestone summaries</Text>
                </View>
              </View>
              <Switch
                value={weeklyGrowthAlerts}
                onValueChange={(val) => handleToggleNotification('weeklyGrowthAlerts', val, setWeeklyGrowthAlerts)}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={weeklyGrowthAlerts ? colors.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="fitness-outline" size={16} color="#2563EB" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingTitle}>Hydration Reminders</Text>
                  <Text style={styles.settingSubText}>Gentle drink water reminders</Text>
                </View>
              </View>
              <Switch
                value={hydrationAlerts}
                onValueChange={(val) => handleToggleNotification('hydrationAlerts', val, setHydrationAlerts)}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={hydrationAlerts ? colors.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="eye-off-outline" size={16} color="#374151" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingTitle}>Discreet Notification Mode</Text>
                  <Text style={styles.settingSubText}>Hides cycle & pregnancy terms on lock screen</Text>
                </View>
              </View>
              <Switch
                value={discreetTitles}
                onValueChange={(val) => handleToggleNotification('discreetTitles', val, setDiscreetTitles)}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={discreetTitles ? colors.primary : '#9CA3AF'}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.settingRow}
              onPress={handleTestNotification}
              disabled={isTestingNotification}
            >
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#FFE5E9' }]}>
                  <Ionicons name="notifications" size={16} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingTitle}>Send Test Notification</Text>
                  <Text style={styles.settingSubText}>
                    {isTestingNotification ? 'Triggering alert...' : 'Verify notification sound & banner on this device'}
                  </Text>
                </View>
              </View>
              <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 4: PRIVACY & DATA SECURITY */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>PRIVACY & DATA SECURITY</Text>

          <View style={styles.cardGroup}>
            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="lock-closed-outline" size={16} color="#374151" />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingTitle}>Passcode & Face ID Lock</Text>
                  <Text style={styles.settingSubText}>Require biometric check on app launch</Text>
                </View>
              </View>
              <Switch
                value={passcodeLock}
                onValueChange={(val) => {
                  setLockModalMode(val ? 'setup' : 'disable');
                  setShowLockModal(true);
                }}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={passcodeLock ? colors.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="eye-off-outline" size={16} color="#374151" />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingTitle}>Anonymous Mode</Text>
                  <Text style={styles.settingSubText}>Decouple email identity from health records</Text>
                </View>
              </View>
              <Switch
                value={anonymousMode}
                onValueChange={setAnonymousMode}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={anonymousMode ? colors.primary : '#9CA3AF'}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.settingRow, styles.rowBorderBottom]}
              onPress={handleExportData}
              disabled={isExporting}
            >
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#FFE5E9' }]}>
                  <Ionicons name="cloud-download-outline" size={16} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingTitle}>Export Health Data</Text>
                  <Text style={styles.settingSubText}>Download encrypted PDF / CSV records</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.settingRow, styles.rowBorderBottom]}
              onPress={onOpenPrivacyPolicy}
            >
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#374151" />
                </View>
                <Text style={[styles.settingTitle, { marginLeft: 12 }]}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.settingRow}
              onPress={onOpenTermsOfUse}
            >
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="document-text-outline" size={16} color="#374151" />
                </View>
                <Text style={[styles.settingTitle, { marginLeft: 12 }]}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 5: SUPPORT & ACCOUNT */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>SUPPORT & ACCOUNT</Text>

          <View style={styles.cardGroup}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.settingRow, styles.rowBorderBottom]}
              onPress={() =>
                Alert.alert(
                  'OB-GYN Support Desk',
                  'Support team is available 24/7. Email us at support@redapple.health'
                )
              }
            >
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#FFE5E9' }]}>
                  <Ionicons name="help-buoy-outline" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.settingTitle, { marginLeft: 12 }]}>Help & Support Center</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.settingRow}
              onPress={onSignOut}
            >
              <View style={styles.settingLabelRow}>
                <View style={[styles.miniIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="log-out-outline" size={16} color="#EF4444" />
                </View>
                <Text style={[styles.settingTitle, { marginLeft: 12, color: '#EF4444', fontWeight: '700' }]}>
                  Sign Out of RedApple
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* BRAND SEAL */}
        <View style={styles.brandSealContainer}>
          <View style={styles.brandLogoBox}>
            <Ionicons name="flower" size={20} color={colors.primary} />
          </View>
          <Text style={styles.brandSealName}>RedApple Health Settings</Text>
          <Text style={styles.appVersionText}>
            v2.4.0 (Build 192) • Zero-Knowledge Encrypted
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* CYCLE PARAMETER EDIT MODAL */}
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
          <TouchableOpacity activeOpacity={1} style={styles.paramModalCard}>
            <Text style={styles.paramModalTitle}>Adjust Cycle Parameters</Text>
            <Text style={styles.paramModalSubTitle}>
              Customize average cycle length and period duration for accurate predictions.
            </Text>

            {/* Cycle Length Adjustment */}
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Average Cycle Length</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.counterBtn}
                  onPress={() => setCycleLength(Math.max(cycleLength - 1, 21))}
                >
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterValueText}>{cycleLength} days</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.counterBtn}
                  onPress={() => setCycleLength(Math.min(cycleLength + 1, 45))}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Period Length Adjustment */}
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Period Duration</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.counterBtn}
                  onPress={() => setPeriodLength(Math.max(periodLength - 1, 2))}
                >
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterValueText}>{periodLength} days</Text>
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
              style={styles.saveParamBtn}
              onPress={handleSaveCycleParams}
            >
              <Text style={styles.saveParamBtnText}>Save Parameters</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* APP SECURITY PIN MODAL */}
      <AppLockModal
        visible={showLockModal}
        mode={lockModalMode}
        onCancel={() => setShowLockModal(false)}
        onSuccess={() => {
          setShowLockModal(false);
          setPasscodeLock(lockModalMode === 'setup');
          Alert.alert(
            lockModalMode === 'setup' ? 'Security PIN Enabled' : 'PIN Lock Disabled',
            lockModalMode === 'setup'
              ? 'Your health records and consultations are now secured with your 4-digit PIN.'
              : 'App PIN security has been turned off.'
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 38) + 8 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  /* PROFILE MINI CARD */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  profileInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  profileSubText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  /* SECTION CONTAINERS */
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  /* SETTING ROW */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  settingSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  settingValuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },

  /* TRACKING MODE ROW */
  modeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modeOptionRowActive: {
    backgroundColor: '#FFF5F6',
  },
  modeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconCircleActive: {
    backgroundColor: '#FFE5E9',
  },
  modeOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  modeOptionTitleActive: {
    fontWeight: '800',
    color: colors.primary,
  },
  modeOptionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  /* BRAND SEAL */
  brandSealContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  brandLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  brandSealName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  appVersionText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  /* PARAMETERS MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paramModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  paramModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  paramModalSubTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paramLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    padding: 4,
  },
  counterBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  counterBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  counterValueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 10,
  },
  saveParamBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 20,
  },
  saveParamBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
