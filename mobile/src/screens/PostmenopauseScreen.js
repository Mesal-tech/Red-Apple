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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getPostmenopauseDataSafe, savePostmenopauseDataSafe } from '../utils/storage';
import ArticleCarousel from '../components/ArticleCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Functional Circular Ring for 12-Month Postmenopause Milestone
function PostmenopauseMilestoneRing() {
  const totalDegrees = 360;
  const rightDeg = 180;
  const leftDeg = 180;

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

      <View style={ringStyles.halfCircleContainerLeft}>
        <View
          style={[
            ringStyles.halfCircleLeft,
            { transform: [{ rotate: `${leftDeg}deg` }] },
          ]}
        />
      </View>

      <View style={ringStyles.innerMaskCircle}>
        <Text style={ringStyles.ringMonthNumber}>12+</Text>
        <Text style={ringStyles.ringMonthTotal}>Months</Text>
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
  ringMonthNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#DC2626',
  },
  ringMonthTotal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
});

const RED_FLAGS = [
  { id: 'bleeding', title: 'Vaginal bleeding after menopause', subtitle: 'Any postmenopausal bleeding requires prompt clinical evaluation' },
  { id: 'breast_lump', title: 'A new breast lump', subtitle: 'New thickening or lumps should be examined by a doctor' },
  { id: 'pelvic_pain', title: 'Severe pelvic pain', subtitle: 'Unusual or persistent severe lower abdominal/pelvic pain' },
  { id: 'weight_loss', title: 'Unexplained weight loss', subtitle: 'Noticeable weight loss without diet or exercise changes' },
  { id: 'bloating', title: 'Persistent bloating', subtitle: 'Bloating lasting more than a few weeks or increasing in size' },
  { id: 'blood_urine', title: 'Blood in urine', subtitle: 'Pink, red, or dark urinary discoloration' },
  { id: 'chest_pain', title: 'Chest pain or shortness of breath', subtitle: 'Immediate emergency medical care required' },
];

const EDU_ARTICLES = [
  {
    id: '1',
    title: 'What happens after menopause?',
    category: 'General Health',
    readTime: '4 min read',
    content: `Menopause is reached once you have gone 12 full months without a period. In this postmenopausal chapter, your estrogen and progesterone levels settle into a new, lower baseline. While hot flushes often ease over time, lower estrogen continues to affect your bones, heart, skin, and intimate comfort. Simple daily nutrition, gentle movement, and routine checkups help you protect your vitality and feel your best.`,
  },
  {
    id: '2',
    title: 'Hormone therapy (HRT): What to know',
    category: 'Therapy & Care',
    readTime: '6 min read',
    content: `Hormone Replacement Therapy (HRT) gently supplements the hormones your body produces in lower amounts after menopause. Key benefits include strong relief from hot flushes, night sweats, mood dips, and sleep troubles, as well as protecting your bones from thinning. Because HRT comes in different forms (pills, patches, or creams), talking with your doctor helps you choose what fits your body best.`,
  },
  {
    id: '3',
    title: 'Protecting your bone strength',
    category: 'Bone Health',
    readTime: '5 min read',
    content: `Estrogen helps keep your bones dense and strong. After your periods stop, your bones can lose calcium faster, which can make them more fragile over time (osteoporosis). You can protect your bones by getting enough calcium in your diet, taking vitamin D, doing weight-bearing exercises like brisk walking, and doing occasional bone density checkups (DEXA scans).`,
  },
  {
    id: '4',
    title: 'Heart health after menopause',
    category: 'Cardiovascular',
    readTime: '5 min read',
    content: `Estrogen naturally helps protect your blood vessels and cholesterol balance. After menopause, keeping your heart strong becomes a top priority. Simple, effective ways to care for your heart include checking your blood pressure regularly, eating heart-healthy foods like vegetables, fish, and nuts, taking daily 30-minute walks, and taking time to relax.`,
  },
  {
    id: '5',
    title: 'Nutrition for everyday energy',
    category: 'Nutrition',
    readTime: '4 min read',
    content: `Your nutritional needs shift gracefully after menopause. To protect muscle tone and energy, make sure you enjoy adequate protein (fish, beans, eggs, lean meats). Add calcium-rich foods (greens, dairy, fortified milks) for bone health, fiber for digestion, and colorful fruit for natural antioxidants. Drinking plenty of water also keeps your skin and joints comfortable.`,
  },
  {
    id: '6',
    title: 'Gentle exercise for vitality',
    category: 'Fitness',
    readTime: '4 min read',
    content: `A simple, enjoyable movement routine gives you energy and protects your body: 1) Light strength training 2–3 times a week keeps your bones and muscles firm; 2) Daily walking for 30 minutes supports your heart and elevates your mood; 3) Gentle stretching or yoga keeps your joints flexible and helps balance.`,
  },
  {
    id: '7',
    title: 'Comfort, intimacy, and sexual wellness',
    category: 'Sexual Wellness',
    readTime: '5 min read',
    content: `Lower estrogen levels commonly lead to intimate dryness and sensitivity during sex. This is completely natural and very treatable. Gentle, hydrating moisturizers, water-based lubricants, or low-dose localized creams from your doctor can quickly restore comfort and confidence in your intimate life.`,
  },
  {
    id: '8',
    title: 'Pelvic floor exercises (Kegels)',
    category: 'Pelvic Health',
    readTime: '3 min read',
    content: `Strengthening your pelvic floor muscles gives your bladder firm support, helping prevent accidental leaks when you cough, laugh, or sneeze. Practice gently squeezing your pelvic muscles (as if holding back urine) for 3–5 seconds, relaxing for 3–5 seconds, and repeating 10 times daily.`,
  },
  {
    id: '9',
    title: 'Healthy sleep habits and restful nights',
    category: 'Sleep & Mood',
    readTime: '4 min read',
    content: `Sleep disturbances postmenopause may stem from night sweats, anxiety, or altered circadian rhythms. Maintain a cool bedroom environment (65-68°F / 18-20°C), wear breathable cotton sleepwear, adhere to consistent bedtime schedules, limit caffeine after noon, and practice wind-down routines like light reading or meditation.`,
  },
];

