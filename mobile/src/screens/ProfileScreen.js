import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { saveActiveHealthModeSafe, saveHealthProfileSafe } from '../utils/storage';
import ProfileSettingsSection from './ProfileSettingsSection';

const HEALTH_STAGES = [
  { id: 'cycle', title: 'Cycle health', icon: 'calendar-outline' },
  { id: 'ttc', title: 'Trying to conceive', icon: 'heart-outline' },
  { id: 'pregnancy', title: 'Pregnancy', icon: 'flower-outline' },
  { id: 'perimenopause', title: 'Perimenopause', icon: 'sunny-outline' },
  { id: 'postmenopause', title: 'Postmenopause', icon: 'leaf-outline' },
];

function initialsFor(name = '') {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'RA';
}

export default function ProfileOverviewScreen({ navigation, onClose, onSignOut, onActiveModeChange, currentMode }) {
  const { user, updateProfile } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const profile = user?.health_profile || {};
  const stage = profile.stage || (user?.pregnancy_mode ? 'pregnancy' : currentMode);
  const stageInfo = HEALTH_STAGES.find((item) => item.id === stage);
  const handleBack = onClose || (() => navigation?.goBack?.());
  const [showAccountEditor, setShowAccountEditor] = useState(false);
  const [showHealthEditor, setShowHealthEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedStage, setSelectedStage] = useState(stage || 'cycle');
  const [cycleLength, setCycleLength] = useState(profile.cycleLength ? String(profile.cycleLength) : '');
  const [periodDuration, setPeriodDuration] = useState(profile.periodDuration ? String(profile.periodDuration) : '');

  const accountInitials = useMemo(() => initialsFor(user?.name), [user?.name]);
  const openHealthEditor = () => {
    setSelectedStage(stage || 'cycle');
    setCycleLength(profile.cycleLength ? String(profile.cycleLength) : '');
    setPeriodDuration(profile.periodDuration ? String(profile.periodDuration) : '');
    setShowHealthEditor(true);
  };

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
        }
        : {}),
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
          <TouchableOpacity onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 34 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: isDarkMode ? '#3A292A' : '#FCE9E7', alignItems: 'center', justifyContent: 'center', marginBottom: 13 }}>
            <Text style={{ color: '#C83D38', fontSize: 26, fontWeight: '700' }}>{accountInitials}</Text>
          </View>
          <Text numberOfLines={1} style={{ color: theme.textPrimary, fontSize: 22, fontWeight: '700' }}>{user?.name || 'Your profile'}</Text>
          <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 14, marginTop: 5 }}>{user?.email || 'Add your account details'}</Text>
          <TouchableOpacity onPress={() => { setName(user?.name || ''); setPhone(user?.phone || ''); setShowAccountEditor(true); }} accessibilityRole="button" style={{ marginTop: 14, paddingHorizontal: 17, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: theme.cardBorder }}>
            <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600' }}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 26 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Tracking &amp; care</Text>
          <TouchableOpacity onPress={openHealthEditor} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Manage tracking and care modes" style={{ backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.cardBorder, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: isDarkMode ? '#3A292A' : '#FFF1EF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name={stageInfo?.icon || 'heart-outline'} size={19} color="#D84440" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '700' }}>{stageInfo?.title || 'Care mode not set'}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                  {(stage === 'cycle' || stage === 'ttc') && profile.cycleLength
                    ? `${profile.cycleLength} day cycle${profile.periodDuration ? ` · ${profile.periodDuration} day period` : ''}`
                    : stageInfo ? 'Used to tailor your health guidance' : 'Choose what you want support with'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </View>
            <Text style={{ color: '#D84440', fontSize: 13, fontWeight: '600', marginLeft: 54, marginTop: 15 }}>Change mode or details</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.textMuted, fontSize: 11, lineHeight: 16, marginTop: 10 }}>Choose a tracking stage or open telemedicine care. Health details are optional.</Text>
        </View>

        <View>
          <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>Settings</Text>
          <ProfileSettingsSection navigation={navigation} onSignOut={onSignOut} />
        </View>
      </ScrollView>

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

      <Modal visible={showHealthEditor} transparent animationType="slide" onRequestClose={() => setShowHealthEditor(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <SafeAreaView edges={['bottom']} style={{ maxHeight: '88%', backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12 }}>
            <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: theme.cardBorder, alignSelf: 'center', marginBottom: 16 }} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: '800' }}>Tracking &amp; care</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 16 }}>Choose a tracking mode and update its details before saving.</Text>
              {HEALTH_STAGES.map((item) => {
                const selected = selectedStage === item.id;
                return (
                  <TouchableOpacity key={item.id} onPress={() => setSelectedStage(item.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 16, backgroundColor: selected ? (isDarkMode ? '#3A2527' : '#FFF2F0') : theme.subtleSurface, borderWidth: 1, borderColor: selected ? '#D84440' : theme.cardBorder, marginBottom: 8 }}>
                    <Ionicons name={item.icon} size={19} color={selected ? '#D84440' : theme.textSecondary} style={{ marginRight: 11 }} />
                    <Text style={{ flex: 1, color: theme.textPrimary, fontSize: 14, fontWeight: selected ? '700' : '500' }}>{item.title}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={19} color="#D84440" />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => {
                  setShowHealthEditor(false);
                  navigation?.navigate?.('MainTabs', { screen: 'Telemed' });
                }}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 16, backgroundColor: theme.subtleSurface, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 8 }}
              >
                <Ionicons name="videocam-outline" size={19} color={theme.textSecondary} style={{ marginRight: 11 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '500' }}>Telemedicine</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 3 }}>Find a clinician or manage consultations</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />
              </TouchableOpacity>
              {(selectedStage === 'cycle' || selectedStage === 'ttc') && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>Cycle details (optional)</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 10 }}>These are your estimates, not a diagnosis.</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 5 }}>Cycle length · days</Text>
                      <TextInput value={cycleLength} onChangeText={setCycleLength} keyboardType="number-pad" placeholder="Not set" placeholderTextColor={theme.textMuted} style={{ color: theme.textPrimary, backgroundColor: theme.subtleSurface, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 5 }}>Period length · days</Text>
                      <TextInput value={periodDuration} onChangeText={setPeriodDuration} keyboardType="number-pad" placeholder="Not set" placeholderTextColor={theme.textMuted} style={{ color: theme.textPrimary, backgroundColor: theme.subtleSurface, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 }} />
                    </View>
                  </View>
                </View>
              )}
              <TouchableOpacity disabled={isSaving} onPress={saveHealthProfile} style={{ backgroundColor: '#D84440', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 20, opacity: isSaving ? 0.6 : 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{isSaving ? 'Saving…' : 'Save preferences'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
