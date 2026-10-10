import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import DoctorCareScreen from './DoctorCareScreen';
import LearnScreen from './LearnScreen';
import PregnancyScreen from './PregnancyScreen';
import PostmenopauseScreen from './PostmenopauseScreen';
import ProfileScreen from './ProfileScreen';
import SettingsScreen from './SettingsScreen';
import PrivacyPolicyDetailScreen from './PrivacyPolicyDetailScreen';
import TermsOfUseDetailScreen from './TermsOfUseDetailScreen';
import OnboardingSetupScreen from './OnboardingSetupScreen';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  saveActiveHealthModeSafe,
  getCachedActiveHealthMode,
  saveHealthProfileSafe,
  getHealthProfileSafe,
  getCycleLogsSafe,
} from '../utils/storage';
import cycleService, {
  computeLocalFertilityPrediction,
  computeLocalCycleStats,
} from '../services/cycleService';
import FunctionalCycleRing from '../components/FunctionalCycleRing';
import CycleLengthChart from '../components/CycleLengthChart';
import AdditionalAnalyticsMetrics from '../components/AdditionalAnalyticsMetrics';
import MiniCalendarDatePicker from '../components/MiniCalendarDatePicker';
import AIAssistantDrawer from '../components/AIAssistantDrawer';
import { getUserBookings } from '../services/telemedicineService';
import notificationService from '../services/notificationService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STATUSBAR_HEIGHT = StatusBar.currentHeight || 38;

