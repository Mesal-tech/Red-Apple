import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { saveActiveHealthModeSafe, saveHealthProfileSafe } from '../utils/storage';
import ProfileSettingsSection from './ProfileSettingsSection';
import cycleService from '../services/cycleService';
import streakService from '../services/streakService';
import StreakModal from '../components/StreakModal';
import ProfileHealthChart from '../components/ProfileHealthChart';
import AppBottomSheet from '../components/AppBottomSheet';

const HEALTH_STAGES = [
  { id: 'cycle', title: 'Cycle health', cardTitle: 'Track my cycle', subtitle: 'Period & Fertile Days', icon: 'water-outline' },
  { id: 'pregnancy', title: 'Pregnancy', cardTitle: 'Track pregnancy', subtitle: 'Expecting Mother', icon: 'heart-outline' },
  { id: 'perimenopause', title: 'Perimenopause', cardTitle: 'Menopause transition', subtitle: 'Cycle shifts in your 40s+', icon: 'leaf-outline' },
  { id: 'postmenopause', title: 'Postmenopause', cardTitle: 'Life after menopause', subtitle: 'Long-term health & vitality', icon: 'shield-checkmark-outline' },
  { id: 'ttc', title: 'Trying to conceive', cardTitle: 'Trying for a baby', subtitle: 'Fertile window alerts & conception planning', icon: 'sparkles-outline', fullWidth: true },
];

function initialsFor(name = '') {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'RA';
}

