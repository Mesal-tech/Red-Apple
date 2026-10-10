import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import * as pregnancyService from '../services/pregnancyService';
import ArticleCarousel from '../components/ArticleCarousel';
import { scheduleAntenatalReminders } from '../utils/notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Functional Circular Ring for Gestational Week Milestone
function PregnancyMilestoneRing({ currentWeek = 16, totalWeeks = 40 }) {
  const fraction = Math.min(Math.max(currentWeek / totalWeeks, 0.05), 1);
  const totalDegrees = 360 * fraction;
  const rightDeg = Math.min(totalDegrees, 180);
  const leftDeg = Math.max(totalDegrees - 180, 0);

  return (
    <View style={ringStyles.ringContainer}>
      <View style={ringStyles.trackCircle} />

      <View style={ringStyles.halfCircleContainerRight}>
        <View
          style={[
            ringStyles.halfCircleRight,
            { transform: [{ rotate: `${rightDeg}deg` }] },
          ]}
        />
      </View>

      {totalDegrees > 180 && (
        <View style={ringStyles.halfCircleContainerLeft}>
          <View
            style={[
              ringStyles.halfCircleLeft,
              { transform: [{ rotate: `${leftDeg}deg` }] },
            ]}
          />
        </View>
      )}

      <View style={ringStyles.innerMaskCircle}>
        <Text style={ringStyles.ringNumber}>{currentWeek}</Text>
        <Text style={ringStyles.ringTotal}>Weeks</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  ringContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  trackCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 7,
    borderColor: '#FFEBEE',
    position: 'absolute',
  },
  halfCircleContainerRight: {
    width: 52,
    height: 104,
    position: 'absolute',
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
  halfCircleRight: {
    width: 52,
    height: 104,
    borderTopRightRadius: 52,
    borderBottomRightRadius: 52,
    borderWidth: 7,
    borderColor: '#DC2626',
    borderLeftWidth: 0,
    transformOrigin: 'left center',
  },
  halfCircleContainerLeft: {
    width: 52,
    height: 104,
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  halfCircleLeft: {
    width: 52,
    height: 104,
    borderTopLeftRadius: 52,
    borderBottomLeftRadius: 52,
    borderWidth: 7,
    borderColor: '#DC2626',
    borderRightWidth: 0,
    transformOrigin: 'right center',
  },
  innerMaskCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ringNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#DC2626',
  },
  ringTotal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
});

