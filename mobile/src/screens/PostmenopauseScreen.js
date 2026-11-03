import React, { useState, useEffect } from 'react';
import {
  Alert,
  Linking,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getPostmenopauseDataSafe, savePostmenopauseDataSafe } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';

const NIA_MENOPAUSE_URL = 'https://www.nia.nih.gov/health/menopause/what-menopause';
const ACOG_HORMONE_THERAPY_URL = 'https://www.acog.org/womens-health/faqs/hormone-therapy-for-menopause';
const NHS_POSTMENOPAUSAL_BLEEDING_URL = 'https://www.nhs.uk/symptoms/post-menopausal-bleeding/';

const TRACKABLE_SYMPTOMS = [
  { id: 'hot_flushes', label: 'Hot flushes', icon: 'sunny-outline' },
  { id: 'night_sweats', label: 'Night sweats', icon: 'moon-outline' },
  { id: 'sleep', label: 'Sleep difficulty', icon: 'bed-outline' },
  { id: 'mood', label: 'Mood or anxiety changes', icon: 'heart-outline' },
  { id: 'vaginal_discomfort', label: 'Vaginal discomfort or dryness', icon: 'water-outline' },
  { id: 'urinary', label: 'Urinary changes', icon: 'medical-outline' },
  { id: 'sexual_wellbeing', label: 'Sexual wellbeing', icon: 'people-outline' },
  { id: 'joint_muscle', label: 'Joint or muscle aches', icon: 'body-outline' },
];

const EDU_ARTICLES = [
  {
    id: '1',
    title: 'What happens after menopause?',
    category: 'General Health',
    readTime: '4 min read',
    summary: 'A simple overview of menopause and common changes people may notice afterward.',
    icon: 'leaf-outline',
    iconBg: '#FCE7E7',
    iconColor: '#DC2626',
    sourceLabel: 'National Institute on Aging',
    sourceUrl: NIA_MENOPAUSE_URL,
    content: `Menopause is generally identified after 12 months without a menstrual period when there is no other cause. Experiences after menopause vary: some symptoms ease, while others can continue or begin later. Keeping a symptom log can help you describe changes and their effect on daily life. Bring new, persistent, or worrying symptoms to a clinician rather than assuming they are caused by menopause.`,
  },
  {
    id: '2',
    title: 'Hormone therapy (HRT): What to know',
    category: 'Therapy & Care',
    readTime: '6 min read',
    summary: 'Questions to discuss with a clinician when considering hormone therapy.',
    icon: 'chatbubble-ellipses-outline',
    iconBg: '#E0F2FE',
    iconColor: '#0284C7',
    sourceLabel: 'American College of Obstetricians and Gynecologists',
    sourceUrl: ACOG_HORMONE_THERAPY_URL,
    content: `Menopausal hormone therapy can help some symptoms, but its benefits and risks depend on the person, the type of treatment, medical history, and timing. Options differ, and treatment is not right for everyone. If you are considering hormone therapy or already use it, discuss your symptoms, health history, alternatives, and follow-up plan with a qualified clinician. Do not start, stop, or change a prescribed treatment based on this overview.`,
  },
  {
    id: '3',
    title: 'Protecting your bone strength',
    category: 'Bone Health',
    readTime: '5 min read',
    summary: 'Learn about bone health and the role of clinician-guided screening.',
    icon: 'fitness-outline',
    iconBg: '#DCFCE7',
    iconColor: '#15803D',
    sourceLabel: 'National Institute on Aging',
    sourceUrl: NIA_MENOPAUSE_URL,
    content: `Bone health is one part of long-term health after menopause. Your personal risk depends on factors such as age, health history, medicines, and previous fractures. A clinician can advise whether bone-density screening is appropriate and discuss nutrition, activity, or treatment options for you. Avoid starting supplements or treatment solely on the basis of a general article.`,
  },
  {
    id: '4',
    title: 'Heart health after menopause',
    category: 'Cardiovascular',
    readTime: '5 min read',
    summary: 'Everyday topics and routine checks to discuss for cardiovascular health.',
    icon: 'heart-outline',
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    sourceLabel: 'National Institute on Aging',
    sourceUrl: NIA_MENOPAUSE_URL,
    content: `Heart health is influenced by many factors, including age, family history, blood pressure, cholesterol, smoking, activity, and other health conditions. Menopause alone cannot explain an individual person's heart risk. Keep routine appointments and ask a clinician which checks or changes are relevant to you. Seek urgent help for possible emergency symptoms such as chest pain or severe difficulty breathing.`,
  },
  {
    id: '5',
    title: 'Nutrition for everyday energy',
    category: 'Nutrition',
    readTime: '4 min read',
    summary: 'General nutrition topics to explore with your care team.',
    icon: 'nutrition-outline',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    sourceLabel: 'National Institute on Aging',
    sourceUrl: NIA_MENOPAUSE_URL,
    content: `There is no single menopause diet that fits everyone. A varied eating pattern can support general health, but specific nutrition needs depend on your health, preferences, access to food, and any medicines or conditions. If you have a restrictive diet, persistent appetite or weight changes, or questions about supplements, ask a qualified clinician or dietitian for individualized advice.`,
  },
  {
    id: '6',
    title: 'Gentle exercise for vitality',
    category: 'Fitness',
    readTime: '4 min read',
    summary: 'Movement ideas and questions to tailor to your health and abilities.',
    icon: 'walk-outline',
    iconBg: '#DCFCE7',
    iconColor: '#15803D',
    sourceLabel: 'National Institute on Aging',
    sourceUrl: NIA_MENOPAUSE_URL,
    content: `Movement can support general health, but the right type and amount depend on your current health, ability, and preferences. Start from a level that feels manageable and ask a clinician before changing activity if you have a health condition, pain, recent injury, or concerns about safety. A physiotherapist can help adapt movement to your needs.`,
  },
  {
    id: '7',
    title: 'Comfort, intimacy, and sexual wellness',
    category: 'Sexual Wellness',
    readTime: '5 min read',
    summary: 'Common intimate and urinary changes, and options to discuss with a clinician.',
    icon: 'heart-circle-outline',
    iconBg: '#FCE7F3',
    iconColor: '#DB2777',
    sourceLabel: 'American College of Obstetricians and Gynecologists',
    sourceUrl: ACOG_HORMONE_THERAPY_URL,
    content: `Vaginal or urinary discomfort and changes in sexual wellbeing can happen after menopause, but they can also have other causes. You do not need to ignore symptoms that affect comfort or daily life. A clinician can discuss possible causes and suitable options; what is safe or appropriate depends on your health history.`,
  },
  {
    id: '8',
    title: 'Pelvic floor exercises (Kegels)',
    category: 'Pelvic Health',
    readTime: '3 min read',
    summary: 'An introduction to pelvic floor health and when to ask for professional guidance.',
    icon: 'body-outline',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
    content: `Pelvic floor concerns can include leakage, pressure, or discomfort. Pelvic floor exercises help some people, but the right approach depends on the symptoms and how the muscles are working. If exercises cause pain or do not help, stop and ask a clinician or pelvic health physiotherapist for guidance.`,
  },
  {
    id: '9',
    title: 'Healthy sleep habits and restful nights',
    category: 'Sleep & Mood',
    readTime: '4 min read',
    summary: 'Sleep changes can have many causes; learn what may help and when to seek care.',
    icon: 'moon-outline',
    iconBg: '#E0E7FF',
    iconColor: '#4F46E5',
    sourceLabel: 'National Institute on Aging',
    sourceUrl: NIA_MENOPAUSE_URL,
    content: `Sleep can be affected by symptoms, stress, medicines, health conditions, and other factors. A short log of sleep and related symptoms may help you spot patterns to discuss with a clinician. If sleep problems persist or affect daily functioning, seek advice rather than relying on sleep tips alone.`,
  },
];

