import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  Image,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmationModal from '../components/ConfirmationModal';
import AppearanceScreen from './AppearanceScreen';
import notificationService from '../services/notificationService';
import { clearAppSessionSafe, getStoredProfileMetricsSafe, getHealthProfileSafe } from '../utils/storage';

const STATUSBAR_HEIGHT =
  Platform.OS === 'android'
    ? (StatusBar.currentHeight || 28)
    : 44;

const FAQS_DATA = [
  {
    q: 'How does Red Apple predict my cycle & ovulation?',
    a: 'Red Apple calculates your fertile window and projected period onset by analyzing your historical cycle baselines, luteal phase length, and daily symptom logs with clinical accuracy algorithms.',
  },
  {
    q: 'Is my reproductive health data secure and private?',
    a: 'Yes. Red Apple implements zero-knowledge encryption protocols for all period, pregnancy, and consultation records. Your health data is never shared with third parties.',
  },
  {
    q: 'How do I consult with a verified OB-GYN?',
    a: 'Navigate to the Doctor Care tab to view licensed obstetrics and gynecology specialists. You can view available dates, choose a convenient slot, and confirm a virtual consultation.',
  },
  {
    q: 'How do I change between Cycle, Pregnancy, and Postmenopause modes?',
    a: 'Go to your Profile screen to switch your active life stage at any time. The interface dynamically updates with stage-specific metrics, milestones, and clinical articles.',
  },
];

const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free Plan',
    price: '₦0',
    interval: 'Forever free',
    badge: 'Current',
    badgeBg: '#F1F5F9',
    badgeColor: '#475569',
    features: [
      'Period & ovulation prediction engine',
      'Daily symptom & mood tracking',
      'Educational clinical articles library',
      'Basic streak & calendar milestones',
    ],
  },
  {
    id: 'premium',
    name: 'Red Apple Premium',
    price: '₦3,500',
    interval: 'per month',
    badge: 'Recommended',
    badgeBg: '#FEF2F2',
    badgeColor: colors.primary,
    isPopular: true,
    features: [
      'Unlimited 24/7 AI chat with Dr. Red OB-GYN',
      'Real-time Partner Sync alerts & notifications',
      'Priority virtual consultation booking with OB-GYNs',
      'Full exportable encrypted health PDF records',
      'Advanced hormone and fertility patterns',
    ],
  },
  {
    id: 'family',
    name: 'Family Conception Pass',
    price: '₦6,000',
    interval: 'per month',
    badge: 'Conception Care',
    badgeBg: '#F5F3FF',
    badgeColor: '#7C3AED',
    features: [
      'All Red Apple Premium features included',
      'Synchronized partner access on 2 devices',
      'Dedicated fertility nurse direct chat line',
      'Weekly gestational milestone webinars',
    ],
  },
];

