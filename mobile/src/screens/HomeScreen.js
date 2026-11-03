import React, { useState, useEffect, useMemo } from 'react';
import {
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Polygon, Rect, G, Defs, LinearGradient, Stop, Ellipse, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';
import PregnancyScreen from './PregnancyScreen';
import PostmenopauseScreen from './PostmenopauseScreen';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import {
  saveActiveHealthModeSafe,
  getCachedActiveHealthMode,
  saveHealthProfileSafe,
  getHealthProfileSafe,
} from '../utils/storage';
import cycleService, {
  computeLocalFertilityPrediction,
} from '../services/cycleService';
import streakService from '../services/streakService';
import partnerService from '../services/partnerService';
import AppBottomSheet from '../components/AppBottomSheet';
import StreakModal from '../components/StreakModal';
import PartnerSyncModal from '../components/PartnerSyncModal';
import { getUserBookings } from '../services/telemedicineService';
import notificationService from '../services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Curated Clinical Articles for Cycle & Period Insights
 */
const CYCLE_ARTICLES_DATA = [
  {
    id: 'art_perimenopause',
    title: 'Perimenopause periods',
    category: 'CYCLE SHIFTS',
    readTime: '6 min read',
    author: 'Clinical Review Board • Hormone Health',
    summary: 'How shifting hormone levels affect cycle length, flow patterns, and period timing during perimenopause.',
    bullets: [
      'Understand new cycle shifts and estrogen fluctuations.',
      'Rethink period products for variable flow (menstrual cups, heavy pads).',
      'Know when to consult an OB-GYN for unexpected bleeding.',
    ],
    fullContent: `Perimenopause is the natural transitional phase leading up to menopause. During this time, estrogen and progesterone levels fluctuate unpredictably, leading to noticeable changes in your menstrual rhythm.\n\nKey Cycle Shifts:\n1. Irregular Cycle Length: Your period may arrive weeks early or significantly late.\n2. Flow Variations: Periods can range from very light spotting to unusually heavy flow.\n3. Skipped Cycles: Anovulatory cycles (cycles where no egg is released) become frequent.\n\nWhen to Seek Specialist Care:\n- Bleeding that lasts more than 7 consecutive days.\n- Needing to change pads or tampons every hour for multiple hours.\n- Spotting after intercourse or between regular periods.`,
    thumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'art_late_period',
    title: 'What counts as a late period?',
    category: 'PERIOD CLARITY',
    readTime: '7 min read',
    author: 'Dr. Mesal Okubor • Senior OB-GYN',
    bgColor: '#EDE6F5',
    borderColor: '#DDD6FE',
    summary: 'Clinical definitions of late vs delayed periods and the top physical and emotional causes.',
    bullets: [
      'A period is clinically late when it is 5 or more days past expected start.',
      'Cycles between 21 and 35 days are considered medically normal.',
      'Acute stress, rapid travel across time zones, and illness can delay ovulation.',
    ],
    fullContent: `In clinical gynecology, a menstrual cycle typically ranges from 21 to 35 days.\n\nA period is considered "late" if it has not started within 5 days of your projected date. If 6 weeks or more elapse without bleeding, it is medically classified as a missed period (amenorrhea).\n\nPrimary Triggers for Period Delay:\n1. Delayed Ovulation: If ovulation occurred later than usual due to illness or acute stress, your luteal phase shifts accordingly.\n2. Hormonal Fluctuations: Thyroid irregularities, PCOS, or hyperprolactinemia can interrupt ovulation.\n3. Pregnancy: A home urine hCG test is recommended if you are sexually active and your period is 5+ days late.\n4. Significant Weight or Exercise Shifts: Sudden intense athletic training or severe caloric restriction can suppress hypothalamic signals.`,
    thumbnail: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'art_cramps_no_period',
    title: 'Cramps but no period? This could ...',
    category: 'SYMPTOM ANALYSIS',
    readTime: '5 min read',
    author: 'Obstetrics & Gynecology Editorial Team',
    bgColor: '#EDE6F5',
    borderColor: '#DDD6FE',
    summary: 'Why pelvic cramping occurs even when bleeding has not yet arrived.',
    bullets: [
      'Prostaglandin surges can trigger uterine contractions 24–48 hours before bleeding starts.',
      'Implantation cramping can occur 6–12 days post-conception.',
      'Gastrointestinal shifts like trapped gas or IBS often mimic period cramps.',
    ],
    fullContent: `Experiencing lower abdominal cramping without bleeding is very common and usually points to one of several physiological events:\n\n1. Upcoming Menstruation: Uterine muscle contractions are stimulated by local prostaglandins up to 48 hours before the first flow appears.\n2. Anovulatory Cycle: If ovulation did not occur, estrogen builds the uterine lining without progesterone stabilization, causing cramp-like sensations.\n3. Early Pregnancy Implantation: Mild uterine cramping often occurs as the fertilized blastocyst implants into the endometrium.\n4. Ovulation Pain (Mittelschmerz): Sharp or dull pelvic twinges mid-cycle when the ovarian follicle ruptures.\n5. Pelvic or Digestive Causes: Constipation, bowel spasms, or ovarian cysts can refer pain to the lower pelvic area.`,
    thumbnail: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'art_remedies',
    title: '5 late period "remedies" to know',
    category: 'WELLNESS & NUTRITION',
    readTime: '11 min read',
    author: 'Maya Lin • Holistic Women\'s Health',
    bgColor: '#EDE6F5',
    borderColor: '#DDD6FE',
    summary: 'Evidence-based holistic methods to support hormonal balance and encourage natural cycle regulation.',
    bullets: [
      'Warm baths and gentle heat therapy relax pelvic muscles and reduce cortisol.',
      'Herbal infusions like ginger and chamomile soothe uterine tension.',
      'Nutritional balance with vitamin C, magnesium, and hydration stabilizes hormones.',
    ],
    fullContent: `While no miracle herb instantly induces menstruation, supporting your nervous and endocrine system helps restore regular rhythm:\n\n1. Cortisol Reduction: High cortisol directly suppresses GnRH and luteinizing hormone. Gentle restorative yoga, breathwork, and deep sleep help signal safety to your ovaries.\n2. Warm Compresses & Heat: Applying a warm heating pad to the lower abdomen encourages healthy pelvic blood circulation.\n3. Magnesium & Electrolytes: Magnesium glycinate reduces smooth muscle spasms and supports nervous system balance.\n4. Hydration & Anti-Inflammatory Nutrition: Dark leafy greens, warm ginger teas, and citrus foods support liver clearance of metabolized estrogen.`,
    thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'art_stress_cycles',
    title: 'How stress delays ovulation & cycle',
    category: 'HORMONAL HEALTH',
    readTime: '4 min read',
    author: 'Reproductive Endocrinology Advisory',
    bgColor: '#EDE6F5',
    borderColor: '#DDD6FE',
    summary: 'The hypothalamic-pituitary-ovarian axis and how cortisol temporarily halts ovulation.',
    bullets: [
      'Cortisol inhibits GnRH release from the hypothalamus.',
      'Ovulation pauses until the sympathetic nervous system settles.',
      'Restorative sleep and electrolyte hydration accelerate hormonal reset.',
    ],
    fullContent: `The reproductive system is tightly linked to your body’s stress response via the Hypothalamic-Pituitary-Adrenal (HPA) axis.\n\nWhen you undergo severe emotional, mental, or physical strain (such as intense sickness, jetlag, or major life changes), your adrenal glands produce elevated cortisol and adrenaline. The brain perceives stress as an unsafe environment for pregnancy, signaling the ovaries to delay or suspend follicular maturation.\n\nOnce the stressful event passes, the hypothalamus resumes pulsing GnRH, and ovulation proceeds normally.`,
    thumbnail: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
  },
];

/**
 * Top Header matching the aesthetic reference:
 * Circular profile avatar, user name & age, streak badge and Bell button with unread count.
 */
function AestheticTopHeader({
  user,
  onOpenProfile,
  onOpenNotifications,
  onOpenStreak,
  streakCount = 1,
  unreadNotificationsCount = 0,
}) {
  const { isDarkMode, theme } = useTheme();
  const userName = user?.name || 'Alison Barry';
  const userAge = useMemo(() => {
    if (user?.date_of_birth) {
      try {
        const birthDate = new Date(user.date_of_birth);
        const ageDiffMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDiffMs);
        const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
        if (!isNaN(calculatedAge) && calculatedAge > 10 && calculatedAge < 100) {
          return `${calculatedAge} years`;
        }
      } catch { }
    }
    if (user?.health_profile?.age) {
      return `${user.health_profile.age} years`;
    }
    return '27 years';
  }, [user?.date_of_birth, user?.health_profile?.age]);

  return (
    <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
      {/* Left: User Avatar & Name/Age */}
      <TouchableOpacity
        activeOpacity={0.8}
        className="flex-row items-center gap-3"
        onPress={onOpenProfile}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: isDarkMode ? '#363636' : '#FFFFFF',
            backgroundColor: isDarkMode ? '#2B2B2B' : '#F3F4F6',
          }}
        >
          <Image
            source={{
              uri:
                user?.avatar_url ||
                'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
            }}
            style={{ width: '100%', height: '100%', borderRadius: 24 }}
            resizeMode="cover"
          />
        </View>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.3 }}>{userName}</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginTop: 2 }}>{userAge}</Text>
        </View>
      </TouchableOpacity>

      {/* Right: Streak Badge & Notifications Circular Action Buttons */}
      <View className="flex-row items-center gap-2">
        {/* Streak Badge Button (matching Profile Screen) */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            height: 44,
            paddingHorizontal: 14,
            borderRadius: 22,
            backgroundColor: isDarkMode ? '#2B2B2B' : '#FFFFFF',
            borderWidth: 1,
            borderColor: isDarkMode ? '#363636' : 'rgba(229, 231, 235, 0.6)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onOpenStreak}
          accessibilityLabel="Current Streak"
        >
          <Ionicons name="flash" size={16} color={isDarkMode ? '#FCD34D' : '#111827'} />
          <Text style={{ fontSize: 12, fontWeight: '900', color: theme.textPrimary, marginLeft: 6 }}>{streakCount}</Text>
        </TouchableOpacity>

        {/* Notifications Bell Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isDarkMode ? '#2B2B2B' : '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDarkMode ? '#363636' : 'rgba(229, 231, 235, 0.6)',
            position: 'relative',
          }}
          onPress={onOpenNotifications}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={20} color={isDarkMode ? '#FFFFFF' : '#1E293B'} />
          {unreadNotificationsCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#DC2626',
                borderWidth: 1.5,
                borderColor: theme.card,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800', lineHeight: 11 }}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen({
  navigation,
  initialMode = 'cycle',
  healthProfile = null,
  onOpenAIAssistant,
}) {
  const { user, updateProfile } = useAuth();
  const { isDarkMode, theme } = useTheme();
  let showToastSuccess = null;
  try {
    const toast = useToast();
    showToastSuccess = toast?.showSuccess;
  } catch (e) { }

  const [activeHealthMode, setActiveHealthMode] = useState(() => {
    const cached = typeof getCachedActiveHealthMode === 'function' ? getCachedActiveHealthMode() : null;
    if (cached) return cached;
    if (initialMode) return initialMode;
    if (healthProfile?.stage) return healthProfile.stage;
    if (user?.health_profile?.stage) return user.health_profile.stage;
    if (user?.pregnancy_mode) return 'pregnancy';
    return 'cycle';
  });

  useEffect(() => {
    if (initialMode) setActiveHealthMode(initialMode);
  }, [initialMode]);

  const isPregnancyMode = activeHealthMode === 'pregnancy';
  const isPostmenopauseMode =
    activeHealthMode === 'postmenopause' || activeHealthMode === 'perimenopause';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState(null);
  const [isPartnerCardDismissed, setIsPartnerCardDismissed] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationsList, setNotificationsList] = useState([]);

  // Educational insights state (matching Learn page pattern)
  const [selectedEduArticle, setSelectedEduArticle] = useState(null);
  const [isFullReadingMode, setIsFullReadingMode] = useState(false);

  const handleOpenEduArticle = (item) => {
    setSelectedEduArticle({
      title: item.title,
      category: item.category,
      readTime: item.readTime,
      author: item.author || 'Clinical Review Board • Women\'s Health',
      summary: item.summary,
      bulletPoints: item.bullets || [],
      fullText: item.fullContent || item.summary,
      thumbnail: item.thumbnail,
    });
    setIsFullReadingMode(false);
  };

  // Streak state
  const [streakCount, setStreakCount] = useState(1);

  // Partner Sync state
  const reloadPartnerStatus = async () => {
    try {
      const status = await partnerService.getPartnerStatus();
      if (status) {
        setPartnerStatus(status);
      }
    } catch (e) { }
  };

  useEffect(() => {
    reloadPartnerStatus();
  }, [user?.id, isRefreshing]);

  const handleDismissPartnerCard = async () => {
    setIsPartnerCardDismissed(true);
    await partnerService.dismissPartnerCard(true);
    showToastSuccess && showToastSuccess('Partner card hidden');
  };

  const handleTalkWithDrRed = () => {
    const prompt = `Hi Dr. Red, I'd like to check in on how my body is feeling today (Cycle Day ${displayCurrentDay}, ${cyclePrediction.currentPhase || 'reproductive phase'}). Can you analyze my symptoms and guide me through today's wellness check?`;
    if (typeof onOpenAIAssistant === 'function') {
      onOpenAIAssistant(prompt);
    } else if (navigation?.navigate) {
      navigation.navigate('AICompanion', {
        initialQuery: prompt,
        autoSend: true,
        timestamp: Date.now(),
      });
    }
  };

  useEffect(() => {
    if (typeof streakService?.getStreakData === 'function') {
      streakService
        .getStreakData()
        .then((data) => {
          if (data?.appStreak != null) {
            setStreakCount(data.appStreak);
          }
        })
        .catch(() => { });
    }
  }, [isRefreshing]);

  const reloadNotifications = async () => {
    try {
      if (typeof notificationService?.getInAppNotifications === 'function') {
        const items = await notificationService.getInAppNotifications();
        if (Array.isArray(items)) {
          setNotificationsList(items);
          const unread = items.filter((n) => !n.isRead).length;
          setUnreadNotificationsCount(unread);
        }
      }
    } catch (e) {
      console.warn('[HomeScreen] Reload notifications error:', e);
    }
  };

  useEffect(() => {
    reloadNotifications();
    let unsub;
    if (typeof notificationService?.subscribe === 'function') {
      unsub = notificationService.subscribe(() => {
        reloadNotifications();
      });
    }
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Real cycle data states
  const [cachedProfile, setCachedProfile] = useState(healthProfile || user?.health_profile || null);
  const activeCycleProfile = useMemo(() => {
    return {
      cycleLength: Number(
        cachedProfile?.cycleLength || healthProfile?.cycleLength || user?.health_profile?.cycleLength || 28
      ),
      periodDuration: Number(
        cachedProfile?.periodDuration || healthProfile?.periodDuration || user?.health_profile?.periodDuration || 5
      ),
      lastPeriodDate:
        cachedProfile?.lastPeriodDate || healthProfile?.lastPeriodDate || user?.health_profile?.lastPeriodDate || null,
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
      currentCycleDay: 14,
      currentPhase: 'ovulatory',
      estimatedOvulationDate: '',
      fertileWindowStart: '',
      fertileWindowEnd: '',
      nextPeriodStartDate: '',
      chanceOfGettingPregnant: 'High',
    };
  });

  const loadCycleData = async () => {
    try {
      let storedProfile = null;
      if (typeof getHealthProfileSafe === 'function') {
        storedProfile = await getHealthProfileSafe();
      }
      if (storedProfile) {
        setCachedProfile(storedProfile);
      }

      const cycleLen = Number(storedProfile?.cycleLength || activeCycleProfile.cycleLength || 28);
      const periodDur = Number(storedProfile?.periodDuration || activeCycleProfile.periodDuration || 5);
      const lastPeriod = storedProfile?.lastPeriodDate || activeCycleProfile.lastPeriodDate;

      if (typeof cycleService?.getFertilityPrediction === 'function') {
        const pred = await cycleService.getFertilityPrediction({
          cycleLength: cycleLen,
          periodDuration: periodDur,
          lastPeriodDate: lastPeriod,
        });
        if (pred) setCyclePrediction(pred);
      }
    } catch (err) {
      console.warn('[HomeScreen] Error loading cycle data:', err);
    }
  };

  useEffect(() => {
    loadCycleData();
    if (typeof streakService?.recordStreakActivity === 'function') {
      streakService.recordStreakActivity({ activityType: 'app_open' }).catch(() => { });
    }
  }, [user?.id, healthProfile?.lastPeriodDate, user?.health_profile?.lastPeriodDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadCycleData();
      await reloadNotifications();
    } catch (e) {
      console.warn('Error refreshing HomeScreen:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const displayCurrentDay = cyclePrediction.currentCycleDay || 14;
  const displayCycleLength = activeCycleProfile.cycleLength || 28;
  const cycleProgress = Math.min(Math.max(displayCurrentDay / displayCycleLength, 0), 1);
  const cycleProgressCircumference = 2 * Math.PI * 36;

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

  const nextPeriodFormatted =
    formatShortDateStr(cyclePrediction.nextPeriodStartDate) ||
    formatShortDateStr(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent={true} />

      {/* Top Header */}
      <AestheticTopHeader
        user={user}
        onOpenProfile={() => navigation?.navigate('Profile')}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        onOpenStreak={() => setShowStreakModal(true)}
        streakCount={streakCount}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {isPregnancyMode ? (
        <PregnancyScreen
          currentWeek={16}
          onBookDoctor={() => navigation?.navigate('Telemed')}
          onOpenDoctorPage={() => navigation?.navigate('Telemed')}
          navigation={navigation}
        />
      ) : isPostmenopauseMode ? (
        <PostmenopauseScreen
          onBookDoctor={() => navigation?.navigate('Telemed')}
          onOpenDoctorPage={() => navigation?.navigate('Telemed')}
          healthProfile={user?.health_profile}
          greetingDisplayName={user?.name?.trim()?.split(/\s+/)?.[0] || ''}
          navigation={navigation}
        />
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.textPrimary}
              colors={[theme.textPrimary]}
              progressBackgroundColor={theme.card}
            />
          }
        >
          {/* BENTO CARD 1: Reproductive Wellness */}
          <TouchableOpacity
            activeOpacity={0.92}
            className="rounded-[32px] p-5 pb-6 mb-3.5 shadow-xs"
            style={{
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.cardBorder,
            }}
            onPress={() => navigation?.navigate('CycleCalendar')}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.subtleSurface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="flower-outline" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: theme.textPrimary, lineHeight: 21 }}>Reproductive wellness</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, lineHeight: 16, marginTop: 2 }}>Your cycle at a glance</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </View>

            <View className="flex-row items-center mt-5">
              <View className="items-center">
                <View style={{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg width={88} height={88} viewBox="0 0 88 88" style={{ position: 'absolute' }}>
                    <Circle cx="44" cy="44" r="36" fill="none" stroke={theme.cardBorder} strokeWidth="6" />
                    <Circle
                      cx="44"
                      cy="44"
                      r="36"
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={cycleProgressCircumference}
                      strokeDashoffset={cycleProgressCircumference * (1 - cycleProgress)}
                      rotation="-90"
                      origin="44, 44"
                    />
                  </Svg>
                  <Text style={{ fontSize: 23, fontWeight: '900', color: theme.textPrimary }}>{displayCurrentDay}</Text>
                </View>
                <Text style={{ marginTop: 3, fontSize: 10, fontWeight: '700', color: theme.textSecondary }}>OF {displayCycleLength}-DAY CYCLE</Text>
              </View>

              <View className="flex-1 ml-5">
                <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.7, color: theme.textMuted }}>CURRENT PHASE</Text>
                <Text style={{ marginTop: 3, fontSize: 17, fontWeight: '800', color: theme.textPrimary }}>
                  {(cyclePrediction.currentPhase || 'follicular').charAt(0).toUpperCase() + (cyclePrediction.currentPhase || 'follicular').slice(1)}
                </Text>
                <View style={{ height: 1, backgroundColor: theme.cardBorder, marginVertical: 10 }} />
                <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.7, color: theme.textMuted }}>NEXT PERIOD</Text>
                <Text style={{ marginTop: 3, fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>{nextPeriodFormatted}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* CARD 1: DAILY WELLNESS & DR. RED AI SYMPTOM CHECK-IN */}
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 32,
              padding: 20,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: theme.cardBorder,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              overflow: 'hidden',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.textPrimary, lineHeight: 26 }}>
                How are you feeling today?
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: theme.textSecondary, marginTop: 4, lineHeight: 18 }}>
                Tell us more about your body to get analysis
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#584988',
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 9999,
                  marginTop: 14,
                  shadowColor: '#584988',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                onPress={handleTalkWithDrRed}
                accessibilityLabel="Talk with Dr. Red"
              >
                <Ionicons name="sparkles" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.2 }}>
                  Talk with Dr. Red
                </Text>
              </TouchableOpacity>
            </View>

            {/* Serene Smiling Yellow Sun Vector Illustration */}
            <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center', marginRight: -6 }}>
              <Svg width={112} height={112} viewBox="0 0 112 112">
                {/* Soft outer glow halo */}
                <Circle cx="64" cy="64" r="46" fill="#FEF3C7" />
                {/* Inner warm sun circle */}
                <Circle cx="68" cy="68" r="38" fill="#FCD34D" />
                {/* Peaceful curved eyes */}
                <Path
                  d="M 46 62 Q 52 66 58 62"
                  stroke="#78350F"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  fill="none"
                />
                <Path
                  d="M 66 59 Q 72 63 78 59"
                  stroke="#78350F"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Gentle curved smile */}
                <Path
                  d="M 52 74 Q 64 84 76 74"
                  stroke="#78350F"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Golden 8-point sparkle star on top-right */}
                <Polygon
                  points="88,28 90,20 92,28 100,30 92,32 90,40 88,32 80,30"
                  fill="#F59E0B"
                />
              </Svg>
            </View>
          </View>

          {/* CARD 2: PARTNER RHYTHM & MOMENTS SYNC */}
          {!isPartnerCardDismissed && (
            <View
              style={{
                backgroundColor: isDarkMode ? '#241B1E' : '#FDF0F5',
                borderRadius: 32,
                padding: 20,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: isDarkMode ? '#3D252C' : 'rgba(251, 113, 133, 0.25)',
                position: 'relative',
                overflow: 'hidden',
                shadowColor: '#F43F5E',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDarkMode ? 0.2 : 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {/* Soft floating background heart watermark */}
              <View
                style={{
                  position: 'absolute',
                  top: -20,
                  right: 10,
                  opacity: 0.16,
                }}
                pointerEvents="none"
              >
                <Ionicons name="heart" size={130} color="#F43F5E" />
              </View>

              {/* Top Right: Dismiss X Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 10,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isDarkMode ? '#2B2B2B' : 'rgba(255, 255, 255, 0.85)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#363636' : 'rgba(251, 113, 133, 0.2)',
                }}
                onPress={handleDismissPartnerCard}
                accessibilityLabel="Dismiss partner card"
              >
                <Ionicons name="close" size={16} color={isDarkMode ? '#ABABAB' : '#94A3B8'} />
              </TouchableOpacity>

              {/* Avatar & Hearts Connected Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 8 }}>
                {/* User Avatar */}
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    borderWidth: 2.5,
                    borderColor: isDarkMode ? '#363636' : '#FFFFFF',
                    overflow: 'hidden',
                    backgroundColor: isDarkMode ? '#2B2B2B' : '#FFFFFF',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Image
                    source={{
                      uri:
                        user?.avatar_url ||
                        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
                    }}
                    style={{ width: '100%', height: '100%', borderRadius: 26 }}
                    resizeMode="cover"
                  />
                </View>

                {/* Love Connection Hearts */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, gap: 5 }}>
                  <Ionicons name="heart" size={13} color="#FB7185" />
                  <Ionicons name="heart" size={17} color="#F43F5E" />
                  <Ionicons name="heart" size={13} color="#FB7185" />
                </View>

                {/* Partner Avatar or Plus Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: isDarkMode ? '#2B2B2B' : '#FFFFFF',
                    borderWidth: 2.5,
                    borderColor: isDarkMode ? '#363636' : '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  onPress={() => setShowPartnerModal(true)}
                  accessibilityLabel="Partner action"
                >
                  {partnerStatus?.status === 'connected' ? (
                    partnerStatus.partnerAvatarUrl ? (
                      <Image
                        source={{ uri: partnerStatus.partnerAvatarUrl }}
                        style={{ width: '100%', height: '100%', borderRadius: 26 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ width: '100%', height: '100%', borderRadius: 26, backgroundColor: '#FFE4E6', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#BE123C' }}>
                          {(partnerStatus.partnerName || 'P').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )
                  ) : (
                    <Ionicons name="add" size={26} color="#FB3B6B" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Center Descriptive Headline */}
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: isDarkMode ? '#FFFFFF' : '#111827',
                  textAlign: 'center',
                  paddingHorizontal: 16,
                  marginTop: 10,
                  marginBottom: 16,
                  lineHeight: 22,
                }}
              >
                {partnerStatus?.status === 'connected'
                  ? `Syncing rhythm and moments with ${partnerStatus.partnerName || 'your partner'}.`
                  : 'Sync your rhythm and moments with your partner.'}
              </Text>

              {/* Primary Pink Action Pill Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={{
                  backgroundColor: '#FB3B6B',
                  paddingVertical: 14,
                  borderRadius: 9999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#FB3B6B',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.28,
                  shadowRadius: 6,
                  elevation: 3,
                }}
                onPress={() => setShowPartnerModal(true)}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 }}>
                  {partnerStatus?.status === 'connected' ? 'Manage Partner Sync' : 'Invite partner'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* CARD 3: TELEMEDICINE SPECIALIST & VIRTUAL CLINIC */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={{
              backgroundColor: isDarkMode ? '#172722' : '#F0FDF9',
              borderRadius: 32,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: isDarkMode ? '#23443B' : 'rgba(13, 148, 136, 0.22)',
              position: 'relative',
              overflow: 'hidden',
              shadowColor: '#0D9488',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.2 : 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
            onPress={() => navigation?.navigate('Telemed')}
            accessibilityLabel="Consult with an OB-GYN"
          >
            {/* Soft decorative background stethoscope watermark */}
            <View
              style={{
                position: 'absolute',
                top: -15,
                right: -10,
                opacity: 0.08,
              }}
              pointerEvents="none"
            >
              <Ionicons name="medkit" size={140} color="#0D9488" />
            </View>

            {/* Content Row: Text + Vector Artwork */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: isDarkMode ? '#FFFFFF' : '#111827', lineHeight: 26 }}>
                  Talk to a Doctor
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '500', color: isDarkMode ? '#ABABAB' : '#64748B', marginTop: 4, lineHeight: 18 }}>
                  Private video & chat care for cycle health, fertility, and wellness.
                </Text>

                {/* Teal Action Pill Button */}
                <View
                  style={{
                    backgroundColor: '#0D9488',
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 9999,
                    marginTop: 14,
                    shadowColor: '#0D9488',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Ionicons name="videocam" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.2 }}>
                    Book Consultation
                  </Text>
                </View>
              </View>

              {/* Clinical Telemedicine Vector Illustration */}
              <View style={{ width: 106, height: 106, alignItems: 'center', justifyContent: 'center', marginRight: -4 }}>
                <Svg width={106} height={106} viewBox="0 0 106 106">
                  {/* Outer soft teal circular glow */}
                  <Circle cx="53" cy="53" r="46" fill="#CCFBF1" />
                  <Circle cx="53" cy="53" r="38" fill="#E6FFFA" stroke="#99F6E4" strokeWidth="1.5" />

                  {/* Consultation Video Screen Tablet */}
                  <Rect x="25" y="24" width="56" height="58" rx="12" fill="#FFFFFF" stroke="#0D9488" strokeWidth="2" />
                  {/* Camera notch */}
                  <Circle cx="53" cy="30" r="1.8" fill="#0D9488" />

                  {/* Clinician Avatar inside screen */}
                  <Circle cx="53" cy="44" r="9" fill="#0D9488" />
                  <Path d="M 37 66 C 37 56, 69 56, 69 66 Z" fill="#14B8A6" />
                  {/* Medical Cross on Chest */}
                  <Rect x="51.5" y="58" width="3" height="7" rx="1" fill="#FFFFFF" />
                  <Rect x="49.5" y="60" width="7" height="3" rx="1" fill="#FFFFFF" />

                  {/* Looping Stethoscope below */}
                  <Path
                    d="M 29 48 C 23 58, 26 76, 40 82 C 48 86, 64 85, 76 76"
                    stroke="#0F766E"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Stethoscope bell */}
                  <Circle cx="76" cy="76" r="4.5" fill="#FFFFFF" stroke="#0F766E" strokeWidth="2" />
                  <Circle cx="76" cy="76" r="2" fill="#0D9488" />

                  {/* Golden Sparkle Star on top right (matching Card 1 aesthetic) */}
                  <Polygon
                    points="84,20 86,12 88,20 96,22 88,24 86,32 84,24 76,22"
                    fill="#F59E0B"
                  />
                </Svg>
              </View>
            </View>
          </TouchableOpacity>

          {/* ========================================================================= */}
          {/* SECTION: EDUCATIONAL PERIOD & CYCLE INSIGHTS (MATCHING REFERENCE UI)       */}
          {/* ========================================================================= */}

          {/* Section Headline */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: '900',
              color: theme.textPrimary,
              marginTop: 18,
              marginBottom: 14,
              paddingHorizontal: 2,
              letterSpacing: -0.3,
            }}
          >
            Your late period
          </Text>

          {/* HERO EDUCATIONAL FEATURE CARD: Perimenopause periods (Dusty Purple / Lavender) */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={{
              backgroundColor: isDarkMode ? '#281E2F' : '#94759F',
              borderRadius: 32,
              padding: 22,
              marginBottom: 20,
              shadowColor: '#94759F',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDarkMode ? 0.35 : 0.22,
              shadowRadius: 10,
              elevation: 4,
              position: 'relative',
              overflow: 'hidden',
              minHeight: 215,
              borderWidth: isDarkMode ? 1 : 0,
              borderColor: isDarkMode ? '#3D2847' : 'transparent',
            }}
            onPress={() => handleOpenEduArticle(CYCLE_ARTICLES_DATA[0])}
          >
            {/* Realistic Period Products Vector Illustration on the Right */}
            <View
              style={{
                position: 'absolute',
                right: -6,
                top: 0,
                bottom: 0,
                width: 155,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              pointerEvents="none"
            >
              <Svg width={155} height={215} viewBox="0 0 155 215">
                {/* 1. Tilted Menstrual Cup at top right */}
                <G transform="translate(68, 52) rotate(-22)">
                  {/* Cup Body */}
                  <Path
                    d="M -22 -18 C -24 6, -12 28, 0 35 C 12 28, 24 6, 22 -18 Z"
                    fill="#C5B2D6"
                    stroke="#FFFFFF"
                    strokeWidth="1.6"
                  />
                  {/* Outer Rim Lip */}
                  <Ellipse cx="0" cy="-18" rx="22" ry="5.5" fill="#DDD0E8" stroke="#FFFFFF" strokeWidth="1.5" />
                  {/* Inner Rim Depth */}
                  <Ellipse cx="0" cy="-18" rx="17" ry="3.5" fill="#B299C2" />
                  {/* Measuring lines on silicone */}
                  <Line x1="-12" y1="-2" x2="-2" y2="-2" stroke="#FFFFFF" strokeWidth="1.3" opacity={0.65} />
                  <Line x1="-14" y1="8" x2="-2" y2="8" stroke="#FFFFFF" strokeWidth="1.3" opacity={0.65} />
                  {/* Stem */}
                  <Path d="M -2.5 35 L -2 46 C -2 48, 2 48, 2 46 L 2.5 35 Z" fill="#DDD0E8" stroke="#FFFFFF" strokeWidth="1" />
                </G>

                {/* 2. White Tampon with Purple/Magenta Band tilted below */}
                <G transform="translate(98, 98) rotate(-16)">
                  {/* Tampon Cylinder Body */}
                  <Rect x="-6" y="-30" width="12" height="38" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
                  {/* Magenta Band */}
                  <Rect x="-6" y="-12" width="12" height="5" fill="#D946EF" opacity={0.9} />
                  {/* Pull String */}
                  <Path d="M 0 8 C 4 16, -2 24, 2 32" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity={0.95} />
                </G>

                {/* 3. Folded Mint-Green Sanitary Pad Wrapper at bottom right */}
                <G transform="translate(76, 156) rotate(-10)">
                  {/* Pad Wrapper Body */}
                  <Rect
                    x="-44"
                    y="-24"
                    width="88"
                    height="54"
                    rx="8"
                    fill="#A3D9C9"
                    stroke="#7BBFA9"
                    strokeWidth="1.5"
                  />
                  {/* Crimped/Heat-sealed border edges */}
                  <Line x1="-44" y1="-24" x2="-44" y2="30" stroke="#75B6A1" strokeWidth="2.5" strokeDasharray="3 2" />
                  <Line x1="44" y1="-24" x2="44" y2="30" stroke="#75B6A1" strokeWidth="2.5" strokeDasharray="3 2" />
                  {/* Quilted embossing pattern */}
                  <Line x1="-32" y1="-12" x2="32" y2="-12" stroke="#BCEAE0" strokeWidth="1" opacity={0.8} />
                  <Line x1="-32" y1="2" x2="32" y2="2" stroke="#BCEAE0" strokeWidth="1" opacity={0.8} />
                  <Line x1="-32" y1="16" x2="32" y2="16" stroke="#BCEAE0" strokeWidth="1" opacity={0.8} />
                  {/* Adhesive peel tab */}
                  <Rect x="-12" y="-24" width="24" height="8" rx="2" fill="#E6F8F3" />
                </G>
              </Svg>
            </View>

            {/* Left Content Column (62% width to allow graphics breathing room) */}
            <View style={{ width: '62%', zIndex: 2 }}>
              <Text style={{ fontSize: 23, fontWeight: '900', color: '#FFFFFF', marginBottom: 14, letterSpacing: -0.3 }}>
                Perimenopause periods
              </Text>

              {/* Bullet 1 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 9,
                  }}
                >
                  <Ionicons name="sync-outline" size={13} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', flex: 1, lineHeight: 17 }}>
                  Understand new cycle shifts
                </Text>
              </View>

              {/* Bullet 2 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 9,
                  }}
                >
                  <Ionicons name="wine-outline" size={13} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', flex: 1, lineHeight: 17 }}>
                  Rethink your period products
                </Text>
              </View>

              {/* Bullet 3 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 9,
                  }}
                >
                  <Ionicons name="alert-circle-outline" size={14} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', flex: 1, lineHeight: 17 }}>
                  Know when to get help for period issues
                </Text>
              </View>

              {/* White Pill Action Button */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 9999,
                  alignSelf: 'flex-start',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#111827' }}>
                  Be prepared
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* SUB-SECTION: Based on your current cycle */}
          <View style={{ marginBottom: 8 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '900',
                color: theme.textPrimary,
                marginBottom: 12,
                paddingHorizontal: 2,
              }}
            >
              Based on your current cycle
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>
              {CYCLE_ARTICLES_DATA.filter((art) => art.id !== 'art_perimenopause').map((art) => (
                <TouchableOpacity
                  key={art.id}
                  activeOpacity={0.88}
                  style={{ width: 148, marginRight: 12 }}
                  onPress={() => handleOpenEduArticle(art)}
                >
                  {/* Graphic Thumbnail Container matching reference screenshot */}
                  <View
                    style={{
                      width: 148,
                      height: 136,
                      borderRadius: 22,
                      backgroundColor: isDarkMode ? '#2B2B2B' : (art.bgColor || '#EDE6F5'),
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#363636' : (art.borderColor || '#DDD6FE'),
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    {art.id === 'art_late_period' ? (
                      /* Phone with pink LATE circle held by hand */
                      <Svg width={148} height={136} viewBox="0 0 148 136">
                        {/* Hand & arm from bottom right */}
                        <Path
                          d="M 68 136 L 68 108 C 68 98, 74 92, 82 90 L 88 136 Z"
                          fill="#F5D0C5"
                        />
                        <G transform="translate(68, 64) rotate(-8)">
                          {/* Phone shadow */}
                          <Rect x="-27" y="-45" width="54" height="88" rx="9" fill="#D8CFE5" />
                          {/* Phone outer body */}
                          <Rect x="-26" y="-46" width="52" height="86" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
                          {/* Screen */}
                          <Rect x="-23" y="-42" width="46" height="78" rx="6" fill="#F8FAFC" />
                          {/* Top notch */}
                          <Rect x="-6" y="-40" width="12" height="2.5" rx="1.2" fill="#CBD5E1" />
                          {/* Vibrant Pink LATE Badge Circle */}
                          <Circle cx="0" cy="-14" r="16" fill="#FF2D55" />
                          <SvgText x="0" y="-10" fill="#FFFFFF" fontSize="8.5" fontWeight="900" textAnchor="middle" letterSpacing="0.5">
                            LATE
                          </SvgText>
                          {/* 3 Pastel color swatches below */}
                          <Rect x="-18" y="10" width="10" height="7" rx="2" fill="#E9D5FF" />
                          <Rect x="-5" y="10" width="10" height="7" rx="2" fill="#FED7AA" />
                          <Rect x="8" y="10" width="10" height="7" rx="2" fill="#E2E8F0" />
                        </G>
                        {/* Hand fingers holding phone */}
                        <Path
                          d="M 40 82 C 40 76, 46 76, 48 82 L 48 95 C 48 100, 42 100, 40 95 Z"
                          fill="#F5D0C5"
                        />
                        <Path
                          d="M 88 68 C 94 68, 96 72, 94 78 L 90 88 C 88 92, 84 92, 84 86 Z"
                          fill="#F0C2B4"
                        />
                      </Svg>
                    ) : art.id === 'art_cramps_no_period' ? (
                      /* Cute ghost with BOO! speech bubble */
                      <Svg width={148} height={136} viewBox="0 0 148 136">
                        {/* Pink BOO Speech Bubble */}
                        <G transform="translate(104, 38)">
                          <Ellipse cx="0" cy="0" rx="18" ry="12" fill="#FF3B5C" />
                          <SvgText x="0" y="3.5" fill="#FFFFFF" fontSize="8" fontWeight="900" textAnchor="middle">
                            BOO!
                          </SvgText>
                          {/* Speech tail */}
                          <Path d="M -10 6 L -16 11 L -7 9 Z" fill="#FF3B5C" />
                        </G>

                        {/* Friendly Sheet Ghost */}
                        <G transform="translate(70, 70)">
                          {/* Ghost body with ripples */}
                          <Path
                            d="M -24 16 C -24 -24, 24 -24, 24 16 C 24 24, 20 28, 16 23 C 12 18, 8 28, 4 23 C 0 18, -4 28, -8 23 C -12 18, -16 28, -20 23 C -22 21, -24 24, -24 16 Z"
                            fill="#FFFFFF"
                            stroke="#EAE6F3"
                            strokeWidth="1.5"
                          />
                          {/* Floating wispy tail */}
                          <Path
                            d="M -4 23 Q 0 35, 8 36 Q 16 37, 14 42"
                            stroke="#FFFFFF"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            fill="none"
                          />
                          {/* Dark oval eyes */}
                          <Ellipse cx="-8" cy="-2" rx="2.5" ry="3.5" fill="#1E293B" />
                          <Ellipse cx="8" cy="-2" rx="2.5" ry="3.5" fill="#1E293B" />
                          {/* Round mouth */}
                          <Circle cx="0" cy="8" r="2.2" fill="#1E293B" />
                        </G>
                      </Svg>
                    ) : art.id === 'art_remedies' ? (
                      /* Fresh Green Parsley / Herb Leaves held by hand */
                      <Svg width={148} height={136} viewBox="0 0 148 136">
                        <G transform="translate(74, 58)">
                          {/* Stems */}
                          <Path d="M 0 30 Q -6 10, -14 -4" stroke="#4ADE80" strokeWidth="2.5" fill="none" />
                          <Path d="M 4 30 Q 8 12, 16 -6" stroke="#4ADE80" strokeWidth="2.5" fill="none" />
                          <Path d="M 2 30 Q 0 8, 2 -14" stroke="#22C55E" strokeWidth="2.5" fill="none" />

                          {/* Leaf clusters */}
                          <Circle cx="-16" cy="-8" r="14" fill="#16A34A" />
                          <Circle cx="-8" cy="-20" r="13" fill="#22C55E" />
                          <Circle cx="12" cy="-18" r="14" fill="#15803D" />
                          <Circle cx="20" cy="-6" r="13" fill="#22C55E" />
                          <Circle cx="2" cy="-26" r="12" fill="#4ADE80" />
                          <Circle cx="0" cy="-12" r="14" fill="#16A34A" />

                          {/* Highlights & florets */}
                          <Circle cx="-22" cy="-4" r="7" fill="#4ADE80" opacity={0.9} />
                          <Circle cx="-14" cy="-26" r="8" fill="#86EFAC" opacity={0.9} />
                          <Circle cx="16" cy="-26" r="7" fill="#86EFAC" opacity={0.9} />
                          <Circle cx="26" cy="-10" r="7" fill="#4ADE80" opacity={0.9} />
                          <Circle cx="-2" cy="-32" r="6" fill="#BBF7D0" opacity={0.9} />
                        </G>

                        {/* Hand holding stems */}
                        <G transform="translate(76, 92)">
                          <Path
                            d="M -4 6 C -4 -2, 16 -6, 26 2 L 40 40 L 10 44 Z"
                            fill="#F5D0C5"
                          />
                          <Path
                            d="M -2 4 C 4 2, 14 4, 18 10 C 18 16, 8 18, 0 14 Z"
                            fill="#F0C2B4"
                          />
                        </G>
                      </Svg>
                    ) : (
                      /* Calm Zen Stones */
                      <Svg width={148} height={136} viewBox="0 0 148 136">
                        <G transform="translate(74, 68)">
                          <Ellipse cx="0" cy="22" rx="34" ry="14" fill="#64748B" />
                          <Ellipse cx="0" cy="20" rx="32" ry="12" fill="#94A3B8" />
                          <Ellipse cx="-2" cy="4" rx="25" ry="11" fill="#475569" />
                          <Ellipse cx="-2" cy="2" rx="23" ry="9" fill="#64748B" />
                          <Ellipse cx="2" cy="-14" rx="16" ry="8" fill="#334155" />
                          <Ellipse cx="2" cy="-16" rx="14" ry="6.5" fill="#475569" />
                          <Polygon points="26,-22 28,-30 30,-22 38,-20 30,-18 28,-10 26,-18 18,-20" fill="#F59E0B" />
                        </G>
                      </Svg>
                    )}
                  </View>

                  {/* Title & Read Time */}
                  <Text
                    numberOfLines={2}
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: theme.textPrimary,
                      marginTop: 8,
                      lineHeight: 18,
                    }}
                  >
                    {art.title}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginTop: 3 }}>
                    {art.readTime}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Wide See More Pill Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              backgroundColor: isDarkMode ? '#2B2B2B' : '#ECEFE6',
              paddingVertical: 14,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 10,
              marginBottom: 16,
              borderWidth: isDarkMode ? 1 : 0,
              borderColor: theme.cardBorder,
            }}
            onPress={() => navigation?.navigate('Learn')}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>
              See more
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Notifications Bottom Sheet */}
      <AppBottomSheet
        visible={showNotificationsModal}
        animationType="slide"
        statusBarTranslucent={true}
        onClose={() => setShowNotificationsModal(false)}
        onRequestClose={() => setShowNotificationsModal(false)}
        scrollable={false}
        noPadding={true}
        cardStyle={{ paddingHorizontal: 0, backgroundColor: theme.modalBg }}
        contentStyle={{ paddingHorizontal: 0, width: '100%', backgroundColor: theme.modalBg }}
        height="86%"
        maxHeight="86%"
      >
        <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent={true} />

        {/* Clean Edge-to-Edge Header */}
        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 6,
            backgroundColor: theme.modalBg,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDarkMode ? '#363636' : '#F8FAFC',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.cardBorder,
            }}
            onPress={() => setShowNotificationsModal(false)}
          >
            <Ionicons name="arrow-back" size={18} color={theme.textPrimary} />
          </TouchableOpacity>

          <Text style={{ fontSize: 17, fontWeight: '800', color: theme.textPrimary }}>Notifications</Text>

          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDarkMode ? '#363636' : '#F8FAFC',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.cardBorder,
            }}
            onPress={async () => {
              if (typeof notificationService?.markAllAsRead === 'function') {
                await notificationService.markAllAsRead();
              }
              setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
              setUnreadNotificationsCount(0);
              showToastSuccess && showToastSuccess('All marked as read');
            }}
            accessibilityLabel="Mark all as read"
          >
            <Ionicons name="checkmark-done" size={18} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Seamless List (No All-Round Borders, Edge-to-Edge Full Width) */}
        <ScrollView
          style={{ width: '100%' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ width: '100%', paddingBottom: 36 }}
        >
          {notificationsList.length === 0 ? (
            <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 20 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Ionicons name="notifications-off-outline" size={26} color="#94A3B8" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#334155' }}>No notifications yet</Text>
              <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4 }}>
                We'll notify you when you have updates on your cycle, consultations, or medications.
              </Text>
            </View>
          ) : (
            notificationsList.map((notif, idx) => {
              const isConsultation =
                notif.type === 'appointment' ||
                notif.title?.toLowerCase().includes('consultation') ||
                notif.title?.toLowerCase().includes('doctor');
              const isPillOrMed =
                notif.type === 'medication' ||
                notif.title?.toLowerCase().includes('pill') ||
                notif.title?.toLowerCase().includes('medication');
              const isCycle =
                notif.type === 'period_alert' ||
                notif.type === 'fertile_window' ||
                notif.title?.toLowerCase().includes('period') ||
                notif.title?.toLowerCase().includes('cycle');

              const iconName = isConsultation
                ? 'videocam-outline'
                : isPillOrMed
                  ? 'medical-outline'
                  : isCycle
                    ? 'water-outline'
                    : notif.icon || 'notifications-outline';

              const iconBg = isConsultation
                ? '#ECFDF5'
                : isPillOrMed
                  ? '#EEF2FF'
                  : isCycle
                    ? '#FFF1F2'
                    : notif.iconBg || '#F8FAFC';

              const iconColor = isConsultation
                ? '#059669'
                : isPillOrMed
                  ? '#4F46E5'
                  : isCycle
                    ? '#E11D48'
                    : notif.iconColor || '#64748B';

              return (
                <TouchableOpacity
                  key={notif.id || idx}
                  activeOpacity={0.75}
                  style={{
                    width: '100%',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.divider,
                    backgroundColor: notif.isRead ? theme.card : (isDarkMode ? '#333333' : '#FAFCFF'),
                  }}
                  onPress={async () => {
                    if (!notif.isRead && typeof notificationService?.markAsRead === 'function') {
                      await notificationService.markAsRead(notif.id);
                      setNotificationsList((prev) =>
                        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
                      );
                      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
                    }
                  }}
                >
                  {/* Category Circular Icon Badge */}
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: iconBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      marginTop: 2,
                    }}
                  >
                    <Ionicons name={iconName} size={18} color={iconColor} />
                  </View>

                  {/* Notification Content */}
                  <View style={{ flex: 1, paddingRight: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: theme.textPrimary,
                          flex: 1,
                          marginRight: 8,
                        }}
                        numberOfLines={1}
                      >
                        {notif.title}
                      </Text>
                      {!notif.isRead && (
                        <View
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 3.5,
                            backgroundColor: colors.primary,
                          }}
                        />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 12.5,
                        color: theme.textSecondary,
                        lineHeight: 17,
                        fontWeight: '400',
                      }}
                    >
                      {notif.body}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </AppBottomSheet>

      {/* Reusable Streak Breakdown & Education Modal */}
      <StreakModal
        visible={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        initialStreakData={{ appStreak: streakCount }}
      />

      {/* Production-Ready Partner Sync Bottom Sheet Modal */}
      <PartnerSyncModal
        visible={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
        user={user}
        onPartnerUpdated={(newStatus) => {
          setPartnerStatus(newStatus);
          setIsPartnerCardDismissed(!!newStatus?.cardDismissed);
        }}
      />

      {/* Article Preview Bottom Sheet (Matching Learn Page) */}
      <Modal
        visible={!!selectedEduArticle && !isFullReadingMode}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setSelectedEduArticle(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
          onPress={() => setSelectedEduArticle(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              overflow: 'hidden',
              maxHeight: '85%',
            }}
          >
            {selectedEduArticle?.thumbnail ? (
              <View style={{ width: '100%', height: 190, position: 'relative' }}>
                <Image
                  source={{ uri: selectedEduArticle.thumbnail }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 16,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setSelectedEduArticle(null)}
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {selectedEduArticle?.category}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setSelectedEduArticle(null)}
                >
                  <Ionicons name="close" size={18} color="#374151" />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#111827', lineHeight: 26, marginBottom: 6 }}>
                {selectedEduArticle?.title}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 12 }}>
                {selectedEduArticle?.readTime} • {selectedEduArticle?.author}
              </Text>

              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 }} />

              <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 16 }}>
                {selectedEduArticle?.summary}
              </Text>

              {selectedEduArticle?.bulletPoints && selectedEduArticle.bulletPoints.length > 0 && (
                <>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#111827', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Key Takeaways
                  </Text>
                  {selectedEduArticle.bulletPoints.map((point, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
                      <Text style={{ fontSize: 13, color: '#4B5563', flex: 1, lineHeight: 18, fontWeight: '500' }}>
                        {point}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Read Full Article Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                  paddingVertical: 13,
                  borderRadius: 50,
                  marginTop: 16,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 2,
                }}
                onPress={() => setIsFullReadingMode(true)}
              >
                <Ionicons name="book" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Read Full Article</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Full Article Reader Page Modal (Matching Learn Page) */}
      <Modal
        visible={!!selectedEduArticle && isFullReadingMode}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsFullReadingMode(false)}
      >
        {selectedEduArticle && (
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: 40 }}>
            {/* Header with Back Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
                onPress={() => setIsFullReadingMode(false)}
              >
                <Ionicons name="arrow-back" size={20} color="#111827" />
              </TouchableOpacity>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#111827' }}>Clinical Education</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#111827', lineHeight: 28, marginBottom: 6 }}>
                {selectedEduArticle.title}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 12 }}>
                {selectedEduArticle.readTime} • {selectedEduArticle.author}
              </Text>

              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 }} />

              <Text style={{ fontSize: 14, color: '#334155', lineHeight: 22, marginBottom: 16 }}>
                {selectedEduArticle.fullText}
              </Text>

              <Text style={{ fontSize: 14, color: '#334155', lineHeight: 22, marginBottom: 24 }}>
                Consistency in learning about your reproductive wellness empowers informed health decisions and personalized care throughout each phase of life.
              </Text>

              {/* Ask Dr. Red AI about this article */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#584988',
                  paddingVertical: 14,
                  borderRadius: 18,
                  shadowColor: '#584988',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 2,
                }}
                onPress={() => {
                  const title = selectedEduArticle.title;
                  setIsFullReadingMode(false);
                  setSelectedEduArticle(null);
                  if (navigation?.navigate) {
                    navigation.navigate('AICompanion', {
                      initialQuery: `Hi Dr. Red, I was reading your article "${title}". Can you give me more insights on how this relates to my cycle?`,
                      autoSend: true,
                      timestamp: Date.now(),
                    });
                  }
                }}
              >
                <Ionicons name="sparkles" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Ask Dr. Red about this</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}