export default function PostmenopauseScreen({
  onSwitchToCycleMode,
  onBookDoctor,
  onOpenDoctorPage,
  greetingDisplayName = '',
  healthProfile = {},
  onOpenSetupWizard,
}) {
  const { isDarkMode, theme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'symptoms' | 'assessments' | 'lifestyle' | 'meds' | 'screenings' | 'learn'

  // Postmenopause Onboarding State
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  // Profile State
  const [profile, setProfile] = useState({});

  // Health Assessments State
  const [boneHealth, setBoneHealth] = useState({
    fracturePost50: null,
    familyOsteoporosis: null,
    smoker: null,
    alcoholRegular: null,
    exerciseFreq: null,
    supplements: null,
  });

  const [heartHealth, setHeartHealth] = useState({
    bloodPressure: null,
    diabetes: null,
    cholesterol: null,
    smokingStatus: null,
    physicalActivity: null,
    familyHeartDisease: null,
  });

  // Lifestyle Tracker State
  const [lifestyle, setLifestyle] = useState({
    waterGlasses: null,
    exerciseMins: null,
    sleepHours: null,
    weightKg: null,
    dietQuality: null,
    stressLevel: null,
  });

  // Medication & Supplement State
  const [medications, setMedications] = useState([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [newScreeningTitle, setNewScreeningTitle] = useState('');
  const [newScreeningDate, setNewScreeningDate] = useState('');
  const [newScreeningLastDate, setNewScreeningLastDate] = useState('');
  const [showAddScreeningModal, setShowAddScreeningModal] = useState(false);

  // Screening Reminders State
  const [screenings, setScreenings] = useState([]);
  const [symptomLogs, setSymptomLogs] = useState([]);
  const [symptomDraft, setSymptomDraft] = useState({});
  const [symptomNote, setSymptomNote] = useState('');

  // Educational Reader State
  const [selectedArticle, setSelectedArticle] = useState(null);

  const postmenopauseDetails = healthProfile?.postmenopauseDetails || {};
  const yearsSinceLastPeriod = profile.yearsSinceLastPeriod || postmenopauseDetails.yearsSinceLastPeriod;
  const hrtStatus = profile.onHRT || ({
    taking_hrt: 'Taking HRT',
    considering: 'Considering HRT',
    not_taking: 'Not taking HRT',
  }[postmenopauseDetails.hrtStatus] || '');
  const yearsSinceLastPeriodLabel = ({
    '1_2_years': '1–2 years since last period',
    '2_5_years': '2–5 years since last period',
    '5_plus_years': '5+ years since last period',
    surgical: 'Surgical menopause',
  }[yearsSinceLastPeriod] || '');
  const priorityLabels = (postmenopauseDetails.priorities || []).map((priority) => ({
    bone_density: 'Bone health',
    cardio: 'Heart health',
    pelvic: 'Pelvic health',
    metabolism: 'Metabolism',
    energy: 'Energy',
    mental_health: 'Mood and wellbeing',
  }[priority] || priority));
  const hasPersonalDetails = Boolean(
    yearsSinceLastPeriodLabel || hrtStatus || profile.currentAge || profile.menopauseType || priorityLabels.length
  );

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
      if (data.symptomLogs) setSymptomLogs(data.symptomLogs);
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
      symptomLogs,
      hasCompletedOnboarding,
      ...updatedFields,
    };
    await savePostmenopauseDataSafe(payload);
  };

  const handleSaveSymptomCheckIn = () => {
    const symptoms = Object.entries(symptomDraft)
      .filter(([, severity]) => severity)
      .map(([id, severity]) => ({ id, severity }));
    if (!symptoms.length && !symptomNote.trim()) {
      Alert.alert('Add something to your check-in', 'Choose a symptom or add a note before saving.');
      return;
    }
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const entry = { id: Date.now().toString(), date, symptoms, ...(symptomNote.trim() ? { note: symptomNote.trim() } : {}) };
    const updated = [entry, ...symptomLogs];
    setSymptomLogs(updated);
    setSymptomDraft({});
    setSymptomNote('');
    persistData({ symptomLogs: updated });
  };

  // Add Medication Handler
  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    const newMed = {
      id: Date.now().toString(),
      name: newMedName,
      dose: newMedDose.trim(),
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

  const handleAddScreening = () => {
    const title = newScreeningTitle.trim();
    const nextDue = newScreeningDate.trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!title || !datePattern.test(nextDue) || Number.isNaN(Date.parse(nextDue))) {
      Alert.alert('Add screening details', 'Enter a screening name and next due date in YYYY-MM-DD format.');
      return;
    }
    const lastDate = newScreeningLastDate.trim();
    if (lastDate && (!datePattern.test(lastDate) || Number.isNaN(Date.parse(lastDate)))) {
      Alert.alert('Check the last date', 'Use YYYY-MM-DD format, or leave the last date blank.');
      return;
    }
    const screening = {
      id: Date.now().toString(),
      title,
      nextDue,
      ...(lastDate ? { lastDate } : {}),
      status: new Date(`${nextDue}T23:59:59`) < new Date() ? 'Due' : 'Upcoming',
    };
    const updated = [...screenings, screening];
    setScreenings(updated);
    setNewScreeningTitle('');
    setNewScreeningDate('');
    setNewScreeningLastDate('');
    setShowAddScreeningModal(false);
    persistData({ screenings: updated });
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
      const currentAge = Number(profile.currentAge);
      const menopauseAge = Number(profile.menopauseAge);
      if (!Number.isInteger(currentAge) || currentAge < 18 || currentAge > 100
        || !Number.isInteger(menopauseAge) || menopauseAge < 18 || menopauseAge > currentAge) {
        Alert.alert('Check your ages', 'Enter a valid current age and the age your periods stopped.');
        return;
      }
      const savedProfile = { ...profile, currentAge, menopauseAge };
      setProfile(savedProfile);
      setHasCompletedOnboarding(true);
      setShowOnboardingWizard(false);
      persistData({ hasCompletedOnboarding: true, profile: savedProfile });
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
      <ScrollView contentContainerStyle={{ paddingBottom: 48, paddingTop: 24, paddingHorizontal: 16, backgroundColor: '#FFFFFF', flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
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
          <View className="flex-1 flex-row items-center gap-1.5 mx-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                className={`flex-1 h-1.5 rounded-full ${i <= onboardingStep ? 'bg-red-600' : 'bg-gray-200'
                  }`}
              />
            ))}
          </View>

          <Text className="text-xs font-bold text-gray-500">Step {onboardingStep} of 5</Text>
        </View>

        <View className="flex-1">
          {onboardingStep === 1 && (
            <View className="items-center py-4">
              <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
                <Ionicons name="person-outline" size={32} color="#DC2626" />
              </View>
              <Text className="text-xl font-extrabold text-gray-900 text-center mb-2 px-2">How old are you?</Text>
              <Text className="text-sm font-medium text-gray-500 text-center mb-6 px-4 leading-5">
                Knowing your current age helps calibrate bone density, cardiovascular risk factors, and health recommendations.
              </Text>

              <TextInput
                value={profile.currentAge == null ? '' : String(profile.currentAge)}
                onChangeText={(value) => setProfile({ ...profile, currentAge: value.replace(/\D/g, '') })}
                keyboardType="number-pad"
                placeholder="Age in years"
                placeholderTextColor={theme.textMuted}
                style={{ width: '100%', maxWidth: 280, color: theme.textPrimary, backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, textAlign: 'center', fontSize: 17, fontWeight: '700' }}
              />
            </View>
          )}

          {onboardingStep === 2 && (
            <View className="items-center py-4">
              <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
                <Ionicons name="calendar-outline" size={32} color="#DC2626" />
              </View>
              <Text className="text-xl font-extrabold text-gray-900 text-center mb-2 px-2">At what age did your periods stop completely?</Text>
              <Text className="text-sm font-medium text-gray-500 text-center mb-6 px-4 leading-5">
                The age when periods stop marks the clinical start of your postmenopausal transition.
              </Text>

              <TextInput
                value={profile.menopauseAge == null ? '' : String(profile.menopauseAge)}
                onChangeText={(value) => setProfile({ ...profile, menopauseAge: value.replace(/\D/g, '') })}
                keyboardType="number-pad"
                placeholder="Age in years"
                placeholderTextColor={theme.textMuted}
                style={{ width: '100%', maxWidth: 280, color: theme.textPrimary, backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, textAlign: 'center', fontSize: 17, fontWeight: '700' }}
              />
            </View>
          )}

          {onboardingStep === 3 && (
            <View className="items-center py-4">
              <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
                <Ionicons name="checkmark-circle-outline" size={32} color="#DC2626" />
              </View>
              <Text className="text-xl font-extrabold text-gray-900 text-center mb-2 px-2">Gone 12 consecutive months without a period?</Text>
              <Text className="text-sm font-medium text-gray-500 text-center mb-6 px-4 leading-5">
                Clinical menopause is officially confirmed after 12 full consecutive months without bleeding.
              </Text>

              <View className="w-full gap-3 px-2">
                {[true, false].map((val) => (
                  <TouchableOpacity
                    key={String(val)}
                    activeOpacity={0.8}
                    className={`flex-row items-center p-4 rounded-2xl border ${profile.twelveMonthsPeriodFree === val ? 'border-red-600 bg-red-50/40' : 'border-gray-200 bg-white'
                      } gap-3.5`}
                    onPress={() => setProfile({ ...profile, twelveMonthsPeriodFree: val })}
                  >
                    <Ionicons
                      name={profile.twelveMonthsPeriodFree === val ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={profile.twelveMonthsPeriodFree === val ? '#DC2626' : colors.textMuted}
                    />
                    <Text
                      className={`text-base flex-1 ${profile.twelveMonthsPeriodFree === val ? 'text-red-600 font-bold' : 'font-semibold text-gray-700'
                        }`}
                    >
                      {val ? 'Yes (12+ Months Confirmed)' : 'No (Currently Transitioning)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {onboardingStep === 4 && (
            <View className="items-center py-4">
              <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
                <Ionicons name="medical-outline" size={32} color="#DC2626" />
              </View>
              <Text className="text-xl font-extrabold text-gray-900 text-center mb-2 px-2">Did menopause occur naturally or after surgery?</Text>
              <Text className="text-sm font-medium text-gray-500 text-center mb-6 px-4 leading-5">
                Surgical menopause (removal of ovaries) often induces rapid hormonal shifts.
              </Text>

              <View className="w-full gap-3 px-2">
                {['Natural', 'Surgical', 'Medical'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.8}
                    className={`flex-row items-center p-4 rounded-2xl border ${profile.menopauseType === type ? 'border-red-600 bg-red-50/40' : 'border-gray-200 bg-white'
                      } gap-3.5`}
                    onPress={() => setProfile({ ...profile, menopauseType: type })}
                  >
                    <Ionicons
                      name={profile.menopauseType === type ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={profile.menopauseType === type ? '#DC2626' : colors.textMuted}
                    />
                    <Text
                      className={`text-base flex-1 ${profile.menopauseType === type ? 'text-red-600 font-bold' : 'font-semibold text-gray-700'
                        }`}
                    >
                      {type} Menopause
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {onboardingStep === 5 && (
            <View className="items-center py-4">
              <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
                <Ionicons name="shield-checkmark-outline" size={32} color="#DC2626" />
              </View>
              <Text className="text-xl font-extrabold text-gray-900 text-center mb-2 px-2">Are you taking Hormone Replacement Therapy (HRT)?</Text>
              <Text className="text-sm font-medium text-gray-500 text-center mb-6 px-4 leading-5">
                Your HRT status customizes symptom management guidance and supplement tracking.
              </Text>

              <View className="w-full gap-3 px-2">
                {['Yes', 'No', 'Previously'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    activeOpacity={0.8}
                    className={`flex-row items-center p-4 rounded-2xl border ${profile.onHRT === status ? 'border-red-600 bg-red-50/40' : 'border-gray-200 bg-white'
                      } gap-3.5`}
                    onPress={() => setProfile({ ...profile, onHRT: status })}
                  >
                    <Ionicons
                      name={profile.onHRT === status ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={profile.onHRT === status ? '#DC2626' : colors.textMuted}
                    />
                    <Text
                      className={`text-base flex-1 ${profile.onHRT === status ? 'text-red-600 font-bold' : 'font-semibold text-gray-700'
                        }`}
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
        <View className="flex-row items-center gap-3 mt-8 pt-4 border-t border-gray-100">
          {onboardingStep > 1 && (
            <TouchableOpacity
              activeOpacity={0.7}
              className="px-6 py-4 rounded-2xl bg-gray-100 items-center justify-center"
              onPress={() => setOnboardingStep(onboardingStep - 1)}
            >
              <Text className="text-base font-bold text-gray-700">Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            className="flex-1 py-4 rounded-2xl bg-red-600 items-center justify-center shadow-md"
            onPress={handleOnboardingNext}
          >
            <Text className="text-base font-bold text-white">
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
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 110, paddingTop: 6, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#D97706"
          colors={['#D97706', '#FA4A14']}
          progressBackgroundColor={theme.card}
        />
      }
    >
      {activeTab === 'dashboard' ? (
        <>
          {/* Education feature and topic cards, following the Cycle screen layout */}
          <View className="mx-4 mb-5">
            <TouchableOpacity
              activeOpacity={0.92}
              className="rounded-[28px] p-5 mb-5 overflow-hidden border"
              style={{
                minHeight: 190,
                backgroundColor: isDarkMode ? '#2B2334' : '#80658E',
                borderColor: isDarkMode ? '#44374F' : '#80658E',
              }}
              onPress={() => setSelectedArticle(EDU_ARTICLES[0])}
            >
              <View className="absolute right-4 top-5 w-24 h-24 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.13)' }}>
                <Ionicons name="flower-outline" size={58} color="rgba(255,255,255,0.88)" />
              </View>
              <View className="pr-24">
                <Text className="text-[21px] font-black leading-7 mb-3" style={{ color: '#FFFFFF' }}>Life after menopause</Text>
                <Text className="text-[13px] font-semibold leading-5 mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  Understand common changes and find questions to bring to your care team.
                </Text>
                <View className="self-start rounded-full px-4 py-2" style={{ backgroundColor: '#FFFFFF' }}>
                  <Text className="text-xs font-extrabold" style={{ color: '#1F2937' }}>Read insight</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-black" style={{ color: theme.textPrimary }}>Explore topics</Text>
              <TouchableOpacity onPress={() => setActiveTab('learn')}>
                <Text className="text-[13px] font-bold" style={{ color: '#DC2626' }}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
              {EDU_ARTICLES.slice(1).map((article) => (
                <TouchableOpacity
                  key={article.id}
                  activeOpacity={0.88}
                  style={{ width: 148, marginRight: 12 }}
                  onPress={() => setSelectedArticle(article)}
                >
                  <View
                    className="rounded-[22px] items-center justify-center border mb-2"
                    style={{
                      height: 126,
                      backgroundColor: isDarkMode ? theme.card : article.iconBg,
                      borderColor: theme.cardBorder,
                    }}
                  >
                    <Ionicons name={article.icon} size={42} color={isDarkMode ? '#F87171' : article.iconColor} />
                  </View>
                  <Text className="text-[10px] font-extrabold tracking-wider uppercase mb-1" style={{ color: isDarkMode ? '#F87171' : article.iconColor }} numberOfLines={1}>{article.category}</Text>
                  <Text className="text-sm font-extrabold leading-5" style={{ color: theme.textPrimary }} numberOfLines={2}>{article.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      ) : (
        <View className="px-4">
          <TouchableOpacity
            activeOpacity={0.75}
            className="flex-row items-center gap-2 py-3 mb-2"
            onPress={() => setActiveTab('dashboard')}
          >
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
            <Text className="text-sm font-bold" style={{ color: theme.textPrimary }}>Back to Overview</Text>
          </TouchableOpacity>

          {activeTab === 'symptoms' && (
            <View className="pb-6">
              <Text className="text-xl font-black mb-1" style={{ color: theme.textPrimary }}>Symptom check-in</Text>
              <Text className="text-sm leading-5 mb-4" style={{ color: theme.textSecondary }}>
                Record what you notice today. This is a personal log, not a diagnosis.
              </Text>
              <View className="rounded-3xl border p-4 mb-5" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                {TRACKABLE_SYMPTOMS.map((symptom, index) => (
                  <View key={symptom.id} className={`py-3 ${index < TRACKABLE_SYMPTOMS.length - 1 ? 'border-b' : ''}`} style={{ borderBottomColor: theme.cardBorder }}>
                    <View className="flex-row items-center mb-2.5">
                      <Ionicons name={symptom.icon} size={19} color="#DC2626" />
                      <Text className="text-sm font-bold ml-2" style={{ color: theme.textPrimary }}>{symptom.label}</Text>
                    </View>
                    <View className="flex-row gap-2">
                      {['Mild', 'Moderate', 'Severe'].map((severity) => {
                        const selected = symptomDraft[symptom.id] === severity;
                        return (
                          <TouchableOpacity
                            key={severity}
                            activeOpacity={0.75}
                            onPress={() => setSymptomDraft((current) => ({
                              ...current,
                              [symptom.id]: selected ? undefined : severity,
                            }))}
                            className="px-3 py-2 rounded-full border"
                            style={{
                              backgroundColor: selected ? (isDarkMode ? '#4A2024' : '#FEE2E2') : theme.inputBg,
                              borderColor: selected ? '#DC2626' : theme.inputBorder,
                            }}
                          >
                            <Text className="text-xs font-bold" style={{ color: selected ? '#DC2626' : theme.textSecondary }}>{severity}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
                <TextInput
                  multiline
                  value={symptomNote}
                  onChangeText={setSymptomNote}
                  placeholder="Optional note"
                  placeholderTextColor={theme.textMuted}
                  className="rounded-2xl border p-3 mt-4 text-sm min-h-[76px]"
                  style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary, textAlignVertical: 'top' }}
                />
                <TouchableOpacity activeOpacity={0.85} onPress={handleSaveSymptomCheckIn} className="rounded-2xl py-3.5 items-center mt-4" style={{ backgroundColor: '#DC2626' }}>
                  <Text className="text-sm font-extrabold text-white">Save check-in</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-lg font-black mb-3" style={{ color: theme.textPrimary }}>Recent check-ins</Text>
              {symptomLogs.slice(0, 10).map((entry) => (
                <View key={entry.id} className="rounded-2xl border p-4 mb-2.5" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                  <Text className="text-xs font-bold mb-2" style={{ color: theme.textMuted }}>{entry.date}</Text>
                  {entry.symptoms?.length ? (
                    <Text className="text-sm leading-5" style={{ color: theme.textPrimary }}>
                      {entry.symptoms.map(({ id, severity }) => `${TRACKABLE_SYMPTOMS.find((item) => item.id === id)?.label || id} · ${severity}`).join('  |  ')}
                    </Text>
                  ) : null}
                  {entry.note ? <Text className="text-sm mt-2 leading-5" style={{ color: theme.textSecondary }}>{entry.note}</Text> : null}
                </View>
              ))}
              {symptomLogs.length === 0 ? (
                <Text className="text-sm" style={{ color: theme.textSecondary }}>Your saved check-ins will appear here.</Text>
              ) : null}
            </View>
          )}

          {/* 2. HEALTH SCORES & ASSESSMENTS */}
          {activeTab === 'assessments' && (
            <View className="gap-4 pb-6">
              <Text className="text-xl font-black mb-1" style={{ color: theme.textPrimary }}>Health check-in questions</Text>
              <Text className="text-sm leading-5 mb-2" style={{ color: theme.textSecondary }}>Use these prompts to organize information for a clinician. They do not provide a diagnosis or calculate your risk.</Text>

              {/* Bone Health Card */}
              <View className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm mb-3">
                <View className="flex-row items-center gap-2.5 mb-3">
                  <Ionicons name="fitness" size={20} color="#0284C7" />
                  <Text className="text-base font-extrabold text-gray-900">Bone Health Assessment</Text>
                </View>

                <Text className="text-xs font-bold text-gray-600 mt-3 mb-2">Fracture after age 50?</Text>
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {[true, false].map((val) => (
                    <TouchableOpacity
                      key={String(val)}
                      activeOpacity={0.7}
                      className={`px-3.5 py-2 rounded-xl border ${boneHealth.fracturePost50 === val ? 'bg-red-50 border-red-600' : 'bg-gray-50 border-gray-200'
                        }`}
                      onPress={() => {
                        const updated = { ...boneHealth, fracturePost50: val };
                        setBoneHealth(updated);
                        persistData({ boneHealth: updated });
                      }}
                    >
                      <Text className={`text-xs font-semibold ${boneHealth.fracturePost50 === val ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {val ? 'Yes' : 'No'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-xs font-bold text-gray-600 mt-3 mb-2">Family history of osteoporosis?</Text>
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {[true, false].map((val) => (
                    <TouchableOpacity
                      key={String(val)}
                      activeOpacity={0.7}
                      className={`px-3.5 py-2 rounded-xl border ${boneHealth.familyOsteoporosis === val ? 'bg-red-50 border-red-600' : 'bg-gray-50 border-gray-200'
                        }`}
                      onPress={() => {
                        const updated = { ...boneHealth, familyOsteoporosis: val };
                        setBoneHealth(updated);
                        persistData({ boneHealth: updated });
                      }}
                    >
                      <Text className={`text-xs font-semibold ${boneHealth.familyOsteoporosis === val ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {val ? 'Yes' : 'No'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-xs font-bold text-gray-600 mt-3 mb-2">Calcium & Vitamin D intake?</Text>
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {['Yes, both', 'Calcium only', 'Vitamin D only', 'Neither'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.7}
                      className={`px-3.5 py-2 rounded-xl border ${boneHealth.supplements === opt ? 'bg-red-50 border-red-600' : 'bg-gray-50 border-gray-200'
                        }`}
                      onPress={() => {
                        const updated = { ...boneHealth, supplements: opt };
                        setBoneHealth(updated);
                        persistData({ boneHealth: updated });
                      }}
                    >
                      <Text className={`text-xs font-semibold ${boneHealth.supplements === opt ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Heart Health Card */}
              <View className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm mb-3">
                <View className="flex-row items-center gap-2.5 mb-3">
                  <Ionicons name="heart" size={20} color="#DC2626" />
                  <Text className="text-base font-extrabold text-gray-900">Heart Health Profile</Text>
                </View>

                <Text className="text-xs font-bold text-gray-600 mt-3 mb-2">Blood Pressure</Text>
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {['Normal (<120/80)', 'Elevated', 'High Stage 1', 'Unsure'].map((bp) => (
                    <TouchableOpacity
                      key={bp}
                      activeOpacity={0.7}
                      className={`px-3.5 py-2 rounded-xl border ${heartHealth.bloodPressure === bp ? 'bg-red-50 border-red-600' : 'bg-gray-50 border-gray-200'
                        }`}
                      onPress={() => {
                        const updated = { ...heartHealth, bloodPressure: bp };
                        setHeartHealth(updated);
                        persistData({ heartHealth: updated });
                      }}
                    >
                      <Text className={`text-xs font-semibold ${heartHealth.bloodPressure === bp ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {bp}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-xs font-bold text-gray-600 mt-3 mb-2">Smoking Status</Text>
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {['Non-smoker', 'Former smoker', 'Current smoker'].map((sm) => (
                    <TouchableOpacity
                      key={sm}
                      activeOpacity={0.7}
                      className={`px-3.5 py-2 rounded-xl border ${heartHealth.smokingStatus === sm ? 'bg-red-50 border-red-600' : 'bg-gray-50 border-gray-200'
                        }`}
                      onPress={() => {
                        const updated = { ...heartHealth, smokingStatus: sm };
                        setHeartHealth(updated);
                        persistData({ heartHealth: updated });
                      }}
                    >
                      <Text className={`text-xs font-semibold ${heartHealth.smokingStatus === sm ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
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
            <View className="gap-4 pb-6">
              <Text className="text-xl font-black text-gray-900 mb-1">Daily Lifestyle Tracker</Text>

              <View className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm mb-3">
                <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                  <Ionicons name="water" size={22} color="#0284C7" />
                  <Text className="text-sm font-bold text-gray-900 flex-1 ml-3">Water Intake</Text>
                  <View className="flex-row items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      className="w-7 h-7 rounded-lg bg-white items-center justify-center shadow-xs"
                      onPress={() => {
                        const val = Math.max(0, (Number(lifestyle.waterGlasses) || 0) - 1);
                        const updated = { ...lifestyle, waterGlasses: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text className="text-xs font-extrabold text-gray-900 px-1">{lifestyle.waterGlasses == null ? 'Not logged' : `${lifestyle.waterGlasses} glasses`}</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      className="w-7 h-7 rounded-lg bg-white items-center justify-center shadow-xs"
                      onPress={() => {
                        const val = (Number(lifestyle.waterGlasses) || 0) + 1;
                        const updated = { ...lifestyle, waterGlasses: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                  <Ionicons name="walk" size={22} color="#15803D" />
                  <Text className="text-sm font-bold text-gray-900 flex-1 ml-3">Exercise</Text>
                  <View className="flex-row items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      className="w-7 h-7 rounded-lg bg-white items-center justify-center shadow-xs"
                      onPress={() => {
                        const val = Math.max(0, (Number(lifestyle.exerciseMins) || 0) - 10);
                        const updated = { ...lifestyle, exerciseMins: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text className="text-xs font-extrabold text-gray-900 px-1">{lifestyle.exerciseMins == null ? 'Not logged' : `${lifestyle.exerciseMins} mins`}</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      className="w-7 h-7 rounded-lg bg-white items-center justify-center shadow-xs"
                      onPress={() => {
                        const val = (Number(lifestyle.exerciseMins) || 0) + 10;
                        const updated = { ...lifestyle, exerciseMins: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                  <Ionicons name="moon" size={22} color="#DC2626" />
                  <Text className="text-sm font-bold text-gray-900 flex-1 ml-3">Sleep Duration</Text>
                  <View className="flex-row items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      className="w-7 h-7 rounded-lg bg-white items-center justify-center shadow-xs"
                      onPress={() => {
                        const val = Math.max(0, (Number(lifestyle.sleepHours) || 0) - 0.5);
                        const updated = { ...lifestyle, sleepHours: val };
                        setLifestyle(updated);
                        persistData({ lifestyle: updated });
                      }}
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text className="text-xs font-extrabold text-gray-900 px-1">{lifestyle.sleepHours == null ? 'Not logged' : `${lifestyle.sleepHours} hrs`}</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      className="w-7 h-7 rounded-lg bg-white items-center justify-center shadow-xs"
                      onPress={() => {
                        const val = (Number(lifestyle.sleepHours) || 0) + 0.5;
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
            <View className="gap-4 pb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-black text-gray-900 mb-1">Meds & Supplements</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-row items-center gap-1 bg-red-600 px-3.5 py-1.5 rounded-full"
                  onPress={() => setShowAddMedModal(true)}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white">Add</Text>
                </TouchableOpacity>
              </View>

              {medications.map((med) => (
                <View key={med.id} className="flex-row items-center p-4 rounded-2xl border mb-2.5" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
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

                  <View className="flex-1 ml-3">
                    <Text className={`text-sm font-bold ${med.takenToday ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {med.name} {med.isHRT ? '(HRT)' : ''}
                    </Text>
                    {!!med.dose && <Text className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>{med.dose}</Text>}
                  </View>
                </View>
              ))}
              {medications.length === 0 && (
                <View className="rounded-2xl border p-5" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                  <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>No medications added</Text>
                  <Text className="text-xs mt-1.5 leading-5" style={{ color: theme.textSecondary }}>Add medications or supplements you want to keep track of.</Text>
                </View>
              )}
            </View>
          )}

          {/* 6. REMINDERS */}
          {activeTab === 'screenings' && (
            <View className="gap-4 pb-6">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xl font-black" style={{ color: theme.textPrimary }}>Screening Reminders</Text>
                <TouchableOpacity onPress={() => setShowAddScreeningModal(true)} className="flex-row items-center gap-1 bg-red-600 px-3.5 py-1.5 rounded-full">
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white">Add</Text>
                </TouchableOpacity>
              </View>
              <Text className="text-xs font-medium text-gray-500 mb-2">Preventive health checks for postmenopausal care.</Text>

              {screenings.map((sc) => (
                <View key={sc.id} className="rounded-3xl p-5 border mb-3" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                  <View className="flex-row items-center gap-2.5 mb-3">
                    <Ionicons name="calendar-outline" size={20} color="#DC2626" />
                    <Text className="text-base font-extrabold text-gray-900">{sc.title}</Text>
                  </View>
                  {!!sc.lastDate && <Text className="text-xs mb-1" style={{ color: theme.textSecondary }}>Last performed: {sc.lastDate}</Text>}
                  {!!sc.nextDue && <Text className="text-xs mb-1" style={{ color: theme.textSecondary }}>Next due date: {sc.nextDue}</Text>}

                  <View className="flex-row mt-2">
                    <Text className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${sc.status === 'Up to date' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      {sc.status}
                    </Text>
                  </View>
                </View>
              ))}
              {screenings.length === 0 && (
                <View className="rounded-2xl border p-5" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                  <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>No reminders added</Text>
                  <Text className="text-xs mt-1.5 leading-5" style={{ color: theme.textSecondary }}>Add the screening names and dates you want to keep track of. Your clinician can help you decide what is appropriate for you.</Text>
                </View>
              )}
            </View>
          )}

          {/* 7. LIBRARY */}
          {activeTab === 'learn' && (
            <View className="gap-3 pb-6">
              <Text className="text-xl font-black mb-1" style={{ color: theme.textPrimary }}>Postmenopause insights</Text>
              <Text className="text-sm leading-5 mb-2" style={{ color: theme.textSecondary }}>General education to help you prepare questions for your care team.</Text>

              {EDU_ARTICLES.map((article) => (
                <TouchableOpacity
                  key={article.id}
                  activeOpacity={0.88}
                  className="rounded-3xl border p-4 mb-1"
                  style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
                  onPress={() => setSelectedArticle(article)}
                >
                  <View className="flex-row items-center">
                    <View className="w-[58px] h-[58px] rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: isDarkMode ? '#3A2529' : article.iconBg }}>
                      <Ionicons name={article.icon} size={28} color={isDarkMode ? '#F87171' : article.iconColor} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-extrabold uppercase tracking-wider mb-1" style={{ color: isDarkMode ? '#F87171' : article.iconColor }}>{article.category} · {article.readTime}</Text>
                      <Text className="text-sm font-extrabold mb-1" style={{ color: theme.textPrimary }}>{article.title}</Text>
                      <Text className="text-xs leading-4" style={{ color: theme.textSecondary }} numberOfLines={2}>{article.summary}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
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
        <View className="flex-1" style={{ backgroundColor: theme.background }}>
          <View
            className="flex-row items-center justify-between px-4 pt-12 pb-3 border-b"
            style={{ borderBottomColor: theme.cardBorder }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: isDarkMode ? '#2B2B2B' : '#F3F4F6' }}
              onPress={() => setSelectedArticle(null)}
            >
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text className="text-xs font-extrabold text-red-600 uppercase">{selectedArticle?.category}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, backgroundColor: theme.background }}>
            <Text className="text-2xl font-black mb-2 leading-7" style={{ color: theme.textPrimary }}>{selectedArticle?.title}</Text>
            <Text className="text-xs font-semibold mb-4" style={{ color: theme.textMuted }}>{selectedArticle?.readTime}</Text>
            <Text className="text-base font-normal leading-6" style={{ color: isDarkMode ? '#D1D5DB' : '#374151' }}>{selectedArticle?.content}</Text>
            {selectedArticle?.sourceUrl ? (
              <TouchableOpacity
                activeOpacity={0.8}
                className="mt-6 pt-4 border-t"
                style={{ borderTopColor: theme.cardBorder }}
                onPress={() => Linking.openURL(selectedArticle.sourceUrl)}
              >
                <Text className="text-xs font-bold" style={{ color: '#DC2626' }}>Further reading: {selectedArticle.sourceLabel}</Text>
              </TouchableOpacity>
            ) : null}
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
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View
            className="w-full rounded-3xl p-6 shadow-xl border"
            style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          >
            <Text className="text-lg font-black mb-4" style={{ color: theme.textPrimary }}>Add Medication</Text>
            <TextInput
              className="rounded-xl px-4 py-3 text-sm mb-3 border"
              style={{
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.textPrimary,
              }}
              placeholder="Name (e.g. Calcium, HRT patch)"
              placeholderTextColor={theme.textMuted}
              value={newMedName}
              onChangeText={setNewMedName}
            />
            <TextInput
              className="rounded-xl px-4 py-3 text-sm mb-3 border"
              style={{
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.textPrimary,
              }}
              placeholder="Dose (e.g. 1200mg)"
              placeholderTextColor={theme.textMuted}
              value={newMedDose}
              onChangeText={setNewMedDose}
            />

            <View className="flex-row justify-end gap-3 mt-2">
              <TouchableOpacity
                activeOpacity={0.7}
                className="py-2.5 px-4"
                onPress={() => setShowAddMedModal(false)}
              >
                <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                className="bg-red-600 py-2.5 px-5 rounded-xl"
                onPress={handleAddMedication}
              >
                <Text className="text-sm font-bold text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddScreeningModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddScreeningModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View className="w-full rounded-3xl p-6 border" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
            <Text className="text-lg font-black mb-1" style={{ color: theme.textPrimary }}>Add a reminder</Text>
            <Text className="text-xs leading-5 mb-4" style={{ color: theme.textSecondary }}>Enter details from your clinician or appointment. Red Apple won’t choose a screening schedule for you.</Text>
            <TextInput
              className="rounded-xl px-4 py-3 text-sm mb-3 border"
              style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }}
              placeholder="Screening name"
              placeholderTextColor={theme.textMuted}
              value={newScreeningTitle}
              onChangeText={setNewScreeningTitle}
            />
            <TextInput
              className="rounded-xl px-4 py-3 text-sm mb-3 border"
              style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }}
              placeholder="Next due date (YYYY-MM-DD)"
              placeholderTextColor={theme.textMuted}
              value={newScreeningDate}
              onChangeText={setNewScreeningDate}
            />
            <TextInput
              className="rounded-xl px-4 py-3 text-sm mb-3 border"
              style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }}
              placeholder="Last completed (optional, YYYY-MM-DD)"
              placeholderTextColor={theme.textMuted}
              value={newScreeningLastDate}
              onChangeText={setNewScreeningLastDate}
            />
            <View className="flex-row justify-end gap-3 mt-2">
              <TouchableOpacity activeOpacity={0.7} className="py-2.5 px-4" onPress={() => setShowAddScreeningModal(false)}>
                <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} className="bg-red-600 py-2.5 px-5 rounded-xl" onPress={handleAddScreening}>
                <Text className="text-sm font-bold text-white">Save reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
