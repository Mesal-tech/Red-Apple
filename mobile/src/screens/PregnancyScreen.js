import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const FETUS_IMAGE = require('../../assets/images/fetus_week_16.jpg');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WEEK_DAYS = [
  { dayName: 'S', dateNum: 26, isToday: false },
  { dayName: 'TODAY', dateNum: 27, isToday: true },
  { dayName: 'T', dateNum: 28, isToday: false },
  { dayName: 'W', dateNum: 29, isToday: false },
  { dayName: 'T', dateNum: 30, isToday: false },
  { dayName: 'F', dateNum: 31, isToday: false },
  { dayName: 'S', dateNum: 1, isToday: false },
];

export default function PregnancyScreen({
  dueDate = 'Dec 24, 2026',
  conceptionDate = 'Apr 2, 2026',
  currentWeek = 16,
  onSwitchToCycleMode,
  onBookDoctor,
}) {
  const [selectedDateNum, setSelectedDateNum] = useState(27);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSymptomsModal, setShowSymptomsModal] = useState(false);
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

  // Contraction State
  const [showContractionModal, setShowContractionModal] = useState(false);
  const [contractionState, setContractionState] = useState('idle');
  const [contractionLogs, setContractionLogs] = useState([]);

  // Logged Symptoms State
  const [selectedSymptoms, setSelectedSymptoms] = useState(['Nausea', 'Backache']);

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
      const formattedTime = `${Math.floor(timerSeconds / 60)} min ${timerSeconds % 60} sec`;
      setKickLogs([
        { id: Date.now(), date: 'Just now', count: 10, duration: formattedTime },
        ...kickLogs,
      ]);
    }
  };

  const resetKickSession = () => {
    setKickCount(0);
    setTimerSeconds(0);
    setIsTimerRunning(false);
  };

  const toggleSymptom = (symName) => {
    if (selectedSymptoms.includes(symName)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symName));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symName]);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((res) => setTimeout(res, 600));
    setIsRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#E11D48"
            colors={['#E11D48', '#FA4A14']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >


      {/* FLO-INSPIRED ATMOSPHERIC HERO CONTAINER */}
      <View style={styles.floHeroContainer}>
        {/* Top Navigation Row: Back Button, Date Title, Alignment Spacer */}
        <View style={styles.floTopNavRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.floBackBtn}
            onPress={() => onSwitchToCycleMode && onSwitchToCycleMode()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.floDateTitle}>July 27</Text>

          <View style={styles.floNavSpacer} />
        </View>

        {/* Horizontal Calendar Week Strip */}
        <View style={styles.floWeekStrip}>
          {WEEK_DAYS.map((item) => {
            const isSelected = selectedDateNum === item.dateNum;
            return (
              <TouchableOpacity
                key={item.dateNum}
                activeOpacity={0.75}
                style={styles.floDayCol}
                onPress={() => setSelectedDateNum(item.dateNum)}
              >
                <Text style={[styles.floDayName, item.isToday && styles.floDayNameToday]}>
                  {item.dayName}
                </Text>
                <View
                  style={[
                    styles.floDateCircle,
                    isSelected && styles.floDateCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.floDateNum,
                      isSelected && styles.floDateNumSelected,
                    ]}
                  >
                    {item.dateNum}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FETUS DEVELOPMENT CALENDAR STAGE CARD */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.fetusStageCard}
          onPress={() => setShowWombLifeModal(true)}
        >
          <View style={styles.fetusImageWrapper}>
            <Image source={FETUS_IMAGE} style={styles.fetusImage} resizeMode="cover" />
            <View style={styles.fetusBadge}>
              <Text style={styles.fetusBadgeText}>WEEK 16 OF PREGNANCY</Text>
            </View>
          </View>

          <View style={styles.fetusInfoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fetusInfoTitle}>Baby's Growth</Text>
              <Text style={styles.fetusInfoSub}>16 weeks 2 days • Second Trimester</Text>
            </View>
            <View style={styles.fetusViewPill}>
              <Text style={styles.fetusViewPillText}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* FLO-INSPIRED CURVED BOTTOM SHEET FOR DAILY INSIGHTS */}
      <View style={styles.floBottomSheetContainer}>
        <Text style={styles.floSectionTitle}>My daily insights</Text>

        {/* Horizontal Insights Cards Carousel */}
        <ScrollView
          horizontal
          nestedScrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          style={styles.floCarousel}
          contentContainerStyle={styles.floCarouselContent}
        >
          {/* Card 1: Log your symptoms */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.floSymptomCard}
            onPress={() => setShowSymptomsModal(true)}
          >
            <Text style={styles.floSymptomCardTitle}>Log your symptoms</Text>
            <View style={styles.floSymptomCardBtnCircle}>
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Card 2: Your baby's life in the womb */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.floInsightCard, { backgroundColor: '#E6F4F1' }]}
            onPress={() => setShowWombLifeModal(true)}
          >
            <Text style={styles.floInsightCardTitle}>Your baby's life in the womb</Text>
            <View style={styles.floInsightCardIconRow}>
              <Ionicons name="body-outline" size={44} color="#00695C" />
            </View>
          </TouchableOpacity>

          {/* Card 3: Tips & Tricks */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.floInsightCard, { backgroundColor: '#FEECEC' }]}
            onPress={() => setShowTipsModal(true)}
          >
            <View style={styles.floTagBadge}>
              <Text style={styles.floTagBadgeText}>Tips & Tricks</Text>
            </View>
            <Text style={styles.floInsightCardTitle}>7 Tips on How to Snack Healthily</Text>
            <View style={styles.floInsightCardIconRow}>
              <Ionicons name="restaurant-outline" size={40} color="#D81B60" />
            </View>
          </TouchableOpacity>


          {/* Card 5: Consult OB-GYN */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.floInsightCard, { backgroundColor: '#F3E8FF' }]}
            onPress={() =>
              onBookDoctor &&
              onBookDoctor({
                name: 'Dr. Mesal Okubor',
                specialty: 'Obstetrician & Gynecologist',
                experience: '12 Yrs Exp',
                nextAvailable: 'Today, 10:00 AM',
                fee: '₦15,000',
                avatarBg: '#008080',
              })
            }
          >
            <View style={[styles.floTagBadge, { backgroundColor: '#8E24AA' }]}>
              <Text style={styles.floTagBadgeText}>Doctor Care</Text>
            </View>
            <Text style={styles.floInsightCardTitle}>Talk to a Women's Health Doctor</Text>
            <View style={styles.floInsightCardIconRow}>
              <Ionicons name="videocam-outline" size={40} color="#8E24AA" />
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Fruit Size Developmental Card */}
        <View style={styles.fruitSizeCard}>
          <View style={styles.fruitIconCircle}>
            <Ionicons name="nutrition-outline" size={28} color="#C35738" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.fruitCardTitle}>Baby is the size of an Avocado</Text>
            <Text style={styles.fruitCardSub}>Approx. 4.5 inches • 3.5 ounces</Text>
            <Text style={styles.fruitDetailText}>
              Your baby can now move tiny facial muscles, make expressions, and process gentle sounds!
            </Text>
          </View>
        </View>


      </View>

      {/* 1. DETAILS BREAKDOWN MODAL */}
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
              <Text style={styles.detailsHeroWeek}>Week 16, Day 2</Text>
              <Text style={styles.detailsHeroSub}>2nd Trimester • Month 4</Text>
            </View>

            <View style={styles.detailMetricRow}>
              <View style={styles.detailMetricBox}>
                <Text style={styles.detailMetricLabel}>CONCEPTION DATE</Text>
                <Text style={styles.detailMetricVal}>{conceptionDate}</Text>
              </View>
              <View style={styles.detailMetricBox}>
                <Text style={styles.detailMetricLabel}>ESTIMATED DUE DATE</Text>
                <Text style={styles.detailMetricVal}>{dueDate}</Text>
              </View>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.detailsCardTitle}>Developmental Milestones</Text>
              <Text style={styles.detailsCardBody}>
                - Facial muscle nerve connections forming.{'\n'}
                - Eyes can perform slow side-to-side movements.{'\n'}
                - Ears have reached final position for hearing ambient sounds.{'\n'}
                - Bone mineralization accelerating rapidly.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 2. SYMPTOMS LOGGER MODAL */}
      <Modal
        visible={showSymptomsModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowSymptomsModal(false)}
      >
        <View style={styles.modalFullContainer}>
          <View style={styles.modalFullHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeBtn}
              onPress={() => setShowSymptomsModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Log Symptoms</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.saveHeaderBtn}
              onPress={() => setShowSymptomsModal(false)}
            >
              <Text style={styles.saveHeaderBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalPadding}>
            <Text style={styles.symptomsIntroText}>
              Select the symptoms you are experiencing today to personalize recommendations:
            </Text>

            <View style={styles.symptomsGrid}>
              {[
                { name: 'Nausea', icon: 'medical-outline' },
                { name: 'Backache', icon: 'fitness-outline' },
                { name: 'Fatigue', icon: 'moon-outline' },
                { name: 'Cravings', icon: 'restaurant-outline' },
                { name: 'Swelling', icon: 'body-outline' },
                { name: 'Heartburn', icon: 'flame-outline' },
                { name: 'Mood Swings', icon: 'sunny-outline' },
                { name: 'Headaches', icon: 'pulse-outline' },
              ].map((item, idx) => {
                const isSelected = selectedSymptoms.includes(item.name);
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    style={[
                      styles.symptomPillButton,
                      isSelected && styles.symptomPillActive,
                    ]}
                    onPress={() => toggleSymptom(item.name)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={isSelected ? '#FFFFFF' : colors.textPrimary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.symptomPillText, isSelected && styles.symptomPillTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 3. BABY IN WOMB ARTICLE MODAL */}
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
            <Text style={styles.articleMeta}>Week 16 Guidance • 4 min read</Text>
            <Text style={styles.articleBody}>
              At Week 16 of pregnancy, your baby is roughly the size of an avocado, measuring about 4.5 inches from crown to rump and weighing around 3.5 ounces.{'\n\n'}
              Your baby is actively exploring their environment: sucking their thumb, flexing tiny limb joints, and making facial expressions. The umbilical cord has grown thick and robust to transport nutrients, oxygen, and antibodies.{'\n\n'}
              The heart is pumping approximately 25 quarts of blood daily, and hearing structures are sensitive enough to recognize your heartbeat, voice, and external music.
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* 4. SNACKING TIPS ARTICLE MODAL */}
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

      {/* 5. KICK COUNTER MODAL */}
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
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Fetal Kick Counter</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalPadding}>
            <View style={styles.kickTimerCard}>
              <Text style={styles.kickTimerHeader}>SESSION TIMER</Text>
              <Text style={styles.kickTimerValue}>{formatTimer(timerSeconds)}</Text>

              <View style={styles.kickProgressWrapper}>
                <Text style={styles.kickProgressCount}>{kickCount} / 10</Text>
                <Text style={styles.kickProgressSub}>Kicks Logged</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.bigKickButton, kickCount >= 10 && styles.bigKickButtonDone]}
                onPress={handleRegisterKick}
                disabled={kickCount >= 10}
              >
                <Ionicons name="footsteps" size={32} color="#FFFFFF" />
                <Text style={styles.bigKickButtonText}>
                  {kickCount >= 10 ? 'Session Complete!' : 'TAP TO LOG KICK'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} style={styles.resetSessionButton} onPress={resetKickSession}>
                <Text style={styles.resetSessionText}>Reset Session</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent Kick Sessions</Text>
            {kickLogs.map((log) => (
              <View key={log.id} style={styles.kickLogRow}>
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.kickLogDate}>{log.date}</Text>
                  <Text style={styles.kickLogSub}>{log.count} kicks in {log.duration}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* 6. CONTRACTION TIMER MODAL */}
      <Modal
        visible={showContractionModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowContractionModal(false)}
      >
        <View style={styles.modalFullContainer}>
          <View style={styles.modalFullHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeBtn}
              onPress={() => setShowContractionModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Contraction Timer</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalPadding}>
            <View style={styles.contractionCard}>
              <Text style={styles.contractionHeader}>LABOR MONITORING</Text>
              <Text style={styles.contractionSubText}>
                Press Start when a contraction begins and Stop when it eases off.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.contractionActionButton,
                  contractionState === 'active' ? styles.contractionActiveBtn : styles.contractionIdleBtn,
                ]}
                onPress={() => {
                  if (contractionState === 'idle' || contractionState === 'rest') {
                    setContractionState('active');
                  } else {
                    setContractionState('rest');
                    setContractionLogs([
                      { id: Date.now(), duration: '45 sec', frequency: '5 min apart' },
                      ...contractionLogs,
                    ]);
                  }
                }}
              >
                <Ionicons
                  name={contractionState === 'active' ? 'stop-circle' : 'play-circle'}
                  size={36}
                  color="#FFFFFF"
                />
                <Text style={styles.contractionActionText}>
                  {contractionState === 'active' ? 'STOP CONTRACTION' : 'START CONTRACTION'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 110,
    backgroundColor: '#FFFFFF',
  },

  /* FLO HERO CONTAINER */
  floHeroContainer: {
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  floTopNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  floBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAE1D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floNavSpacer: {
    width: 36,
    height: 36,
  },
  floDateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  /* Week Strip */
  floWeekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  floDayCol: {
    alignItems: 'center',
  },
  floDayName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  floDayNameToday: {
    fontWeight: '900',
    color: colors.textPrimary,
  },
  floDateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floDateCircleSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floDateNum: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  floDateNumSelected: {
    fontWeight: '900',
    color: colors.primary,
  },

  /* Central Aura Stage */
  floAuraStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  floOuterGlowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  floMiddleGlowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(220, 38, 38, 0.16)',
  },
  floInnerOrbCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 20,
  },
  floTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  floTimeText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  floDetailsButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  floDetailsButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },

  /* FLO CURVED BOTTOM SHEET CONTAINER */
  floBottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 80,
    minHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 4,
  },
  floSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },

  /* Carousel */
  floCarousel: {
    marginHorizontal: -20,
    marginBottom: 24,
  },
  floCarouselContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  floSymptomCard: {
    width: 140,
    height: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  floSymptomCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  floSymptomCardBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D81B60',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  floInsightCard: {
    width: 150,
    height: 160,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
  },
  floTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#00695C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  floTagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  floInsightCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  floInsightCardIconRow: {
    alignItems: 'flex-end',
  },

  /* Fruit Card */
  fruitSizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF6F0',
    borderColor: '#F7D6C2',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  fruitIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fruitCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fruitCardSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C35738',
    marginTop: 2,
  },
  fruitDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },

  /* Quick Tools Grid */
  quickToolsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickToolTile: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickToolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickToolTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickToolSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
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
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  saveHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 14,
  },
  saveHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalPadding: {
    padding: 20,
  },

  /* Details Modal */
  detailsHeroCard: {
    backgroundColor: '#FDF6F0',
    borderColor: '#F7D6C2',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsHeroWeek: {
    fontSize: 24,
    fontWeight: '900',
    color: '#C35738',
  },
  detailsHeroSub: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
  },
  detailMetricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailMetricBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailMetricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
  },
  detailMetricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
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
    color: colors.textPrimary,
    marginBottom: 8,
  },
  detailsCardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  /* Symptoms Modal */
  symptomsIntroText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symptomPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  symptomPillActive: {
    backgroundColor: colors.primary,
  },
  symptomPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  symptomPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Article Readers */
  articleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  articleMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 16,
  },
  articleBody: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
  },

  /* Kick Counter */
  kickTimerCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kickTimerHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  kickTimerValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    marginVertical: 8,
  },
  kickProgressWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  kickProgressCount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  kickProgressSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bigKickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    width: '100%',
    marginBottom: 10,
  },
  bigKickButtonDone: {
    backgroundColor: '#10B981',
  },
  bigKickButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  resetSessionButton: {
    paddingVertical: 6,
  },
  resetSessionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  kickLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  kickLogDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  kickLogSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  /* Contraction */
  contractionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contractionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  contractionSubText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 18,
  },
  contractionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    width: '100%',
  },
  contractionIdleBtn: {
    backgroundColor: colors.primary,
  },
  contractionActiveBtn: {
    backgroundColor: '#EF4444',
  },
  contractionActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 10,
  },

  /* FETUS STAGE CARD IN CALENDAR */
  fetusStageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EAE1D7',
  },
  fetusImageWrapper: {
    height: 150,
    width: '100%',
    position: 'relative',
  },
  fetusImage: {
    width: '100%',
    height: '100%',
  },
  fetusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fetusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  fetusInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  fetusInfoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fetusInfoSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  fetusViewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  fetusViewPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 2,
  },

  /* EXIT MODAL STYLES */
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  exitModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  exitModalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  exitModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  exitModalSubTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exitModalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  exitModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  exitModalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  exitModalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  exitModalConfirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
