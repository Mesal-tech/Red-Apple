import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import DoctorCareScreen from './DoctorCareScreen';
import LearnScreen from './LearnScreen';
import PregnancyScreen from './PregnancyScreen';
import PostmenopauseScreen from './PostmenopauseScreen';
import SettingsScreen from './SettingsScreen';
import PrivacyPolicyDetailScreen from './PrivacyPolicyDetailScreen';
import TermsOfUseDetailScreen from './TermsOfUseDetailScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUSBAR_HEIGHT = StatusBar.currentHeight || 38;

function FunctionalCycleRing({ currentDay, totalDays }) {
  const percentage = Math.min(Math.max(currentDay / totalDays, 0), 1);
  const totalDegrees = percentage * 360;

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
        <Text style={ringStyles.ringDayNumber}>{currentDay}</Text>
        <Text style={ringStyles.ringDayTotal}>of {totalDays}</Text>
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
    borderColor: colors.primary,
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
    borderColor: colors.primary,
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
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  ringDayNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
  },
  ringDayTotal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
});

function CycleLengthChart() {
  const months = [
    { month: 'Feb', value: 27 },
    { month: 'Mar', value: 29 },
    { month: 'Apr', value: 28 },
    { month: 'May', value: 26 },
    { month: 'Jun', value: 28 },
    { month: 'Jul', value: 28 },
  ];

  const minY = 24;
  const maxY = 32;
  const chartHeight = 100;

  const getYPos = (val) => {
    const pct = (val - minY) / (maxY - minY);
    return chartHeight * (1 - pct);
  };

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Cycle Length History</Text>

      <View style={styles.chartMainContainer}>
        <View style={styles.yAxisCol}>
          <Text style={styles.yAxisText}>32</Text>
          <Text style={styles.yAxisText}>28</Text>
          <Text style={styles.yAxisText}>24</Text>
        </View>

        <View style={styles.graphPlotArea}>
          <View style={[styles.gridLine, { top: 0 }]} />
          <View style={[styles.gridLine, { top: chartHeight / 2 }]} />
          <View style={[styles.gridLine, { top: chartHeight }]} />

          {months.map((item, idx) => {
            const currentY = getYPos(item.value);
            const xStep = 100 / (months.length - 1);
            const currentXPercent = idx * xStep;

            let lineSegment = null;
            if (idx < months.length - 1) {
              const nextItem = months[idx + 1];
              const nextY = getYPos(nextItem.value);
              const nextXPercent = (idx + 1) * xStep;

              const containerWidth = SCREEN_WIDTH - 120;
              const x1 = (currentXPercent / 100) * containerWidth;
              const y1 = currentY;
              const x2 = (nextXPercent / 100) * containerWidth;
              const y2 = nextY;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);

              lineSegment = (
                <View
                  key={`line-${idx}`}
                  style={{
                    position: 'absolute',
                    left: `${currentXPercent}%`,
                    top: currentY + 6,
                    width: length,
                    height: 3,
                    backgroundColor: colors.primary,
                    borderRadius: 1.5,
                    transformOrigin: 'left center',
                    transform: [{ rotate: `${angle}deg` }],
                    zIndex: 1,
                  }}
                />
              );
            }

            return (
              <React.Fragment key={idx}>
                {lineSegment}
                <View
                  style={[
                    styles.dataPointDotContainer,
                    { left: `${currentXPercent}%`, top: currentY },
                  ]}
                >
                  <View style={styles.dataPointDot} />
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <View style={styles.xAxisRow}>
        <View style={{ width: 32 }} />
        <View style={styles.xAxisLabelsContainer}>
          {months.map((item, idx) => (
            <Text key={idx} style={styles.xAxisText}>{item.month}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function AdditionalAnalyticsMetrics() {
  return (
    <View style={{ gap: 16, marginTop: 16 }}>
      <View style={styles.metricCard}>
        <View style={styles.metricHeaderRow}>
          <View style={styles.metricTitleIconRow}>
            <Ionicons name="water" size={20} color={colors.primary} />
            <Text style={styles.metricCardTitle}>Period Duration & Flow</Text>
          </View>
          <View style={styles.normalBadge}>
            <Text style={styles.normalBadgeText}>Normal Flow</Text>
          </View>
        </View>

        <Text style={styles.metricDescriptionText}>
          Your period typically lasts <Text style={styles.boldText}>5 days</Text>. Flow starts heavy on Days 1–2 and naturally lightens through Day 5.
        </Text>

        <View style={styles.metricStatGrid}>
          <View style={styles.metricStatBox}>
            <Text style={styles.metricStatVal}>5 Days</Text>
            <Text style={styles.metricStatLbl}>Avg. Duration</Text>
          </View>
          <View style={styles.metricStatBox}>
            <Text style={styles.metricStatVal}>Days 1-2</Text>
            <Text style={styles.metricStatLbl}>Heavy Flow</Text>
          </View>
          <View style={styles.metricStatBox}>
            <Text style={styles.metricStatVal}>Days 3-5</Text>
            <Text style={styles.metricStatLbl}>Light Flow</Text>
          </View>
        </View>

        <View style={styles.flowTimelineContainer}>
          <View style={styles.flowDayPillActive}><Text style={styles.flowDayText}>D1</Text></View>
          <View style={styles.flowDayPillActive}><Text style={styles.flowDayText}>D2</Text></View>
          <View style={styles.flowDayPillMedium}><Text style={styles.flowDayText}>D3</Text></View>
          <View style={styles.flowDayPillLight}><Text style={styles.flowDayText}>D4</Text></View>
          <View style={styles.flowDayPillLight}><Text style={styles.flowDayText}>D5</Text></View>
        </View>
      </View>

      <View style={styles.metricCard}>
        <View style={styles.metricHeaderRow}>
          <View style={styles.metricTitleIconRow}>
            <Ionicons name="leaf" size={20} color="#00A88F" />
            <Text style={styles.metricCardTitle}>Fertility & Ovulation</Text>
          </View>
          <View style={[styles.normalBadge, { backgroundColor: '#E0F2F1' }]}>
            <Text style={[styles.normalBadgeText, { color: '#00A88F' }]}>High Accuracy</Text>
          </View>
        </View>

        <View style={styles.fertilityRow}>
          <View style={styles.fertilityItem}>
            <Text style={styles.fertilitySubLabel}>LUTEAL PHASE</Text>
            <Text style={styles.fertilityBigText}>14 Days</Text>
          </View>
          <View style={styles.fertilityItem}>
            <Text style={styles.fertilitySubLabel}>NEXT FERTILE WINDOW</Text>
            <Text style={styles.fertilityBigText}>Aug 10 – Aug 15</Text>
          </View>
        </View>
      </View>

      <View style={styles.metricCard}>
        <View style={styles.metricHeaderRow}>
          <View style={styles.metricTitleIconRow}>
            <Ionicons name="pulse" size={20} color="#7C4DFF" />
            <Text style={styles.metricCardTitle}>Logged Symptoms</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          style={{ marginTop: 8 }}
        >
          <View style={styles.symptomTagPill}>
            <Text style={styles.symptomTagText}>Mild Cramps • 65%</Text>
          </View>
          <View style={styles.symptomTagPill}>
            <Text style={styles.symptomTagText}>Energy Dip • 40%</Text>
          </View>
          <View style={styles.symptomTagPill}>
            <Text style={styles.symptomTagText}>Mood Shift • 25%</Text>
          </View>
          <View style={styles.symptomTagPill}>
            <Text style={styles.symptomTagText}>Bloating • 20%</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default function HomeScreen({ onSignOut }) {
  const [currentPage, setCurrentPage] = useState(1); // 0: Doctor Care | 1: Center Homepage | 2: Learn
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [showAnalysisScreen, setShowAnalysisScreen] = useState(false);
  const [showExpandedCycleModal, setShowExpandedCycleModal] = useState(false);

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(3);
  const [notificationsList, setNotificationsList] = useState([
    {
      id: '1',
      title: 'Period Expected Soon',
      body: 'Your period is expected in 3 days (Jul 29). Tap to review predictions.',
      time: '2h ago',
      icon: 'water-outline',
      iconBg: '#FFEBEE',
      iconColor: colors.primary,
    },
    {
      id: '2',
      title: 'Daily Health Log Reminder',
      body: 'Keep your insights accurate by logging your daily mood and symptoms.',
      time: '5h ago',
      icon: 'create-outline',
      iconBg: '#FFF3E0',
      iconColor: '#E65100',
    },
    {
      id: '3',
      title: 'Doctor Appointment Confirmed',
      body: 'Your HD Video Consultation with Dr. Sarah Jenkins is scheduled for 4:00 PM.',
      time: 'Yesterday',
      icon: 'videocam-outline',
      iconBg: '#E0F2F1',
      iconColor: '#008080',
    },
  ]);

  const [isPregnancyMode, setIsPregnancyMode] = useState(false);
  const [isPostmenopauseMode, setIsPostmenopauseMode] = useState(false);
  const [showPregnancySetupModal, setShowPregnancySetupModal] = useState(false);
  const [pregnancyStep, setPregnancyStep] = useState(1);
  const [pregnancyCalcMethod, setPregnancyCalcMethod] = useState('lmp');
  const [pregnancyMonth, setPregnancyMonth] = useState('Apr');
  const [pregnancyDay, setPregnancyDay] = useState(2);
  const [pregnancyYear, setPregnancyYear] = useState(2026);
  const [pregnancyIsFirstBaby, setPregnancyIsFirstBaby] = useState(true);
  const [pregnancyMultipleType, setPregnancyMultipleType] = useState('single');
  const [pregnancyReminders, setPregnancyReminders] = useState({
    vitamins: true,
    weeklyUpdates: true,
    kickCounter: true,
  });
  const [pregnancyDueDate, setPregnancyDueDate] = useState('Dec 24, 2026');
  const [pregnancyConceptionDate, setPregnancyConceptionDate] = useState('Apr 2, 2026');

  const [showDailyLogDrawer, setShowDailyLogDrawer] = useState(false);
  const [selectedFeelingIndex, setSelectedFeelingIndex] = useState(0);
  const [activeQuickLogs, setActiveQuickLogs] = useState(['Cramps']);
  const [hasLoggedToday, setHasLoggedToday] = useState(true);

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isFullReadingMode, setIsFullReadingMode] = useState(false);

  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null);
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

  const handleOpenNotifications = () => {
    setUnreadNotificationsCount(0);
    setShowNotificationsModal(true);
  };

  const calendarDays = [
    { day: '', type: 'empty' }, { day: '', type: 'empty' }, { day: '', type: 'empty' },
    { day: 1, type: 'period' }, { day: 2, type: 'period' }, { day: 3, type: 'period' }, { day: 4, type: 'period' },
    { day: 5, type: 'period' }, { day: 6, type: 'normal' }, { day: 7, type: 'normal' }, { day: 8, type: 'normal' },
    { day: 9, type: 'normal' }, { day: 10, type: 'normal' }, { day: 11, type: 'normal' },
    { day: 12, type: 'normal' }, { day: 13, type: 'fertile' }, { day: 14, type: 'fertile' },
    { day: 15, type: 'ovulation' }, { day: 16, type: 'fertile' }, { day: 17, type: 'fertile' }, { day: 18, type: 'normal' },
    { day: 19, type: 'normal' }, { day: 20, type: 'normal' }, { day: 21, type: 'normal' }, { day: 22, type: 'normal' },
    { day: 23, type: 'normal' }, { day: 24, type: 'normal' }, { day: 25, type: 'normal' },
    { day: 26, type: 'today' }, { day: 27, type: 'normal' }, { day: 28, type: 'normal' },
    { day: 29, type: 'period' }, { day: 30, type: 'period' }, { day: 31, type: 'period' },
  ];

  const feelingsList = [
    { label: 'Great', icon: 'happy-outline', color: '#00A88F' },
    { label: 'Normal', icon: 'sunny-outline', color: '#FFB300' },
    { label: 'Tired', icon: 'moon-outline', color: '#7C4DFF' },
    { label: 'Sad', icon: 'rainy-outline', color: '#008080' },
    { label: 'Crampy', icon: 'flash-outline', color: colors.primary },
  ];

  const toggleQuickLog = (logName) => {
    if (activeQuickLogs.includes(logName)) {
      setActiveQuickLogs(activeQuickLogs.filter((l) => l !== logName));
    } else {
      setActiveQuickLogs([...activeQuickLogs, logName]);
    }
  };

  const handleSaveDailyLog = () => {
    setHasLoggedToday(true);
    setShowDailyLogDrawer(false);
  };

  const openArticleDetails = (title, category, readTime, author, summary, bulletPoints, fullText) => {
    setSelectedArticle({
      title,
      category,
      readTime,
      author: author || 'Dr. Sarah Jenkins, MD • Gynecologist',
      summary: summary || 'Understanding your body changes empowers proactive reproductive health and fertility planning.',
      bulletPoints: bulletPoints || [
        'Recognize subtle shifts in physical cues and hormonal patterns.',
        'Keep track of daily symptoms to identify cycle trends.',
        'Consult with certified specialists whenever unexpected changes occur.',
      ],
      fullText: fullText || 'Tracking hormonal fluctuations across your menstrual cycle provides invaluable health data. By monitoring physiological symptoms such as cervical fluid elasticity, basal body temperature, and energy levels, you can accurately predict your peak fertile window and optimize your reproductive wellness.',
    });
    setIsFullReadingMode(false);
  };

  const closeFullReadingMode = () => {
    setIsFullReadingMode(false);
    setSelectedArticle(null);
  };

  const handleActivatePregnancyMode = () => {
    setIsPregnancyMode(true);
    setShowPregnancySetupModal(false);
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
        contentOffset={{ x: SCREEN_WIDTH, y: 0 }}
        style={{ flex: 1 }}
      >
        {/* PAGE 0: DOCTOR CARE */}
        <View style={styles.pageWidth}>
          <View style={[styles.shazamHeader, styles.transparentOverlayHeader]}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.headerIconOnlyCircle}
              onPress={() => setShowSettingsModal(true)}
            >
              <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.centerTitleDotCol}>
              <Text style={styles.centerPageTitle}>Doctor Care</Text>
              <View style={styles.dotRow}>
                {[0, 1, 2].map((idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === 0 ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Empty view balancing right side to keep title perfectly centered */}
            <View style={{ width: 38 }} />
          </View>

          <DoctorCareScreen onBookDoctor={(doc) => setSelectedDoctorForBooking(doc)} />
        </View>

        {/* PAGE 1: HOME / PREGNANCY / POSTMENOPAUSE */}
        <View style={[styles.pageWidth, isPregnancyMode && { backgroundColor: colors.backgroundLight }]}>
          <View style={[styles.shazamHeader, isPregnancyMode && { backgroundColor: colors.backgroundLight }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.headerShortcutLeft}
              onPress={() => scrollToPage(0)}
            >
              <Ionicons name="medkit" size={20} color={colors.textPrimary} />
              <Text style={styles.headerShortcutLabel}>Doctor Care</Text>
            </TouchableOpacity>

            <View style={styles.centerDotCol}>
              <View style={styles.dotRow}>
                {[0, 1, 2].map((idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === 1 ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.headerShortcutRight}
              onPress={() => scrollToPage(2)}
            >
              <Ionicons name="journal" size={20} color={colors.textPrimary} />
              <Text style={styles.headerShortcutLabel}>Learn</Text>
            </TouchableOpacity>
          </View>
          {isPregnancyMode ? (
            <PregnancyScreen
              dueDate={pregnancyDueDate}
              conceptionDate={pregnancyConceptionDate}
              currentWeek={16}
              onSwitchToCycleMode={() => setIsPregnancyMode(false)}
              onBookDoctor={(doc) => setSelectedDoctorForBooking(doc)}
            />
          ) : isPostmenopauseMode ? (
            <PostmenopauseScreen
              onSwitchToCycleMode={() => {
                setIsPostmenopauseMode(false);
                setIsPregnancyMode(false);
              }}
              onBookDoctor={(doc) => setSelectedDoctorForBooking(doc)}
            />
          ) : (
            <ScrollView contentContainerStyle={styles.pageScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.greetingHeaderRow}>
                <View>
                  <Text style={styles.greetingSub}>Good morning,</Text>
                  <Text style={styles.greetingName}>Amara</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.bellButton}
                  onPress={handleOpenNotifications}
                >
                  <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
                  {unreadNotificationsCount > 0 && <View style={styles.bellBadgeDot} />}
                </TouchableOpacity>
              </View>

              <View style={styles.calendarCard}>
                <View style={styles.calendarHeaderRow}>
                  <View>
                    <Text style={styles.calendarMonthTitle}>July 2026</Text>
                    <View style={styles.calendarSubRow}>
                      <Text style={styles.calendarSubTitle}>Cycle calendar</Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.infoIconButton}
                        onPress={() => setShowLegendModal(true)}
                      >
                        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.framelessChartButton}
                    onPress={() => setShowAnalysisScreen(true)}
                  >
                    <Ionicons name="stats-chart-outline" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.weekdayRow}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, idx) => (
                    <Text key={idx} style={styles.weekdayText}>{w}</Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarDays.map((item, idx) => {
                    if (item.type === 'empty') {
                      return <View key={idx} style={styles.calendarDayCell} />;
                    }

                    let cellStyle = styles.dayNormal;
                    let textStyle = styles.dayTextNormal;

                    if (item.type === 'period') {
                      cellStyle = styles.dayPeriod;
                      textStyle = styles.dayTextPeriod;
                    } else if (item.type === 'fertile') {
                      cellStyle = styles.dayFertile;
                      textStyle = styles.dayTextFertile;
                    } else if (item.type === 'ovulation') {
                      cellStyle = styles.dayOvulation;
                      textStyle = styles.dayTextOvulation;
                    } else if (item.type === 'today') {
                      cellStyle = styles.dayToday;
                      textStyle = styles.dayTextToday;
                    }

                    return (
                      <View key={idx} style={styles.calendarDayCell}>
                        <View style={[styles.dayCircle, cellStyle]}>
                          <Text style={[styles.dayTextBase, textStyle]}>{item.day}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.mainCycleCard}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.cardExpandButtonTopRight}
                  onPress={() => setShowExpandedCycleModal(true)}
                >
                  <Ionicons name="expand-outline" size={20} color={colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.ringWrapper}>
                  <FunctionalCycleRing currentDay={26} totalDays={28} />
                </View>

                <View style={styles.cycleDetailsCol}>
                  <Text style={styles.cycleDetailHeader}>CYCLE DAY</Text>
                  <View style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.bulletText}>
                      Period in <Text style={styles.boldText}>3 days</Text>
                    </Text>
                  </View>
                  <View style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: '#FFCDD2' }]} />
                    <Text style={styles.bulletText}>Late luteal phase</Text>
                  </View>
                  <View style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: '#00A88F' }]} />
                    <Text style={styles.bulletText}>Ovulation was Jul 15</Text>
                  </View>
                </View>
              </View>

              <View style={{ gap: 12, marginBottom: 16 }}>
                <View style={styles.solidActionCardsRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.solidPregnancyCard}
                    onPress={() => setShowPregnancySetupModal(true)}
                  >
                    <View style={styles.solidCardIconCircle}>
                      <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                    </View>
                    <Text style={styles.solidCardTitle}>Pregnancy Mode</Text>
                    <Text style={styles.solidCardSub}>Track your journey</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.solidPregnancyCard, { backgroundColor: '#8E24AA' }]}
                    onPress={() => {
                      setIsPregnancyMode(false);
                      setIsPostmenopauseMode(true);
                    }}
                  >
                    <View style={styles.solidCardIconCircle}>
                      <Ionicons name="flower" size={22} color="#FFFFFF" />
                    </View>
                    <Text style={styles.solidCardTitle}>Postmenopause</Text>
                    <Text style={styles.solidCardSub}>Health & Tracker</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.solidFullWidthDoctorCard}
                  onPress={() => scrollToPage(0)}
                >
                  <View style={styles.doctorCardLeft}>
                    <View style={styles.doctorIconCircle}>
                      <Ionicons name="videocam" size={22} color="#008080" />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.doctorCardMainTitle}>Talk to a Doctor</Text>
                      <Text style={styles.doctorCardSubTitle}>Book a video consultation with specialists</Text>
                    </View>
                  </View>
                  <View style={styles.doctorConsultBadge}>
                    <Text style={styles.doctorConsultBadgeText}>Consult Now</Text>
                    <Ionicons name="chevron-forward" size={14} color="#008080" />
                  </View>
                </TouchableOpacity>
              </View>



              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.dailyLogSummaryCard}
                onPress={() => setShowDailyLogDrawer(true)}
              >
                <View style={styles.dailyLogSummaryLeft}>
                  <View style={styles.dailyLogIconCircle}>
                    <Ionicons
                      name={feelingsList[selectedFeelingIndex].icon}
                      size={24}
                      color={feelingsList[selectedFeelingIndex].color}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.dailyLogTitleRow}>
                      <Text style={styles.dailyLogMainTitle}>Daily Feeling & Log</Text>
                      <View style={styles.todayLoggedBadge}>
                        <Text style={styles.todayLoggedBadgeText}>Today</Text>
                      </View>
                    </View>

                    <Text style={styles.dailyLogSubText}>
                      Mood: <Text style={styles.boldText}>{feelingsList[selectedFeelingIndex].label}</Text>
                      {activeQuickLogs.length > 0 ? ` • ${activeQuickLogs.join(', ')}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.logTodayActionButton}>
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.logTodayActionText}>Log Today</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.sectionHeaderLabel}>UPCOMING PREDICTIONS</Text>
              <View style={{ gap: 10, marginBottom: 16 }}>
                <View style={styles.upcomingPeriodCard}>
                  <View style={styles.upcomingIconCircleRed}>
                    <Ionicons name="water-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.upcomingCardMainTitle}>Period expected Jul 29</Text>
                    <Text style={styles.upcomingCardSubTitle}>3 days from now</Text>
                  </View>
                </View>

                <View style={styles.upcomingFertileCard}>
                  <View style={styles.upcomingIconCircleGreen}>
                    <Ionicons name="leaf-outline" size={20} color="#00A88F" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.upcomingCardMainTitle}>Fertile window Aug 10–14</Text>
                    <Text style={styles.upcomingCardSubTitle}>Next cycle</Text>
                  </View>
                </View>
              </View>

            </ScrollView>
          )}
        </View>

        <View style={styles.pageWidth}>
          <View style={styles.shazamHeader}>
            <View style={styles.headerIconOnlySpacer} />

            <View style={styles.centerTitleDotCol}>
              <Text style={styles.centerPageTitle}>Learn & Insights</Text>
              <View style={styles.dotRow}>
                {[0, 1, 2].map((idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === 2 ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.headerIconOnly}
              onPress={() => alert('Bookmarks & Saved Articles')}
            >
              <Ionicons name="bookmark-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <LearnScreen openArticleDetails={openArticleDetails} />
        </View>
      </ScrollView>

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
              onPress={() => alert('All notifications marked as read.')}
            >
              <Ionicons name="checkmark-done" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.articleDetailScrollContent} showsVerticalScrollIndicator={false}>
            {notificationsList.map((item) => (
              <View key={item.id} style={styles.notificationItemRow}>
                <View style={[styles.notificationIconCircle, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={styles.notificationHeaderRow}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.notificationBody}>{item.body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

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

            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary }}>Cycle Day 26</Text>

            <TouchableOpacity activeOpacity={0.7} style={styles.closeDetailButton}>
              <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.articleDetailScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.expandedRingHeaderCard}>
              <FunctionalCycleRing currentDay={26} totalDays={28} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.expandedRingTitle}>Day 26 of 28</Text>
                <Text style={styles.expandedRingSub}>93% through current cycle</Text>
                <View style={styles.nextPeriodBadge}>
                  <Ionicons name="water-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.nextPeriodBadgeText}>Next Period: Jul 29 (3 days)</Text>
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
                  <Text style={styles.phaseItemTitle}>Menstrual</Text>
                  <Text style={styles.phaseItemDays}>Days 1–5</Text>
                </View>
                <View style={styles.phaseItem}>
                  <Text style={styles.phaseItemTitle}>Follicular</Text>
                  <Text style={styles.phaseItemDays}>Days 6–12</Text>
                </View>
                <View style={styles.phaseItem}>
                  <Text style={styles.phaseItemTitle}>Ovulation</Text>
                  <Text style={styles.phaseItemDays}>Days 13–16</Text>
                </View>
                <View style={[styles.phaseItem, styles.phaseItemActive]}>
                  <Text style={[styles.phaseItemTitle, { color: colors.primary }]}>Luteal (Active)</Text>
                  <Text style={styles.phaseItemDays}>Days 17–28</Text>
                </View>
              </View>
            </View>

            <Text style={styles.takeawayHeader}>Physiological Indicators</Text>
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
                  <Text style={styles.bioCardTitle}>Conception Chance</Text>
                  <Text style={styles.bioCardVal}>Low (Passed Ovulation)</Text>
                </View>
              </View>

              <View style={[styles.biometricCardRow, { width: 240, marginBottom: 0 }]}>
                <View style={[styles.bioIconCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="stats-chart" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.bioCardTitle}>Hormone Dynamics</Text>
                  <Text style={styles.bioCardVal}>Progesterone Drop</Text>
                </View>
              </View>

              <View style={[styles.biometricCardRow, { width: 240, marginBottom: 0 }]}>
                <View style={[styles.bioIconCircle, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="thermometer-outline" size={20} color="#E65100" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.bioCardTitle}>Basal Body Temp</Text>
                  <Text style={styles.bioCardVal}>36.6 °C (Luteal Plateau)</Text>
                </View>
              </View>
            </ScrollView>

            <Text style={styles.takeawayHeader}>What to Expect Today</Text>
            <View style={styles.insightBoxTextContainer}>
              <Text style={styles.fullArticleBodyText}>
                During the late luteal phase, decreasing progesterone signals your uterine lining to prepare for shedding. As your period approaches in 3 days, it is completely natural to experience mild energy shifts, breast tenderness, or light cramping.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showDailyLogDrawer}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowDailyLogDrawer(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.drawerBackdrop}
          onPress={() => setShowDailyLogDrawer(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.drawerContentContainer}
          >
            <View style={styles.drawerHandlePill} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.dailyLogDrawerTitle}>How are you feeling today?</Text>
              <Text style={styles.dailyLogDrawerSub}>Log your daily mood and health metrics for July 26</Text>

              <View style={styles.feelingIconsRowDrawer}>
                {feelingsList.map((feeling, idx) => {
                  const isSelected = selectedFeelingIndex === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      style={[
                        styles.feelingCircleButtonDrawer,
                        isSelected && { backgroundColor: feeling.color + '20', borderColor: feeling.color, borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedFeelingIndex(idx)}
                    >
                      <Ionicons
                        name={feeling.icon}
                        size={26}
                        color={isSelected ? feeling.color : colors.textSecondary}
                      />
                      <Text style={[styles.feelingLabelText, isSelected && { color: feeling.color, fontWeight: '800' }]}>
                        {feeling.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.innerDividerLine} />

              <Text style={styles.quickLogSubHeader}>SELECT SYMPTOMS & INDICATORS</Text>
              <View style={styles.quickLogGrid}>
                {[
                  { name: 'Cramps', icon: 'flame-outline', bg: '#FFEBEE', color: colors.primary },
                  { name: 'Fatigue', icon: 'pulse-outline', bg: '#FFF3E0', color: '#E65100' },
                  { name: 'Bloating', icon: 'swap-horizontal-outline', bg: '#E0F2F1', color: '#008080' },
                  { name: 'Temp', icon: 'thermometer-outline', bg: '#E3F2FD', color: '#1E88E5' },
                  { name: 'Tender', icon: 'heart-outline', bg: '#FCE4EC', color: '#D81B60' },
                  { name: 'More', icon: 'add-outline', bg: '#F3E8FF', color: '#7C4DFF' },
                ].map((item, idx) => {
                  const isSelected = activeQuickLogs.includes(item.name);
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      style={[
                        styles.quickLogCard,
                        isSelected && { borderColor: item.color, borderWidth: 2 },
                      ]}
                      onPress={() => toggleQuickLog(item.name)}
                    >
                      <View style={[styles.quickLogIconCircle, { backgroundColor: item.bg }]}>
                        <Ionicons name={item.icon} size={20} color={item.color} />
                      </View>
                      <Text style={styles.quickLogCardText}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.saveDailyLogButtonDrawer}
                onPress={handleSaveDailyLog}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.saveDailyLogTextDrawer}>Save Daily Log</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 5-Step Interactive Pregnancy Onboarding Wizard Modal */}
      <Modal
        visible={showPregnancySetupModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowPregnancySetupModal(false)}
      >
        <SafeAreaView style={styles.pregWizardModalContainer} edges={['top', 'bottom', 'left', 'right']}>
          {/* Header */}
          <View style={styles.pregWizardHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.pregWizardCloseBtn}
              onPress={() => setShowPregnancySetupModal(false)}
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* 5-Segment Progress Bar */}
            <View style={styles.pregWizardProgressContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pregWizardProgressSegment,
                    i <= pregnancyStep ? styles.pregWizardProgressSegmentActive : styles.pregWizardProgressSegmentInactive,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.pregWizardStepBadge}>Step {pregnancyStep} of 5</Text>
          </View>

          <ScrollView contentContainerStyle={styles.pregWizardScrollContent} showsVerticalScrollIndicator={false}>
            {pregnancyStep === 1 && (
              <View style={styles.pregWizardStepContent}>
                <View style={styles.pregWizardIconCircle}>
                  <Ionicons name="sparkles" size={32} color={colors.primary} />
                </View>
                <Text style={styles.pregWizardQuestionTitle}>How is your pregnancy timeline calculated?</Text>
                <Text style={styles.pregWizardQuestionSub}>
                  Select your primary calculation method to establish your gestational age and timeline.
                </Text>

                <View style={styles.pregWizardOptionsCol}>
                  {[
                    { id: 'lmp', label: 'Last Menstrual Period (LMP)', desc: 'Calculated from the first day of your last period' },
                    { id: 'conception', label: 'Estimated Conception Date', desc: 'Calculated from ovulation or conception date' },
                    { id: 'ultrasound', label: 'Early Ultrasound Scan', desc: 'Based on early dating ultrasound measurements' },
                    { id: 'due', label: 'Assigned Due Date', desc: 'Directly assigned by your OB-GYN or midwife' },
                  ].map((item) => {
                    const isSelected = pregnancyCalcMethod === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        style={[styles.pregWizardOptionCard, isSelected && styles.pregWizardOptionCardActive]}
                        onPress={() => setPregnancyCalcMethod(item.id)}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.pregWizardOptionTitle, isSelected && styles.pregWizardOptionTitleActive]}>
                            {item.label}
                          </Text>
                          <Text style={styles.pregWizardOptionSub}>{item.desc}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {pregnancyStep === 2 && (
              <View style={styles.pregWizardStepContent}>
                <View style={styles.pregWizardIconCircle}>
                  <Ionicons name="calendar" size={32} color={colors.primary} />
                </View>
                <Text style={styles.pregWizardQuestionTitle}>Select your key reference date</Text>
                <Text style={styles.pregWizardQuestionSub}>
                  Used to accurately determine your current gestational week and due date.
                </Text>

                <View style={styles.datePickerCard}>
                  <Text style={styles.datePickerCardLabel}>MONTH</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                      <TouchableOpacity
                        key={m}
                        activeOpacity={0.7}
                        style={[styles.datePill, pregnancyMonth === m && styles.datePillActive]}
                        onPress={() => setPregnancyMonth(m)}
                      >
                        <Text style={[styles.datePillText, pregnancyMonth === m && styles.datePillTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.datePickerCardLabel}>DAY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <TouchableOpacity
                        key={d}
                        activeOpacity={0.7}
                        style={[styles.datePill, pregnancyDay === d && styles.datePillActive]}
                        onPress={() => setPregnancyDay(d)}
                      >
                        <Text style={[styles.datePillText, pregnancyDay === d && styles.datePillTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.datePickerCardLabel}>YEAR</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[2025, 2026, 2027].map((y) => (
                      <TouchableOpacity
                        key={y}
                        activeOpacity={0.7}
                        style={[styles.datePill, pregnancyYear === y && styles.datePillActive]}
                        onPress={() => setPregnancyYear(y)}
                      >
                        <Text style={[styles.datePillText, pregnancyYear === y && styles.datePillTextActive]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Calculation Summary Preview Card */}
                <View style={styles.calculatedPreviewCard}>
                  <View style={styles.calcPreviewRow}>
                    <Ionicons name="nutrition-outline" size={20} color={colors.primary} />
                    <Text style={styles.calcPreviewTitle}>GESTATIONAL ESTIMATE</Text>
                  </View>
                  <Text style={styles.calcPreviewWeekText}>Week 16 of 40 (2nd Trimester)</Text>
                  <Text style={styles.calcPreviewSubText}>Conception: {pregnancyConceptionDate} • Due: {pregnancyDueDate}</Text>
                </View>
              </View>
            )}

            {pregnancyStep === 3 && (
              <View style={styles.pregWizardStepContent}>
                <View style={styles.pregWizardIconCircle}>
                  <Ionicons name="heart" size={32} color={colors.primary} />
                </View>
                <Text style={styles.pregWizardQuestionTitle}>Is this your first pregnancy?</Text>
                <Text style={styles.pregWizardQuestionSub}>
                  Tailors weekly guidance, body change expectations, and hospital prep checklists.
                </Text>

                <View style={styles.pregWizardOptionsCol}>
                  {[
                    { id: true, label: 'Yes, my first baby', desc: 'First time navigating pregnancy milestones' },
                    { id: false, label: 'No, I have children', desc: 'Experienced mother with prior pregnancy history' },
                  ].map((item) => {
                    const isSelected = pregnancyIsFirstBaby === item.id;
                    return (
                      <TouchableOpacity
                        key={String(item.id)}
                        activeOpacity={0.8}
                        style={[styles.pregWizardOptionCard, isSelected && styles.pregWizardOptionCardActive]}
                        onPress={() => setPregnancyIsFirstBaby(item.id)}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.pregWizardOptionTitle, isSelected && styles.pregWizardOptionTitleActive]}>
                            {item.label}
                          </Text>
                          <Text style={styles.pregWizardOptionSub}>{item.desc}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {pregnancyStep === 4 && (
              <View style={styles.pregWizardStepContent}>
                <View style={styles.pregWizardIconCircle}>
                  <Ionicons name="people" size={32} color={colors.primary} />
                </View>
                <Text style={styles.pregWizardQuestionTitle}>Single baby or twins/multiples?</Text>
                <Text style={styles.pregWizardQuestionSub}>
                  Multiple pregnancies follow specialized growth charts and prenatal appointment schedules.
                </Text>

                <View style={styles.pregWizardOptionsCol}>
                  {[
                    { id: 'single', label: 'Single Baby', desc: 'One baby expected' },
                    { id: 'twins', label: 'Twins', desc: 'Two babies expected' },
                    { id: 'multiples', label: 'Triplets or Multiples', desc: 'Three or more babies expected' },
                  ].map((item) => {
                    const isSelected = pregnancyMultipleType === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        style={[styles.pregWizardOptionCard, isSelected && styles.pregWizardOptionCardActive]}
                        onPress={() => setPregnancyMultipleType(item.id)}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.pregWizardOptionTitle, isSelected && styles.pregWizardOptionTitleActive]}>
                            {item.label}
                          </Text>
                          <Text style={styles.pregWizardOptionSub}>{item.desc}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {pregnancyStep === 5 && (
              <View style={styles.pregWizardStepContent}>
                <View style={styles.pregWizardIconCircle}>
                  <Ionicons name="notifications" size={32} color={colors.primary} />
                </View>
                <Text style={styles.pregWizardQuestionTitle}>Customize your pregnancy reminders</Text>
                <Text style={styles.pregWizardQuestionSub}>
                  Turn on timely alerts to stay prepared throughout your pregnancy.
                </Text>

                <View style={styles.pregWizardOptionsCol}>
                  {[
                    { id: 'vitamins', label: 'Prenatal Vitamins & Folic Acid Reminders', desc: 'Daily morning medication reminder' },
                    { id: 'weeklyUpdates', label: 'Weekly Fruit Size & Growth Updates', desc: 'Get weekly updates on baby development' },
                    { id: 'kickCounter', label: 'Fetal Kick Count & Contraction Tracker', desc: 'Quick access to movement logging tools' },
                  ].map((item) => {
                    const isChecked = pregnancyReminders[item.id];
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        style={[styles.pregWizardOptionCard, isChecked && styles.pregWizardOptionCardActive]}
                        onPress={() => setPregnancyReminders({ ...pregnancyReminders, [item.id]: !isChecked })}
                      >
                        <Ionicons
                          name={isChecked ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isChecked ? colors.primary : colors.textMuted}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.pregWizardOptionTitle, isChecked && styles.pregWizardOptionTitleActive]}>
                            {item.label}
                          </Text>
                          <Text style={styles.pregWizardOptionSub}>{item.desc}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Navigation */}
          <View style={styles.pregWizardBottomActions}>
            {pregnancyStep > 1 && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.pregWizardBackBtn}
                onPress={() => setPregnancyStep(pregnancyStep - 1)}
              >
                <Text style={styles.pregWizardBackBtnText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.pregWizardNextBtn}
              onPress={() => {
                if (pregnancyStep < 5) {
                  setPregnancyStep(pregnancyStep + 1);
                } else {
                  setIsPregnancyMode(true);
                  setShowPregnancySetupModal(false);
                  setPregnancyStep(1);
                }
              }}
            >
              <Text style={styles.pregWizardNextBtnText}>
                {pregnancyStep === 5 ? 'Enable Pregnancy Mode' : 'Next Step'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
          currentMode={isPregnancyMode ? 'pregnancy' : isPostmenopauseMode ? 'postmenopause' : 'cycle'}
          onSwitchMode={(mode) => {
            if (mode === 'cycle') {
              setIsPregnancyMode(false);
              setIsPostmenopauseMode(false);
            } else if (mode === 'pregnancy') {
              setIsPregnancyMode(true);
              setIsPostmenopauseMode(false);
            } else if (mode === 'postmenopause') {
              setIsPostmenopauseMode(true);
              setIsPregnancyMode(false);
            }
            setShowSettingsModal(false);
          }}
          onOpenPrivacyPolicy={() => setShowPrivacyPolicyModal(true)}
          onOpenTermsOfUse={() => setShowTermsModal(true)}
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
        visible={showAnalysisScreen}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowAnalysisScreen(false)}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <SafeAreaView style={styles.articleDetailContainer} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.articleDetailHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeDetailButton}
              onPress={() => setShowAnalysisScreen(false)}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary }}>Analytics</Text>

            <TouchableOpacity activeOpacity={0.7} style={styles.closeDetailButton}>
              <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.articleDetailScrollContent} showsVerticalScrollIndicator={false}>
            <CycleLengthChart />
            <AdditionalAnalyticsMetrics />
          </ScrollView>
        </SafeAreaView>
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
            <View style={styles.drawerHandlePill} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.drawerHeaderRow}>
                <View style={styles.articleCategoryBadge}>
                  <Text style={styles.articleCategoryText}>{selectedArticle?.category}</Text>
                </View>

                <TouchableOpacity activeOpacity={0.7} style={styles.bookmarkButtonCircle}>
                  <Ionicons name="bookmark-outline" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

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

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.saveLibrarySecondaryButton}
                onPress={() => alert('Article Saved to Your Library!')}
              >
                <Ionicons name="heart-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.saveLibrarySecondaryText}>Save to My Library</Text>
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
              <View style={styles.articleCategoryBadge}>
                <Text style={styles.articleCategoryText}>{selectedArticle.category}</Text>
              </View>

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

      <Modal
        visible={!!selectedDoctorForBooking}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => {
          setSelectedDoctorForBooking(null);
          setBookingConfirmed(false);
        }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        {selectedDoctorForBooking && (
          <SafeAreaView style={styles.articleDetailContainer} edges={['top', 'bottom', 'left', 'right']}>
            <View style={styles.articleDetailHeader}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.closeDetailButton}
                onPress={() => {
                  setSelectedDoctorForBooking(null);
                  setBookingConfirmed(false);
                }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.articleDetailScrollContent} showsVerticalScrollIndicator={false}>
              {!bookingConfirmed ? (
                <>
                  <View style={[styles.doctorAvatarCircle, { backgroundColor: selectedDoctorForBooking.avatarBg, width: 64, height: 64, borderRadius: 32, marginBottom: 16 }]}>
                    <Ionicons name="person" size={32} color="#FFFFFF" />
                  </View>

                  <Text style={styles.articleDetailTitle}>{selectedDoctorForBooking.name}</Text>
                  <Text style={styles.articleDetailMeta}>{selectedDoctorForBooking.specialty} • {selectedDoctorForBooking.experience}</Text>

                  <View style={styles.dividerLine} />

                  <Text style={styles.takeawayHeader}>Consultation Details</Text>

                  <View style={styles.bookingDetailRow}>
                    <Ionicons name="time" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={styles.bookingDetailText}>Slot: {selectedDoctorForBooking.nextAvailable}</Text>
                  </View>

                  <View style={styles.bookingDetailRow}>
                    <Ionicons name="videocam" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={styles.bookingDetailText}>Format: HD Video Consultation</Text>
                  </View>

                  <View style={styles.bookingDetailRow}>
                    <Ionicons name="card" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={styles.bookingDetailText}>Fee: {selectedDoctorForBooking.fee}</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.saveArticleButton}
                    onPress={() => setBookingConfirmed(true)}
                  >
                    <Text style={styles.saveArticleText}>Confirm Booking ({selectedDoctorForBooking.fee})</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <View style={styles.successIconCircle}>
                    <Ionicons name="checkmark" size={40} color="#FFFFFF" />
                  </View>

                  <Text style={styles.bookingSuccessTitle}>Consultation Confirmed!</Text>
                  <Text style={styles.bookingSuccessSub}>
                    You have booked a Video Consultation with {selectedDoctorForBooking.name} for {selectedDoctorForBooking.nextAvailable}.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.saveArticleButton}
                    onPress={() => {
                      setSelectedDoctorForBooking(null);
                      setBookingConfirmed(false);
                    }}
                  >
                    <Text style={styles.saveArticleText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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

  /* Cycle Length History Chart Styles */
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FAF0F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  chartMainContainer: {
    flexDirection: 'row',
    height: 110,
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
    height: 100,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F5F5FA',
  },
  dataPointDotContainer: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dataPointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    fontWeight: '600',
    color: colors.textSecondary,
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
  symptomPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomTagPill: {
    backgroundColor: '#F5F5FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  symptomTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
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
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
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
});

