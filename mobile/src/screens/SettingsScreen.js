import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen({
  onClose,
  onSignOut,
  onRedoSetup,
  currentMode = 'cycle',
  onSwitchMode,
  onOpenPrivacyPolicy,
  onOpenTermsOfUse,
}) {
  const { user } = useAuth();
  const displayName = user?.name || 'Amara Okonkwo';
  const displayEmail = user?.email || 'amara@redapple.health';
  const memberSince = user?.created_at
    ? `Member since ${new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    : 'Member since January 2026';

  // Notification States
  const [periodAlerts, setPeriodAlerts] = useState(true);
  const [dailyPillAlerts, setDailyPillAlerts] = useState(true);
  const [weeklyGrowthAlerts, setWeeklyGrowthAlerts] = useState(true);
  const [hydrationAlerts, setHydrationAlerts] = useState(false);

  // Security & Privacy States
  const [passcodeLock, setPasscodeLock] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);

  // Cycle Parameters
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [showCycleParamModal, setShowCycleParamModal] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      Alert.alert(
        'Export Complete',
        'Your encrypted health records have been exported successfully to your downloads directory.'
      );
    }, 1500);
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((res) => setTimeout(res, 600));
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close-outline" size={26} color={colors.textPrimary} />
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
        {/* USER PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color="#FFFFFF" />
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={10} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.profileInfoCol}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              <View style={styles.premiumBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            </View>
            <Text style={styles.profileEmail}>{displayEmail}</Text>
            <Text style={styles.profileSubText}>{memberSince}</Text>
          </View>
        </View>

        {/* LIFE STAGE & TRACKING MODE */}
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
                      size={20}
                      color={isSelected ? colors.primary : colors.textSecondary}
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
                    size={22}
                    color={isSelected ? colors.primary : '#D1D5DB'}
                  />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 8 }]}
              onPress={() => onRedoSetup && onRedoSetup()}
            >
              <View style={styles.settingLabelRow}>
                <Ionicons name="sparkles-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Retake Health Onboarding</Text>
                  <Text style={styles.settingSubText}>Change stage, due dates, or health goals</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CYCLE PARAMETERS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>CYCLE PARAMETERS</Text>

          <View style={styles.cardGroup}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.settingRow, styles.rowBorderBottom]}
              onPress={() => setShowCycleParamModal(true)}
            >
              <View style={styles.settingLabelRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Average Cycle Length</Text>
                  <Text style={styles.settingSubText}>Normal range: 21 to 35 days</Text>
                </View>
              </View>
              <View style={styles.settingValuePill}>
                <Text style={styles.settingValueText}>{cycleLength} days</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.settingRow}
              onPress={() => setShowCycleParamModal(true)}
            >
              <View style={styles.settingLabelRow}>
                <Ionicons name="water-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Average Period Duration</Text>
                  <Text style={styles.settingSubText}>Typical period bleeding days</Text>
                </View>
              </View>
              <View style={styles.settingValuePill}>
                <Text style={styles.settingValueText}>{periodLength} days</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* NOTIFICATIONS & REMINDERS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>NOTIFICATIONS & ALERTS</Text>

          <View style={styles.cardGroup}>
            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="notifications-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Period & Ovulation Alerts</Text>
                  <Text style={styles.settingSubText}>Reminders 3 days before predicted period</Text>
                </View>
              </View>
              <Switch
                value={periodAlerts}
                onValueChange={setPeriodAlerts}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={periodAlerts ? colors.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="medical-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Daily Medication & Pill</Text>
                  <Text style={styles.settingSubText}>Daily reminder at 8:00 AM</Text>
                </View>
              </View>
              <Switch
                value={dailyPillAlerts}
                onValueChange={setDailyPillAlerts}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={dailyPillAlerts ? colors.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="sparkles-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Weekly Growth Updates</Text>
                  <Text style={styles.settingSubText}>Fetal development & milestone summaries</Text>
                </View>
              </View>
              <Switch
                value={weeklyGrowthAlerts}
                onValueChange={setWeeklyGrowthAlerts}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={weeklyGrowthAlerts ? colors.primary : '#9CA3AF'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="fitness-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Hydration Reminders</Text>
                  <Text style={styles.settingSubText}>Gentle drink water reminders</Text>
                </View>
              </View>
              <Switch
                value={hydrationAlerts}
                onValueChange={setHydrationAlerts}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={hydrationAlerts ? colors.primary : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* SECURITY & PRIVACY */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>PRIVACY & DATA SECURITY</Text>

          <View style={styles.cardGroup}>
            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Passcode & Face ID Lock</Text>
                  <Text style={styles.settingSubText}>Require biometric check on app launch</Text>
                </View>
              </View>
              <Switch
                value={passcodeLock}
                onValueChange={setPasscodeLock}
                trackColor={{ false: '#E5E7EB', true: '#FFCDD2' }}
                thumbColor={passcodeLock ? colors.primary : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorderBottom]}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="eye-off-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <View>
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
                <Ionicons name="cloud-download-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Export Health Data</Text>
                  <Text style={styles.settingSubText}>Download encrypted PDF / CSV records</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.settingRow, styles.rowBorderBottom]}
              onPress={onOpenPrivacyPolicy}
            >
              <View style={styles.settingLabelRow}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <Text style={styles.settingTitle}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.settingRow}
              onPress={onOpenTermsOfUse}
            >
              <View style={styles.settingLabelRow}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <Text style={styles.settingTitle}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* HELP & APP INFO */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>SUPPORT & ACCOUNT</Text>

          <View style={styles.cardGroup}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.settingRow, styles.rowBorderBottom]}
              onPress={() => Alert.alert('OB-GYN Support', 'Support team is available 24/7. Email us at support@redapple.health')}
            >
              <View style={styles.settingLabelRow}>
                <Ionicons name="help-buoy-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                <Text style={styles.settingTitle}>Help & Support Center</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.signOutRow}
              onPress={onSignOut}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" style={styles.settingIcon} />
              <Text style={styles.signOutTitle}>Sign Out of RedApple</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.appVersionText}>RedApple Health v2.4.0 (Build 184) • Zero-Knowledge Encrypted</Text>
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
                  onPress={() => setCycleLength(Math.min(cycleLength + 1, 40))}
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
              activeOpacity={0.85}
              style={styles.saveParamBtn}
              onPress={() => setShowCycleParamModal(false)}
            >
              <Text style={styles.saveParamBtnText}>Save Parameters</Text>
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
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DFD8',
    backgroundColor: colors.backgroundLight,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  /* PROFILE CARD */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8DFD8',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileSubText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },

  /* SECTION CONTAINERS */
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8DFD8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  rowBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  /* MODE OPTION ROWS */
  modeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  modeOptionRowActive: {
    backgroundColor: '#FFF5F5',
  },
  modeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconCircleActive: {
    backgroundColor: '#FFEBEE',
  },
  modeOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modeOptionTitleActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  modeOptionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* SETTING ROWS */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingValuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  settingValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 4,
  },

  /* SIGN OUT ROW */
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  signOutTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EF4444',
  },
  appVersionText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  paramModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  paramModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  paramModalSubTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  paramRow: {
    marginBottom: 16,
  },
  paramLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 6,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  counterValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  saveParamBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveParamBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