export default function ProfileOverviewScreen({ navigation, onClose, onSignOut, onActiveModeChange, currentMode, wideLayout = false }) {
  const { user, updateProfile } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const profile = user?.health_profile || {};
  const stage = profile.stage || (user?.pregnancy_mode ? 'pregnancy' : currentMode);
  const stageInfo = HEALTH_STAGES.find((item) => item.id === stage);
  const handleBack = onClose || (() => navigation?.goBack?.());
  const [showAccountEditor, setShowAccountEditor] = useState(false);
  const [showHealthEditor, setShowHealthEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [healthSetupStep, setHealthSetupStep] = useState(1);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedStage, setSelectedStage] = useState(stage || 'cycle');
  const [cycleLength, setCycleLength] = useState(profile.cycleLength ? String(profile.cycleLength) : '');
  const [periodDuration, setPeriodDuration] = useState(profile.periodDuration ? String(profile.periodDuration) : '');
  const [lastPeriodDate, setLastPeriodDate] = useState(profile.lastPeriodDate || '');
  const [pregnancyCalcMethod, setPregnancyCalcMethod] = useState(profile.pregnancyDetails?.calculationMethod || 'lmp');
  const [pregnancyReferenceDate, setPregnancyReferenceDate] = useState(profile.pregnancyDetails?.referenceDate || '');
  const [isFirstBaby, setIsFirstBaby] = useState(profile.pregnancyDetails?.isFirstBaby ?? true);
  const [multipleType, setMultipleType] = useState(profile.pregnancyDetails?.multipleType || 'single');
  const [periCyclePattern, setPeriCyclePattern] = useState(profile.perimenopauseDetails?.cyclePattern || 'irregular');
  const [periSymptoms, setPeriSymptoms] = useState(Array.isArray(profile.perimenopauseDetails?.symptoms) ? profile.perimenopauseDetails.symptoms : []);
  const [periOnsetTimeline, setPeriOnsetTimeline] = useState(profile.perimenopauseDetails?.onsetTimeline || '1_2_years');
  const [postYearsSincePeriod, setPostYearsSincePeriod] = useState(profile.postmenopauseDetails?.yearsSinceLastPeriod || '2_5_years');
  const [postPriorities, setPostPriorities] = useState(Array.isArray(profile.postmenopauseDetails?.priorities) ? profile.postmenopauseDetails.priorities : []);
  const [hrtStatus, setHrtStatus] = useState(profile.postmenopauseDetails?.hrtStatus || 'considering');
  const [activeProfileTab, setActiveProfileTab] = useState('progress');
  const [cycleLogs, setCycleLogs] = useState([]);
  const [streakData, setStreakData] = useState({ appStreak: 0, longestAppStreak: 0, weeklyDays: [] });
  const [showStreakDetails, setShowStreakDetails] = useState(false);

  const accountInitials = useMemo(() => initialsFor(user?.name), [user?.name]);
  const avatarUrl = user?.avatar_url || user?.photo_url || user?.profile_image_url || user?.profile_picture_url || user?.profile_picture;
  const cycleLengthValue = Number(profile.cycleLength) || 28;
  const periodDurationValue = Number(profile.periodDuration) || 5;
  const premiumCardBackground = isDarkMode ? '#151515' : theme.card;
  const premiumCardBorder = isDarkMode ? '#252525' : theme.cardBorder;
  const premiumDivider = isDarkMode ? '#303030' : theme.divider;
  const profileTabs = [
    { id: 'progress', label: 'Progress', icon: 'stats-chart' },
    { id: 'activity', label: 'Activity', icon: 'pulse-outline' },
    { id: 'more', label: 'More', icon: 'menu-outline' },
  ];
  const recentLogs = [...cycleLogs].sort((a, b) => new Date(b.date || b.logged_at) - new Date(a.date || a.logged_at)).slice(0, 6);
  const monthCalendar = (() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOffset = (monthStart.getDay() + 6) % 7;
    const count = Math.ceil((startOffset + new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) / 7) * 7;
    const activeDates = new Set(streakData.activeDates || []);
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), index - startOffset + 1);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { dateStr, inMonth: date.getMonth() === now.getMonth(), completed: activeDates.has(dateStr), today: dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` };
    });
  })();

  useEffect(() => {
    let mounted = true;
    cycleService.getCycleHistory()
      .then((history) => { if (mounted) setCycleLogs(Array.isArray(history?.logs) ? history.logs : []); })
      .catch(() => {});
    streakService.getStreakData()
      .then((data) => { if (mounted && data) setStreakData(data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleShareProfile = async () => {
    try {
      await Share.share({
        title: `${user?.name || 'Red Apple'} profile`,
        message: `I’m tracking my health journey with Red Apple${user?.name ? ` — ${user.name}` : ''}.`,
      });
    } catch (error) {
      Alert.alert('Could not share profile', error?.message || 'Please try again.');
    }
  };
  const openHealthEditor = () => {
    setSelectedStage(stage || 'cycle');
    setHealthSetupStep(1);
    setCycleLength(profile.cycleLength ? String(profile.cycleLength) : '');
    setPeriodDuration(profile.periodDuration ? String(profile.periodDuration) : '');
    setLastPeriodDate(profile.lastPeriodDate || '');
    setPregnancyCalcMethod(profile.pregnancyDetails?.calculationMethod || 'lmp');
    setPregnancyReferenceDate(profile.pregnancyDetails?.referenceDate || '');
    setIsFirstBaby(profile.pregnancyDetails?.isFirstBaby ?? true);
    setMultipleType(profile.pregnancyDetails?.multipleType || 'single');
    setPeriCyclePattern(profile.perimenopauseDetails?.cyclePattern || 'irregular');
    setPeriSymptoms(Array.isArray(profile.perimenopauseDetails?.symptoms) ? profile.perimenopauseDetails.symptoms : []);
    setPeriOnsetTimeline(profile.perimenopauseDetails?.onsetTimeline || '1_2_years');
    setPostYearsSincePeriod(profile.postmenopauseDetails?.yearsSinceLastPeriod || '2_5_years');
    setPostPriorities(Array.isArray(profile.postmenopauseDetails?.priorities) ? profile.postmenopauseDetails.priorities : []);
    setHrtStatus(profile.postmenopauseDetails?.hrtStatus || 'considering');
    setShowHealthEditor(true);
  };

  const totalHealthSetupSteps = selectedStage === 'cycle' || selectedStage === 'ttc' ? 2 : 3;
  const toggleHealthChoice = (setItems, value) => {
    setItems((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };
  const renderHealthOptions = (label, options, selectedValue, onSelect, multiSelect = false) => (
    <View style={{ marginTop: 18 }}>
      <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 10 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {options.map((option) => {
          const selected = multiSelect ? selectedValue.includes(option.value) : selectedValue === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onSelect(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={{ flexGrow: 1, flexBasis: '45%', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: selected ? (isDarkMode ? '#6B9D8C' : '#173D36') : theme.inputBorder, backgroundColor: selected ? (isDarkMode ? '#263C35' : '#EAF1EF') : theme.inputBg }}
            >
              <Text style={{ flex: 1, color: selected ? (isDarkMode ? '#C4DED5' : '#173D36') : theme.textPrimary, fontSize: 13, fontWeight: selected ? '700' : '500' }}>{option.label}</Text>
              {selected && <Ionicons name="checkmark-circle" size={17} color={isDarkMode ? '#A8D0C3' : '#173D36'} style={{ marginLeft: 6 }} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const saveAccount = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter the name you want to use on your account.');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      setShowAccountEditor(false);
    } catch (error) {
      Alert.alert('Could not save profile', error?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveHealthProfile = async () => {
    if (selectedStage === 'pregnancy') {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(pregnancyReferenceDate) || Number.isNaN(Date.parse(pregnancyReferenceDate))) {
        Alert.alert('Pregnancy date needed', 'Enter a valid date in YYYY-MM-DD format to personalize your pregnancy timeline.');
        return;
      }
    }
    const nextCycleLength = Number(cycleLength);
    const nextPeriodDuration = Number(periodDuration);
    if ((selectedStage === 'cycle' || selectedStage === 'ttc')
      && ((cycleLength && (nextCycleLength < 15 || nextCycleLength > 60))
        || (periodDuration && (nextPeriodDuration < 1 || nextPeriodDuration > 15)))) {
      Alert.alert('Check your cycle details', 'Cycle length must be 15–60 days and period length 1–15 days.');
      return;
    }
    const nextProfile = {
      ...profile,
      stage: selectedStage,
      ...(selectedStage === 'cycle' || selectedStage === 'ttc'
        ? {
          cycleLength: cycleLength ? nextCycleLength : null,
          periodDuration: periodDuration ? nextPeriodDuration : null,
          lastPeriodDate: lastPeriodDate || null,
        }
        : {}),
      ...(selectedStage === 'pregnancy' ? { pregnancyDetails: {
        calculationMethod: pregnancyCalcMethod,
        referenceDate: pregnancyReferenceDate || null,
        isFirstBaby,
        multipleType,
      } } : {}),
      ...(selectedStage === 'perimenopause' ? { perimenopauseDetails: {
        cyclePattern: periCyclePattern,
        symptoms: periSymptoms,
        onsetTimeline: periOnsetTimeline,
      } } : {}),
      ...(selectedStage === 'postmenopause' ? { postmenopauseDetails: {
        yearsSinceLastPeriod: postYearsSincePeriod,
        priorities: postPriorities,
        hrtStatus,
      } } : {}),
    };
    setIsSaving(true);
    try {
      await updateProfile({ pregnancy_mode: selectedStage === 'pregnancy', health_profile: nextProfile });
      await Promise.all([saveHealthProfileSafe(nextProfile), saveActiveHealthModeSafe(selectedStage)]);
      onActiveModeChange?.(selectedStage);
      setShowHealthEditor(false);
    } catch (error) {
      Alert.alert('Could not save health profile', error?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />
      <ScrollView contentContainerStyle={{ paddingHorizontal: wideLayout ? 28 : 20, paddingTop: 8, paddingBottom: wideLayout ? 28 : 0, width: '100%', maxWidth: wideLayout ? 1180 : undefined, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <TouchableOpacity onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={handleShareProfile} accessibilityRole="button" accessibilityLabel="Share profile" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="share-outline" size={19} color={theme.textPrimary} /></TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 16 }}>
          <View style={{ width: 82, height: 82, borderRadius: 41, backgroundColor: isDarkMode ? '#3A292A' : '#FCE9E7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: '#C83D38', fontSize: 26, fontWeight: '700' }}>{accountInitials}</Text>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: theme.textPrimary, fontSize: 25, fontWeight: '800' }}>{user?.name || 'Your profile'}</Text>
            <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 15, marginTop: 4 }}>{user?.email || stageInfo?.title || 'Health profile'}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 5 }}>{cycleLogs.length} health {cycleLogs.length === 1 ? 'entry' : 'entries'}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Edit profile', icon: 'create-outline', onPress: () => { setName(user?.name || ''); setPhone(user?.phone || ''); setShowAccountEditor(true); } },
            { label: 'Share profile', icon: 'share-outline', onPress: handleShareProfile },
          ].map((action) => <TouchableOpacity key={action.label} onPress={action.onPress} accessibilityRole="button" style={{ flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 24, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}><Ionicons name={action.icon} size={17} color={theme.textPrimary} /><Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700' }}>{action.label}</Text></TouchableOpacity>)}
        </View>

        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.divider, marginHorizontal: -20, paddingHorizontal: 8, marginBottom: 20 }}>
          {profileTabs.map((tab) => {
            const selected = activeProfileTab === tab.id;
            return <TouchableOpacity key={tab.id} onPress={() => setActiveProfileTab(tab.id)} accessibilityRole="tab" accessibilityState={{ selected }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 11, borderBottomWidth: 3, borderBottomColor: selected ? '#E84432' : 'transparent' }}>
              <Ionicons name={tab.icon} size={21} color={selected ? theme.textPrimary : theme.textMuted} />
              <Text style={{ color: selected ? theme.textPrimary : theme.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 4 }}>{tab.label}</Text>
            </TouchableOpacity>;
          })}
        </View>

        {activeProfileTab === 'progress' && <View style={{ gap: 10 }}>
          <ProfileHealthChart
            cycleLogs={cycleLogs}
            cycleLength={cycleLengthValue}
            periodDuration={periodDurationValue}
            theme={theme}
            isDarkMode={isDarkMode}
          />
          <View style={{ flexDirection: wideLayout ? 'row' : 'column', alignItems: 'stretch', gap: 12 }}>
            <TouchableOpacity onPress={openHealthEditor} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Manage tracking and care modes" style={{ flex: 1, backgroundColor: theme.card, borderRadius: 22, borderWidth: 1, borderColor: theme.cardBorder, padding: 16 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '800' }}>Tracking &amp; care</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? '#3A292A' : '#FFF1EF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><Ionicons name={stageInfo?.icon || 'heart-outline'} size={19} color="#D84440" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '700' }}>{stageInfo?.title || 'Care mode not set'}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>{(stage === 'cycle' || stage === 'ttc') ? `${profile.cycleLength || cycleLengthValue} day cycle · ${profile.periodDuration || periodDurationValue} day period` : stageInfo ? 'Personalized health guidance' : 'Choose what you want support with'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </View>
              <Text style={{ color: '#D84440', fontSize: 12, fontWeight: '700', marginLeft: 50, marginTop: 10 }}>Change mode or details</Text>
              <Text style={{ color: theme.textMuted, fontSize: 10, lineHeight: 14, marginTop: 8 }}>Cycle details are personal estimates and can be updated anytime.</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowStreakDetails(true)} activeOpacity={0.82} accessibilityRole="button" accessibilityLabel="View health check-in streak" style={{ flex: 1, padding: 16, borderRadius: 22, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '800' }}>Streak</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: theme.textSecondary, fontSize: 13 }}>This month</Text><Ionicons name="chevron-forward" size={17} color={theme.textMuted} /></View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                <View style={{ width: '38%', alignItems: 'center' }}>
                  <Ionicons name="flame" size={58} color="#D84440" />
                  <Text style={{ color: '#D84440', fontSize: 21, lineHeight: 24, fontWeight: '900' }}>{streakData.weeksInRow || 0}</Text>
                  <Text style={{ color: '#D84440', fontSize: 15, fontWeight: '800' }}>{(streakData.weeksInRow || 0) === 1 ? 'Week' : 'Weeks'}</Text>
                </View>
                <View style={{ width: '58%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignContent: 'center', gap: 7 }}>
                  {monthCalendar.map((day) => <View key={day.dateStr} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: day.completed ? (isDarkMode ? '#FFFFFF' : '#D84440') : day.inMonth ? theme.subtleSurface : 'transparent', borderWidth: day.today && !day.completed ? 1.5 : 0, borderColor: isDarkMode ? '#FFFFFF' : '#D84440' }} />)}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ position: 'relative', marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, overflow: 'hidden' }}>
            <LinearGradient colors={isDarkMode ? ['transparent', 'rgba(216,68,64,0.08)', 'rgba(216,68,64,0.40)'] : ['transparent', 'rgba(216,68,64,0.03)', 'rgba(216,68,64,0.12)']} locations={[0, 0.48, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', left: -150, bottom: -160, width: 440, height: 440, borderRadius: 240 }} pointerEvents="none" />
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: premiumCardBackground, borderWidth: 1, borderColor: premiumCardBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Ionicons name="lock-closed-outline" size={19} color={theme.textPrimary} /></View>
            <Text style={{ color: theme.textPrimary, fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 }}>Unlock your full potential.</Text>
            <Text style={{ color: theme.textPrimary, fontSize: 15, lineHeight: 21, marginTop: 8, marginBottom: 16 }}>Track your progress and reach your goals with subscription features.</Text>

            <TouchableOpacity onPress={() => setActiveProfileTab('more')} activeOpacity={0.84} accessibilityRole="button" accessibilityLabel="Explore Red Apple Premium" style={{ padding: 14, borderRadius: 22, backgroundColor: premiumCardBackground, borderWidth: 1, borderColor: premiumCardBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '800' }}>Personalized Health Insights</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 }}>Get a clearer picture of your health journey with Premium.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </View>
              <View style={{ height: 1, backgroundColor: premiumDivider, marginVertical: 11 }} />
              {[
                { title: 'Cycle & fertility patterns', detail: 'Personalized', icon: 'analytics-outline', secondary: false },
                { title: 'Unlimited Dr. Red', detail: 'Premium', icon: 'sparkles-outline', secondary: true },
              ].map((feature, index) => <View key={feature.title} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: index === 1 ? 0 : 1, borderBottomColor: premiumDivider, opacity: feature.secondary ? 0.62 : 1 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDarkMode ? '#362022' : '#FCE9E7', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><Ionicons name={feature.icon} size={19} color="#D84440" /></View>
                <View style={{ flex: 1 }}><Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '800' }}>{feature.title}</Text><Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{feature.secondary ? 'AI health support when you need it' : 'Insights based on your logged health data'}</Text></View>
                <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, backgroundColor: feature.secondary ? theme.subtleSurface : (isDarkMode ? 'rgba(216,68,64,0.20)' : '#FCE9E7') }}><Text style={{ color: feature.secondary ? theme.textSecondary : '#D84440', fontSize: 11, fontWeight: '800' }}>{feature.detail}</Text></View>
              </View>)}
            </TouchableOpacity>

            <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 9 }}>Health milestones</Text>
            <TouchableOpacity onPress={() => setActiveProfileTab('activity')} activeOpacity={0.82} style={{ padding: 14, borderRadius: 20, backgroundColor: premiumCardBackground, borderWidth: 1, borderColor: premiumCardBorder }}>
              <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 9 }}>Your check-ins</Text>
              {[
                { title: `${cycleLogs.length} health ${cycleLogs.length === 1 ? 'entry' : 'entries'}`, detail: 'Cycle and symptom history', icon: 'heart-outline' },
                { title: `${streakData.longestAppStreak || 0}-day best streak`, detail: 'Your longest check-in streak', icon: 'flame-outline' },
              ].map((item) => <View key={item.title} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDarkMode ? '#33251B' : '#FCE9E7', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><Ionicons name={item.icon} size={19} color="#D84440" /></View>
                <View style={{ flex: 1 }}><Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>{item.detail}</Text></View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </View>)}
            </TouchableOpacity>

            <View style={{ flexDirection: wideLayout ? 'row' : 'column', gap: 12, marginTop: 12 }}>
              <TouchableOpacity onPress={openHealthEditor} activeOpacity={0.82} style={{ flex: 1, minHeight: 145, padding: 14, borderRadius: 20, backgroundColor: premiumCardBackground, borderWidth: 1, borderColor: premiumCardBorder }}>
                <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '800' }}>Care goals</Text>
                <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 4, borderColor: theme.cardBorder, borderTopColor: '#D84440', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}><Ionicons name="heart-outline" size={18} color={theme.textPrimary} /></View>
                <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 8 }}>{stageInfo?.title || 'Choose a care mode'}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 5 }}>Your health focus</Text>
                <Ionicons name="chevron-forward" size={19} color={theme.textSecondary} style={{ position: 'absolute', bottom: 16, right: 16 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowStreakDetails(true)} activeOpacity={0.82} style={{ flex: 1, minHeight: 145, padding: 14, borderRadius: 20, backgroundColor: premiumCardBackground, borderWidth: 1, borderColor: premiumCardBorder }}>
                <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '800' }}>Check-in rhythm</Text>
                <Text style={{ color: '#D84440', fontSize: 23, fontWeight: '900', marginTop: 14 }}>{streakData.daysThisYear || 0}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>days logged this year</Text>
                <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 9 }}>{streakData.weeksInRow || 0} {streakData.weeksInRow === 1 ? 'week' : 'weeks'} in a row</Text>
                <Ionicons name="chevron-forward" size={19} color={theme.textSecondary} style={{ position: 'absolute', bottom: 16, right: 16 }} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setActiveProfileTab('activity')} activeOpacity={0.82} style={{ marginTop: 10, padding: 14, borderRadius: 20, backgroundColor: premiumCardBackground, borderWidth: 1, borderColor: premiumCardBorder }}>
              <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '800' }}>Health log</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 10 }}>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {cycleLogs.length} entries</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
                  const activeDay = (streakData.weeklyDays || []).find((item) => item.index === index)?.isCompleted;
                  return <View key={`${day}-${index}`} style={{ alignItems: 'center', gap: 6 }}><Text style={{ color: theme.textMuted, fontSize: 11 }}>{day}</Text><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: activeDay ? (isDarkMode ? '#586D42' : '#DCEBD6') : theme.subtleSurface, alignItems: 'center', justifyContent: 'center' }}>{activeDay && <Ionicons name="checkmark" size={10} color={isDarkMode ? '#FFFFFF' : '#355C36'} />}</View></View>;
                })}
              </View>
              <Ionicons name="chevron-forward" size={19} color={theme.textSecondary} style={{ position: 'absolute', bottom: 16, right: 16 }} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setActiveProfileTab('more')} activeOpacity={0.84} accessibilityRole="button" style={{ marginTop: 14, minHeight: 48, borderRadius: 24, backgroundColor: '#D84440', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>Explore Premium plans</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 22, padding: 16, borderRadius: 22, backgroundColor: premiumCardBackground, borderWidth: 1, borderColor: premiumCardBorder }}>
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '800' }}>Data sources</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 7 }}>Your health activity is based on the information you choose to log in Red Apple.</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
                <Ionicons name="phone-portrait-outline" size={21} color={theme.textPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700' }}>Red Apple</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 3 }}>Cycle and symptom entries</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setActiveProfileTab('more')} activeOpacity={0.8} style={{ alignSelf: 'flex-end', marginTop: 14 }}><Text style={{ color: '#D84440', fontSize: 13, fontWeight: '800' }}>Manage health data</Text></TouchableOpacity>
            </View>
          </View>
        </View>}

        {activeProfileTab === 'activity' && <View style={{ gap: 12 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 21, fontWeight: '800', marginBottom: 2 }}>Recent health activity</Text>
          {recentLogs.length ? recentLogs.map((log, index) => {
            const symptoms = Array.isArray(log.symptoms) ? log.symptoms : [];
            const date = log.date || log.logged_at;
            return <View key={`${date || 'entry'}-${index}`} style={{ padding: 16, borderRadius: 18, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: isDarkMode ? '#3A292A' : '#FFF1EF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={log.isPeriodDay ? 'water-outline' : 'heart-outline'} size={19} color="#E84432" /></View>
                <View style={{ flex: 1 }}><Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '700' }}>{log.isPeriodDay ? 'Period day' : log.feeling || 'Health check-in'}</Text><Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>{date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent entry'}</Text></View>
                <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />
              </View>
              {!!symptoms.length && <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 12 }}>{symptoms.join(' · ')}</Text>}
            </View>;
          }) : <View style={{ padding: 22, borderRadius: 20, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={30} color="#E84432" />
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 12 }}>Your activity will appear here</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 5 }}>Log cycle dates, symptoms, and how you feel to see your health history.</Text>
            <TouchableOpacity onPress={() => navigation?.navigate?.('CycleCalendar')} style={{ marginTop: 15, paddingHorizontal: 17, paddingVertical: 11, borderRadius: 22, backgroundColor: '#D84440' }}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Open cycle calendar</Text></TouchableOpacity>
          </View>}
        </View>}

        {activeProfileTab === 'more' && <View>
          <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>Settings</Text>
          <ProfileSettingsSection navigation={navigation} onSignOut={onSignOut} />
        </View>}
      </ScrollView>

      <StreakModal visible={showStreakDetails} onClose={() => setShowStreakDetails(false)} initialStreakData={streakData} />

      <Modal visible={showAccountEditor} transparent animationType="fade" onRequestClose={() => setShowAccountEditor(false)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: theme.cardBorder }}>
            <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 16 }}>Account details</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>Name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={theme.textMuted} style={{ color: theme.textPrimary, backgroundColor: theme.subtleSurface, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 13 }} />
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>Phone (optional)</Text>
            <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={theme.textMuted} keyboardType="phone-pad" style={{ color: theme.textPrimary, backgroundColor: theme.subtleSurface, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11 }} />
            {!!user?.email && <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 13 }}>Email: {user.email}</Text>}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowAccountEditor(false)} style={{ paddingHorizontal: 15, paddingVertical: 11 }}><Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={isSaving} onPress={saveAccount} style={{ paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, backgroundColor: '#D84440', opacity: isSaving ? 0.6 : 1 }}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{isSaving ? 'Saving…' : 'Save'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AppBottomSheet
        visible={showHealthEditor}
        onClose={() => setShowHealthEditor(false)}
        showHandle
        showCloseChevron
        scrollable
      >
        <View style={{ paddingBottom: 12 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 21, fontWeight: '800', marginBottom: 5 }}>Tracking &amp; care</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 17 }}>
            {healthSetupStep === 1 ? 'Choose your current life stage.' : `Step ${healthSetupStep} of ${totalHealthSetupSteps} · Tell us a little more to personalize your care.`}
          </Text>
          {healthSetupStep === 1 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {HEALTH_STAGES.map((item) => {
                const selected = selectedStage === item.id;
                return (
                  <TouchableOpacity key={item.id} onPress={() => setSelectedStage(item.id)} activeOpacity={0.85} accessibilityRole="radio" accessibilityState={{ selected }} style={{ width: item.fullWidth ? '100%' : '48.5%', minHeight: item.fullWidth ? 82 : 132, padding: 16, borderRadius: 24, justifyContent: 'space-between', backgroundColor: selected ? (isDarkMode ? '#263C35' : '#EAF1EF') : theme.inputBg, borderWidth: 1, borderColor: selected ? (isDarkMode ? '#6B9D8C' : '#173D36') : theme.inputBorder }}>
                    {item.fullWidth ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                        <Ionicons name={item.icon} size={25} color={selected ? (isDarkMode ? '#A8D0C3' : '#173D36') : theme.textSecondary} />
                        <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                          <Text style={{ color: selected ? (isDarkMode ? '#C4DED5' : '#173D36') : theme.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: '700' }}>{item.cardTitle}</Text>
                          <Text style={{ color: selected ? (isDarkMode ? '#A8C8BC' : '#365B52') : theme.textSecondary, fontSize: 12, lineHeight: 16, marginTop: 3 }}>{item.subtitle}</Text>
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={20} color={isDarkMode ? '#A8D0C3' : '#173D36'} />}
                      </View>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <Ionicons name={item.icon} size={28} color={selected ? (isDarkMode ? '#A8D0C3' : '#173D36') : theme.textSecondary} />
                          {selected && <Ionicons name="checkmark-circle" size={20} color={isDarkMode ? '#A8D0C3' : '#173D36'} />}
                        </View>
                        <View>
                          <Text style={{ color: selected ? (isDarkMode ? '#C4DED5' : '#173D36') : theme.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: '700' }} numberOfLines={2}>{item.cardTitle}</Text>
                          <Text style={{ color: selected ? (isDarkMode ? '#A8C8BC' : '#365B52') : theme.textSecondary, fontSize: 12, lineHeight: 16, marginTop: 3 }} numberOfLines={2}>{item.subtitle}</Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {healthSetupStep === 2 && (selectedStage === 'cycle' || selectedStage === 'ttc') && (
            <View>
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '800' }}>Cycle details</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>These details are optional estimates and can be changed later.</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>Cycle length · days</Text>
                  <TextInput value={cycleLength} onChangeText={setCycleLength} keyboardType="number-pad" placeholder="Not set" placeholderTextColor={theme.textMuted} style={{ color: theme.textPrimary, backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>Period length · days</Text>
                  <TextInput value={periodDuration} onChangeText={setPeriodDuration} keyboardType="number-pad" placeholder="Not set" placeholderTextColor={theme.textMuted} style={{ color: theme.textPrimary, backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12 }} />
                </View>
              </View>
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>First day of your last period · optional</Text>
                <TextInput value={lastPeriodDate} onChangeText={setLastPeriodDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textMuted} style={{ color: theme.textPrimary, backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12 }} />
              </View>
            </View>
          )}

          {healthSetupStep === 2 && selectedStage === 'pregnancy' && (
            <View>
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '800' }}>Pregnancy dates</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>Choose which date you know so we can estimate your pregnancy timeline.</Text>
              {renderHealthOptions('Calculate from', [
                { label: 'Last period', value: 'lmp' }, { label: 'Due date', value: 'dueDate' },
                { label: 'Conception', value: 'conception' }, { label: 'IVF transfer', value: 'ivf' },
              ], pregnancyCalcMethod, setPregnancyCalcMethod)}
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>Date · YYYY-MM-DD</Text>
                <TextInput value={pregnancyReferenceDate} onChangeText={setPregnancyReferenceDate} placeholder="Enter date" placeholderTextColor={theme.textMuted} style={{ color: theme.textPrimary, backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12 }} />
              </View>
            </View>
          )}

          {healthSetupStep === 2 && selectedStage === 'perimenopause' && (
            <View>
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '800' }}>Cycle changes</Text>
              {renderHealthOptions('What best describes your cycles?', [
                { label: 'Irregular', value: 'irregular' }, { label: 'Skipping periods', value: 'skipping' },
                { label: 'Flow changes', value: 'flow_changes' }, { label: 'Mostly regular', value: 'regular_with_symptoms' },
              ], periCyclePattern, setPeriCyclePattern)}
              {renderHealthOptions('When did changes begin?', [
                { label: 'Less than a year', value: 'less_than_year' }, { label: '1–2 years ago', value: '1_2_years' },
                { label: '3–5 years ago', value: '3_5_years' }, { label: 'More than 5 years', value: '5_plus_years' },
              ], periOnsetTimeline, setPeriOnsetTimeline)}
            </View>
          )}

          {healthSetupStep === 2 && selectedStage === 'postmenopause' && (
            <View>
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '800' }}>Postmenopause details</Text>
              {renderHealthOptions('How long since your last period?', [
                { label: '1–2 years', value: '1_2_years' }, { label: '2–5 years', value: '2_5_years' },
                { label: '5–10 years', value: '5_10_years' }, { label: '10+ years', value: '10_plus_years' },
              ], postYearsSincePeriod, setPostYearsSincePeriod)}
              {renderHealthOptions('Are you using hormone therapy?', [
                { label: 'Not using', value: 'not_using' }, { label: 'Using now', value: 'using' },
                { label: 'Considering it', value: 'considering' }, { label: 'Stopped', value: 'stopped' },
              ], hrtStatus, setHrtStatus)}
            </View>
          )}

          {healthSetupStep === 3 && selectedStage === 'pregnancy' && (
            <View>
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '800' }}>A little more about you</Text>
              {renderHealthOptions('Is this your first baby?', [
                { label: 'Yes', value: true }, { label: 'No', value: false },
              ], isFirstBaby, setIsFirstBaby)}
              {renderHealthOptions('Are you expecting more than one baby?', [
                { label: 'One baby', value: 'single' }, { label: 'Twins', value: 'twins' }, { label: 'Triplets or more', value: 'triplets_plus' },
              ], multipleType, setMultipleType)}
            </View>
          )}

          {healthSetupStep === 3 && selectedStage === 'perimenopause' && (
            <View>
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '800' }}>What would you like support with?</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>Choose all that apply. You can update these any time.</Text>
              {renderHealthOptions('Symptoms', [
                { label: 'Hot flashes', value: 'hot_flashes' }, { label: 'Night sweats', value: 'night_sweats' },
                { label: 'Sleep changes', value: 'sleep' }, { label: 'Mood changes', value: 'mood' },
                { label: 'Brain fog', value: 'brain_fog' }, { label: 'Joint aches', value: 'joint_aches' },
              ], periSymptoms, (value) => toggleHealthChoice(setPeriSymptoms, value), true)}
            </View>
          )}

          {healthSetupStep === 3 && selectedStage === 'postmenopause' && (
            <View>
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '800' }}>Your health priorities</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>Choose the areas you’d like us to focus on.</Text>
              {renderHealthOptions('Choose all that apply', [
                { label: 'Bone health', value: 'bone_density' }, { label: 'Heart health', value: 'cardio' },
                { label: 'Sleep', value: 'sleep' }, { label: 'Mood', value: 'mood' },
                { label: 'Weight & energy', value: 'weight_energy' }, { label: 'Sexual health', value: 'sexual_health' },
              ], postPriorities, (value) => toggleHealthChoice(setPostPriorities, value), true)}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'center', marginTop: 22, marginBottom: 10 }}>
            {Array.from({ length: totalHealthSetupSteps }, (_, index) => {
              const active = index + 1 === healthSetupStep;
              return <View key={index} style={{ width: active ? 24 : 6, height: active ? 4 : 6, borderRadius: 3, backgroundColor: index + 1 <= healthSetupStep ? '#D84440' : theme.cardBorder }} />;
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {healthSetupStep > 1 && (
              <TouchableOpacity onPress={() => setHealthSetupStep((step) => step - 1)} style={{ minHeight: 50, paddingHorizontal: 20, borderRadius: 26, borderWidth: 1, borderColor: theme.inputBorder, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700' }}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity disabled={isSaving} onPress={() => healthSetupStep < totalHealthSetupSteps ? setHealthSetupStep((step) => step + 1) : saveHealthProfile()} style={{ flex: 1, minHeight: 50, backgroundColor: '#D84440', borderRadius: 28, alignItems: 'center', justifyContent: 'center', opacity: isSaving ? 0.6 : 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{isSaving ? 'Saving…' : healthSetupStep === totalHealthSetupSteps ? 'Save preferences' : 'Continue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppBottomSheet>
    </SafeAreaView>
  );
}
