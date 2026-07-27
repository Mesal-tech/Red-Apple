import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getPostmenopauseDataSafe, savePostmenopauseDataSafe } from '../utils/storage';

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
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  trackCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 7,
    borderColor: '#F3E8FF',
    position: 'absolute',
  },
  halfCircleContainerRight: {
    width: 48,
    height: 96,
    position: 'absolute',
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
  halfCircleRight: {
    width: 48,
    height: 96,
    borderTopRightRadius: 48,
    borderBottomRightRadius: 48,
    borderWidth: 7,
    borderColor: '#8E24AA',
    borderLeftWidth: 0,
    transformOrigin: 'left center',
  },
  halfCircleContainerLeft: {
    width: 48,
    height: 96,
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  halfCircleLeft: {
    width: 48,
    height: 96,
    borderTopLeftRadius: 48,
    borderBottomLeftRadius: 48,
    borderWidth: 7,
    borderColor: '#8E24AA',
    borderRightWidth: 0,
    transformOrigin: 'right center',
  },
  innerMaskCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
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
    fontSize: 22,
    fontWeight: '900',
    color: '#8E24AA',
  },
  ringMonthTotal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
});

const ALL_SYMPTOMS = [
  'Hot flushes',
  'Night sweats',
  'Vaginal dryness',
  'Pain during intercourse',
  'Low libido',
  'Mood changes',
  'Anxiety',
  'Depression',
  'Sleep problems',
  'Brain fog or memory issues',
  'Fatigue',
  'Joint and muscle pain',
  'Headaches',
  'Weight gain',
  'Urinary urgency or leakage',
];

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
    content: `Menopause is defined as 12 consecutive months without a menstrual period, marking the end of natural reproductive years. After menopause (the postmenopausal stage), estrogen and progesterone levels stabilize at lower baseline levels. While symptoms such as hot flushes often diminish over time, low estrogen levels continue to influence cardiovascular health, bone density, skin elasticity, and vaginal mucosa. Understanding these long-term physiological changes enables proactive health management through nutrition, physical activity, and targeted medical care.`,
  },
  {
    id: '2',
    title: 'Hormone replacement therapy (HRT): Benefits and risks',
    category: 'Therapy & Care',
    readTime: '6 min read',
    content: `Hormone Replacement Therapy (HRT) replaces hormones that the body stops producing during and after menopause. Benefits include significant relief from vasomotor symptoms (hot flushes, night sweats), prevention of bone loss, and improved sleep quality. Risks depend on HRT type (estrogen-only vs. combined estrogen-progestogen), delivery method (transdermal vs. oral), age at initiation, and individual cardiovascular or breast cancer risk factors. Consulting a qualified healthcare provider helps weigh individual benefits against potential risks.`,
  },
  {
    id: '3',
    title: 'Osteoporosis prevention and bone strength',
    category: 'Bone Health',
    readTime: '5 min read',
    content: `Estrogen plays a pivotal role in maintaining bone mineral density. Following menopause, bone resorption accelerates, increasing osteoporosis risk. Effective prevention strategies include adequate daily calcium intake (1,200 mg total daily via food and supplements), vitamin D (800-2000 IU daily for absorption), weight-bearing exercises (brisk walking, strength training), avoiding tobacco, and limiting alcohol. Bone density (DEXA) scans monitor bone health over time.`,
  },
  {
    id: '4',
    title: 'Heart health after menopause',
    category: 'Cardiovascular',
    readTime: '5 min read',
    content: `Estrogen exerts protective effects on vascular elasticity and lipid profiles. Postmenopause, women face an elevated risk for cardiovascular disease. Managing heart health involves regularly tracking blood pressure, lipid panels (cholesterol), and blood glucose levels. Prioritizing a Mediterranean-style diet, achieving 150 minutes of weekly moderate aerobic exercise, managing stress, and maintaining a healthy weight significantly lower cardiac risks.`,
  },
  {
    id: '5',
    title: 'Nutrition for healthy ageing',
    category: 'Nutrition',
    readTime: '4 min read',
    content: `Nutritional needs evolve during postmenopause. Muscle mass naturally declines, requiring higher protein intake (1.0-1.2g per kg body weight). Focus on calcium-rich foods (dairy, leafy greens, fortified plant milks), fiber for digestive and lipid regulation, phytoestrogen sources (flaxseed, soy), and antioxidant-rich berries and vegetables. Minimizing processed sugars and sodium supports metabolic and vascular health.`,
  },
  {
    id: '6',
    title: 'Exercise recommendations for vitality',
    category: 'Fitness',
    readTime: '4 min read',
    content: `A balanced postmenopausal exercise routine combines three elements: 1) Resistance training 2-3 times weekly to stimulate bone density and maintain muscle; 2) Aerobic activity (walking, swimming, cycling) for 30 minutes 5 days a week for heart health; 3) Balance and flexibility routines (yoga, Pilates) to prevent falls and preserve joint mobility.`,
  },
  {
    id: '7',
    title: 'Sexual health and intimacy',
    category: 'Sexual Wellness',
    readTime: '5 min read',
    content: `Reduced estrogen levels can cause genitourinary syndrome of menopause (GSM), leading to vaginal dryness, tissue thinning, and pain during intercourse. Regular use of non-hormonal vaginal moisturizers, water- or silicone-based lubricants during intimacy, or localized low-dose vaginal estrogen prescribed by a doctor can restore comfort and sexual satisfaction.`,
  },
  {
    id: '8',
    title: 'Pelvic floor exercises (Kegels)',
    category: 'Pelvic Health',
    readTime: '3 min read',
    content: `Strengthening pelvic floor muscles supports the bladder, bowel, and uterus, helping prevent urinary leakage (stress urgency incontinence) and pelvic organ prolapse. Practice contracting the pelvic floor muscles for 3-5 seconds, relaxing for 3-5 seconds, performing 10-15 repetitions 3 times daily.`,
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
}) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'symptoms' | 'assessments' | 'lifestyle' | 'meds' | 'screenings' | 'learn' | 'ai'

  // Postmenopause Onboarding State
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Profile State
  const [profile, setProfile] = useState({
    currentAge: 54,
    menopauseAge: 51,
    twelveMonthsPeriodFree: true,
    menopauseType: 'Natural',
    onHRT: 'No',
  });

  // Symptom Tracker State
  const [loggedSymptoms, setLoggedSymptoms] = useState([
    { name: 'Hot flushes', intensity: 'Moderate' },
    { name: 'Sleep problems', intensity: 'Mild' },
    { name: 'Joint and muscle pain', intensity: 'Mild' },
  ]);

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
      if (data.loggedSymptoms) setLoggedSymptoms(data.loggedSymptoms);
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

  const persistData = async (updatedFields = {}) => {
    const payload = {
      profile,
      loggedSymptoms,
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

  // Symptom Add / Toggle
  const handleToggleSymptom = (symptomName) => {
    const existing = loggedSymptoms.find((s) => s.name === symptomName);
    let updated;
    if (existing) {
      updated = loggedSymptoms.filter((s) => s.name !== symptomName);
    } else {
      updated = [...loggedSymptoms, { name: symptomName, intensity: 'Moderate' }];
    }
    setLoggedSymptoms(updated);
    persistData({ loggedSymptoms: updated });
  };

  const handleSetSymptomIntensity = (symptomName, intensity) => {
    const updated = loggedSymptoms.map((s) => (s.name === symptomName ? { ...s, intensity } : s));
    setLoggedSymptoms(updated);
    persistData({ loggedSymptoms: updated });
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
    setOnboardingStep(1);
    setShowOnboardingWizard(true);
  };

  // PRIMARY VIEW: POSTMENOPAUSE ONBOARDING SETUP WIZARD
  if (!hasCompletedOnboarding || showOnboardingWizard) {
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
                <Ionicons name="person-outline" size={32} color="#8E24AA" />
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
                <Ionicons name="calendar-outline" size={32} color="#8E24AA" />
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
                <Ionicons name="checkmark-circle-outline" size={32} color="#8E24AA" />
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
                      color={profile.twelveMonthsPeriodFree === val ? '#8E24AA' : colors.textMuted}
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
                <Ionicons name="medical-outline" size={32} color="#8E24AA" />
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
                      color={profile.menopauseType === type ? '#8E24AA' : colors.textMuted}
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
                <Ionicons name="shield-checkmark-outline" size={32} color="#8E24AA" />
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
                      color={profile.onHRT === status ? '#8E24AA' : colors.textMuted}
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
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Top Life Stage Mode Selector Bar */}
      <View style={styles.topModeBar}>
        <View style={styles.modePillContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.modeTabInactive}
            onPress={onSwitchToCycleMode}
          >
            <Text style={styles.modeTabTextInactive}>Cycle Mode</Text>
          </TouchableOpacity>

          <View style={styles.modeTabActive}>
            <Ionicons name="sparkles" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.modeTabTextActive}>Postmenopause</Text>
          </View>
        </View>
      </View>

      {/* Main Sub-Tab Pill Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.subTabBar}
        contentContainerStyle={styles.subTabBarContent}
      >
        {[
          { id: 'dashboard', label: 'Overview', icon: 'apps-outline' },
          { id: 'symptoms', label: 'Symptoms', icon: 'pulse-outline' },
          { id: 'assessments', label: 'Health Scores', icon: 'fitness-outline' },
          { id: 'lifestyle', label: 'Lifestyle', icon: 'water-outline' },
          { id: 'meds', label: 'Meds & HRT', icon: 'medical-outline' },
          { id: 'screenings', label: 'Reminders', icon: 'calendar-outline' },
          { id: 'learn', label: 'Library', icon: 'book-outline' },
          { id: 'ai', label: 'Ask AI', icon: 'chatbubbles-outline' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.75}
              style={[styles.subTabPill, isActive && styles.subTabPillActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={isActive ? '#FFFFFF' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Urgent Red Flag Alert Banner */}
      {activeRedFlags.length > 0 && (
        <View style={styles.redFlagAlertBanner}>
          <View style={styles.redFlagAlertHeader}>
            <Ionicons name="warning" size={22} color="#DC2626" />
            <Text style={styles.redFlagAlertTitle}>Medical Review Advised</Text>
          </View>
          <Text style={styles.redFlagAlertBody}>
            You reported high-priority symptoms requiring clinical evaluation. Postmenopausal symptoms like unexpected bleeding or new breast lumps require direct assessment by a healthcare clinician.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.redFlagAlertButton}
            onPress={() => onBookDoctor && onBookDoctor({ name: 'Dr. Sarah Jenkins', spec: 'Gynaecology & Menopause Specialist' })}
          >
            <Ionicons name="call-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.redFlagAlertButtonText}>Consult Doctor Care Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TAB CONTENT AREA */}

      {/* 1. OVERVIEW DASHBOARD */}
      {activeTab === 'dashboard' && (
        <View style={styles.tabSection}>
          {/* Signature Hero Card */}
          <View style={styles.mainHeroCard}>
            <View style={styles.ringCol}>
              <PostmenopauseMilestoneRing />
            </View>

            <View style={styles.heroInfoCol}>
              <View style={styles.heroHeaderTitleRow}>
                <Text style={styles.heroSubHeader}>HEALTH SUMMARY</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.editSetupBtn}
                  onPress={handleOpenOnboardingWizard}
                >
                  <Ionicons name="settings-outline" size={14} color="#8E24AA" />
                  <Text style={styles.editSetupBtnText}>Edit Setup</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.heroMainTitle}>Postmenopausal Stage</Text>
              <Text style={styles.heroBadge}>
                {profile.twelveMonthsPeriodFree ? '12+ Months Period-Free' : 'Monitoring Transition'}
              </Text>

              <View style={styles.heroMetricsRow}>
                <View style={styles.heroMetricItem}>
                  <Text style={styles.heroMetricLabel}>AGE</Text>
                  <Text style={styles.heroMetricVal}>{profile.currentAge} yrs</Text>
                </View>
                <View style={styles.heroMetricItem}>
                  <Text style={styles.heroMetricLabel}>MENOPAUSE AGE</Text>
                  <Text style={styles.heroMetricVal}>{profile.menopauseAge} yrs</Text>
                </View>
              </View>

              <View style={styles.hrtStatusBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#8E24AA" style={{ marginRight: 6 }} />
                <Text style={styles.hrtStatusText}>
                  HRT: {profile.onHRT} ({profile.menopauseType} Cause)
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Action Grid */}
          <Text style={styles.sectionHeaderTitle}>Daily Health Management</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.quickCard, { backgroundColor: '#F3E8FF' }]}
              onPress={() => setActiveTab('symptoms')}
            >
              <Ionicons name="pulse" size={24} color="#8E24AA" />
              <Text style={styles.quickCardTitle}>Log Symptoms</Text>
              <Text style={styles.quickCardSub}>{loggedSymptoms.length} logged today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.quickCard, { backgroundColor: '#E0F2FE' }]}
              onPress={() => setActiveTab('assessments')}
            >
              <Ionicons name="fitness" size={24} color="#0284C7" />
              <Text style={styles.quickCardTitle}>Bone & Heart</Text>
              <Text style={styles.quickCardSub}>Assess health risks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.quickCard, { backgroundColor: '#FEF3C7' }]}
              onPress={() => setActiveTab('lifestyle')}
            >
              <Ionicons name="water" size={24} color="#D97706" />
              <Text style={styles.quickCardTitle}>Lifestyle</Text>
              <Text style={styles.quickCardSub}>{lifestyle.waterGlasses} glasses water</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.quickCard, { backgroundColor: '#DCFCE7' }]}
              onPress={() => setActiveTab('ai')}
            >
              <Ionicons name="chatbubbles" size={24} color="#15803D" />
              <Text style={styles.quickCardTitle}>Ask AI</Text>
              <Text style={styles.quickCardSub}>Instant answers</Text>
            </TouchableOpacity>
          </View>

          {/* Clinical Red Flag Checklist Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="warning-outline" size={20} color="#DC2626" />
              <Text style={styles.cardTitle}>Clinical Red Flag Symptom Check</Text>
            </View>
            <Text style={styles.cardBodyText}>
              Select any symptoms below if currently present. Red flags warrant clinical review.
            </Text>
            {RED_FLAGS.map((item) => {
              const isSelected = activeRedFlags.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  style={[styles.redFlagRow, isSelected && styles.redFlagRowSelected]}
                  onPress={() => handleToggleRedFlag(item.id)}
                >
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isSelected ? '#DC2626' : colors.textMuted}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.redFlagTitle, isSelected && { color: '#DC2626' }]}>
                      {item.title}
                    </Text>
                    <Text style={styles.redFlagSub}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Personalised Insights */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="analytics-outline" size={20} color="#8E24AA" />
              <Text style={styles.cardTitle}>Personalised Insights</Text>
            </View>

            <View style={styles.insightItem}>
              <Ionicons name="sunny-outline" size={18} color="#D97706" style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.insightTitle}>Symptom Pattern</Text>
                <Text style={styles.insightDesc}>
                  {loggedSymptoms.some((s) => s.name === 'Hot flushes')
                    ? 'Hot flushes logged at moderate level. Keep cool hydration handy.'
                    : 'Symptom levels are stable today.'}
                </Text>
              </View>
            </View>

            <View style={styles.insightItem}>
              <Ionicons name="body-outline" size={18} color="#0284C7" style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.insightTitle}>Bone Protection</Text>
                <Text style={styles.insightDesc}>
                  {boneHealth.supplements.includes('both')
                    ? 'Great job taking daily Calcium & Vitamin D!'
                    : 'Consider supplementing Calcium (1200mg) and Vitamin D for bone density.'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 2. SYMPTOM TRACKER */}
      {activeTab === 'symptoms' && (
        <View style={styles.tabSection}>
          <Text style={styles.sectionHeaderTitle}>Symptom Tracker</Text>
          <Text style={styles.sectionHeaderSub}>Tap symptoms to log severity for today.</Text>

          <View style={styles.symptomsGrid}>
            {ALL_SYMPTOMS.map((symName) => {
              const logged = loggedSymptoms.find((s) => s.name === symName);
              const isSelected = !!logged;

              return (
                <View key={symName} style={[styles.symptomCard, isSelected && styles.symptomCardSelected]}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.symptomHeader}
                    onPress={() => handleToggleSymptom(symName)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isSelected ? '#8E24AA' : colors.textMuted}
                    />
                    <Text style={[styles.symptomTitle, isSelected && styles.symptomTitleSelected]}>
                      {symName}
                    </Text>
                  </TouchableOpacity>

                  {isSelected && (
                    <View style={styles.intensityRow}>
                      <Text style={styles.intensityLabel}>Severity:</Text>
                      {['Mild', 'Moderate', 'Severe'].map((lvl) => (
                        <TouchableOpacity
                          key={lvl}
                          activeOpacity={0.7}
                          style={[
                            styles.intensityPill,
                            logged.intensity === lvl && styles.intensityPillActive,
                          ]}
                          onPress={() => handleSetSymptomIntensity(symName, lvl)}
                        >
                          <Text
                            style={[
                              styles.intensityText,
                              logged.intensity === lvl && styles.intensityTextActive,
                            ]}
                          >
                            {lvl}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 3. HEALTH SCORES & ASSESSMENTS */}
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
              <Ionicons name="moon" size={22} color="#8E24AA" />
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
                <Ionicons name="calendar-outline" size={20} color="#8E24AA" />
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
                <Ionicons name="help-circle-outline" size={14} color="#8E24AA" style={{ marginRight: 4 }} />
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
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
    backgroundColor: '#8E24AA',
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
    backgroundColor: '#8E24AA',
    borderColor: '#8E24AA',
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
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#8E24AA',
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
    color: '#8E24AA',
    letterSpacing: 0.8,
  },
  editSetupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editSetupBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E24AA',
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
    color: '#8E24AA',
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
    width: (SCREEN_WIDTH - 52) / 2,
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

  /* Symptoms Grid */
  symptomsGrid: {
    gap: 10,
  },
  symptomCard: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  symptomCardSelected: {
    borderColor: '#8E24AA',
    backgroundColor: '#FAF5FF',
  },
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symptomTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 10,
  },
  symptomTitleSelected: {
    fontWeight: '700',
    color: '#8E24AA',
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E9D5FF',
    gap: 8,
  },
  intensityLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  intensityPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  intensityPillActive: {
    backgroundColor: '#8E24AA',
  },
  intensityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  intensityTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#8E24AA',
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
    backgroundColor: '#8E24AA',
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
    color: '#8E24AA',
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
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E24AA',
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
    backgroundColor: '#F3E8FF',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#8E24AA',
  },
  chatText: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiChatText: {
    color: '#4C1D95',
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
    backgroundColor: '#8E24AA',
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
    backgroundColor: '#8E24AA',
  },
  wizardProgressSegmentInactive: {
    backgroundColor: '#E5E7EB',
  },
  wizardStepBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E24AA',
  },
  wizardStepContent: {
    width: '100%',
    alignItems: 'center',
  },
  wizardIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
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
    color: '#8E24AA',
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
    borderColor: '#8E24AA',
    backgroundColor: '#FAF5FF',
  },
  wizardOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  wizardOptionTextActive: {
    fontWeight: '700',
    color: '#8E24AA',
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
    backgroundColor: '#8E24AA',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8E24AA',
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
    color: '#8E24AA',
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
    backgroundColor: '#8E24AA',
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