const PRESET_AI_QUESTIONS = [
  'Why am I still having hot flushes?',
  'Is this vaginal bleeding normal?',
  'Can I still become pregnant?',
  'Should I consider hormone replacement therapy?',
  'What foods are good for my bones?',
  'How can I improve my sex drive after menopause?',
];

const AI_KNOWLEDGE_BASE = {
  'Why am I still having hot flushes?':
    'Hot flushes occur due to thermoregulatory adjustments in the brain (hypothalamus) caused by lower estrogen levels. While they peak during perimenopause, up to 40% of postmenopausal women continue to experience hot flushes for years. Triggers include caffeine, spicy foods, alcohol, stress, and warm environments. Dress in layers, practice deep slow breathing during an onset, and consult your doctor about HRT or non-hormonal prescription options if symptoms disrupt daily life.',

  'Is this vaginal bleeding normal?':
    'No. Any vaginal bleeding occurring after 12 consecutive months of no periods (postmenopausal bleeding) is considered unexpected and requires medical evaluation by a doctor or gynaecologist. While causes are often benign (such as vaginal thinning/atrophy or polyps), it must be evaluated promptly to rule out endometrial hyperplasia or uterine conditions.',

  'Can I still become pregnant?':
    'Once you have reached clinical menopause (12 full consecutive months without a menstrual period), spontaneous ovulation has permanently ceased, and natural pregnancy is no longer possible. However, if you are unsure whether you have completed 12 consecutive months, barrier contraception should be maintained until confirmed by a physician.',

  'Should I consider hormone replacement therapy?':
    'Hormone Replacement Therapy (HRT) is highly effective for relieving vasomotor symptoms (hot flushes, night sweats), vaginal dryness, and preventing bone density loss. HRT choice depends on your age, time since menopause onset, health history, and personal preferences. Women under 60 or within 10 years of menopause generally have a favorable benefit-risk profile. Schedule a consultation with your doctor to evaluate your individual candidacy.',

  'What foods are good for my bones?':
    'For robust bone density postmenopause, focus on:\n- Calcium-rich foods: Greek yogurt, aged cheese, leafy green vegetables (kale, broccoli), canned salmon/sardines with bones, and fortified plant milks.\n- Vitamin D sources: Wild fatty fish (salmon, mackerel), egg yolks, and fortified foods (essential for calcium absorption).\n- Magnesium & Potassium: Nuts, seeds, legumes, and whole grains.\n- Adequate protein: Essential for preserving muscle mass and structural bone matrix.',

  'How can I improve my sex drive after menopause?':
    'Low libido postmenopause is common and multi-factorial, stemming from reduced estrogen/androgens, vaginal dryness, fatigue, or stress. Key steps include:\n1. Using non-hormonal vaginal moisturizers regularly and lubricants during intimacy.\n2. Discussing localized low-dose vaginal estrogen with your doctor to relieve pain during sex.\n3. Prioritizing open communication with your partner and stress reduction.\n4. Exercising regularly to enhance circulation and energy.\n5. Discussing medical options with your gynaecologist if low libido causes distress.',
};

