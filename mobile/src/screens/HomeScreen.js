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
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Polygon, Rect, G, Defs, Ellipse, Text as SvgText } from 'react-native-svg';
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
import EducationArticleModals from '../components/EducationArticleModals';
import StageEducationSection from '../components/StageEducationSection';
import { getUserBookings } from '../services/telemedicineService';
import notificationService from '../services/notificationService';

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

function NotificationEmptyIllustration({ theme, isDarkMode }) {
  return (
    <View style={{ width: 176, height: 142, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', width: 128, height: 128, borderRadius: 64, backgroundColor: isDarkMode ? '#271B21' : '#FFF0F1', top: 5 }} />
      <View style={{ position: 'absolute', width: 110, height: 78, borderRadius: 18, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, left: 20, top: 34, padding: 12, justifyContent: 'flex-end' }}>
        <View style={{ width: 56, height: 5, borderRadius: 4, backgroundColor: isDarkMode ? '#444444' : '#E4E7EC', marginBottom: 7 }} />
        <View style={{ width: 78, height: 5, borderRadius: 4, backgroundColor: isDarkMode ? '#383838' : '#EEF0F3' }} />
      </View>
      <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: isDarkMode ? '#3B2024' : '#FFE2E3', borderWidth: 4, borderColor: theme.modalBg, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], marginTop: 4 }}>
        <Ionicons name="notifications-outline" size={29} color={colors.primary} />
      </View>
      <View style={{ position: 'absolute', right: 12, top: 18, width: 30, height: 30, borderRadius: 15, backgroundColor: isDarkMode ? '#202020' : '#FFFFFF', borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="checkmark" size={16} color={colors.primary} />
      </View>
      <View style={{ position: 'absolute', left: 17, bottom: 20, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
    </View>
  );
}

function HomeContentRail({ wide, children, style }) {
  const { width } = useWindowDimensions();
  return (
    <View style={[{
      width: '100%',
      flexDirection: wide ? 'row' : 'column',
      flexWrap: wide && width < 1200 ? 'wrap' : 'nowrap',
      alignItems: 'stretch',
      gap: wide ? 14 : 0,
    }, style]}>
      {children}
    </View>
  );
}

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
  const { width: windowWidth } = useWindowDimensions();
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
  const isWideHome = windowWidth >= 820;
  const homeCardWidth = isWideHome
    ? (windowWidth >= 1200 ? '31.5%' : '48%')
    : '100%';
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
  const [streakCount, setStreakCount] = useState(0);

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
      unsub = notificationService.subscribe((items) => {
        if (Array.isArray(items)) {
          setNotificationsList(items);
          setUnreadNotificationsCount(items.filter((n) => !n.isRead).length);
        } else {
          reloadNotifications();
        }
      });
    }
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Real cycle data states
  const [cachedProfile, setCachedProfile] = useState(healthProfile || user?.health_profile || null);
  const [cycleInsights, setCycleInsights] = useState(() => cycleService.computeCycleInsights([], 28));
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

      const fallbackProfile = {
        cycleLength: Number(storedProfile?.cycleLength || activeCycleProfile.cycleLength || 28),
        periodDuration: Number(storedProfile?.periodDuration || activeCycleProfile.periodDuration || 5),
        lastPeriodDate: storedProfile?.lastPeriodDate || activeCycleProfile.lastPeriodDate,
      };
      const history = await cycleService.getCycleHistory();
      const personalized = cycleService.getPersonalizedCycleProfile(history?.logs || [], fallbackProfile);
      const cycleLen = personalized.cycleLength;
      const periodDur = personalized.periodDuration;

      if (typeof cycleService?.getFertilityPrediction === 'function') {
        const pred = await cycleService.getFertilityPrediction({
          cycleLength: cycleLen,
          periodDuration: periodDur,
          lastPeriodDate: personalized.lastPeriodDate,
        });
        if (pred) setCyclePrediction(pred);
      }
      setCycleInsights(cycleService.computeCycleInsights(history?.logs || [], cycleLen));
    } catch (err) {
      console.warn('[HomeScreen] Error loading cycle data:', err);
    }
  };

  useEffect(() => {
    loadCycleData();
    const unsubscribe = navigation?.addListener?.('focus', loadCycleData);
    return unsubscribe;
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
          isPerimenopause={activeHealthMode === 'perimenopause'}
          greetingDisplayName={user?.name?.trim()?.split(/\s+/)?.[0] || ''}
          navigation={navigation}
        />
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ width: '100%', alignItems: 'stretch', paddingBottom: 110 }}
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
          {isWideHome && (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8, marginBottom: 12, paddingHorizontal: 2 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 21, fontWeight: '800', letterSpacing: -0.4 }}>Your health</Text>
            </View>
          )}
          <View style={{ width: '100%' }}>
          {/* BENTO CARD 1: Reproductive Wellness */}
          <TouchableOpacity
            activeOpacity={0.92}
            className="rounded-[32px] p-5 pb-6 mb-3.5 shadow-xs"
            style={{
              width: '100%',
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

          </View>
          <HomeContentRail wide={isWideHome}>
          {/* CARD 1: DAILY WELLNESS & DR. RED AI SYMPTOM CHECK-IN */}
          <View
            style={{
              width: isWideHome ? homeCardWidth : '100%',
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
          {/* PERSONAL CYCLE OBSERVATIONS */}
          <View style={{ width: isWideHome ? homeCardWidth : '100%', backgroundColor: theme.card, borderRadius: 28, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: theme.cardBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDarkMode ? '#342B4E' : '#F1EAFE', alignItems: 'center', justifyContent: 'center', marginRight: 11 }}>
                <Ionicons name="sparkles-outline" size={19} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '900' }}>Your cycle insights</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>Patterns from what you’ve logged</Text>
              </View>
            </View>
            {cycleInsights.slice(0, 2).map((insight, index) => (
              <View key={insight.id} style={{ paddingVertical: 11, borderTopWidth: index ? 1 : 0, borderTopColor: theme.cardBorder }}>
                <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '800', lineHeight: 20 }}>{insight.title}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{insight.detail}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={() => navigation?.navigate('CycleCalendar')} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start' }} accessibilityRole="button" accessibilityLabel="View cycle history and log symptoms">
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800', marginRight: 5 }}>View history & log symptoms</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.primary} />
            </TouchableOpacity>
            <Text style={{ color: theme.textMuted, fontSize: 10, lineHeight: 15, marginTop: 10 }}>These are observations from your entries, not medical advice. Predictions are estimates.</Text>
          </View>

          {/* CARD 2: PARTNER RHYTHM & MOMENTS SYNC */}
          {!isPartnerCardDismissed && (
            <View
              style={{
                width: isWideHome ? homeCardWidth : '100%',
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
          </HomeContentRail>

          {/* CARD 3: TELEMEDICINE SPECIALIST & VIRTUAL CLINIC */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={{
              width: '100%',
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
          {/* SECTION: EDUCATIONAL PERIOD & CYCLE INSIGHTS                               */}
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

          <StageEducationSection
            content={{
              feature: {
                title: 'Perimenopause periods',
                summary: 'Understand new cycle shifts, rethink period products, and know when to get support.',
                bullets: ['Understand new cycle shifts', 'Rethink your period products', 'Know when to get help for period issues'],
                actionLabel: 'Be prepared',
                icon: 'water-outline',
                article: CYCLE_ARTICLES_DATA[0],
                railTitle: 'Based on your current cycle',
              },
              articles: CYCLE_ARTICLES_DATA.filter((article) => article.id !== 'art_perimenopause'),
            }}
            onSelectArticle={handleOpenEduArticle}
            onSeeAll={() => navigation?.navigate('Learn')}
            theme={theme}
            isDarkMode={isDarkMode}
          />

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

        {/* The app sheet provides its own close affordance. */}
        <View style={{ width: '100%', height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: theme.modalBg }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: theme.textPrimary }}>Notifications</Text>
          {unreadNotificationsCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ position: 'absolute', right: 16, height: 36, justifyContent: 'center', paddingHorizontal: 8 }}
              onPress={async () => {
              setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
              setUnreadNotificationsCount(0);
              if (typeof notificationService?.markAllAsRead === 'function') {
                void notificationService.markAllAsRead();
              }
              showToastSuccess && showToastSuccess('All marked as read');
              }}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Seamless List (No All-Round Borders, Edge-to-Edge Full Width) */}
        <ScrollView
          style={{ width: '100%' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ width: '100%', paddingBottom: 24, flexGrow: 1 }}
        >
          {notificationsList.length === 0 ? (
            <View style={{ flex: 1, minHeight: 420, width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
              <NotificationEmptyIllustration theme={theme} isDarkMode={isDarkMode} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' }}>You’re all caught up</Text>
              <Text style={{ maxWidth: 380, fontSize: 13, lineHeight: 20, color: theme.textSecondary, textAlign: 'center', marginTop: 7 }}>
                When there’s an update about your cycle, care, or medication, you’ll find it here.
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
                      setNotificationsList((prev) =>
                        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
                      );
                      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
                      void notificationService.markAsRead(notif.id);
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
                    {!!notif.time && (
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 5 }}>
                        {notif.time}
                      </Text>
                    )}
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

      <EducationArticleModals
        article={selectedEduArticle}
        isReading={isFullReadingMode}
        onReadFull={() => setIsFullReadingMode(true)}
        onClosePreview={() => setSelectedEduArticle(null)}
        onCloseReader={() => setIsFullReadingMode(false)}
        onAskDrRed={(article) => {
          const title = article?.title || 'this article';
          setIsFullReadingMode(false);
          setSelectedEduArticle(null);
          navigation?.navigate('AICompanion', {
            initialQuery: `Hi Dr. Red, I was reading your article "${title}". Can you give me more insights on how this relates to my health?`,
            autoSend: true,
            timestamp: Date.now(),
          });
        }}
      />

    </SafeAreaView>
  );
}