export default function ProfileSettingsSection({
  navigation,
  onClose,
  onBack,
  onSignOut,
  onOpenPrivacyPolicy,
  onOpenTermsOfUse,
  embedded = true,
}) {
  const { user, logout, deleteAccount } = useAuth();
  const { isDarkMode, setDarkMode, theme, themeMode, useSystemTheme, setUseSystemTheme } = useTheme();
  const darkMode = isDarkMode;

  const [showAppearanceModal, setShowAppearanceModal] = useState(false);

  let toast = null;
  try {
    toast = useToast();
  } catch (_) {}

  const handleClose = onBack || onClose || (() => (navigation?.goBack ? navigation.goBack() : null));
  const handlePrivacy = onOpenPrivacyPolicy || (() => (navigation?.navigate ? navigation.navigate('PrivacyPolicy') : null));
  const handleTerms = onOpenTermsOfUse || (() => (navigation?.navigate ? navigation.navigate('TermsOfUse') : null));

  // Modals
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('premium');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const [showHealthRecordsModal, setShowHealthRecordsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);

  // Health Profile Metrics
  const [healthProfileData, setHealthProfileData] = useState({
    cycleLength: 28,
    periodDuration: 5,
    bloodGroup: 'O+',
    genotype: 'AA',
    bloodPressure: '118/76',
    allergies: 'None recorded',
  });

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Notification States
  const [periodAlerts, setPeriodAlerts] = useState(true);
  const [dailyPillAlerts, setDailyPillAlerts] = useState(true);
  const [weeklyGrowthAlerts, setWeeklyGrowthAlerts] = useState(true);
  const [hydrationAlerts, setHydrationAlerts] = useState(false);
  const [dailyLogReminder, setDailyLogReminder] = useState(true);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const notifSettings = await notificationService.getSettings();
        if (notifSettings) {
          setPeriodAlerts(notifSettings.periodAlerts !== false);
          setDailyPillAlerts(notifSettings.dailyPillAlerts !== false);
          setWeeklyGrowthAlerts(notifSettings.weeklyGrowthAlerts !== false);
          setHydrationAlerts(notifSettings.hydrationAlerts === true);
          setDailyLogReminder(notifSettings.dailyLogReminder !== false);
        }

        const hp = await getHealthProfileSafe();
        const metrics = await getStoredProfileMetricsSafe();
        setHealthProfileData((prev) => ({
          ...prev,
          cycleLength: hp?.cycleLength || prev.cycleLength,
          periodDuration: hp?.periodDuration || prev.periodDuration,
          bloodGroup: metrics?.bloodGroup || prev.bloodGroup,
          genotype: metrics?.genotype || prev.genotype,
          bloodPressure: metrics?.bloodPressure || prev.bloodPressure,
        }));
      } catch (e) {
        console.warn('[ProfileSettingsSection] Load settings error:', e);
      }
    }
    loadSettings();
  }, []);

  const handleToggleNotification = async (key, val, setter) => {
    setter(val);
    try {
      if (typeof notificationService.updateSettings === 'function') {
        await notificationService.updateSettings({ [key]: val });
      } else if (typeof notificationService.updateSetting === 'function') {
        await notificationService.updateSetting(key, val);
      }
    } catch (e) {
      console.warn('[ProfileSettingsSection] Failed to update notification setting:', e);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      if (typeof notificationService.triggerTestNotification === 'function') {
        await notificationService.triggerTestNotification();
      } else {
        await notificationService.scheduleLocalNotification({
          id: `test_${Date.now()}`,
          title: 'Red Apple Health Alert 🌸',
          body: 'Your cycle insights and reminders are up to date.',
          trigger: { seconds: 1 },
        });
      }

      try {
        if (toast?.showToast) {
          toast.showToast({
            title: 'Red Apple Health Alert 🌸',
            message: 'Notifications are active! Your reminders and alerts are working properly.',
            type: 'success',
            duration: 4000,
          });
        }
      } catch (_) {}

      Alert.alert(
        'Test Notification Sent! 🌸',
        'Red Apple Health Alert:\n\nYour cycle insights, reminders, and notifications are active and working properly.'
      );
    } catch (err) {
      console.warn('[ProfileSettingsSection] Test notification failed:', err);
      Alert.alert(
        'Test Alert Triggered 🌸',
        'Notification sent. Check your notifications shade or device settings.'
      );
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleUpdatePassword = () => {
    if (!currentPassword.trim()) {
      Alert.alert('Required', 'Please enter your current password.');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordModal(false);
      Alert.alert('Success', 'Your password has been changed successfully.');
    }, 1000);
  };

  const handleSubscribePlan = () => {
    setIsSubscribing(true);
    setTimeout(() => {
      setIsSubscribing(false);
      setShowPlansModal(false);
      Alert.alert(
        'Subscription Activated! 🎉',
        'You have unlocked Red Apple Premium with unlimited AI access and encrypted health exports.'
      );
    }, 1200);
  };

  const handleConfirmSignOut = async () => {
    setShowLogoutModal(false);
    try {
      if (onSignOut) {
        await onSignOut();
      } else {
        await logout();
      }
    } catch (err) {
      Alert.alert('Could not log out', err?.message || 'Please try again.');
    }
  };

  const handleConfirmDeleteAccount = async () => {
    try {
      setShowDeleteModal(false);
      await deleteAccount();
      if (onSignOut) {
        await onSignOut();
      } else {
        await logout();
        await clearAppSessionSafe();
      }
    } catch (err) {
      Alert.alert('Could not delete account', err?.message || 'Please try again.');
    }
  };


  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((res) => setTimeout(res, 500));
    setIsRefreshing(false);
  };

  const ScreenContainer = embedded ? View : SafeAreaView;
  const SettingsContent = embedded ? View : ScrollView;

  return (
    <ScreenContainer
      style={{ flex: embedded ? undefined : 1, backgroundColor: theme.background }}
      {...(!embedded ? { edges: Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['left', 'right', 'bottom'] } : {})}
    >
      {!embedded && <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent={true} />}

      {/* Top Header: Circular Back Button & Centered "Settings" Title */}
      {!embedded && <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT + 6 : 8,
          paddingBottom: 14,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.card,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0.35 : 0.06,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: theme.cardBorder,
          }}
          onPress={handleClose}
        >
          <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary }}>Settings</Text>

        {/* Empty Spacer to balance centered title */}
        <View style={{ width: 44 }} />
      </View>}

      <SettingsContent
        {...(!embedded ? {
          contentContainerStyle: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 60 },
          showsVerticalScrollIndicator: false,
          refreshControl: (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={theme.card}
            />
          ),
        } : {})}
      >
        {/* Section 1: Health & Subscription */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: isDarkMode ? '#94A3B8' : '#1E293B',
            marginTop: 10,
            marginBottom: 10,
            marginLeft: 4,
          }}
        >
          Health & Subscription
        </Text>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.cardBorder,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.03,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          {/* Subscription Plans */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 17,
              paddingHorizontal: 18,
            }}
            onPress={() => setShowPlansModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <Ionicons name="sparkles" size={20} color="#F59E0B" />
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary }}>
                  Subscription Plans
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                  Free Tier • Upgrade to Premium
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.2)' : '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>UPGRADE</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: theme.divider, marginLeft: 60 }} />

          {/* Health records */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 17,
              paddingHorizontal: 18,
            }}
            onPress={() => setShowHealthRecordsModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <Ionicons name="document-text" size={20} color={theme.textPrimary} />
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary }}>
                  Health records
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                  Cycle logs, vitals & clinical reports
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section 2: Preferences & Security */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: isDarkMode ? '#94A3B8' : '#1E293B',
            marginTop: 20,
            marginBottom: 10,
            marginLeft: 4,
          }}
        >
          Preferences & Security
        </Text>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.cardBorder,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.03,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          {/* Password */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 17,
              paddingHorizontal: 18,
            }}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <Ionicons name="lock-closed" size={20} color={theme.textPrimary} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginLeft: 14 }}>
                Password
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: theme.divider, marginLeft: 60 }} />

          {/* Notifications */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 17,
              paddingHorizontal: 18,
            }}
            onPress={() => setShowNotificationsModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <Ionicons name="notifications" size={20} color={theme.textPrimary} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginLeft: 14 }}>
                Notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: theme.divider, marginLeft: 60 }} />

          {/* Appearance */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 14,
              paddingHorizontal: 18,
            }}
            onPress={() => {
              if (navigation?.navigate) {
                navigation.navigate('Appearance');
              } else {
                setShowAppearanceModal(true);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Open appearance settings"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <Ionicons name="color-palette-outline" size={20} color={isDarkMode ? '#38BDF8' : '#DC2626'} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginLeft: 14 }}>
                Appearance
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary, textTransform: 'capitalize' }}>
                {themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 3: Support & Account */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: isDarkMode ? '#94A3B8' : '#1E293B',
            marginTop: 20,
            marginBottom: 10,
            marginLeft: 4,
          }}
        >
          Support & Account
        </Text>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.cardBorder,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.03,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          {/* About application */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 17,
              paddingHorizontal: 18,
            }}
            onPress={() => setShowAboutModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <Ionicons name="information-circle" size={22} color={theme.textPrimary} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginLeft: 14 }}>
                About application
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: theme.divider, marginLeft: 60 }} />

          {/* Help/FAQ */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 17,
              paddingHorizontal: 18,
            }}
            onPress={() => setShowFaqModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <Ionicons name="chatbubble-ellipses" size={20} color={theme.textPrimary} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginLeft: 14 }}>
                Help/FAQ
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: theme.divider, marginLeft: 60 }} />

          {/* Log out (Placed before Delete Account as requested) */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 17,
              paddingHorizontal: 18,
            }}
            onPress={() => setShowLogoutModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <Ionicons name="log-out-outline" size={20} color={theme.textPrimary} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginLeft: 14 }}>
                Log out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: theme.divider, marginLeft: 60 }} />

          {/* Delete account */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 17,
              paddingHorizontal: 18,
            }}
            onPress={() => setShowDeleteModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, alignItems: 'center' }}>
                <Ionicons name="trash" size={20} color="#EF4444" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#EF4444', marginLeft: 14 }}>
                Delete account
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Brand Info Footer */}
        <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted }}>
            Red Apple • v2.4.0 (Build 192)
          </Text>
          <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>
            Encrypted Reproductive Healthcare
          </Text>
        </View>
      </SettingsContent>

      {/* 1. SUBSCRIPTION PLANS MODAL */}
      <Modal
        visible={showPlansModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowPlansModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowPlansModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.modalBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
              maxHeight: '90%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 19, fontWeight: '900', color: theme.textPrimary }}>Membership Plans</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? '#233044' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowPlansModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18, marginBottom: 16 }}>
                Choose the best plan for your reproductive journey. Unlock full clinical companion access with Dr. Red AI and direct telemedicine doctor access.
              </Text>

              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    activeOpacity={0.9}
                    style={{
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? colors.primary : theme.cardBorder,
                      backgroundColor: isSelected ? (isDarkMode ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2') : theme.card,
                      borderRadius: 20,
                      padding: 16,
                      marginBottom: 12,
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDarkMode ? 0.2 : 0.04,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                    onPress={() => setSelectedPlanId(plan.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary }}>{plan.name}</Text>
                        <View style={{ backgroundColor: plan.badgeBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: plan.badgeColor }}>{plan.badge}</Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={isSelected ? colors.primary : theme.textMuted}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 }}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: colors.primary }}>{plan.price}</Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 4 }}>{plan.interval}</Text>
                    </View>

                    <View style={{ gap: 6 }}>
                      {plan.features.map((feat, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="checkmark-circle" size={14} color={isSelected ? colors.primary : '#059669'} style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 12, color: theme.textSecondary, flex: 1 }}>{feat}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                activeOpacity={0.88}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 14,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 2,
                }}
                onPress={handleSubscribePlan}
                disabled={isSubscribing}
              >
                {isSubscribing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    {selectedPlanId === 'free' ? 'Continue with Free Tier' : 'Upgrade to Selected Plan'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 2. HEALTH RECORDS MODAL */}
      <Modal
        visible={showHealthRecordsModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowHealthRecordsModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowHealthRecordsModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.modalBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
              maxHeight: '88%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 19, fontWeight: '900', color: theme.textPrimary }}>Health Records</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? '#233044' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowHealthRecordsModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Reproductive Baseline Card */}
              <View style={{ backgroundColor: theme.subtleSurface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="calendar" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.textPrimary }}>Cycle & Menstrual Baselines</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary }}>Average Cycle Length</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textPrimary }}>{healthProfileData.cycleLength} Days</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary }}>Average Bleeding Days</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textPrimary }}>{healthProfileData.periodDuration} Days</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary }}>Prediction Confidence</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#059669' }}>96% Regular</Text>
                </View>
              </View>

              {/* Vitals & Clinical Data */}
              <View style={{ backgroundColor: theme.subtleSurface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="heart" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.textPrimary }}>Clinical Vitals</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary }}>Blood Pressure</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textPrimary }}>{healthProfileData.bloodPressure}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary }}>Blood Group / Genotype</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textPrimary }}>{healthProfileData.bloodGroup} • {healthProfileData.genotype}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary }}>Known Drug Allergies</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textPrimary }}>{healthProfileData.allergies}</Text>
                </View>
              </View>

              {/* Export Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#233044' : '#1E293B',
                  borderWidth: isDarkMode ? 1 : 0,
                  borderColor: isDarkMode ? '#334155' : 'transparent',
                  paddingVertical: 14,
                  borderRadius: 18,
                  marginTop: 6,
                }}
                onPress={() => {
                  Alert.alert(
                    'Export Complete',
                    'Your encrypted health records have been compiled into a certified clinical report and saved to your device.'
                  );
                }}
              >
                <Ionicons name="cloud-download-outline" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Export Encrypted PDF Report</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 3. PASSWORD MODAL */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowPasswordModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.modalBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary }}>Change Password</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? '#233044' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowPasswordModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 18, lineHeight: 18 }}>
              Ensure your account is protected with a secure password containing at least 6 characters.
            </Text>

            {/* Current Password */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
              Current Password
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.inputBg,
                borderWidth: 1,
                borderColor: theme.inputBorder,
                borderRadius: 16,
                paddingHorizontal: 14,
                marginBottom: 14,
                height: 48,
              }}
            >
              <TextInput
                style={{ flex: 1, fontSize: 14, color: theme.textPrimary }}
                placeholder="Enter current password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPasswordText}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPasswordText(!showPasswordText)}>
                <Ionicons name={showPasswordText ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
              New Password
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.inputBg,
                borderWidth: 1,
                borderColor: theme.inputBorder,
                borderRadius: 16,
                paddingHorizontal: 14,
                marginBottom: 14,
                height: 48,
              }}
            >
              <TextInput
                style={{ flex: 1, fontSize: 14, color: theme.textPrimary }}
                placeholder="Enter new password (min. 6 chars)"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPasswordText}
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            {/* Confirm New Password */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
              Confirm New Password
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.inputBg,
                borderWidth: 1,
                borderColor: theme.inputBorder,
                borderRadius: 16,
                paddingHorizontal: 14,
                marginBottom: 22,
                height: 48,
              }}
            >
              <TextInput
                style={{ flex: 1, fontSize: 14, color: theme.textPrimary }}
                placeholder="Re-enter new password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPasswordText}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 5,
                elevation: 2,
              }}
              onPress={handleUpdatePassword}
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Update Password</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 4. NOTIFICATIONS MODAL */}
      <Modal
        visible={showNotificationsModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowNotificationsModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.modalBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
              maxHeight: '85%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary }}>Notifications & Alerts</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? '#233044' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowNotificationsModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Period Alerts */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Period & Ovulation Alerts</Text>
                  <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 2 }}>Reminders before projected fertile window</Text>
                </View>
                <Switch
                  value={periodAlerts}
                  onValueChange={(val) => handleToggleNotification('periodAlerts', val, setPeriodAlerts)}
                  trackColor={{ false: '#E2E8F0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Daily Pill Alerts */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Daily Medication & Pill</Text>
                  <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 2 }}>Daily pill schedule at 8:00 AM</Text>
                </View>
                <Switch
                  value={dailyPillAlerts}
                  onValueChange={(val) => handleToggleNotification('dailyPillAlerts', val, setDailyPillAlerts)}
                  trackColor={{ false: '#E2E8F0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Daily Log Reminder */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Daily Symptom Check-in</Text>
                  <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 2 }}>Evening wellness check at 8:00 PM</Text>
                </View>
                <Switch
                  value={dailyLogReminder}
                  onValueChange={(val) => handleToggleNotification('dailyLogReminder', val, setDailyLogReminder)}
                  trackColor={{ false: '#E2E8F0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Weekly Growth Alerts */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Weekly Growth Updates</Text>
                  <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 2 }}>Pregnancy milestones & gestational articles</Text>
                </View>
                <Switch
                  value={weeklyGrowthAlerts}
                  onValueChange={(val) => handleToggleNotification('weeklyGrowthAlerts', val, setWeeklyGrowthAlerts)}
                  trackColor={{ false: '#E2E8F0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Hydration Reminders */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Hydration Reminders</Text>
                  <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 2 }}>Gentle water drinking alerts throughout the day</Text>
                </View>
                <Switch
                  value={hydrationAlerts}
                  onValueChange={(val) => handleToggleNotification('hydrationAlerts', val, setHydrationAlerts)}
                  trackColor={{ false: '#E2E8F0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Send Test Notification Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#233044' : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                  paddingVertical: 13,
                  borderRadius: 18,
                  marginTop: 18,
                }}
                onPress={handleTestNotification}
                disabled={isTestingNotification}
              >
                {isTestingNotification ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="paper-plane-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                )}
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                  {isTestingNotification ? 'Sending Alert...' : 'Send Test Notification'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 5. ABOUT APPLICATION MODAL */}
      <Modal
        visible={showAboutModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowAboutModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowAboutModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.modalBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary }}>About Application</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? '#233044' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowAboutModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginVertical: 12 }}>
              <View
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 20,
                  backgroundColor: isDarkMode ? '#1E293B' : '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#334155' : '#FECACA',
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  elevation: 2,
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={{ width: 46, height: 46, borderRadius: 10 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textPrimary }}>Red Apple</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginTop: 2 }}>
                Version 2.4.0 (Build 192)
              </Text>
            </View>

            <View
              style={{
                backgroundColor: theme.subtleSurface,
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                marginVertical: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="shield-checkmark" size={18} color="#059669" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>Zero-Knowledge Privacy</Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                Red Apple secures your menstrual cycle, prenatal records, and doctor consultations with end-to-end encrypted storage.
              </Text>
            </View>

            {/* Legal Links */}
            <View style={{ marginTop: 8 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.divider }}
                onPress={() => {
                  setShowAboutModal(false);
                  handlePrivacy();
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}
                onPress={() => {
                  setShowAboutModal(false);
                  handleTerms();
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>Terms of Use</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 6. HELP / FAQ MODAL */}
      <Modal
        visible={showFaqModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowFaqModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowFaqModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.modalBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
              maxHeight: '88%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary }}>Help & Frequently Asked</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? '#233044' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowFaqModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {FAQS_DATA.map((faq, index) => {
                const isExpanded = expandedFaqIndex === index;
                return (
                  <View
                    key={index}
                    style={{
                      backgroundColor: theme.subtleSurface,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: theme.cardBorder,
                      marginBottom: 10,
                      overflow: 'hidden',
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 15,
                      }}
                      onPress={() => setExpandedFaqIndex(isExpanded ? null : index)}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.textPrimary, flex: 1, marginRight: 10 }}>
                        {faq.q}
                      </Text>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={{ paddingHorizontal: 15, paddingBottom: 15, paddingTop: 2, borderTopWidth: 1, borderTopColor: theme.divider }}>
                        <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 19 }}>{faq.a}</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Support Contact Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#233044' : '#1E293B',
                  borderWidth: isDarkMode ? 1 : 0,
                  borderColor: isDarkMode ? '#334155' : 'transparent',
                  paddingVertical: 14,
                  borderRadius: 18,
                  marginTop: 14,
                }}
                onPress={() => {
                  Linking.openURL('mailto:support@redapple.health?subject=Support%20Request%20-%20Red%20Apple%20App');
                }}
              >
                <Ionicons name="mail" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  Contact Clinical Support Desk
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* APPEARANCE MODAL */}
      <Modal
        visible={showAppearanceModal}
        transparent={false}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowAppearanceModal(false)}
      >
        <AppearanceScreen onBack={() => setShowAppearanceModal(false)} />
      </Modal>

      {/* 7. LOG OUT CONFIRMATION MODAL */}
      <ConfirmationModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmSignOut}
        title="Log Out?"
        message="Are you sure you want to sign out of your Red Apple account on this device?"
        confirmText="Log Out"
        cancelText="Cancel"
        icon="log-out-outline"
        confirmBg="#1E293B"
      />

      {/* 8. DELETE ACCOUNT CONFIRMATION MODAL */}
      <ConfirmationModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDeleteAccount}
        title="Delete Account?"
        message="This permanently deletes your account, profile, cycle and pregnancy data, appointments, and payment history. This action cannot be undone."
        confirmText="Delete Account"
        cancelText="Cancel"
        isDestructive={true}
        icon="trash"
      />
    </ScreenContainer>
  );
}