function TopProfileHeader({
  user,
  isDoctorAccount,
  userName,
  userSubtitle,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  unreadNotificationsCount,
}) {
  return (
    <View style={styles.headerRow}>
      {/* User Profile Avatar & Name - Opens Profile Screen */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.userInfoRow}
        onPress={onOpenProfile || onOpenSettings}
      >
        <Image
          source={{
            uri: user?.avatar_url || (isDoctorAccount
              ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
          }}
          style={styles.userAvatarImage}
        />
        <View style={styles.userTextCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.userNameText}>{userName}</Text>
            {isDoctorAccount && (
              <View style={styles.verifiedDoctorBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
              </View>
            )}
          </View>
          <Text style={styles.userSubtitleText}>{userSubtitle}</Text>
        </View>
      </TouchableOpacity>

      {/* Right Action Icons: Settings Gear & Notifications */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {onOpenSettings && (
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.bellBtnDark}
            onPress={onOpenSettings}
          >
            <Ionicons name="settings-outline" size={19} color="#111827" />
          </TouchableOpacity>
        )}

        {/* Standard App Notification Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.bellBtnDark}
          onPress={onOpenNotifications}
        >
          <Ionicons name="notifications-outline" size={22} color="#111827" />
          {unreadNotificationsCount > 0 && (
            <View style={styles.bellBadgeGlow}>
              <Text style={styles.bellBadgeGlowText}>{unreadNotificationsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen({
  onSignOut,
  initialMode = 'cycle',
  healthProfile = null,
  onRedoSetup,
}) {
  const { user, updateProfile } = useAuth();

  const isDoctorAccount =
    user?.role === 'doctor' ||
    user?.email?.toLowerCase() === 'mesalokubor63@gmail.com';

  const userName = isDoctorAccount
    ? (user?.name || 'Consulting Doctor')
    : (user?.name || 'Amara Okonkwo');

  const greetingDisplayName = isDoctorAccount
    ? (userName.startsWith('Dr.') ? userName : `Dr. ${userName}`)
    : (user?.name ? user.name.split(' ')[0] : (userName ? userName.split(' ')[0] : 'Amara'));

  const userSubtitle = isDoctorAccount
    ? 'Doctor / Telemedicine Specialist'
    : 'Patient';

  const effectiveMode =
    initialMode ||
    healthProfile?.stage ||
    user?.health_profile?.stage ||
    (user?.pregnancy_mode ? 'pregnancy' : 'cycle');

  const [currentPage, setCurrentPage] = useState(0); // 0: Homepage | 1: Cycle / Center | 2: Learn | 3: Telemed
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [showExpandedCycleModal, setShowExpandedCycleModal] = useState(false);
  const [showCycleCalendarModal, setShowCycleCalendarModal] = useState(false);
  const [showDailyLogDrawer, setShowDailyLogDrawer] = useState(false);

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationsList, setNotificationsList] = useState([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);

  const reloadNotifications = async () => {
    try {
      const items = await notificationService.getInAppNotifications();
      if (Array.isArray(items)) {
        setNotificationsList(items);
        const unread = items.filter((n) => !n.isRead).length;
        setUnreadNotificationsCount(unread);
      }
    } catch (e) {
      console.warn('[HomeScreen] Reload notifications error:', e);
    }
  };

  useEffect(() => {
    reloadNotifications();
    const unsub = notificationService.subscribe(() => {
      reloadNotifications();
    });
    return () => unsub();
  }, []);

  const [activeHealthMode, setActiveHealthMode] = useState(() => {
    // 1. Check in-memory / local storage cache first (immediate user switch)
    const cached = getCachedActiveHealthMode();
    if (cached) return cached;
    // 2. Prop from AppNavigator
    if (initialMode) return initialMode;
    // 3. Health profile stage
    if (healthProfile?.stage) return healthProfile.stage;
    if (user?.health_profile?.stage) return user.health_profile.stage;
    if (user?.pregnancy_mode) return 'pregnancy';
    return 'cycle';
  });

  const isPregnancyMode = activeHealthMode === 'pregnancy';
  const isPostmenopauseMode =
    activeHealthMode === 'postmenopause' || activeHealthMode === 'perimenopause';

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const cached = getCachedActiveHealthMode();
      if (cached) setActiveHealthMode(cached);
      await getHealthProfileSafe();
      await new Promise((res) => setTimeout(res, 600));
    } catch (e) {
      console.warn('Error refreshing HomeScreen:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const [userBookingsList, setUserBookingsList] = useState([]);

  useEffect(() => {
    let isMounted = true;
    getUserBookings()
      .then((res) => {
        if (isMounted && Array.isArray(res)) {
          setUserBookingsList(res);
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, [showDailyLogDrawer, isRefreshing]);

  /**
   * Persistently switch health modes both locally and to the backend.
   * Ensures exiting or entering pregnancy mode sticks across app restarts with zero flashing.
   */
  const switchHealthMode = async (targetMode) => {
    setActiveHealthMode(targetMode);

    // 1. Persist locally to storage
    await saveActiveHealthModeSafe(targetMode);

    // 2. Sync to backend and update in-memory AuthContext user
    try {
      if (updateProfile) {
        await updateProfile({
          pregnancy_mode: targetMode === 'pregnancy',
          health_profile: {
            ...(user?.health_profile || {}),
            stage: targetMode,
          },
        });
      }
    } catch (err) {
      console.warn('[HomeScreen] Failed to sync health mode to backend:', err.message);
    }
  };

  useEffect(() => {
    if (initialMode && initialMode !== activeHealthMode) {
      setActiveHealthMode(initialMode);
    }
  }, [initialMode]);
  const toast = useToast();
  const showToastSuccess = toast?.showSuccess;

  const [showModeChangeModal, setShowModeChangeModal] = useState(false);
  const [modeChangeTarget, setModeChangeTarget] = useState(null);

  // Welcome Back Check-in Drawer (When switching back to Cycle Mode)
  const [showWelcomeBackDrawer, setShowWelcomeBackDrawer] = useState(false);
  const [welcomeBackFromMode, setWelcomeBackFromMode] = useState(null);
  const [welcomePeriodStatus, setWelcomePeriodStatus] = useState('started'); // 'started' | 'not_yet'
  const [welcomePeriodDate, setWelcomePeriodDate] = useState(() => new Date());

  const openModeChangeOnboarding = async (targetStage) => {
    if (targetStage === 'cycle') {
      const prevMode = activeHealthMode;
      await switchHealthMode('cycle');
      // If returning from pregnancy or postmenopause, prompt the Welcome Back check-in drawer
      if (prevMode === 'pregnancy' || prevMode === 'postmenopause') {
        setWelcomeBackFromMode(prevMode);
        setWelcomePeriodStatus('started');
        setWelcomePeriodDate(new Date());
        setShowWelcomeBackDrawer(true);
      }
      return;
    }
    setModeChangeTarget(targetStage);
    setShowModeChangeModal(true);
  };

  const handleSaveWelcomeBackCycle = async () => {
    try {
      const existingProfile = (await getHealthProfileSafe()) || {};
      let updatedProfile = { ...existingProfile, stage: 'cycle' };

      if (welcomePeriodStatus === 'started') {
        const year = welcomePeriodDate.getFullYear();
        const month = String(welcomePeriodDate.getMonth() + 1).padStart(2, '0');
        const day = String(welcomePeriodDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        updatedProfile.lastPeriodDate = dateStr;
        updatedProfile.postpartumTransition = false;
        showToastSuccess && showToastSuccess(`Cycle updated to ${dateStr}!`);
      } else {
        updatedProfile.postpartumTransition = true;
        showToastSuccess && showToastSuccess('Transition mode active.');
      }

      await saveHealthProfileSafe(updatedProfile);

      if (updateProfile) {
        await updateProfile({
          pregnancy_mode: false,
          health_profile: updatedProfile,
        });
      }
    } catch (err) {
      console.warn('[HomeScreen] Failed to save welcome back profile:', err.message);
    } finally {
      setShowWelcomeBackDrawer(false);
    }
  };

  const handleCompleteModeChange = async (newProfile, newStage) => {
    setShowModeChangeModal(false);
    setModeChangeTarget(null);
    if (newStage) {
      await switchHealthMode(newStage);
    }
  };

  const [pregnancyDueDate, setPregnancyDueDate] = useState('Dec 24, 2026');
  const [pregnancyConceptionDate, setPregnancyConceptionDate] = useState('Apr 2, 2026');

  // Real cycle data states
  const [cachedProfile, setCachedProfile] = useState(healthProfile || user?.health_profile || null);
  const activeCycleProfile = useMemo(() => {
    return {
      cycleLength: Number(cachedProfile?.cycleLength || healthProfile?.cycleLength || user?.health_profile?.cycleLength || 28),
      periodDuration: Number(cachedProfile?.periodDuration || healthProfile?.periodDuration || user?.health_profile?.periodDuration || 5),
      lastPeriodDate: cachedProfile?.lastPeriodDate || healthProfile?.lastPeriodDate || user?.health_profile?.lastPeriodDate || null,
    };
  }, [cachedProfile, healthProfile, user?.health_profile]);

  const [cyclePrediction, setCyclePrediction] = useState(() => {
    if (typeof computeLocalFertilityPrediction === 'function') {
      return computeLocalFertilityPrediction(
        activeCycleProfile.lastPeriodDate,
        activeCycleProfile.periodDuration,
        activeCycleProfile.cycleLength
      );
    }
    return {
      currentCycleDay: 1,
      currentPhase: 'follicular',
      estimatedOvulationDate: '',
      fertileWindowStart: '',
      fertileWindowEnd: '',
      nextPeriodStartDate: '',
      chanceOfGettingPregnant: 'Low',
    };
  });
  const [cycleHistory, setCycleHistory] = useState({ logs: [], stats: {} });
  const [cycleLogs, setCycleLogs] = useState([]);

  const loadCycleData = async () => {
    try {
      const storedProfile = await getHealthProfileSafe();
      if (storedProfile) {
        setCachedProfile(storedProfile);
      }

      const cycleLen = Number(storedProfile?.cycleLength || activeCycleProfile.cycleLength || 28);
      const periodDur = Number(storedProfile?.periodDuration || activeCycleProfile.periodDuration || 5);
      const lastPeriod = storedProfile?.lastPeriodDate || activeCycleProfile.lastPeriodDate;

      const [pred, hist] = await Promise.all([
        cycleService.getFertilityPrediction({
          cycleLength: cycleLen,
          periodDuration: periodDur,
          lastPeriodDate: lastPeriod,
        }),
        cycleService.getCycleHistory(),
      ]);

      if (pred) setCyclePrediction(pred);
      if (hist) {
        setCycleHistory(hist);
        const logs = hist.logs || [];
        setCycleLogs(logs);
      }
    } catch (err) {
      console.warn('[HomeScreen] Error loading cycle data:', err);
    }
  };

  useEffect(() => {
    loadCycleData();
  }, [user?.id, healthProfile?.lastPeriodDate, user?.health_profile?.lastPeriodDate]);

  const displayCurrentDay = cyclePrediction.currentCycleDay || 1;
  const displayCycleLength = activeCycleProfile.cycleLength || 28;
  const displayPeriodDuration = activeCycleProfile.periodDuration || 5;

  const parseDateSafe = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatShortDateStr = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = parseDateSafe(dateStr);
      if (!d) return dateStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateRange = (d1, d2) => {
    if (!d1 || !d2) return '';
    const date1 = parseDateSafe(d1);
    const date2 = parseDateSafe(d2);
    if (!date1 || !date2) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (date1.getMonth() === date2.getMonth()) {
      return `${months[date1.getMonth()]} ${date1.getDate()}–${date2.getDate()}`;
    }
    return `${months[date1.getMonth()]} ${date1.getDate()} – ${months[date2.getMonth()]} ${date2.getDate()}`;
  };

  // Detailed dynamic upcoming predictions calculation
  const upcomingPredictions = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cycleLen = displayCycleLength;
    const periodDur = displayPeriodDuration;

    // 1. Next Period Prediction
    let nextPeriodDate = parseDateSafe(cyclePrediction.nextPeriodStartDate);
    if (!nextPeriodDate) {
      const remainingDays = Math.max(cycleLen - displayCurrentDay + 1, 1);
      nextPeriodDate = new Date(todayMidnight.getTime() + remainingDays * 24 * 60 * 60 * 1000);
    }

    const diffPeriodMs = nextPeriodDate.getTime() - todayMidnight.getTime();
    const daysUntilPeriod = Math.round(diffPeriodMs / (1000 * 60 * 60 * 24));

    let periodPill = `${daysUntilPeriod} days`;
    let periodSubTitle = `${daysUntilPeriod} days from today • Cycle Day ${displayCurrentDay}`;

    if (daysUntilPeriod === 0) {
      periodPill = 'Today';
      periodSubTitle = `Expected today • Cycle Day ${displayCurrentDay}`;
    } else if (daysUntilPeriod === 1) {
      periodPill = 'Tomorrow';
      periodSubTitle = `Expected tomorrow • Cycle Day ${displayCurrentDay}`;
    } else if (daysUntilPeriod < 0) {
      const lateDays = Math.abs(daysUntilPeriod);
      periodPill = `${lateDays}d late`;
      periodSubTitle = `${lateDays} day${lateDays > 1 ? 's' : ''} past expected • Cycle Day ${displayCurrentDay}`;
    }

    const periodMainTitle = `Period expected ${formatShortDateStr(nextPeriodDate)}`;

    // 2. Fertile Window Prediction
    let fStart = parseDateSafe(cyclePrediction.fertileWindowStart);
    let fEnd = parseDateSafe(cyclePrediction.fertileWindowEnd);

    const ovDay = Math.max(cycleLen - 14, 1);
    const fStartDay = Math.max(ovDay - 5, 1);
    const fEndDay = ovDay + 1;

    if (!fStart || !fEnd) {
      const cycleStart = new Date(todayMidnight.getTime() - (displayCurrentDay - 1) * 24 * 60 * 60 * 1000);
      fStart = new Date(cycleStart.getTime() + (fStartDay - 1) * 24 * 60 * 60 * 1000);
      fEnd = new Date(cycleStart.getTime() + (fEndDay - 1) * 24 * 60 * 60 * 1000);
    }

    let fertileMainTitle = '';
    let fertileSubTitle = '';
    let fertilePill = '';
    let isFertileActiveNow = false;

    if (todayMidnight > fEnd) {
      // Current cycle's fertile window is in the past -> show next cycle's fertile window
      const nextCycleStart = nextPeriodDate;
      const nextFStart = new Date(nextCycleStart.getTime() + (fStartDay - 1) * 24 * 60 * 60 * 1000);
      const nextFEnd = new Date(nextCycleStart.getTime() + (fEndDay - 1) * 24 * 60 * 60 * 1000);

      const diffMs = nextFStart.getTime() - todayMidnight.getTime();
      const daysUntilNextFertile = Math.max(Math.round(diffMs / (1000 * 60 * 60 * 24)), 1);

      fertileMainTitle = `Fertile window ${formatDateRange(nextFStart, nextFEnd)}`;
      fertileSubTitle = `${daysUntilNextFertile} day${daysUntilNextFertile === 1 ? '' : 's'} away • Next cycle`;
      fertilePill = `${daysUntilNextFertile} days`;
    } else if (todayMidnight >= fStart && todayMidnight <= fEnd) {
      isFertileActiveNow = true;
      fertileMainTitle = `Fertile window ${formatDateRange(fStart, fEnd)}`;
      fertileSubTitle = cyclePrediction.currentPhase === 'ovulatory'
        ? 'Peak fertility today • Ovulation'
        : 'High chance of conception today';
      fertilePill = 'Active now';
    } else {
      const diffMs = fStart.getTime() - todayMidnight.getTime();
      const daysUntilFertile = Math.max(Math.round(diffMs / (1000 * 60 * 60 * 24)), 1);
      fertileMainTitle = `Fertile window ${formatDateRange(fStart, fEnd)}`;
      fertileSubTitle = `${daysUntilFertile} day${daysUntilFertile === 1 ? '' : 's'} away • High chance`;
      fertilePill = `${daysUntilFertile} days`;
    }

    return {
      nextPeriodDate,
      daysUntilPeriod,
      periodPill,
      periodMainTitle,
      periodSubTitle,
      fertileMainTitle,
      fertileSubTitle,
      fertilePill,
      isFertileActiveNow,
    };
  }, [cyclePrediction, displayCycleLength, displayPeriodDuration, displayCurrentDay]);

  const nextPeriodFormatted = formatShortDateStr(cyclePrediction.nextPeriodStartDate) || formatShortDateStr(upcomingPredictions.nextPeriodDate);
  const ovulationFormatted = formatShortDateStr(cyclePrediction.estimatedOvulationDate) || formatShortDateStr(new Date(Date.now() + (Math.max(displayCycleLength - 14, 1) - displayCurrentDay) * 24 * 60 * 60 * 1000));
  const isOvulationPast = cyclePrediction.estimatedOvulationDate && parseDateSafe(cyclePrediction.estimatedOvulationDate) < new Date();
  const ovulationLabel = `${isOvulationPast ? 'Ovulation was' : 'Ovulation is'} ${ovulationFormatted}`;

  const displayNotifications = useMemo(() => {
    if (!Array.isArray(notificationsList) || notificationsList.length === 0) {
      return [];
    }
    return notificationsList.map((item) => {
      if (item.type === 'period_alert' && upcomingPredictions) {
        const periodDetail = upcomingPredictions.daysUntilPeriod === 0
          ? 'today'
          : upcomingPredictions.daysUntilPeriod === 1
            ? 'tomorrow'
            : upcomingPredictions.daysUntilPeriod < 0
              ? `${Math.abs(upcomingPredictions.daysUntilPeriod)} days ago`
              : `in ${upcomingPredictions.daysUntilPeriod} days`;
        return {
          ...item,
          body: item.body || `Your period is expected ${periodDetail} (${nextPeriodFormatted}). Tap to review predictions.`,
        };
      }
      return item;
    });
  }, [notificationsList, upcomingPredictions, nextPeriodFormatted]);

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isFullReadingMode, setIsFullReadingMode] = useState(false);

  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(xOffset / SCREEN_WIDTH);
    if (pageIndex >= 0 && pageIndex <= 2 && pageIndex !== currentPage) {
      setCurrentPage(pageIndex);
    }
  };

  const scrollToPage = (pageIndex) => {
    setCurrentPage(pageIndex);
    scrollViewRef.current?.scrollTo({ x: pageIndex * SCREEN_WIDTH, animated: true });
  };

  const handleBookDoctorFromHome = (doc) => {
    setSelectedDoctorForBooking(doc);
    scrollToPage(2);
  };

  const handleOpenNotifications = async () => {
    setShowNotificationsModal(true);
    await reloadNotifications();
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
      showToastSuccess && showToastSuccess('All notifications marked as read.');
    } catch (e) {
      console.warn('[HomeScreen] Mark all read error:', e);
    }
  };

  const handlePressNotificationItem = async (item) => {
    try {
      await notificationService.markAsRead(item.id);
      setNotificationsList((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
      setShowNotificationsModal(false);

      if (item.data?.screen === 'DoctorCareScreen' || item.type === 'appointment') {
        scrollToPage(2);
      } else if (item.data?.screen === 'PregnancyScreen' || item.type === 'pregnancy_milestone') {
        if (!isPregnancyMode) {
          await switchHealthMode('pregnancy');
        }
      } else if (item.data?.screen === 'PostmenopauseScreen' || item.type === 'menopause_wellness') {
        if (!isPostmenopauseMode) {
          await switchHealthMode('postmenopause');
        }
      } else if (item.type === 'daily_log') {
        setShowDailyLogDrawer(true);
      } else {
        scrollToPage(0);
      }
    } catch (err) {
      console.warn('[HomeScreen] Press notification error:', err);
    }
  };

  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Dynamically calculate the accurate 7 days of the current week based on real cycle data
  const { weekDays } = useMemo(() => {
    const now = new Date();
    // Monday-based week: distanceToMonday is 0 on Mon, 1 on Tue, 2 on Wed, 3 on Thu, 4 on Fri, 5 on Sat, 6 on Sun
    const distanceToMonday = (now.getDay() + 6) % 7;
    const baseMonday = new Date(now);
    baseMonday.setDate(now.getDate() - distanceToMonday);
    baseMonday.setHours(0, 0, 0, 0);

    const singleLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const days = [];

    const cycleLength = activeCycleProfile.cycleLength || 28;
    const periodDuration = activeCycleProfile.periodDuration || 5;
    const lastPeriodDate = activeCycleProfile.lastPeriodDate ? new Date(activeCycleProfile.lastPeriodDate) : null;
    const ovulationCycleDay = Math.max(cycleLength - 14, 1);
    const fertileStartCycleDay = Math.max(ovulationCycleDay - 5, 1);
    const fertileEndCycleDay = ovulationCycleDay + 1;

    const todayZero = new Date(now);
    todayZero.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseMonday);
      d.setDate(baseMonday.getDate() + i);
      const isToday = d.toDateString() === now.toDateString();
      const dateKey = d.toISOString().split('T')[0];

      let cycleDay = 1;
      if (lastPeriodDate && !isNaN(lastPeriodDate.getTime())) {
        const lastZero = new Date(lastPeriodDate.getFullYear(), lastPeriodDate.getMonth(), lastPeriodDate.getDate());
        const diffFromStart = Math.floor((d.getTime() - lastZero.getTime()) / (1000 * 60 * 60 * 24));
        cycleDay = ((((diffFromStart) % cycleLength) + cycleLength) % cycleLength) + 1;
      } else {
        const diffDays = Math.round((d - todayZero) / (1000 * 60 * 60 * 24));
        const currentDay = cyclePrediction.currentCycleDay || 1;
        cycleDay = ((((currentDay - 1 + diffDays) % cycleLength) + cycleLength) % cycleLength) + 1;
      }

      // Check if logged as period
      const isLoggedPeriod = cycleLogs.some((l) => {
        const lDate = l.date || (l.logged_at ? l.logged_at.split('T')[0] : null);
        return lDate === dateKey && (l.isPeriodDay || l.flow);
      });

      let type = 'normal';
      if (isLoggedPeriod || (cycleDay >= 1 && cycleDay <= periodDuration)) {
        type = 'period';
      } else if (cycleDay === ovulationCycleDay) {
        type = 'ovulation';
      } else if (cycleDay >= fertileStartCycleDay && cycleDay <= fertileEndCycleDay) {
        type = 'fertile';
      }

      days.push({
        singleLetter: singleLetters[i],
        dayNum: d.getDate(),
        dateKey,
        isToday,
        type,
        cycleDay,
      });
    }

    return { weekDays: days };
  }, [activeCycleProfile, cycleLogs, cyclePrediction.currentCycleDay]);

  const handleJumpToToday = () => {
    const d = new Date();
    setSelectedDateKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  useEffect(() => {
    if (showCycleCalendarModal) {
      const now = new Date();
      const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (!selectedDateKey || !selectedDateKey.startsWith(currentMonthPrefix)) {
        setSelectedDateKey(`${currentMonthPrefix}-${String(now.getDate()).padStart(2, '0')}`);
      }
    }
  }, [showCycleCalendarModal]);

  const currentMonthData = useMemo(() => {
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const cycleLength = activeCycleProfile.cycleLength || 28;
    const periodDuration = activeCycleProfile.periodDuration || 5;
    const lastPeriodDate = activeCycleProfile.lastPeriodDate ? new Date(activeCycleProfile.lastPeriodDate) : null;
    const ovulationCycleDay = Math.max(cycleLength - 14, 1);
    const fertileStartCycleDay = Math.max(ovulationCycleDay - 5, 1);
    const fertileEndCycleDay = ovulationCycleDay + 1;

    // Fast O(1) set lookup for logged period days
    const loggedPeriodDatesSet = new Set();
    cycleLogs.forEach((l) => {
      if (l.isPeriodDay) {
        const lDate = l.date || (l.logged_at ? l.logged_at.split('T')[0] : null);
        if (lDate) loggedPeriodDatesSet.add(lDate);
      }
    });

    const year = now.getFullYear();
    const month = now.getMonth();
    const monthTitle = `${monthNames[month]} ${year}`;
    const monthKey = `${year}-${month}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday-based week: Monday is 0, Sunday is 6
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ key: `pad-${year}-${month}-${i}`, empty: true });
    }

    let periodDaysCount = 0;
    let fertileDaysCount = 0;
    let ovulationDayNum = null;

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const isToday = cellDate.toDateString() === now.toDateString();
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      let cycleDay = 1;
      if (lastPeriodDate && !isNaN(lastPeriodDate.getTime())) {
        const lastZero = new Date(lastPeriodDate.getFullYear(), lastPeriodDate.getMonth(), lastPeriodDate.getDate());
        const cellZero = new Date(year, month, d);
        const diffFromStart = Math.floor((cellZero.getTime() - lastZero.getTime()) / (1000 * 60 * 60 * 24));
        cycleDay = ((((diffFromStart) % cycleLength) + cycleLength) % cycleLength) + 1;
      } else {
        const cellZero = new Date(year, month, d);
        const diffDays = Math.round((cellZero - todayZero) / (1000 * 60 * 60 * 24));
        const currentDay = cyclePrediction.currentCycleDay || 1;
        cycleDay = ((((currentDay - 1 + diffDays) % cycleLength) + cycleLength) % cycleLength) + 1;
      }

      const isLoggedPeriod = loggedPeriodDatesSet.has(dateKey);

      let type = 'normal';
      if (isLoggedPeriod || (cycleDay >= 1 && cycleDay <= periodDuration)) {
        type = 'period';
        periodDaysCount++;
      } else if (cycleDay === ovulationCycleDay) {
        type = 'ovulation';
        ovulationDayNum = d;
      } else if (cycleDay >= fertileStartCycleDay && cycleDay <= fertileEndCycleDay) {
        type = 'fertile';
        fertileDaysCount++;
      }

      cells.push({
        key: `day-${year}-${month}-${d}`,
        empty: false,
        dayNum: d,
        dateKey,
        isToday,
        type,
        cycleDay,
      });
    }

    return {
      monthKey,
      monthTitle,
      year,
      month,
      isCurrentMonth: true,
      cells,
      stats: {
        periodDaysCount,
        fertileDaysCount,
        ovulationDayNum,
      },
    };
  }, [activeCycleProfile, cycleLogs, cyclePrediction.currentCycleDay]);

  const selectedDateCellInfo = useMemo(() => {
    if (!currentMonthData?.cells) return null;
    const found = currentMonthData.cells.find((c) => !c.empty && c.dateKey === selectedDateKey);
    if (found) return found;

    const todayCell = currentMonthData.cells.find((c) => !c.empty && c.isToday);
    if (todayCell) return todayCell;

    return currentMonthData.cells.find((c) => !c.empty) || null;
  }, [currentMonthData, selectedDateKey]);


  const handleSaveDailyLog = async (logData) => {
    try {
      await cycleService.logCycleSymptom(logData);
      await loadCycleData();
      setShowDailyLogDrawer(false);
      if (showToastSuccess) {
        showToastSuccess('Daily log saved!');
      } else {
        Alert.alert('Saved', 'Your daily log has been recorded.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save daily log.');
    }
  };

  const openArticleDetails = (title, category, readTime, author, summary, bulletPoints, fullText, thumbnail) => {
    setSelectedArticle({
      title,
      category,
      readTime,
      author: author || 'Medical Editorial Board • Reviewed by OB-GYN',
      summary: summary || 'Understanding your body changes empowers proactive reproductive health and fertility planning.',
      bulletPoints: bulletPoints || [
        'Recognize subtle shifts in physical cues and hormonal patterns.',
        'Keep track of your cycle to identify trends.',
        'Consult with certified specialists whenever unexpected changes occur.',
      ],
      fullText: fullText || 'Tracking hormonal fluctuations across your menstrual cycle provides invaluable health data. By monitoring physiological symptoms such as cervical fluid elasticity, basal body temperature, and energy levels, you can accurately predict your peak fertile window and optimize your reproductive wellness.',
      thumbnail,
    });
    setIsFullReadingMode(false);
  };

  const closeFullReadingMode = () => {
    setIsFullReadingMode(false);
    setSelectedArticle(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled={true}
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentOffset={{ x: 0, y: 0 }}
        style={{ flex: 1 }}
      >
        {/* PAGE 0: MERGED HOMEPAGE & MODE PAGE (CYCLE / PREGNANCY / POSTMENOPAUSE) */}
        <View style={[styles.pageWidth, { backgroundColor: '#FFFFFF' }]}>
          <TopProfileHeader
            user={user}
            isDoctorAccount={isDoctorAccount}
            userName={userName}
            userSubtitle={userSubtitle}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenNotifications={handleOpenNotifications}
            unreadNotificationsCount={unreadNotificationsCount}
          />

          {isPregnancyMode ? (
            <PregnancyScreen
              dueDate={pregnancyDueDate}
              conceptionDate={pregnancyConceptionDate}
              currentWeek={16}
              greetingDisplayName={greetingDisplayName}
              weekDays={weekDays}
              onSwitchToCycleMode={() => openModeChangeOnboarding('cycle')}
              onBookDoctor={handleBookDoctorFromHome}
              onOpenDoctorPage={() => scrollToPage(2)}
            />
          ) : isPostmenopauseMode ? (
            <PostmenopauseScreen
              greetingDisplayName={greetingDisplayName}
              weekDays={weekDays}
              onSwitchToCycleMode={() => openModeChangeOnboarding('cycle')}
              onOpenSetupWizard={(stage) => openModeChangeOnboarding(stage || 'postmenopause')}
              onBookDoctor={handleBookDoctorFromHome}
              onOpenDoctorPage={() => scrollToPage(2)}
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.pageScrollContentDark}
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
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeGreeting}>
                  Welcome, <Text style={styles.welcomeNameText}>{greetingDisplayName}</Text> 👋
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  Here's your cycle & health overview for today
                </Text>
              </View>

              {/* HERO FEATURED WHITE CARD - OPENS CYCLE CALENDAR ON TAP */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.heroCardContainer}
                onPress={() => setShowCycleCalendarModal(true)}
              >
                <View style={styles.heroWhiteCard}>
                  {/* Functional Ring & Cycle Details */}
                  <View style={styles.heroRingRow}>
                    <FunctionalCycleRing currentDay={displayCurrentDay} totalDays={displayCycleLength} />
                    <View style={styles.heroMetricsCol}>
                      <View style={styles.metricItemRow}>
                        <View style={[styles.metricDot, { backgroundColor: colors.primary }]} />
                        <Text style={styles.metricItemText}>
                          Next period <Text style={{ fontWeight: '800', color: '#111827' }}>{nextPeriodFormatted}</Text>
                        </Text>
                      </View>
                      <View style={styles.metricItemRow}>
                        <View style={[styles.metricDot, { backgroundColor: '#FF8A80' }]} />
                        <Text style={styles.metricItemText}>Cycle length: {displayCycleLength} days</Text>
                      </View>
                      <View style={styles.metricItemRow}>
                        <View style={[styles.metricDot, { backgroundColor: '#00A88F' }]} />
                        <Text style={styles.metricItemText}>{ovulationLabel}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

              {/* FEATURED CARD: TALK TO A DOCTOR */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.doctorFeaturedCard}
                onPress={() => scrollToPage(2)}
              >
                <View style={styles.doctorFeaturedTopRow}>
                  <Text style={styles.doctorFeaturedTitle}>Talk to a Doctor</Text>
                  <View style={styles.doctorActionPill}>
                    <Text style={styles.doctorActionPillText}>Consult</Text>
                    <Ionicons name="arrow-forward" size={13} color="#008080" />
                  </View>
                </View>
                <Text style={styles.doctorFeaturedSubtitle}>
                  Book a video consultation with a certified women's health specialist.
                </Text>
              </TouchableOpacity>

              {/* 2-COLUMN BENTO GRID: PREGNANCY & POSTMENOPAUSE */}
              <View style={styles.bentoSectionGrid}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.bentoWhiteCard}
                  onPress={() => openModeChangeOnboarding('pregnancy')}
                >
                  <Text style={styles.bentoCardHeading}>Pregnancy</Text>
                  <Text style={styles.bentoCardSub}>Baby growth & tracker</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.bentoWhiteCard}
                  onPress={() => openModeChangeOnboarding('postmenopause')}
                >
                  <Text style={styles.bentoCardHeading}>Menopause</Text>
                  <Text style={styles.bentoCardSub}>Hormones & vitality</Text>
                </TouchableOpacity>
              </View>

              {/* CYCLE FORECAST SECTION */}
              <View style={styles.predictionsContainer}>
                <Text style={styles.sectionHeaderLabelDark}>CYCLE FORECAST</Text>
                <View style={{ gap: 12 }}>
                  <View style={styles.upcomingPredictionCardClean}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.upcomingCardMainTitle}>{upcomingPredictions.periodMainTitle}</Text>
                      <Text style={styles.upcomingCardSubTitle}>{upcomingPredictions.periodSubTitle}</Text>
                    </View>
                  </View>
                </View>
              </View>



              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </View>

        {/* PAGE 1: LEARN & INSIGHTS */}
        <View style={[styles.pageWidth, { backgroundColor: '#FFFFFF' }]}>
          <TopProfileHeader
            user={user}
            isDoctorAccount={isDoctorAccount}
            userName={userName}
            userSubtitle={userSubtitle}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenNotifications={handleOpenNotifications}
            unreadNotificationsCount={unreadNotificationsCount}
          />

          <LearnScreen openArticleDetails={openArticleDetails} />
        </View>

        {/* PAGE 2: DOCTOR CARE / TELEMEDICINE */}
        <View style={[styles.pageWidth, { backgroundColor: '#FFFFFF' }]}>
          <DoctorCareScreen
            initialDoctor={selectedDoctorForBooking}
            onBookDoctor={handleBookDoctorFromHome}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenNotifications={handleOpenNotifications}
            unreadNotificationsCount={unreadNotificationsCount}
            onNavigateHome={() => scrollToPage(0)}
          />
        </View>
      </ScrollView>

      {/* PERSISTENT BOTTOM NAVIGATION BAR WITH ROUNDED PARENT CONTAINER */}
      <View style={styles.bottomBarParentContainer}>
        <View style={styles.persistentBottomBar}>
          {/* TAB 1: HOMEPAGE */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.bottomBarTab}
            onPress={() => scrollToPage(0)}
          >
            <Ionicons
              name={currentPage === 0 ? "home" : "home-outline"}
              size={22}
              color={currentPage === 0 ? colors.primary : "#8E8E93"}
            />
            <Text
              style={[
                styles.bottomBarTabLabel,
                currentPage === 0 && styles.bottomBarTabLabelActive,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          {/* TAB 2: CENTER AI AGENT ASSISTANT & SYMPTOM LOG */}
          <View style={styles.bottomBarCenterBtnWrapper}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.bottomBarCenterBtn}
              onPress={() => setShowDailyLogDrawer(true)}
              accessibilityLabel="AI Health Companion"
            >
              <Ionicons name="sparkles" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* TAB 3: LEARN */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.bottomBarTab}
            onPress={() => scrollToPage(1)}
          >
            <Ionicons
              name={currentPage === 1 ? "book" : "book-outline"}
              size={22}
              color={currentPage === 1 ? colors.primary : "#8E8E93"}
            />
            <Text
              style={[
                styles.bottomBarTabLabel,
                currentPage === 1 && styles.bottomBarTabLabelActive,
              ]}
            >
              Learn
            </Text>
          </TouchableOpacity>

          {/* TAB 4: TELEMEDICINE */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.bottomBarTab}
            onPress={() => scrollToPage(2)}
          >
            <Ionicons
              name={currentPage === 2 ? "videocam" : "videocam-outline"}
              size={22}
              color={currentPage === 2 ? colors.primary : "#8E8E93"}
            />
            <Text
              style={[
                styles.bottomBarTabLabel,
                currentPage === 2 && styles.bottomBarTabLabelActive,
              ]}
            >
              Telemed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <SafeAreaView style={styles.articleDetailContainer} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.articleDetailHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeDetailButton}
              onPress={() => setShowNotificationsModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary }}>Notifications</Text>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeDetailButton}
              onPress={handleMarkAllNotificationsRead}
            >
              <Ionicons name="checkmark-done" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.articleDetailScrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isNotificationsLoading}
                onRefresh={async () => {
                  setIsNotificationsLoading(true);
                  await reloadNotifications();
                  setIsNotificationsLoading(false);
                }}
                tintColor={colors.primary}
              />
            }
          >
            {displayNotifications.length === 0 ? (
              <View style={styles.notificationEmptyContainer}>
                <View style={styles.notificationEmptyIconCircle}>
                  <Ionicons name="notifications-outline" size={38} color="#9CA3AF" />
                </View>
                <Text style={styles.notificationEmptyTitle}>All Caught Up!</Text>
                <Text style={styles.notificationEmptySubtitle}>
                  You don't have any unread health alerts right now. We will notify you when your cycle, medication, or consultation timings approach.
                </Text>
              </View>
            ) : (
              displayNotifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.75}
                  style={[
                    styles.notificationItemRow,
                    !item.isRead && styles.notificationItemRowUnread,
                  ]}
                  onPress={() => handlePressNotificationItem(item)}
                >
                  <View style={[styles.notificationIconCircle, { backgroundColor: item.iconBg || '#FFE5E9' }]}>
                    <Ionicons name={item.icon || 'notifications'} size={22} color={item.iconColor || colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={styles.notificationHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <Text style={styles.notificationTitle} numberOfLines={1}>{item.title}</Text>
                        {!item.isRead && <View style={styles.notificationUnreadDot} />}
                      </View>
                      <Text style={styles.notificationTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.notificationBody}>{item.body}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showCycleCalendarModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowCycleCalendarModal(false)}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        {showCycleCalendarModal && (
          <SafeAreaView style={styles.calendarPageContainer} edges={['top', 'bottom', 'left', 'right']}>
            {/* TOP HEADER */}
            <View style={styles.calendarPageHeader}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.calendarPageBackBtn}
                onPress={() => setShowCycleCalendarModal(false)}
              >
                <Ionicons name="arrow-back" size={22} color="#111827" />
              </TouchableOpacity>

              <View style={{ alignItems: 'center' }}>
                <Text style={styles.calendarPageTitle}>Cycle Calendar</Text>
              </View>

              <View style={{ width: 38 }} />
            </View>

            {/* PINNED STICKY WEEKDAY & LEGEND ROW */}
            <View style={styles.calendarPagePinnedHeader}>
              {/* Compact Legend Row */}
              <View style={styles.calendarPageLegendRow}>
                <View style={styles.calendarLegendItem}>
                  <View style={[styles.calendarLegendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.calendarLegendText}>Period</Text>
                </View>
                <View style={styles.calendarLegendItem}>
                  <View style={[styles.calendarLegendDot, { backgroundColor: '#E0F2F1', borderWidth: 1, borderColor: '#00A88F' }]} />
                  <Text style={styles.calendarLegendText}>Fertile</Text>
                </View>
                <View style={styles.calendarLegendItem}>
                  <View style={[styles.calendarLegendDot, { backgroundColor: '#00A88F' }]} />
                  <Text style={styles.calendarLegendText}>Ovulation</Text>
                </View>
                <View style={styles.calendarLegendItem}>
                  <View style={[styles.calendarLegendDot, { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#FFFFFF' }]} />
                  <Text style={styles.calendarLegendText}>Today</Text>
                </View>
              </View>

              {/* Weekday Row */}
              <View style={styles.calendarPageWeekdayRow}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, idx) => (
                  <View key={idx} style={styles.calendarPageWeekdayCol}>
                    <Text style={styles.calendarPageWeekdayText}>{w}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* SINGLE CURRENT MONTH SCROLLABLE CONTENT */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.calendarPageScrollContent}
            >
              <View style={styles.calendarMonthBlockSingle}>
                {/* Month Title Header */}
                <View style={styles.calendarMonthHeaderRow}>
                  <Text style={styles.calendarMonthTitleText}>{currentMonthData.monthTitle}</Text>
                </View>

                {/* Day Cells Grid (7 Columns) */}
                <View style={styles.calendarMonthGrid}>
                  {currentMonthData.cells.map((cell) => {
                    if (cell.empty) {
                      return <View key={cell.key} style={styles.calendarPageCellTouchable} />;
                    }

                    const isSelected = (selectedDateCellInfo?.dateKey || selectedDateKey) === cell.dateKey;
                    const isToday = cell.isToday;

                    let cellBg = 'transparent';
                    let textColor = '#1F2937';
                    let fontWeight = '600';
                    const isPeriodDay = cell.type === 'period';

                    if (cell.type === 'period') {
                      cellBg = '#FFEBEE';
                      textColor = colors.primary;
                      fontWeight = '800';
                    } else if (cell.type === 'ovulation') {
                      cellBg = '#00A88F';
                      textColor = '#FFFFFF';
                      fontWeight = '900';
                    } else if (cell.type === 'fertile') {
                      cellBg = '#E0F2F1';
                      textColor = '#008080';
                      fontWeight = '800';
                    }

                    if (isToday) {
                      fontWeight = '900';
                      if (!isPeriodDay && cell.type === 'normal') {
                        cellBg = '#F3F4F6';
                        textColor = colors.primary;
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={cell.key}
                        activeOpacity={0.7}
                        style={styles.calendarPageCellTouchable}
                        onPress={() => setSelectedDateKey(cell.dateKey)}
                      >
                        <View
                          style={[
                            styles.calendarPageDayCellCircle,
                            { backgroundColor: cellBg },
                            isToday && { borderWidth: 2, borderColor: colors.primary },
                            isSelected && !isToday && styles.dayCellSelected,
                            isSelected && isToday && styles.dayCellTodaySelected,
                          ]}
                        >
                          <Text style={{ fontSize: 13, fontWeight, color: textColor }}>
                            {cell.dayNum}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* SELECTED DAY INSIGHT & ACTION CARD */}
              {selectedDateCellInfo && (
                <View style={styles.calendarDayInsightCard}>
                  <View style={styles.calendarDayInsightTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.calendarDayInsightDate}>
                        {(() => {
                          const [y, m, d] = selectedDateCellInfo.dateKey.split('-');
                          const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
                          const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                          const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          const dayName = daysShort[dateObj.getDay()];
                          const monthName = monthsShort[dateObj.getMonth()];
                          return `${dayName}, ${monthName} ${Number(d)}${selectedDateCellInfo.isToday ? ' • Today' : ''}`;
                        })()}
                      </Text>
                      <Text style={styles.calendarDayInsightPhase}>
                        {selectedDateCellInfo.type === 'period'
                          ? `🩸 Menstrual Period • Day ${selectedDateCellInfo.cycleDay}`
                          : selectedDateCellInfo.type === 'ovulation'
                          ? `✨ Ovulation Day • Peak Fertility (Day ${selectedDateCellInfo.cycleDay})`
                          : selectedDateCellInfo.type === 'fertile'
                          ? `🌱 Fertile Window • High Chance (Day ${selectedDateCellInfo.cycleDay})`
                          : selectedDateCellInfo.cycleDay > 15
                          ? `🌙 Luteal Phase • Day ${selectedDateCellInfo.cycleDay}`
                          : `🌸 Follicular Phase • Day ${selectedDateCellInfo.cycleDay}`}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.calendarPhasePill,
                        selectedDateCellInfo.type === 'period' && { backgroundColor: '#FFEBEE' },
                        selectedDateCellInfo.type === 'ovulation' && { backgroundColor: '#E0F2F1' },
                        selectedDateCellInfo.type === 'fertile' && { backgroundColor: '#E0F2F1' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarPhasePillText,
                          selectedDateCellInfo.type === 'period' && { color: colors.primary },
                          selectedDateCellInfo.type === 'ovulation' && { color: '#008080' },
                          selectedDateCellInfo.type === 'fertile' && { color: '#008080' },
                        ]}
                      >
                        Day {selectedDateCellInfo.cycleDay}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.calendarDayInsightNote}>
                    {selectedDateCellInfo.type === 'period'
                      ? 'Active menstrual flow. Stay hydrated, use warm compresses for cramping, and track flow intensity.'
                      : selectedDateCellInfo.type === 'ovulation'
                      ? 'Ovulation is predicted today. This is your peak 24-hour fertile window.'
                      : selectedDateCellInfo.type === 'fertile'
                      ? 'Elevated fertility window. Sperm can survive up to 5 days leading up to ovulation.'
                      : selectedDateCellInfo.cycleDay > 15
                      ? 'Progesterone is supporting your body in the second half of your cycle.'
                      : 'Estrogen is gradually rising as follicles mature. Great time for high energy activities.'}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.calendarLogDayBtn}
                    onPress={() => setShowDailyLogDrawer(true)}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.calendarLogDayBtnText}>Log Symptoms for this Day</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* MONTH OVERVIEW SUMMARY STATS */}
              <View style={styles.calendarMonthStatsRow}>
                <View style={styles.calendarMonthStatCard}>
                  <Text style={styles.calendarMonthStatVal}>{displayCycleLength}d</Text>
                  <Text style={styles.calendarMonthStatLbl}>Cycle Length</Text>
                </View>
                <View style={styles.calendarMonthStatCard}>
                  <Text style={[styles.calendarMonthStatVal, { color: colors.primary }]}>
                    {currentMonthData.stats?.periodDaysCount || 5}d
                  </Text>
                  <Text style={styles.calendarMonthStatLbl}>Period Days</Text>
                </View>
                <View style={styles.calendarMonthStatCard}>
                  <Text style={[styles.calendarMonthStatVal, { color: '#00A88F' }]}>
                    {currentMonthData.stats?.fertileDaysCount ? `${currentMonthData.stats.fertileDaysCount}d` : '6d'}
                  </Text>
                  <Text style={styles.calendarMonthStatLbl}>Fertile Days</Text>
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* AI HEALTH ASSISTANT & SYMPTOM LOG DRAWER                                  */}
      {/* ========================================================================= */}
      <AIAssistantDrawer
        visible={showDailyLogDrawer}
        onClose={() => setShowDailyLogDrawer(false)}
        selectedDateKey={selectedDateKey}
        healthContext={{
          activeMode: isPregnancyMode ? 'pregnancy' : isPostmenopauseMode ? 'postmenopause' : 'cycle',
          userName: greetingDisplayName || userName,
          userAge: user?.date_of_birth ? Math.floor((new Date().getTime() - new Date(user.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000)) : undefined,
          medicalProfile: {
            reproductiveGoal: user?.health_profile?.reproductiveGoal || (isPregnancyMode ? 'track_pregnancy' : 'track_cycle'),
            birthControl: user?.health_profile?.birthControl || 'None reported',
            knownConditions: user?.health_profile?.conditions || [],
            notes: user?.health_profile?.notes || '',
          },
          appointments: userBookingsList.map((b) => ({
            id: b.booking_id,
            doctorId: b.doctor_id,
            doctorName: b.doctor_name,
            doctorSpecialty: b.doctor_specialty,
            scheduledTime: b.scheduled_time,
            consultationType: b.consultation_type,
            status: b.status,
            reason: b.reason,
          })),
          pregnancy: isPregnancyMode ? {
            currentWeek: 16,
            dueDate: pregnancyDueDate,
            conceptionDate: pregnancyConceptionDate,
            trimester: 2,
            babySize: 'Avocado',
          } : null,
          postmenopause: isPostmenopauseMode ? {
            stage: activeHealthMode,
          } : null,
          cycle: {
            currentCycleDay: displayCurrentDay,
            cycleLength: displayCycleLength,
            phaseName: cyclePrediction.currentPhase
              ? cyclePrediction.currentPhase.charAt(0).toUpperCase() + cyclePrediction.currentPhase.slice(1) + ' Phase'
              : 'Menstrual Phase',
            nextPeriodDate: nextPeriodFormatted,
            ovulationDate: ovulationFormatted,
            selectedDate: selectedDateKey,
          },
        }}
        onSaveLog={handleSaveDailyLog}
        onNavigateTelemedicine={() => scrollToPage(2)}
      />

      <Modal
        visible={showExpandedCycleModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowExpandedCycleModal(false)}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <SafeAreaView style={styles.articleDetailContainer} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.articleDetailHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeDetailButton}
              onPress={() => setShowExpandedCycleModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary }}>Cycle Day {displayCurrentDay}</Text>

            <TouchableOpacity activeOpacity={0.7} style={styles.closeDetailButton}>
              <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.articleDetailScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.expandedRingHeaderCard}>
              <FunctionalCycleRing currentDay={displayCurrentDay} totalDays={displayCycleLength} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.expandedRingTitle}>Day {displayCurrentDay} of {displayCycleLength}</Text>
                <Text style={styles.expandedRingSub}>{Math.min(Math.round((displayCurrentDay / displayCycleLength) * 100), 100)}% through current cycle</Text>
                <View style={styles.nextPeriodBadge}>
                  <Ionicons name="water-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.nextPeriodBadgeText}>Next Period: {nextPeriodFormatted} ({upcomingPredictions.periodPill})</Text>
                </View>
              </View>
            </View>

            <Text style={styles.takeawayHeader}>Cycle Phase Overview</Text>
            <View style={styles.segmentedPhaseCard}>
              <View style={styles.phaseBarRow}>
                <View style={[styles.phaseBarSegment, { backgroundColor: '#FFCDD2' }]} />
                <View style={[styles.phaseBarSegment, { backgroundColor: '#D0F5ED' }]} />
                <View style={[styles.phaseBarSegment, { backgroundColor: '#00A88F' }]} />
                <View style={[styles.phaseBarSegment, { backgroundColor: colors.primary }]} />
              </View>

              <View style={styles.phaseLabelsGrid}>
                <View style={styles.phaseItem}>
                  <Text style={styles.phaseItemTitle}>Period</Text>
                  <Text style={styles.phaseItemDays}>Days 1–5</Text>
                </View>
                <View style={styles.phaseItem}>
                  <Text style={styles.phaseItemTitle}>Egg Prep</Text>
                  <Text style={styles.phaseItemDays}>Days 6–12</Text>
                </View>
                <View style={styles.phaseItem}>
                  <Text style={styles.phaseItemTitle}>Fertile</Text>
                  <Text style={styles.phaseItemDays}>Days 13–16</Text>
                </View>
                <View style={[styles.phaseItem, styles.phaseItemActive]}>
                  <Text style={[styles.phaseItemTitle, { color: colors.primary }]}>Pre-Period</Text>
                  <Text style={styles.phaseItemDays}>Days 17–28</Text>
                </View>
              </View>
            </View>

            <Text style={styles.takeawayHeader}>Your Body's Signals Today</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              contentContainerStyle={{ gap: 12 }}
            >
              <View style={[styles.biometricCardRow, { width: 240, marginBottom: 0 }]}>
                <View style={[styles.bioIconCircle, { backgroundColor: '#E0F2F1' }]}>
                  <Ionicons name="sparkles" size={20} color="#00A88F" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.bioCardTitle}>Pregnancy Chance</Text>
                  <Text style={styles.bioCardVal}>Low (Egg already released)</Text>
                </View>
              </View>

              <View style={[styles.biometricCardRow, { width: 240, marginBottom: 0 }]}>
                <View style={[styles.bioIconCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="stats-chart" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.bioCardTitle}>Hormone Shift</Text>
                  <Text style={styles.bioCardVal}>Progesterone dipping</Text>
                </View>
              </View>

              <View style={[styles.biometricCardRow, { width: 240, marginBottom: 0 }]}>
                <View style={[styles.bioIconCircle, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="thermometer-outline" size={20} color="#E65100" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.bioCardTitle}>Morning Temp</Text>
                  <Text style={styles.bioCardVal}>36.6 °C (Warm pre-period)</Text>
                </View>
              </View>
            </ScrollView>

            <Text style={styles.takeawayHeader}>What to Expect Today</Text>
            <View style={styles.insightBoxTextContainer}>
              <Text style={styles.fullArticleBodyText}>
                Your body is getting ready for your period in about 3 days as your hormone levels naturally dip. It's completely normal to feel lower energy, breast tenderness, mild bloating, or light cramps today.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* REDESIGNED SLEEK WELCOME BACK TO CYCLE TRACKING DRAWER */}
      <Modal
        visible={showWelcomeBackDrawer}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowWelcomeBackDrawer(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.drawerBackdrop}
          onPress={() => setShowWelcomeBackDrawer(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.drawerContentContainer}
          >
            {/* Top Close Button & Drag Handle */}
            <View style={styles.modernDrawerTopBar}>
              <View style={styles.drawerHandlePill} />
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.modernDrawerCloseBtn}
                onPress={() => setShowWelcomeBackDrawer(false)}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Hero Centered Heading */}
              <View style={styles.modernDrawerHeroSection}>
                <Text style={styles.modernDrawerTitle}>Welcome Back</Text>
                <Text style={styles.modernDrawerSubtitle}>
                  {welcomeBackFromMode === 'pregnancy'
                    ? 'Has your period returned since pregnancy?'
                    : 'Ready to resume your cycle tracking?'}
                </Text>
              </View>

              {/* Clean Choice Card 1: Yes, period started */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.modernChoiceCard,
                  welcomePeriodStatus === 'started' && styles.modernChoiceCardActive,
                ]}
                onPress={() => setWelcomePeriodStatus('started')}
              >
                <View style={styles.modernChoiceIconBoxRed}>
                  <Ionicons name="water" size={22} color={colors.primary} />
                </View>
                <View style={styles.modernChoiceTextCol}>
                  <Text style={styles.modernChoiceTitle}>Yes, my period started</Text>
                  <Text style={styles.modernChoiceSub}>Pick the exact date on the calendar</Text>
                </View>
                <Ionicons
                  name={welcomePeriodStatus === 'started' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={welcomePeriodStatus === 'started' ? colors.primary : '#D1D5DB'}
                />
              </TouchableOpacity>

              {/* Precision Date Picker (Revealed when 'started' is selected) */}
              {welcomePeriodStatus === 'started' && (
                <MiniCalendarDatePicker
                  selectedDate={welcomePeriodDate}
                  onSelectDate={(date) => setWelcomePeriodDate(date)}
                  maxDate={new Date()}
                />
              )}

              {/* Clean Choice Card 2: Not yet */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.modernChoiceCard,
                  welcomePeriodStatus === 'not_yet' && styles.modernChoiceCardActivePurple,
                  { marginTop: 12 },
                ]}
                onPress={() => setWelcomePeriodStatus('not_yet')}
              >
                <View style={styles.modernChoiceIconBoxPurple}>
                  <Ionicons name="moon-outline" size={22} color="#7C3AED" />
                </View>
                <View style={styles.modernChoiceTextCol}>
                  <Text style={styles.modernChoiceTitle}>Not yet</Text>
                  <Text style={styles.modernChoiceSub}>Still waiting / in transition</Text>
                </View>
                <Ionicons
                  name={welcomePeriodStatus === 'not_yet' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={welcomePeriodStatus === 'not_yet' ? '#7C3AED' : '#D1D5DB'}
                />
              </TouchableOpacity>

              {/* Primary Action Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.modernPrimaryBtn}
                onPress={handleSaveWelcomeBackCycle}
              >
                <Text style={styles.modernPrimaryBtnText}>Continue</Text>
              </TouchableOpacity>

              {/* Subtle Dismiss Link */}
              <TouchableOpacity
                activeOpacity={0.6}
                style={styles.modernSkipBtn}
                onPress={() => setShowWelcomeBackDrawer(false)}
              >
                <Text style={styles.modernSkipBtnText}>Skip for now</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* UNIFIED GENERAL ONBOARDING SETUP MODAL (FOR SEAMLESS MODE CHANGES) */}
      <Modal
        visible={showModeChangeModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => {
          setShowModeChangeModal(false);
          setModeChangeTarget(null);
        }}
      >
        <OnboardingSetupScreen
          initialStage={modeChangeTarget}
          isChangingMode={true}
          onBack={() => {
            setShowModeChangeModal(false);
            setModeChangeTarget(null);
          }}
          onComplete={handleCompleteModeChange}
        />
      </Modal>

      {/* SNAPCHAT-INSPIRED PROFILE & HEALTH RECORDS MODAL */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <ProfileScreen
          onClose={() => setShowProfileModal(false)}
          onOpenSettings={() => {
            setShowProfileModal(false);
            setShowSettingsModal(true);
          }}
          currentMode={isPregnancyMode ? 'pregnancy' : isPostmenopauseMode ? 'postmenopause' : 'cycle'}
          cyclePrediction={cyclePrediction}
          activeCycleProfile={activeCycleProfile}
          cycleLogs={cycleLogs}
          onBookDoctor={() => {
            setShowProfileModal(false);
            scrollToPage(2);
          }}
        />
      </Modal>

      {/* SETTINGS & PREFERENCES MODAL */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <SettingsScreen
          onClose={() => setShowSettingsModal(false)}
          onSignOut={() => {
            setShowSettingsModal(false);
            onSignOut && onSignOut();
          }}
          onRedoSetup={() => {
            setShowSettingsModal(false);
            openModeChangeOnboarding(null);
          }}
          currentMode={isPregnancyMode ? 'pregnancy' : isPostmenopauseMode ? 'postmenopause' : 'cycle'}
          onSwitchMode={(mode) => {
            setShowSettingsModal(false);
            openModeChangeOnboarding(mode);
          }}
          onOpenPrivacyPolicy={() => setShowPrivacyPolicyModal(true)}
          onOpenTermsOfUse={() => setShowTermsModal(true)}
          cyclePrediction={cyclePrediction}
          activeCycleProfile={activeCycleProfile}
          cycleLogs={cycleLogs}
          onBookDoctor={() => {
            setShowSettingsModal(false);
            scrollToPage(2);
          }}
        />
      </Modal>

      {/* PRIVACY POLICY DETAIL MODAL */}
      <Modal
        visible={showPrivacyPolicyModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowPrivacyPolicyModal(false)}
      >
        <PrivacyPolicyDetailScreen onBack={() => setShowPrivacyPolicyModal(false)} />
      </Modal>

      {/* TERMS OF USE DETAIL MODAL */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <TermsOfUseDetailScreen onBack={() => setShowTermsModal(false)} />
      </Modal>



      <Modal
        visible={showLegendModal}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowLegendModal(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowLegendModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Calendar Guide</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowLegendModal(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.legendGridModal}>
              <View style={styles.legendPill}>
                <View style={[styles.legendDot, { backgroundColor: '#FFCDD2' }]} />
                <Text style={styles.legendText}>Period</Text>
              </View>
              <View style={styles.legendPill}>
                <View style={[styles.legendDot, { backgroundColor: '#D0F5ED' }]} />
                <Text style={styles.legendText}>Fertile window</Text>
              </View>
              <View style={styles.legendPill}>
                <View style={[styles.legendDot, { backgroundColor: '#00A88F' }]} />
                <Text style={styles.legendText}>Ovulation</Text>
              </View>
              <View style={styles.legendPill}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Today</Text>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!selectedArticle && !isFullReadingMode}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setSelectedArticle(null)}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <TouchableOpacity
          activeOpacity={1}
          style={styles.drawerBackdrop}
          onPress={() => setSelectedArticle(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.drawerContentContainer}
          >
            {/* FULL-WIDTH TOP IMAGE HEADER WITH OVERLAY CONTROLS */}
            {selectedArticle?.thumbnail ? (
              <View style={styles.drawerTopHeaderContainer}>
                <Image
                  source={{ uri: selectedArticle.thumbnail }}
                  style={styles.drawerTopHeaderImage}
                  resizeMode="cover"
                />
                <View style={styles.drawerHandlePillOverlay} />
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.drawerCloseButtonOverlay}
                  onPress={() => setSelectedArticle(null)}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ paddingTop: 12, paddingHorizontal: 20 }}>
                <View style={styles.drawerHandlePill} />
                <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.bookmarkButtonCircle}
                    onPress={() => setSelectedArticle(null)}
                  >
                    <Ionicons name="close" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerScrollBody}>
              <Text style={styles.drawerArticleTitle}>{selectedArticle?.title}</Text>
              <Text style={styles.drawerArticleMeta}>{selectedArticle?.readTime} • {selectedArticle?.author}</Text>

              <View style={styles.dividerLine} />

              <Text style={styles.drawerSummaryText}>{selectedArticle?.summary}</Text>

              <Text style={styles.takeawayHeader}>Key Takeaways</Text>
              {selectedArticle?.bulletPoints.map((point, index) => (
                <View key={index} style={styles.takeawayRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.drawerTakeawayText}>{point}</Text>
                </View>
              ))}

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.openFullArticleButton}
                onPress={() => setIsFullReadingMode(true)}
              >
                <Ionicons name="book" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.openFullArticleButtonText}>Read Full Article</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!selectedArticle && isFullReadingMode}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={closeFullReadingMode}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        {selectedArticle && (
          <SafeAreaView style={styles.articleDetailContainer} edges={['top', 'bottom', 'left', 'right']}>
            <View style={styles.articleDetailHeader}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.closeDetailButton}
                onPress={closeFullReadingMode}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} style={styles.closeDetailButton}>
                <Ionicons name="bookmark-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.articleDetailScrollContent} showsVerticalScrollIndicator={false}>
              {selectedArticle?.thumbnail && (
                <View style={styles.fullArticleThumbnailContainer}>
                  <Image
                    source={{ uri: selectedArticle.thumbnail }}
                    style={styles.fullArticleThumbnailImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              <Text style={styles.articleDetailTitle}>{selectedArticle.title}</Text>
              <Text style={styles.articleDetailMeta}>{selectedArticle.readTime} • {selectedArticle.author}</Text>

              <View style={styles.dividerLine} />

              <Text style={styles.fullArticleBodyText}>{selectedArticle.fullText}</Text>
              <Text style={styles.fullArticleBodyText}>
                Consistency in logging daily health metrics yields the highest statistical confidence when computing personal cycle averages. Over time, your personal Red Apple insights adapt directly to your unique hormonal rhythm.
              </Text>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  /* Persistent Floating Bottom Navigation Bar Parent Container */
  bottomBarParentContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 999,
  },
  persistentBottomBar: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  bottomBarTab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  bottomBarTabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 2,
  },
  bottomBarTabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  bottomBarCenterBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  bottomBarCenterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },

  /* TOP BAR: USER PROFILE & ACTION BUTTONS */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUSBAR_HEIGHT + 6,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  userTextCol: {
    marginLeft: 12,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  verifiedDoctorBadge: {
    marginLeft: 2,
  },
  userSubtitleText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 2,
  },

  /* Homepage Styles */
  homepageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  homepageText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  /* Modern Light Mockup 1 Styles */
  darkCyclePage: {
    backgroundColor: '#FFFFFF',
  },
  modernDarkTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: STATUSBAR_HEIGHT + 6,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  brandSquircleBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchGlassCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginLeft: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  modernDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  modernDotActive: {
    backgroundColor: '#DC2626',
    width: 16,
  },
  modernDotInactive: {
    backgroundColor: '#D1D5DB',
  },
  bellBtnDark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  bellBadgeGlow: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  bellBadgeGlowText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  pageScrollContentDark: {
    paddingTop: 8,
    paddingBottom: 90,
    backgroundColor: '#FFFFFF',
  },

  /* Horizontal Stories Row */
  storiesContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  storyCard: {
    alignItems: 'center',
    width: 66,
  },
  storyAvatarBox: {
    width: 66,
    height: 66,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  storyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
  },

  /* Welcome Message Section (Just on top of the Cycle Card) */
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  welcomeGreeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
  },
  welcomeNameText: {
    color: colors.primary,
    fontWeight: '800',
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 3,
  },

  /* Hero Featured White Card (Matching Mockup 1: Spacious, Uncluttered) */
  heroCardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  heroWhiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  heroCardCalendarLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  heroCardCalendarLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCardCalendarLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  heroCardCalendarLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroCardCalendarLinkPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  heroCardPhaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroPhasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E9',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 20,
    gap: 6,
  },
  heroPhasePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  heroDayBadge: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 20,
  },
  heroDayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroUserAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  heroUserName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  heroUserPhase: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  heroRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroMetricsCol: {
    flex: 1,
    marginLeft: 18,
    gap: 10,
  },
  metricItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  metricItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  heroFooterMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  /* Hero Floating Actions Docked Right */
  heroFloatingActions: {
    position: 'absolute',
    right: -8,
    bottom: 24,
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  heroActionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827', // High contrast floating buttons matching mockup
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  heroActionBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  heroActionBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  /* 2-Column Bento Grid */
  bentoSectionGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  bentoWhiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    minHeight: 88,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bentoIconSquare: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoCardHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginTop: 0,
    marginBottom: 2,
  },
  bentoCardSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },

  /* Doctor Featured Card (Matching Mockup 2 Featured Card) */
  doctorFeaturedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  doctorFeaturedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  doctorBadgeIconLarge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorFeaturedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 0,
  },
  doctorFeaturedSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 18,
  },
  doctorActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  doctorActionPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#008080',
  },

  /* Cal AI Style 7-Day Calendar Strip */
  calAiCalendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
  },
  calAiDayCol: {
    alignItems: 'center',
    flex: 1,
  },
  calAiCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  calAiCircleDashed: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  calAiCircleToday: {
    backgroundColor: '#111827',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  calAiCirclePeriod: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: '#FFE5E9',
  },
  calAiCircleSelected: {
    borderWidth: 2,
    borderColor: '#111827',
    borderStyle: 'solid',
  },
  calAiDayLetter: {
    fontSize: 13,
    fontWeight: '700',
  },
  calAiDayLetterNormal: {
    color: '#6B7280',
  },
  calAiDayLetterToday: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  calAiDayLetterPeriod: {
    color: colors.primary,
    fontWeight: '800',
  },
  calAiDateNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  calAiDateNumToday: {
    color: '#111827',
    fontWeight: '900',
  },
  calAiDateNumPeriod: {
    color: colors.primary,
    fontWeight: '800',
  },
  calAiDateNumSelected: {
    color: '#111827',
    fontWeight: '900',
  },

  /* Predictions Container */
  predictionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeaderLabelDark: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  upcomingPredictionCardClean: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  upcomingIconSquircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingPillRed: {
    backgroundColor: '#FFE5E9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  upcomingPillRedText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  upcomingPillGreen: {
    backgroundColor: '#E0F2F1',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  upcomingPillGreenText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#008080',
  },
  upcomingCardMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  upcomingCardSubTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },

  /* Floating Bottom Dock (Anchored at Bottom, matching Mockup 1) */
  floatingBottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827', // High contrast floating dark dock matching mockup
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  dockPlusGlowButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  dockUserStatusRow: {
    flex: 1,
    marginLeft: 14,
  },
  dockUserStatusName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dockUserStatusSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  dockGearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },

  /* Shazam Header */
  shazamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUSBAR_HEIGHT + 6,
    paddingBottom: 12,
  },
  headerShortcutLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: 90,
  },
  headerShortcutRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: 90,
  },
  headerShortcutLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  centerTitleDotCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  headerIconOnly: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconOnlySpacer: {
    width: 44,
  },
  centerDotCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerModeTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerModeToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#D0D0D8',
  },

  /* Full Width Swipe Pages */
  pageWidth: {
    width: SCREEN_WIDTH,
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  pageScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },

  /* Greeting Header */
  greetingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  greetingSub: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  greetingName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  /* Notifications Modal Styles */
  notificationItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  notificationItemRowUnread: {
    backgroundColor: '#FFFBF8',
    borderColor: '#FED7AA',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 6,
  },
  notificationIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  notificationTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 4,
  },
  notificationEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  notificationEmptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notificationEmptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  notificationEmptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* Outside Month Header Styles (Matching Prototype) */
  calendarHeaderOutsideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  calendarMonthTitleOutside: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  calendarSubTitleOutside: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  calendarNavBtnOutside: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },

  /* Compact Calendar Card */
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarMonthTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  calendarSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  calendarSubTitle: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  infoIconButton: {
    padding: 2,
  },
  framelessChartButton: {
    padding: 6,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayCellCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 17,
    overflow: 'hidden',
  },
  dayCellTodaySelected: {
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderRadius: 17,
    overflow: 'hidden',
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNormal: {
    backgroundColor: 'transparent',
  },
  dayTextNormal: {
    color: colors.textPrimary,
  },
  dayPeriod: {
    backgroundColor: '#FFCDD2',
  },
  dayTextPeriod: {
    color: colors.primary,
    fontWeight: '800',
  },
  dayFertile: {
    backgroundColor: '#D0F5ED',
  },
  dayTextFertile: {
    color: '#00A88F',
    fontWeight: '800',
  },
  dayOvulation: {
    backgroundColor: '#00A88F',
  },
  dayTextOvulation: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  dayToday: {
    backgroundColor: colors.primary,
  },
  dayTextToday: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  dayTextBase: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Main Cycle Ring Summary Card */
  mainCycleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardExpandButtonTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  ringWrapper: {
    marginRight: 16,
  },
  cycleDetailsCol: {
    flex: 1,
  },
  cycleDetailHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  bulletText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '400',
  },
  boldText: {
    fontWeight: '800',
  },

  /* Expanded Cycle Modal Styles */
  expandedRingHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FAF0F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  expandedRingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  expandedRingSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  nextPeriodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nextPeriodBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  segmentedPhaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FAF0F2',
    marginBottom: 20,
  },
  phaseBarRow: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
    gap: 4,
  },
  phaseBarSegment: {
    flex: 1,
  },
  phaseLabelsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phaseItem: {
    flex: 1,
  },
  phaseItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 4,
  },
  phaseItemTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  phaseItemDays: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  biometricGridCol: {
    gap: 12,
    marginBottom: 20,
  },
  biometricCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  bioIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  bioCardVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  insightBoxTextContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FAF0F2',
    marginBottom: 24,
  },

  /* Solid Side-by-Side Action Cards */
  solidActionCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  solidFullWidthDoctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0F2F1',
    borderColor: '#B2DFDB',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    shadowColor: '#008080',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  doctorCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doctorIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#008080',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  doctorCardMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#004D4D',
  },
  doctorCardSubTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#006666',
    marginTop: 2,
  },
  doctorConsultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  doctorConsultBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#008080',
    marginRight: 4,
  },

  solidPregnancyCard: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  solidDoctorCard: {
    flex: 1,
    backgroundColor: '#008080',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#008080',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  solidCardIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  solidCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  solidCardSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  /* Daily Log Summary Card */
  dailyLogSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FAF0F2',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dailyLogSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dailyLogIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyLogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyLogMainTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  todayLoggedBadge: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayLoggedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00A88F',
  },
  dailyLogSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logTodayActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  logTodayActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Daily Log Drawer Specific Styles */
  dailyLogDrawerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  dailyLogDrawerSub: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  feelingIconsRowDrawer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  feelingCircleButtonDrawer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F5F5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feelingLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 4,
  },
  innerDividerLine: {
    height: 1,
    backgroundColor: '#F0F0F5',
    marginVertical: 14,
  },
  saveDailyLogButtonDrawer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 16,
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveDailyLogTextDrawer: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* MODERN WELCOME BACK DRAWER STYLES */
  modernDrawerTopBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 4,
    position: 'relative',
    width: '100%',
  },
  modernDrawerCloseBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernDrawerHeroSection: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  modernDrawerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  modernDrawerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  modernChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modernChoiceCardActive: {
    backgroundColor: '#FFF8F9',
    borderColor: colors.primary,
  },
  modernChoiceCardActivePurple: {
    backgroundColor: '#FAF5FF',
    borderColor: '#7C3AED',
  },
  modernChoiceIconBoxRed: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernChoiceIconBoxPurple: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernChoiceTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  modernChoiceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  modernChoiceSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  modernPrimaryBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modernPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modernSkipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 2,
    marginBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  modernSkipBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  /* Section Header Labels */
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  /* Upcoming Cards Column */
  upcomingCardsCol: {
    gap: 10,
    marginBottom: 20,
  },
  upcomingPeriodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFD6E0',
  },
  upcomingIconCircleRed: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingFertileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  upcomingIconCircleGreen: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingCardMainTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  upcomingCardSubTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Quick Log Grid */
  quickLogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  quickLogCard: {
    width: (SCREEN_WIDTH - 76) / 3,
    backgroundColor: '#FAF0F2',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  quickLogIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLogCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  /* Pregnancy Setup Modal Styles */
  pregnancySetupIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  pregnancySetupTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  pregnancySetupSub: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  methodTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5FA',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  methodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  methodTabTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  dueDateInputCard: {
    backgroundColor: '#F5F5FA',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  dueDateInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  dueDateInputVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  confirmPregnancyButton: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmPregnancyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Minimal Cycle Screen Styles (Matching Prototype) */
  minimalCycleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  minimalCycleTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  minimalCycleSub: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },
  minimalMonthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minimalMonthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F0E6E6',
  },
  minimalCalendarCard: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#F0E6E6',
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  weekdayRowMinimal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  weekdayTextMinimal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  minimalDayCellWrapper: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  minimalDayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalDayText: {
    fontSize: 14,
  },
  minimalLegendGrid: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  minimalLegendRow: {
    flexDirection: 'row',
    gap: 10,
  },
  minimalLegendPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSurface,
    borderRadius: 24,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#F0E6E6',
  },
  minimalLegendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  minimalLegendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  /* Cycle Length History Chart Styles */
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 18,
  },
  chartMainContainer: {
    flexDirection: 'row',
    height: 100,
  },
  yAxisCol: {
    width: 32,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  yAxisText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  graphPlotArea: {
    flex: 1,
    position: 'relative',
    height: 90,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'transparent',
  },
  dataPointDotContainer: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dataPointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  xAxisRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  xAxisLabelsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xAxisText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    width: 30,
    textAlign: 'center',
  },

  /* Additional Metrics Styles */
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FAF0F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metricTitleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  metricDescriptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  normalBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  normalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  metricStatGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metricStatBox: {
    alignItems: 'flex-start',
  },
  metricStatVal: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  metricStatLbl: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  flowTimelineContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  flowDayPillActive: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  flowDayPillMedium: {
    flex: 1,
    backgroundColor: '#EF5350',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  flowDayPillLight: {
    flex: 1,
    backgroundColor: '#FFCDD2',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  flowDayText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fertilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  fertilityItem: {
    flex: 1,
  },
  fertilitySubLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fertilityBigText: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },

  /* Calendar Legend Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  legendGridModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  /* DRAGGABLE DRAWER BOTTOM SHEET STYLES */
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  drawerContentContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  drawerTopHeaderContainer: {
    width: '100%',
    height: 170,
    backgroundColor: '#374151',
    position: 'relative',
  },
  drawerTopHeaderImage: {
    width: '100%',
    height: '100%',
  },
  drawerHandlePillOverlay: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
  },
  drawerCloseButtonOverlay: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  drawerScrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  drawerHandlePill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E0E0E6',
    alignSelf: 'center',
    marginBottom: 16,
  },
  drawerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  articleCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  articleCategoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  bookmarkButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullArticleThumbnailContainer: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 18,
  },
  fullArticleThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  drawerArticleTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 30,
    marginBottom: 8,
  },
  drawerArticleMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#EBEBEF',
    marginVertical: 14,
  },
  drawerSummaryText: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
    marginBottom: 18,
  },
  takeawayHeader: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  takeawayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  drawerTakeawayText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  openFullArticleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 16,
    marginTop: 18,
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  openFullArticleButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  saveLibrarySecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 28,
    paddingVertical: 14,
  },
  saveLibrarySecondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },

  /* FULL READING MODE & ANALYTICS FULL SCREEN STYLES */
  articleDetailContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  articleDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  closeDetailButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleDetailScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  articleDetailTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 34,
    marginBottom: 10,
  },
  articleDetailMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  fullArticleBodyText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  doctorAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  bookingDetailText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#008080',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bookingSuccessTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  bookingSuccessSub: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  saveArticleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 16,
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveArticleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Pregnancy Onboarding Wizard Styles */
  pregWizardModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pregWizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pregWizardCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pregWizardProgressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 14,
  },
  pregWizardProgressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  pregWizardProgressSegmentActive: {
    backgroundColor: colors.primary,
  },
  pregWizardProgressSegmentInactive: {
    backgroundColor: '#E5E7EB',
  },
  pregWizardStepBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  pregWizardScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  pregWizardStepContent: {
    width: '100%',
    alignItems: 'center',
  },
  pregWizardIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0F5',
    borderColor: '#FFD1DC',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pregWizardQuestionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 8,
  },
  pregWizardQuestionSub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  pregWizardOptionsCol: {
    width: '100%',
    gap: 12,
  },
  pregWizardOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pregWizardOptionCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF5F7',
  },
  pregWizardOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pregWizardOptionTitleActive: {
    color: colors.primary,
  },
  pregWizardOptionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  datePickerCard: {
    width: '100%',
    backgroundColor: colors.backgroundSurface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  datePickerCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  datePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  datePillActive: {
    backgroundColor: colors.primary,
  },
  datePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  datePillTextActive: {
    color: '#FFFFFF',
  },
  calculatedPreviewCard: {
    width: '100%',
    backgroundColor: '#FFF5F7',
    borderColor: '#FFD1DC',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
  },
  calcPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  calcPreviewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  calcPreviewWeekText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  calcPreviewSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pregWizardBottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  pregWizardBackBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  pregWizardBackBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pregWizardNextBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  pregWizardNextBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  transparentOverlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    elevation: 0,
    paddingTop: STATUSBAR_HEIGHT + 8,
  },
  headerIconOnlyCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  /* ========================================================================= */
  /* DEDICATED CYCLE CALENDAR PAGE STYLES (RED APPLE SIGNATURE DESIGN)         */
  /* ========================================================================= */
  calendarPageContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  calendarPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  calendarPageBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarPageTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  calendarPageTodayHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  calendarPageTodayHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  calendarPagePinnedHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calendarPageWeekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  calendarPageWeekdayCol: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  calendarPageWeekdayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  calendarPageLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calendarLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calendarLegendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarPageScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },
  calendarMonthBlock: {
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calendarMonthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calendarMonthTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  calendarCurrentMonthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  calendarCurrentMonthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  calendarMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarPageCellTouchable: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  calendarPageDayCellCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthBlockSingle: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calendarDayInsightCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarDayInsightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarDayInsightDate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  calendarDayInsightPhase: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 2,
  },
  calendarPhasePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  calendarPhasePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#374151',
  },
  calendarDayInsightNote: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 14,
  },
  calendarLogDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 12,
  },
  calendarLogDayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calendarMonthStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  calendarMonthStatCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarMonthStatVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  calendarMonthStatLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },

  /* DAILY LOG DRAWER */
  dailyLogDrawerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  dailyLogHeroSection: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
  },
  dailyLogHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  dailyLogHeroSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  dailyLogSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    marginTop: 12,
  },
  flowPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  flowPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  flowPillBtnActive: {
    backgroundColor: '#FFEBEE',
    borderColor: colors.primary,
  },
  flowPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  flowPillBtnTextActive: {
    color: colors.primary,
  },
  chipsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipBtnActive: {
    backgroundColor: '#FFEBEE',
    borderColor: colors.primary,
  },
  chipBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  dailyLogSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  dailyLogSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