export default function PregnancyScreen({
  dueDate = 'Dec 24, 2026',
  conceptionDate = 'Apr 2, 2026',
  currentWeek = 16,
  greetingDisplayName = 'Amara',
  weekDays = null,
  onSwitchToCycleMode,
  onBookDoctor,
  onOpenDoctorPage,
}) {
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showWombLifeModal, setShowWombLifeModal] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);

  // Kick Counter State
  const [showKickCounterModal, setShowKickCounterModal] = useState(false);
  const [kickCount, setKickCount] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [kickLogs, setKickLogs] = useState([
    { id: 1, date: 'Today, 2:30 PM', count: 10, duration: '12 min' },
    { id: 2, date: 'Yesterday, 8:15 PM', count: 10, duration: '15 min' },
  ]);

  // Dynamic Gestational & Baby Milestone State
  const [liveWeek, setLiveWeek] = useState(currentWeek);
  const [liveDueDate, setLiveDueDate] = useState(dueDate);
  const [milestoneTitle, setMilestoneTitle] = useState('Patterned Hair & Heart Development');
  const [milestoneDesc, setMilestoneDesc] = useState('Eyes are becoming sensitive to light and facial expressions develop.');

  useEffect(() => {
    loadLivePregnancyData();
  }, []);

  const loadLivePregnancyData = async () => {
    try {
      const res = await pregnancyService.getPregnancyStatus();
      if (res?.pregnancy) {
        setLiveWeek(res.pregnancy.current_week || currentWeek);
        setLiveDueDate(res.pregnancy.estimated_due_date || dueDate);
        if (res.pregnancy.weekly_milestone_title) setMilestoneTitle(res.pregnancy.weekly_milestone_title);
        if (res.pregnancy.weekly_milestone_description) setMilestoneDesc(res.pregnancy.weekly_milestone_description);
        scheduleAntenatalReminders(res.pregnancy.current_week, res.pregnancy.estimated_due_date).catch(() => { });
      }
      const kicksRes = await pregnancyService.getKickHistory();
      if (kicksRes?.sessions && kicksRes.sessions.length > 0) {
        setKickLogs(
          kicksRes.sessions.map((k) => ({
            id: k.id,
            date: new Date(k.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            count: k.kick_count,
            duration: `${k.duration_minutes} min`,
          }))
        );
      }
    } catch (e) {
      console.warn('[PregnancyScreen] Error loading live pregnancy data:', e);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleRegisterKick = () => {
    if (!isTimerRunning) {
      setIsTimerRunning(true);
    }
    const newCount = kickCount + 1;
    setKickCount(newCount);

    if (newCount >= 10) {
      setIsTimerRunning(false);
      const minutesSpent = Math.max(1, Math.ceil(timerSeconds / 60));
      const formattedTime = `${Math.floor(timerSeconds / 60)} min ${timerSeconds % 60} sec`;
      setKickLogs([
        { id: Date.now(), date: 'Just now', count: 10, duration: formattedTime },
        ...kickLogs,
      ]);

      pregnancyService.logKickSession(10, minutesSpent, 'Completed 10-kick count').catch((err) => {
        console.warn('[PregnancyScreen] Kick log sync error:', err?.message);
      });
    }
  };

  const resetKickSession = () => {
    setKickCount(0);
    setTimerSeconds(0);
    setIsTimerRunning(false);
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLivePregnancyData();
    await new Promise((res) => setTimeout(res, 600));
    setIsRefreshing(false);
  };

  // Calendar Week Strip
  const calendarWeekDays = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const days = [];
    const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        singleLetter: letters[i],
        dayNum: d.getDate(),
        isToday,
        dateKey,
      });
    }
    return days;
  }, []);

  const trimester = liveWeek <= 13 ? 'First Trimester' : liveWeek <= 27 ? 'Second Trimester' : 'Third Trimester';

  return (
    <ScrollView
      contentContainerStyle={styles.pageScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#DC2626"
          colors={['#DC2626', '#FA4A14']}
          progressBackgroundColor="#FFFFFF"
        />
      }
    >
      {/* CAL AI STYLE 7-DAY CALENDAR STRIP */}
      <View style={styles.calAiCalendarRow}>
        {calendarWeekDays.map((item) => {
          const isSelected = selectedDateKey === item.dateKey;
          return (
            <TouchableOpacity
              key={item.dateKey}
              activeOpacity={0.75}
              style={styles.calAiDayCol}
              onPress={() => setSelectedDateKey(item.dateKey)}
            >
              <View
                style={[
                  styles.calAiCircle,
                  item.isToday
                    ? styles.calAiCircleToday
                    : styles.calAiCircleDashed,
                  isSelected && !item.isToday && styles.calAiCircleSelected,
                ]}
              >
                <Text
                  style={[
                    styles.calAiDayLetter,
                    item.isToday
                      ? styles.calAiDayLetterToday
                      : styles.calAiDayLetterNormal,
                  ]}
                >
                  {item.singleLetter}
                </Text>
              </View>
              <Text
                style={[
                  styles.calAiDateNum,
                  item.isToday && styles.calAiDateNumToday,
                  isSelected && styles.calAiDateNumSelected,
                ]}
              >
                {item.dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* HERO FEATURED WHITE CARD (HEADER REMOVED AS REQUESTED) */}
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.heroCardContainer}
        onPress={() => setShowDetailsModal(true)}
      >
        <View style={styles.heroWhiteCard}>
          {/* Big Display Headline */}
          <Text style={styles.heroHeadlineDisplay}>
            Nurturing Life & Growing{"\n"}Strong Together.
          </Text>

          {/* Functional Ring & Key Health Details */}
          <View style={styles.heroRingRow}>
            <PregnancyMilestoneRing currentWeek={liveWeek} totalWeeks={40} />
            <View style={styles.heroMetricsCol}>
              <View style={styles.metricItemRow}>
                <View style={[styles.metricDot, { backgroundColor: '#DC2626' }]} />
                <Text style={styles.metricItemText}>
                  Status: <Text style={{ fontWeight: '800', color: '#111827' }}>{trimester} ({liveWeek}w 2d)</Text>
                </Text>
              </View>
              <View style={styles.metricItemRow}>
                <View style={[styles.metricDot, { backgroundColor: '#0284C7' }]} />
                <Text style={styles.metricItemText}>
                  Baby Heartbeat: <Text style={{ fontWeight: '700', color: '#111827' }}>Optimal & Active</Text>
                </Text>
              </View>
              <View style={styles.metricItemRow}>
                <View style={[styles.metricDot, { backgroundColor: '#D97706' }]} />
                <Text style={styles.metricItemText}>
                  Est. Due Date: <Text style={{ fontWeight: '700', color: '#111827' }}>{liveDueDate}</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Card Footer */}
          <View style={styles.heroFooterRow}>
            <Text style={styles.heroFooterMeta}>Personalized for your maternal vitality & fetal development</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* FEATURED CARD: TALK TO A DOCTOR */}
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.doctorFeaturedCard}
        onPress={() => {
          if (onOpenDoctorPage) {
            onOpenDoctorPage();
          } else if (onBookDoctor) {
            onBookDoctor({
              name: 'Dr. Chioma Nwachukwu',
              specialty: 'Obstetrician & Gynecologist',
              experience: '12 Yrs Exp',
              nextAvailable: 'Today, 10:00 AM',
              fee: '₦15,000',
              avatarBg: '#008080',
            });
          }
        }}
      >
        <View style={styles.doctorFeaturedTopRow}>
          <View style={styles.doctorBadgeIconLarge}>
            <Ionicons name="videocam" size={26} color="#008080" />
          </View>
          <View style={styles.doctorActionPill}>
            <Text style={styles.doctorActionPillText}>Consult</Text>
            <Ionicons name="arrow-forward" size={13} color="#008080" />
          </View>
        </View>
        <Text style={styles.doctorFeaturedTitle}>Talk to a Doctor</Text>
        <Text style={styles.doctorFeaturedSubtitle}>
          Book an HD video consultation with a certified OB-GYN & maternal care specialist.
        </Text>
      </TouchableOpacity>

      {/* 2-COLUMN BENTO GRID: CYCLE MODE & KICK COUNTER */}
      <View style={styles.bentoSectionGrid}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.bentoWhiteCard}
          onPress={onSwitchToCycleMode}
        >
          <View style={[styles.bentoIconSquare, { backgroundColor: '#FFE5E9' }]}>
            <Ionicons name="sparkles" size={22} color="#DC2626" />
          </View>
          <Text style={styles.bentoCardHeading}>Cycle Mode</Text>
          <Text style={styles.bentoCardSub}>Fertile & period tracker</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.bentoWhiteCard}
          onPress={() => setShowKickCounterModal(true)}
        >
          <View style={[styles.bentoIconSquare, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="fitness" size={22} color="#DC2626" />
          </View>
          <Text style={styles.bentoCardHeading}>Kick Counter</Text>
          <Text style={styles.bentoCardSub}>Fetal movement tracker</Text>
        </TouchableOpacity>
      </View>

      {/* UPCOMING SCREENINGS & MILESTONES SECTION */}
      <View style={styles.predictionsContainer}>
        <Text style={styles.sectionHeaderLabelDark}>UPCOMING SCREENINGS & MILESTONES</Text>
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.upcomingPredictionCardClean}
            onPress={() => setShowWombLifeModal(true)}
          >
            <View style={[styles.upcomingIconSquircle, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="fitness" size={22} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.upcomingCardMainTitle}>Anatomy Ultrasound Scan</Text>
              <Text style={styles.upcomingCardSubTitle}>Mid-pregnancy anomaly & fetal growth review</Text>
            </View>
            <View style={styles.upcomingPillRed}>
              <Text style={styles.upcomingPillRedText}>Week 20</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.upcomingPredictionCardClean}
            onPress={() => setShowDetailsModal(true)}
          >
            <View style={[styles.upcomingIconSquircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="heart" size={22} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.upcomingCardMainTitle}>Glucose Challenge Test</Text>
              <Text style={styles.upcomingCardSubTitle}>Gestational diabetes & metabolic wellness check</Text>
            </View>
            <View style={styles.upcomingPillBlue}>
              <Text style={styles.upcomingPillBlueText}>Week 24</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.upcomingPredictionCardClean}
            onPress={() => setShowTipsModal(true)}
          >
            <View style={[styles.upcomingIconSquircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="shield-checkmark" size={22} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.upcomingCardMainTitle}>Routine Prenatal Checkup</Text>
              <Text style={styles.upcomingCardSubTitle}>Fundal height, blood pressure & fetal review</Text>
            </View>
            <View style={[styles.upcomingPillRed, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.upcomingPillRedText, { color: '#B45309' }]}>Upcoming</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* PERSONALIZED INSIGHTS CAROUSEL OF ARTICLES */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <Text style={styles.sectionHeaderLabelDark}>PERSONALIZED INSIGHTS</Text>
        </View>
        <ArticleCarousel onSelectArticle={(article) => setSelectedArticle(article)} />
      </View>

      <View style={{ height: 100 }} />

      {/* ARTICLE READER MODAL (FOR CAROUSEL ARTICLES) */}
      <Modal
        visible={!!selectedArticle}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setSelectedArticle(null)}
      >
        <View style={styles.modalFullContainer}>
          <View style={styles.modalFullHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeBtn}
              onPress={() => setSelectedArticle(null)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>{selectedArticle?.category || 'Maternal Insight'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalPadding}>
            <Text style={styles.articleTitle}>{selectedArticle?.title}</Text>
            <Text style={styles.articleMeta}>{selectedArticle?.readTime}</Text>
            <Text style={styles.articleBody}>{selectedArticle?.fullContent}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* 1. GESTATIONAL DETAILS MODAL */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalFullContainer}>
          <View style={styles.modalFullHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeBtn}
              onPress={() => setShowDetailsModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Gestational Details</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalPadding}>
            <View style={styles.detailsHeroCard}>
              <Text style={styles.detailsHeroWeek}>Week {liveWeek}, Day 2</Text>
              <Text style={styles.detailsHeroSub}>{trimester} • Estimated Due Date: {liveDueDate}</Text>
            </View>

            <View style={styles.detailMetricRow}>
              <View style={styles.detailMetricBox}>
                <Text style={styles.detailMetricLabel}>CONCEPTION DATE</Text>
                <Text style={styles.detailMetricVal}>{conceptionDate}</Text>
              </View>
              <View style={styles.detailMetricBox}>
                <Text style={styles.detailMetricLabel}>ESTIMATED DUE DATE</Text>
                <Text style={styles.detailMetricVal}>{liveDueDate}</Text>
              </View>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.detailsCardTitle}>{milestoneTitle}</Text>
              <Text style={styles.detailsCardBody}>
                {milestoneDesc}{'\n\n'}
                - Facial muscle nerve connections actively forming.{'\n'}
                - Ears have reached their final anatomical position.{'\n'}
                - Bone mineralization accelerating rapidly.{'\n'}
                - Heart pumping robustly to nourish growing tissue.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 2. WOMB DEVELOPMENT ARTICLE MODAL */}
      <Modal
        visible={showWombLifeModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowWombLifeModal(false)}
      >
        <View style={styles.modalFullContainer}>
          <View style={styles.modalFullHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeBtn}
              onPress={() => setShowWombLifeModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Womb Development</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalPadding}>
            <Text style={styles.articleTitle}>Your Baby's Life in the Womb</Text>
            <Text style={styles.articleMeta}>Week {liveWeek} Guidance • 4 min read</Text>
            <Text style={styles.articleBody}>
              At Week {liveWeek} of pregnancy, your baby is actively exploring their environment: flexing tiny limb joints, sucking their thumb, and making gentle facial expressions.{'\n\n'}
              The umbilical cord has grown thick and robust to transport nutrients, oxygen, and protective antibodies.{'\n\n'}
              The heart is pumping approximately 25 quarts of blood daily, and hearing structures are sensitive enough to recognize your heartbeat, voice, and external music.
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* 3. NUTRITION TIPS ARTICLE MODAL */}
      <Modal
        visible={showTipsModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowTipsModal(false)}
      >
        <View style={styles.modalFullContainer}>
          <View style={styles.modalFullHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeBtn}
              onPress={() => setShowTipsModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Nutrition Tips</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalPadding}>
            <Text style={styles.articleTitle}>7 Tips on How to Snack Healthily During Pregnancy</Text>
            <Text style={styles.articleMeta}>Prenatal Nutrition • 5 min read</Text>
            <Text style={styles.articleBody}>
              1. Pair Complex Carbs with Protein: Combine apple slices with almond butter or Greek yogurt with berries for sustained blood sugar stability.{'\n\n'}
              2. Keep Calcium-Rich Snacks Handy: Fortified plant milk smoothies, cheese sticks, or kale chips support fetal skeleton growth.{'\n\n'}
              3. Hydrate Constantly: Dehydration can trigger false Braxton-Hicks contractions. Drink 8-10 glasses of water daily.{'\n\n'}
              4. Choose Fiber to Ease Constipation: Prunes, chia seed puddings, and whole-grain toast help digestion.{'\n\n'}
              5. Portion Nuts & Seeds: Walnuts and pumpkin seeds supply vital Omega-3 fatty acids for fetal brain development.{'\n\n'}
              6. Manage Nausea with Ginger: Ginger tea or dry whole-grain crackers settle morning sickness.{'\n\n'}
              7. Avoid Unpasteurized Dairy & Raw Seafood: Ensure all cheeses, milk, and eggs are thoroughly pasteurized to protect against listeria.
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* 4. KICK COUNTER MODAL */}
      <Modal
        visible={showKickCounterModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowKickCounterModal(false)}
      >
        <View style={styles.modalFullContainer}>
          <View style={styles.modalFullHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeBtn}
              onPress={() => setShowKickCounterModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Fetal Movement Counter</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalPadding}>
            <View style={styles.kickHeroCard}>
              <Text style={styles.kickHeroTitle}>Target: 10 Movements</Text>
              <Text style={styles.kickHeroSub}>
                A healthy baby typically completes 10 distinct movements within 2 hours during active cycles.
              </Text>
              <Text style={styles.kickTimerText}>{formatTimer(timerSeconds)}</Text>
            </View>

            {/* BIG INTERACTIVE KICK BUTTON */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.kickBigBtn,
                kickCount >= 10 && { backgroundColor: '#C81E3A', borderColor: '#059669' },
              ]}
              onPress={handleRegisterKick}
            >
              <Ionicons name="footsteps" size={38} color="#FFFFFF" />
              <Text style={styles.kickBigCount}>{kickCount}</Text>
              <Text style={styles.kickBigSub}>
                {kickCount >= 10 ? 'Session Complete 🎉' : 'Tap on Each Movement'}
              </Text>
            </TouchableOpacity>

            <View style={styles.kickActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.kickResetBtn}
                onPress={resetKickSession}
              >
                <Ionicons name="refresh" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.kickResetText}>Reset Counter</Text>
              </TouchableOpacity>
            </View>

            {/* HISTORY LOGS */}
            <Text style={styles.kickHistoryTitle}>Past Kick Sessions</Text>
            {kickLogs.map((log) => (
              <View key={log.id} style={styles.kickLogRow}>
                <View>
                  <Text style={styles.kickLogDate}>{log.date}</Text>
                  <Text style={styles.kickLogDuration}>Duration: {log.duration}</Text>
                </View>
                <View style={styles.kickLogBadge}>
                  <Text style={styles.kickLogBadgeText}>{log.count} kicks</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageScrollContent: {
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },

  /* Cal AI Style 7-Day Calendar Strip */
  calAiCalendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  calAiDayCol: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 32) / 7,
  },
  calAiCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calAiCircleToday: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  calAiCircleDashed: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calAiCircleSelected: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1.5,
    borderColor: '#DC2626',
  },
  calAiDayLetter: {
    fontSize: 11,
    fontWeight: '800',
  },
  calAiDayLetterToday: {
    color: '#FFFFFF',
  },
  calAiDayLetterNormal: {
    color: colors.textSecondary,
  },
  calAiDateNum: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
  },
  calAiDateNumToday: {
    color: '#DC2626',
    fontWeight: '900',
  },
  calAiDateNumSelected: {
    color: '#DC2626',
    fontWeight: '900',
  },

  /* Hero Featured White Card */
  heroCardContainer: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  heroWhiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  heroHeadlineDisplay: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 28,
    letterSpacing: -0.4,
    marginBottom: 18,
  },
  heroRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroMetricsCol: {
    flex: 1,
    marginLeft: 18,
    gap: 8,
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
    color: colors.textSecondary,
    fontWeight: '600',
  },
  heroFooterRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  heroFooterMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* Featured Card: Talk to a Doctor */
  doctorFeaturedCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  doctorFeaturedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  doctorBadgeIconLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  doctorActionPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#008080',
  },
  doctorFeaturedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  doctorFeaturedSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  /* 2-Column Bento Grid */
  bentoSectionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  bentoWhiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bentoIconSquare: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bentoCardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  bentoCardSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* Upcoming Screenings Section */
  predictionsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeaderLabelDark: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  upcomingPredictionCardClean: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  upcomingIconSquircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingCardMainTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  upcomingCardSubTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upcomingPillRed: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  upcomingPillRedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  upcomingPillBlue: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  upcomingPillBlueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },

  /* Modals */
  modalFullContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalFullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPadding: {
    padding: 20,
  },
  detailsHeroCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  detailsHeroWeek: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 4,
  },
  detailsHeroSub: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
  },
  detailMetricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailMetricBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailMetricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 4,
  },
  detailMetricVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailsCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  detailsCardBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  articleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  articleMeta: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '700',
    marginBottom: 16,
  },
  articleBody: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
  },

  /* Kick Counter Modal */
  kickHeroCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  kickHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  kickHeroSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  kickTimerText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    marginTop: 12,
  },
  kickBigBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#DC2626',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 6,
    borderColor: '#FECACA',
    marginBottom: 20,
  },
  kickBigCount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  kickBigSub: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  kickActionsRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  kickResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  kickResetText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  kickHistoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  kickLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kickLogDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  kickLogDuration: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  kickLogBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  kickLogBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
});