export default function PostmenopauseScreen({
  onSwitchToCycleMode,
  onBookDoctor,
  onOpenDoctorPage,
  greetingDisplayName = 'Amara',
  weekDays = [],
  onOpenSetupWizard,
}) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'assessments' | 'lifestyle' | 'meds' | 'screenings' | 'learn' | 'ai'
  const [selectedDateKey, setSelectedDateKey] = useState(() => new Date().toISOString().split('T')[0]);

  const calendarWeekDays = React.useMemo(() => {
    if (weekDays && weekDays.length > 0) return weekDays;
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon ...
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const singleLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      days.push({
        singleLetter: singleLetters[i],
        dayNum: d.getDate(),
        dateKey: d.toISOString().split('T')[0],
        isToday,
      });
    }
    return days;
  }, [weekDays]);

  // Postmenopause Onboarding State
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  // Profile State
  const [profile, setProfile] = useState({
    currentAge: 54,
    menopauseAge: 51,
    twelveMonthsPeriodFree: true,
    menopauseType: 'Natural',
    onHRT: 'No',
  });

  // Health Assessments State
  const [boneHealth, setBoneHealth] = useState({
    fracturePost50: false,
    familyOsteoporosis: true,
    smoker: false,
    alcoholRegular: false,
    exerciseFreq: '3-5 times/week',
    supplements: 'Yes, both',
  });

  const [heartHealth, setHeartHealth] = useState({
    bloodPressure: 'Normal (<120/80)',
    diabetes: 'No',
    cholesterol: 'Normal',
    smokingStatus: 'Non-smoker',
    physicalActivity: 'Moderate 150+ mins/week',
    familyHeartDisease: false,
  });

  // Lifestyle Tracker State
  const [lifestyle, setLifestyle] = useState({
    waterGlasses: 7,
    exerciseMins: 30,
    sleepHours: 7.5,
    weightKg: 64.5,
    dietQuality: 'Healthy & balanced',
    stressLevel: 'Moderate',
  });

  // Medication & Supplement State
  const [medications, setMedications] = useState([
    { id: '1', name: 'Calcium + Vitamin D3', dose: '1200mg / 1000 IU', time: '8:00 AM', takenToday: true, isHRT: false },
    { id: '2', name: 'Estradiol Transdermal Patch', dose: '0.05 mg/day', time: 'Weekly', takenToday: true, isHRT: true },
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [showAddMedModal, setShowAddMedModal] = useState(false);

  // Screening Reminders State
  const [screenings, setScreenings] = useState([
    { id: '1', title: 'Breast Cancer Screening (Mammogram)', lastDate: '2025-09-15', nextDue: '2026-09-15', status: 'Up to date' },
    { id: '2', title: 'Bone Density (DEXA) Scan', lastDate: '2024-11-10', nextDue: '2026-11-10', status: 'Up to date' },
    { id: '3', title: 'Blood Pressure Check', lastDate: '2026-06-01', nextDue: '2026-12-01', status: 'Up to date' },
    { id: '4', title: 'Lipid Panel (Cholesterol)', lastDate: '2025-05-20', nextDue: '2026-05-20', status: 'Due soon' },
    { id: '5', title: 'Diabetes Screening (HbA1c)', lastDate: '2025-07-10', nextDue: '2026-07-10', status: 'Due soon' },
    { id: '6', title: 'Cervical Screening', lastDate: '2023-04-12', nextDue: '2028-04-12', status: 'Up to date' },
    { id: '7', title: 'Colorectal Cancer Screening', lastDate: '2025-01-18', nextDue: '2027-01-18', status: 'Up to date' },
  ]);

  // Educational Reader State
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Red Flag State
  const [activeRedFlags, setActiveRedFlags] = useState([]);

  // AI Chat State
  const [aiChatMessages, setAiChatMessages] = useState([
    { id: '1', sender: 'ai', text: 'Hello Amara! I am RedApple AI, your specialized postmenopausal health assistant. Ask me anything about symptoms, HRT, bone health, or lifestyle support.' },
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // Initial Load from Storage
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    const data = await getPostmenopauseDataSafe();
    if (data) {
      if (data.profile) setProfile(data.profile);
      if (data.boneHealth) setBoneHealth(data.boneHealth);
      if (data.heartHealth) setHeartHealth(data.heartHealth);
      if (data.lifestyle) setLifestyle(data.lifestyle);
      if (data.medications) setMedications(data.medications);
      if (data.screenings) setScreenings(data.screenings);
      if (data.activeRedFlags) setActiveRedFlags(data.activeRedFlags);
      if (data.hasCompletedOnboarding !== undefined) {
        setHasCompletedOnboarding(data.hasCompletedOnboarding);
      }
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSavedData();
    await new Promise((res) => setTimeout(res, 500));
    setIsRefreshing(false);
  };

  const persistData = async (updatedFields = {}) => {
    const payload = {
      profile,
      boneHealth,
      heartHealth,
      lifestyle,
      medications,
      screenings,
      activeRedFlags,
      hasCompletedOnboarding,
      ...updatedFields,
    };
    await savePostmenopauseDataSafe(payload);
  };

  // Red Flag Toggle
  const handleToggleRedFlag = (flagId) => {
    let updated;
    if (activeRedFlags.includes(flagId)) {
      updated = activeRedFlags.filter((id) => id !== flagId);
    } else {
      updated = [...activeRedFlags, flagId];
    }
    setActiveRedFlags(updated);
    persistData({ activeRedFlags: updated });
  };

  // AI Ask Handler
  const handleAskAI = (questionText) => {
    const query = questionText || aiInputText;
    if (!query.trim()) return;

    const userMsg = { id: Date.now().toString(), sender: 'user', text: query };
    const answer =
      AI_KNOWLEDGE_BASE[query] ||
      `Regarding "${query}": In postmenopause, hormone shifts can influence your general wellbeing. Maintaining regular exercise, balanced nutrition rich in calcium and vitamin D, adequate hydration, and consulting your physician for persistent symptoms is recommended. Please seek direct medical advice for specific diagnoses.`;

    const aiMsg = { id: (Date.now() + 1).toString(), sender: 'ai', text: answer };

    setAiChatMessages((prev) => [...prev, userMsg, aiMsg]);
    setAiInputText('');
  };

  // Add Medication Handler
  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    const newMed = {
      id: Date.now().toString(),
      name: newMedName,
      dose: newMedDose || 'Standard Dose',
      time: '9:00 AM',
      takenToday: false,
      isHRT: newMedName.toLowerCase().includes('hrt') || newMedName.toLowerCase().includes('estrogen'),
    };
    const updated = [...medications, newMed];
    setMedications(updated);
    setNewMedName('');
    setNewMedDose('');
    setShowAddMedModal(false);
    persistData({ medications: updated });
  };

  // Toggle Medication Taken
  const handleToggleMedTaken = (id) => {
    const updated = medications.map((m) => (m.id === id ? { ...m, takenToday: !m.takenToday } : m));
    setMedications(updated);
    persistData({ medications: updated });
  };

  // Handle Onboarding Next Step
  const handleOnboardingNext = () => {
    if (onboardingStep < 5) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      setHasCompletedOnboarding(true);
      setShowOnboardingWizard(false);
      persistData({ hasCompletedOnboarding: true, profile });
    }
  };

  const handleOpenOnboardingWizard = () => {
    if (onOpenSetupWizard) {
      onOpenSetupWizard('postmenopause');
    } else {
      setOnboardingStep(1);
      setShowOnboardingWizard(true);
    }
  };

  // PRIMARY VIEW: POSTMENOPAUSE ONBOARDING SETUP WIZARD (Legacy fallback only if no onOpenSetupWizard)
  if (!onOpenSetupWizard && (!hasCompletedOnboarding || showOnboardingWizard)) {
    return (
      <ScrollView contentContainerStyle={styles.wizardMainScrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.wizardMainHeader}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.wizardCloseBtn}
            onPress={() => {
              if (hasCompletedOnboarding) {
                setShowOnboardingWizard(false);
              } else {
                onSwitchToCycleMode();
              }
            }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* 5-Segment Progress Bar */}
          <View style={styles.wizardProgressContainer}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.wizardProgressSegment,
                  i <= onboardingStep ? styles.wizardProgressSegmentActive : styles.wizardProgressSegmentInactive,
                ]}
              />
            ))}
          </View>

          <Text style={styles.wizardStepBadge}>Step {onboardingStep} of 5</Text>
        </View>

        <View style={styles.wizardMainBody}>
          {onboardingStep === 1 && (
            <View style={styles.wizardStepContent}>
              <View style={styles.wizardIconCircle}>
                <Ionicons name="person-outline" size={32} color="#DC2626" />
              </View>
              <Text style={styles.wizardQuestionTitle}>How old are you?</Text>
              <Text style={styles.wizardQuestionSub}>
                Knowing your current age helps calibrate bone density, cardiovascular risk factors, and health recommendations.
              </Text>

              <View style={styles.wizardStepperCard}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.wizardStepperBtn}
                  onPress={() => {
                    const val = Math.max(30, profile.currentAge - 1);
                    setProfile({ ...profile, currentAge: val });
                  }}
                >
                  <Ionicons name="remove" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.wizardStepperText}>{profile.currentAge} years</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.wizardStepperBtn}
                  onPress={() => {
                    const val = Math.min(100, profile.currentAge + 1);
                    setProfile({ ...profile, currentAge: val });
                  }}
                >
                  <Ionicons name="add" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {onboardingStep === 2 && (
            <View style={styles.wizardStepContent}>
              <View style={styles.wizardIconCircle}>
                <Ionicons name="calendar-outline" size={32} color="#DC2626" />
              </View>
              <Text style={styles.wizardQuestionTitle}>At what age did your periods stop completely?</Text>
              <Text style={styles.wizardQuestionSub}>
                The age when periods stop marks the clinical start of your postmenopausal transition.
              </Text>

              <View style={styles.wizardStepperCard}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.wizardStepperBtn}
                  onPress={() => {
                    const val = Math.max(25, profile.menopauseAge - 1);
                    setProfile({ ...profile, menopauseAge: val });
                  }}
                >
                  <Ionicons name="remove" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.wizardStepperText}>{profile.menopauseAge} years</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.wizardStepperBtn}
                  onPress={() => {
                    const val = Math.min(profile.currentAge, profile.menopauseAge + 1);
                    setProfile({ ...profile, menopauseAge: val });
                  }}
                >
                  <Ionicons name="add" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {onboardingStep === 3 && (
            <View style={styles.wizardStepContent}>
              <View style={styles.wizardIconCircle}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#DC2626" />
              </View>
              <Text style={styles.wizardQuestionTitle}>Gone 12 consecutive months without a period?</Text>
              <Text style={styles.wizardQuestionSub}>
                Clinical menopause is officially confirmed after 12 full consecutive months without bleeding.
              </Text>

              <View style={styles.wizardOptionsCol}>
                {[true, false].map((val) => (
                  <TouchableOpacity
                    key={String(val)}
                    activeOpacity={0.8}
                    style={[
                      styles.wizardOptionCard,
                      profile.twelveMonthsPeriodFree === val && styles.wizardOptionCardActive,
                    ]}
                    onPress={() => setProfile({ ...profile, twelveMonthsPeriodFree: val })}
                  >
                    <Ionicons
                      name={profile.twelveMonthsPeriodFree === val ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={profile.twelveMonthsPeriodFree === val ? '#DC2626' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.wizardOptionText,
                        profile.twelveMonthsPeriodFree === val && styles.wizardOptionTextActive,
                      ]}
                    >
                      {val ? 'Yes (12+ Months Confirmed)' : 'No (Currently Transitioning)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {onboardingStep === 4 && (
            <View style={styles.wizardStepContent}>
              <View style={styles.wizardIconCircle}>
                <Ionicons name="medical-outline" size={32} color="#DC2626" />
              </View>
              <Text style={styles.wizardQuestionTitle}>Did menopause occur naturally or after surgery?</Text>
              <Text style={styles.wizardQuestionSub}>
                Surgical menopause (removal of ovaries) often induces rapid hormonal shifts.
              </Text>

              <View style={styles.wizardOptionsCol}>
                {['Natural', 'Surgical', 'Medical'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.8}
                    style={[
                      styles.wizardOptionCard,
                      profile.menopauseType === type && styles.wizardOptionCardActive,
                    ]}
                    onPress={() => setProfile({ ...profile, menopauseType: type })}
                  >
                    <Ionicons
                      name={profile.menopauseType === type ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={profile.menopauseType === type ? '#DC2626' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.wizardOptionText,
                        profile.menopauseType === type && styles.wizardOptionTextActive,
                      ]}
                    >
                      {type} Menopause
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {onboardingStep === 5 && (
            <View style={styles.wizardStepContent}>
              <View style={styles.wizardIconCircle}>
                <Ionicons name="shield-checkmark-outline" size={32} color="#DC2626" />
              </View>
              <Text style={styles.wizardQuestionTitle}>Are you taking Hormone Replacement Therapy (HRT)?</Text>
              <Text style={styles.wizardQuestionSub}>
                Your HRT status customizes symptom management guidance and supplement tracking.
              </Text>

              <View style={styles.wizardOptionsCol}>
                {['Yes', 'No', 'Previously'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    activeOpacity={0.8}
                    style={[
                      styles.wizardOptionCard,
                      profile.onHRT === status && styles.wizardOptionCardActive,
                    ]}
                    onPress={() => setProfile({ ...profile, onHRT: status })}
                  >
                    <Ionicons
                      name={profile.onHRT === status ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={profile.onHRT === status ? '#DC2626' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.wizardOptionText,
                        profile.onHRT === status && styles.wizardOptionTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.wizardBottomActions}>
          {onboardingStep > 1 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.wizardBackBtn}
              onPress={() => setOnboardingStep(onboardingStep - 1)}
            >
              <Text style={styles.wizardBackBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.wizardNextBtn}
            onPress={handleOnboardingNext}
          >
            <Text style={styles.wizardNextBtnText}>
              {onboardingStep === 5 ? 'Complete Onboarding' : 'Next Step'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // MAIN DASHBOARD VIEW (ONCE ONBOARDING COMPLETED)
  return (
    <ScrollView
      contentContainerStyle={styles.pageScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#D97706"
          colors={['#D97706', '#FA4A14']}
          progressBackgroundColor="#FFFFFF"
        />
      }
    >
      {activeTab === 'dashboard' ? (
        <>
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

          {/* HERO FEATURED WHITE CARD (MATCHING CYCLE SCREEN) */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.heroCardContainer}
            onPress={handleOpenOnboardingWizard}
          >
            <View style={styles.heroWhiteCard}>
              {/* Big Display Headline */}
              <Text style={styles.heroHeadlineDisplay}>
                Stay Vibrant, Strong{"\n"}& Hormonally Balanced.
              </Text>

              {/* Functional Ring & Key Health Details */}
              <View style={styles.heroRingRow}>
                <PostmenopauseMilestoneRing />
                <View style={styles.heroMetricsCol}>
                  <View style={styles.metricItemRow}>
                    <View style={[styles.metricDot, { backgroundColor: '#DC2626' }]} />
                    <Text style={styles.metricItemText}>
                      Status: <Text style={{ fontWeight: '800', color: '#111827' }}>12+ Mo Period-Free</Text>
                    </Text>
                  </View>
                  <View style={styles.metricItemRow}>
                    <View style={[styles.metricDot, { backgroundColor: '#0284C7' }]} />
                    <Text style={styles.metricItemText}>
                      Bone & Heart: <Text style={{ fontWeight: '700', color: '#111827' }}>Optimal vitality</Text>
                    </Text>
                  </View>
                  <View style={styles.metricItemRow}>
                    <View style={[styles.metricDot, { backgroundColor: '#D97706' }]} />
                    <Text style={styles.metricItemText}>
                      HRT Support: <Text style={{ fontWeight: '700', color: '#111827' }}>{profile.onHRT}</Text> ({profile.menopauseType})
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* FEATURED CARD: TALK TO A DOCTOR (MATCHING CYCLE SCREEN) */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.doctorFeaturedCard}
            onPress={() => {
              if (onOpenDoctorPage) {
                onOpenDoctorPage();
              } else if (onBookDoctor) {
                onBookDoctor({ name: 'Telemedicine Specialist', spec: 'Obstetrics & Gynecological Telemedicine' });
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
              Book an HD video consultation with a certified menopause & hormone specialist.
            </Text>
          </TouchableOpacity>

          {/* 2-COLUMN BENTO GRID: CYCLE MODE & HEALTH SCORES */}
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
              onPress={() => setActiveTab('assessments')}
            >
              <View style={[styles.bentoIconSquare, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="fitness" size={22} color="#DC2626" />
              </View>
              <Text style={styles.bentoCardHeading}>Health Scores</Text>
              <Text style={styles.bentoCardSub}>Bone & heart health</Text>
            </TouchableOpacity>
          </View>

          {/* UPCOMING SCREENINGS & MILESTONES SECTION */}
          <View style={styles.predictionsContainer}>
            <Text style={styles.sectionHeaderLabelDark}>UPCOMING SCREENINGS & MILESTONES</Text>
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.upcomingPredictionCardClean}
                onPress={() => setActiveTab('screenings')}
              >
                <View style={[styles.upcomingIconSquircle, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="fitness" size={22} color="#DC2626" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.upcomingCardMainTitle}>DEXA Bone Density Scan</Text>
                  <Text style={styles.upcomingCardSubTitle}>Annual bone mineral density review</Text>
                </View>
                <View style={styles.upcomingPillRed}>
                  <Text style={styles.upcomingPillRedText}>Due Oct</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.upcomingPredictionCardClean}
                onPress={() => setActiveTab('assessments')}
              >
                <View style={[styles.upcomingIconSquircle, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="heart" size={22} color="#0284C7" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.upcomingCardMainTitle}>Cardiovascular Health Review</Text>
                  <Text style={styles.upcomingCardSubTitle}>Lipids, blood pressure & arterial vitality</Text>
                </View>
                <View style={styles.upcomingPillBlue}>
                  <Text style={styles.upcomingPillBlueText}>Annual</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.upcomingPredictionCardClean}
                onPress={() => setActiveTab('screenings')}
              >
                <View style={[styles.upcomingIconSquircle, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="shield-checkmark" size={22} color="#D97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.upcomingCardMainTitle}>Mammogram Screening</Text>
                  <Text style={styles.upcomingCardSubTitle}>Routine annual breast wellness check</Text>
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
        </>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.backToDashboardHeader}
            onPress={() => setActiveTab('dashboard')}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
            <Text style={styles.backToDashboardHeaderText}>Back to Overview</Text>
          </TouchableOpacity>

          {/* 2. HEALTH SCORES & ASSESSMENTS */}
          {activeTab === 'assessments' && (
            <View style={styles.tabSection}>
              <Text style={styles.sectionHeaderTitle}>Health Risk Assessments</Text>

              {/* Bone Health Card */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="fitness" size={20} color="#0284C7" />
                  <Text style={styles.cardTitle}>Bone Health Assessment</Text>
                </View>

                <Text style={styles.fieldLabel}>Fracture after age 50?</Text>
                <View style={styles.radioGroup}>
                  {[true, false].map((val) => (
                    <TouchableOpacity
                      key={String(val)}
                      activeOpacity={0.7}
                      style={[styles.radioPill, boneHealth.fracturePost50 === val && styles.radioPillActive]}
                      onPress={() => {
                        const updated = { ...boneHealth, fracturePost50: val };
                        setBoneHealth(updated);
                        persistData({ boneHealth: updated });
                      }}
                    >
                      <Text style={[styles.radioText, boneHealth.fracturePost50 === val && styles.radioTextActive]}>
                        {val ? 'Yes' : 'No'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Family history of osteoporosis?</Text>
                <View style={styles.radioGroup}>
                  {[true, false].map((val) => (
                    <TouchableOpacity
                      key={String(val)}
                      activeOpacity={0.7}
                      style={[styles.radioPill, boneHealth.familyOsteoporosis === val && styles.radioPillActive]}
                      onPress={() => {
                        const updated = { ...boneHealth, familyOsteoporosis: val };
                        setBoneHealth(updated);
                        persistData({ boneHealth: updated });
                      }}
                    >
                      <Text style={[styles.radioText, boneHealth.familyOsteoporosis === val && styles.radioTextActive]}>
                        {val ? 'Yes' : 'No'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Calcium & Vitamin D intake?</Text>
                <View style={styles.radioGroup}>
                  {['Yes, both', 'Calcium only', 'Vitamin D only', 'Neither'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.7}
                      style={[styles.radioPill, boneHealth.supplements === opt && styles.radioPillActive]}
                      onPress={() => {
                        const updated = { ...boneHealth, supplements: opt };
                        setBoneHealth(updated);
                        persistData({ boneHealth: updated });
                      }}
                    >
                      <Text style={[styles.radioText, boneHealth.supplements === opt && styles.radioTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Heart Health Card */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="heart" size={20} color="#DC2626" />
                  <Text style={styles.cardTitle}>Heart Health Profile</Text>
                </View>

                <Text style={styles.fieldLabel}>Blood Pressure</Text>
                <View style={styles.radioGroup}>
                  {['Normal (<120/80)', 'Elevated', 'High Stage 1', 'Unsure'].map((bp) => (
                    <TouchableOpacity
                      key={bp}
                      activeOpacity={0.7}
                      style={[styles.radioPill, heartHealth.bloodPressure === bp && styles.radioPillActive]}
                      onPress={() => {
                        const updated = { ...heartHealth, bloodPressure: bp };
                        setHeartHealth(updated);
                        persistData({ heartHealth: updated });
                      }}
                    >
                      <Text style={[styles.radioText, heartHealth.bloodPressure === bp && styles.radioTextActive]}>
                        {bp}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Smoking Status</Text>
                <View style={styles.radioGroup}>
                  {['Non-smoker', 'Former smoker', 'Current smoker'].map((sm) => (
                    <TouchableOpacity
                      key={sm}
                      activeOpacity={0.7}
                      style={[styles.radioPill, heartHealth.smokingStatus === sm && styles.radioPillActive]}
                      onPress={() => {
                        const updated = { ...heartHealth, smokingStatus: sm };
                        setHeartHealth(updated);
                        persistData({ heartHealth: updated });
                      }}
                    >
                      <Text style={[styles.radioText, heartHealth.smokingStatus === sm && styles.radioTextActive]}>
                        {sm}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* 4. LIFESTYLE TRACKER */}
          {activeTab === 'lifestyle' && (
            <View style={styles.tabSection}>
              <Text style={styles.sectionHeaderTitle}>Daily Lifestyle Tracker</Text>

              <View style={styles.card}>
                <View style={styles.metricRow}>
                  <Ionicons name="water" size={22} color="#0284C7" />
                  <Text style={styles.metricTitle}>Water Intake</Text>
                  <View style={styles.stepperSmallRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.stepperSmallBtn}
                      onPress={() => {
                        const val = Math.max(0, lifestyle.waterGlasses - 1);
                        const updated = { ...lifestyle, waterGlasses: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.metricValText}>{lifestyle.waterGlasses} glasses</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.stepperSmallBtn}
                      onPress={() => {
                        const val = lifestyle.waterGlasses + 1;
                        const updated = { ...lifestyle, waterGlasses: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <Ionicons name="walk" size={22} color="#15803D" />
                  <Text style={styles.metricTitle}>Exercise</Text>
                  <View style={styles.stepperSmallRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.stepperSmallBtn}
                      onPress={() => {
                        const val = Math.max(0, lifestyle.exerciseMins - 10);
                        const updated = { ...lifestyle, exerciseMins: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.metricValText}>{lifestyle.exerciseMins} mins</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.stepperSmallBtn}
                      onPress={() => {
                        const val = lifestyle.exerciseMins + 10;
                        const updated = { ...lifestyle, exerciseMins: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <Ionicons name="moon" size={22} color="#DC2626" />
                  <Text style={styles.metricTitle}>Sleep Duration</Text>
                  <View style={styles.stepperSmallRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.stepperSmallBtn}
                      onPress={() => {
                        const val = Math.max(0, lifestyle.sleepHours - 0.5);
                        const updated = { ...lifestyle, sleepHours: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.metricValText}>{lifestyle.sleepHours} hrs</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.stepperSmallBtn}
                      onPress={() => {
                        const val = lifestyle.sleepHours + 0.5;
                        const updated = { ...lifestyle, sleepHours: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 5. MEDS & HRT */}
          {activeTab === 'meds' && (
            <View style={styles.tabSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Meds & Supplements</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.addMedBtn}
                  onPress={() => setShowAddMedModal(true)}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addMedBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {medications.map((med) => (
                <View key={med.id} style={styles.medCard}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleToggleMedTaken(med.id)}
                  >
                    <Ionicons
                      name={med.takenToday ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={med.takenToday ? '#15803D' : colors.textMuted}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.medTitle, med.takenToday && styles.medTitleTaken]}>
                      {med.name} {med.isHRT ? '(HRT)' : ''}
                    </Text>
                    <Text style={styles.medDoseText}>{med.dose} • {med.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 6. REMINDERS */}
          {activeTab === 'screenings' && (
            <View style={styles.tabSection}>
              <Text style={styles.sectionHeaderTitle}>Screening Reminders</Text>
              <Text style={styles.sectionHeaderSub}>Preventive health checks for postmenopausal care.</Text>

              {screenings.map((sc) => (
                <View key={sc.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Ionicons name="calendar-outline" size={20} color="#DC2626" />
                    <Text style={styles.cardTitle}>{sc.title}</Text>
                  </View>
                  <Text style={styles.screeningText}>Last performed: {sc.lastDate}</Text>
                  <Text style={styles.screeningText}>Next due date: {sc.nextDue}</Text>

                  <View style={styles.statusBadgeRow}>
                    <Text style={[styles.statusBadge, sc.status === 'Up to date' ? styles.statusBadgeGood : styles.statusBadgeWarn]}>
                      {sc.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 7. LIBRARY */}
          {activeTab === 'learn' && (
            <View style={styles.tabSection}>
              <Text style={styles.sectionHeaderTitle}>Postmenopausal Library</Text>

              {EDU_ARTICLES.map((article) => (
                <TouchableOpacity
                  key={article.id}
                  activeOpacity={0.8}
                  style={styles.articleCard}
                  onPress={() => setSelectedArticle(article)}
                >
                  <View style={styles.articleTagRow}>
                    <Text style={styles.articleCategory}>{article.category}</Text>
                    <Text style={styles.articleTime}>{article.readTime}</Text>
                  </View>
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  <Text style={styles.articleSnippet} numberOfLines={2}>{article.content}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 8. ASK AI */}
          {activeTab === 'ai' && (
            <View style={styles.tabSection}>
              <Text style={styles.sectionHeaderTitle}>Ask RedApple AI</Text>
              <Text style={styles.sectionHeaderSub}>Get instant answers tailored for postmenopausal wellness.</Text>

              <Text style={styles.fieldLabel}>Preset Questions</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {PRESET_AI_QUESTIONS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    activeOpacity={0.8}
                    style={styles.presetChip}
                    onPress={() => handleAskAI(q)}
                  >
                    <Ionicons name="help-circle-outline" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={styles.presetChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.chatList}>
                {aiChatMessages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <View
                      key={msg.id}
                      style={[styles.chatBubble, isUser ? styles.userBubble : styles.aiBubble]}
                    >
                      <Text style={[styles.chatText, isUser ? styles.userChatText : styles.aiChatText]}>
                        {msg.text}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatTextInput}
                  placeholder="Ask about symptoms, HRT, diet, sex..."
                  placeholderTextColor={colors.textMuted}
                  value={aiInputText}
                  onChangeText={setAiInputText}
                  onSubmitEditing={() => handleAskAI()}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.chatSendBtn}
                  onPress={() => handleAskAI()}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Article Modal Reader */}
      <Modal
        visible={!!selectedArticle}
        animationType="slide"
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
            <Text style={styles.modalCategoryText}>{selectedArticle?.category}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContentPadding}>
            <Text style={styles.modalArticleTitle}>{selectedArticle?.title}</Text>
            <Text style={styles.modalArticleTime}>{selectedArticle?.readTime}</Text>
            <Text style={styles.modalArticleBody}>{selectedArticle?.content}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Medication Modal */}
      <Modal
        visible={showAddMedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Add Medication</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name (e.g. Calcium, HRT patch)"
              placeholderTextColor={colors.textMuted}
              value={newMedName}
              onChangeText={setNewMedName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Dose (e.g. 1200mg)"
              placeholderTextColor={colors.textMuted}
              value={newMedDose}
              onChangeText={setNewMedDose}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.modalCancelBtn}
                onPress={() => setShowAddMedModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.modalSaveBtn}
                onPress={handleAddMedication}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageScrollContent: {
    paddingBottom: 48,
    paddingTop: 6,
  },

  /* Cal AI Style 7-Day Calendar Strip */
  calAiCalendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
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
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  calAiCircleSelected: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1.5,
    borderColor: '#DC2626',
  },
  calAiDayLetter: {
    fontSize: 13,
    fontWeight: '800',
  },
  calAiDayLetterNormal: {
    color: '#6B7280',
  },
  calAiDayLetterToday: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  calAiDateNum: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  calAiDateNumToday: {
    color: '#111827',
    fontWeight: '900',
  },
  calAiDateNumSelected: {
    color: '#DC2626',
    fontWeight: '900',
  },

  /* Hero Featured White Card */
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroUserAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#DC2626',
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
  heroHeadlineDisplay: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
    lineHeight: 28,
    marginBottom: 16,
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
  heroFooterRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 2,
  },
  heroFooterMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  /* Doctor Featured Card */
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
    marginBottom: 14,
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
    marginBottom: 4,
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
    minHeight: 140,
    justifyContent: 'space-between',
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
    marginTop: 12,
    marginBottom: 2,
  },
  bentoCardSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },

  /* Upcoming Predictions / Milestones Container */
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
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  upcomingPillRedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  upcomingPillBlue: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  upcomingPillBlueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
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

  /* Toolkits Chip Row */
  toolkitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  toolkitChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },

  /* Back to Dashboard Navigation Header */
  backToDashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
    marginBottom: 8,
  },
  backToDashboardHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  /* Top Mode Selector Pill matching PregnancyScreen */
  topModeBar: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modePillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  modeTabInactive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeTabTextInactive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modeTabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeTabTextActive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Sub-Tab Navigation Bar */
  subTabBar: {
    marginBottom: 18,
  },
  subTabBarContent: {
    gap: 8,
    paddingVertical: 2,
  },
  subTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  subTabPillActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Urgent Red Flag Alert Banner */
  redFlagAlertBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  redFlagAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  redFlagAlertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    marginLeft: 8,
  },
  redFlagAlertBody: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
    marginBottom: 12,
  },
  redFlagAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 10,
  },
  redFlagAlertButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Section Containers */
  tabSection: {
    width: '100%',
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionHeaderSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },

  /* Hero Card */
  mainHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  ringCol: {
    marginRight: 14,
  },
  heroInfoCol: {
    flex: 1,
  },
  heroHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSubHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
  },
  editSetupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editSetupBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 4,
  },
  heroMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  heroBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7E22CE',
    marginTop: 2,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  heroMetricItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  heroMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  hrtStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  hrtStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  /* Quick Action Grid */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  quickCard: {
    width: '48%',
    minWidth: 140,
    flexGrow: 1,
    borderRadius: 18,
    padding: 16,
  },
  quickCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  quickCardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Cards */
  card: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  cardBodyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },

  /* Red Flag Checklist */
  redFlagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  redFlagRowSelected: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  redFlagTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  redFlagSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Personalised Insights */
  insightItem: {
    flexDirection: 'row',
    marginTop: 10,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  insightDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },

  /* Form & Control Inputs */
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  radioPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  radioPillActive: {
    backgroundColor: '#DC2626',
  },
  radioText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  radioTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Metrics */
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginLeft: 10,
  },
  stepperSmallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperSmallBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 70,
    textAlign: 'center',
  },

  /* Meds */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addMedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSurface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  medTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  medTitleTaken: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  medDoseText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Screenings */
  screeningText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadgeRow: {
    marginTop: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeGood: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  statusBadgeWarn: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
  },

  /* Articles */
  articleCard: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  articleTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  articleCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  articleTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  articleSnippet: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  /* AI Chat */
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  chatList: {
    gap: 10,
    marginBottom: 16,
  },
  chatBubble: {
    maxWidth: '85%',
    borderRadius: 18,
    padding: 14,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFEBEE',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#DC2626',
  },
  chatText: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiChatText: {
    color: '#991B1B',
  },
  userChatText: {
    color: '#FFFFFF',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.backgroundSurface,
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.textPrimary,
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Postmenopause Onboarding Primary View */
  wizardMainScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  wizardMainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  wizardMainBody: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  wizardCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  wizardProgressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 14,
  },
  wizardProgressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  wizardProgressSegmentActive: {
    backgroundColor: '#DC2626',
  },
  wizardProgressSegmentInactive: {
    backgroundColor: '#E5E7EB',
  },
  wizardStepBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  wizardStepContent: {
    width: '100%',
    alignItems: 'center',
  },
  wizardIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  wizardQuestionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 10,
  },
  wizardQuestionSub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  wizardStepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: colors.backgroundSurface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wizardStepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardStepperText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#DC2626',
  },
  wizardOptionsCol: {
    width: '100%',
    gap: 12,
  },
  wizardOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.backgroundSurface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wizardOptionCardActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  wizardOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  wizardOptionTextActive: {
    fontWeight: '700',
    color: '#DC2626',
  },
  wizardBottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  wizardBackBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  wizardBackBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  wizardNextBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  wizardNextBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Full Article Reader Modal */
  modalFullContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSurface,
  },
  modalFullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCategoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalContentPadding: {
    padding: 20,
  },
  modalArticleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalArticleTime: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
  },
  modalArticleBody: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
  },

  /* Add Med Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.backgroundSurface,
    borderRadius: 20,
    padding: 20,
  },
  modalCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modalSaveBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
