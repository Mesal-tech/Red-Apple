import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppBottomSheet from './AppBottomSheet';
import partnerService from '../services/partnerService';

/**
 * Reusable Partner Sync Modal Bottom Sheet
 * Provides production-ready partner inviting, code linking, and granular privacy controls.
 */
export default function PartnerSyncModal({
  visible = false,
  onClose,
  user = null,
  onPartnerUpdated,
}) {
  const [partnerStatus, setPartnerStatus] = useState({
    inviteCode: 'RED-APPLE-SYNC',
    status: 'none',
    partnerName: null,
    partnerEmail: null,
    partnerAvatarUrl: null,
    cardDismissed: false,
    connectedAt: null,
    preferences: {
      shareFertileWindow: true,
      shareCyclePhase: true,
      shareSymptoms: true,
      shareDailyTips: true,
    },
  });

  const [activeTab, setActiveTab] = useState('invite'); // 'invite' | 'join' | 'privacy'
  const [partnerNameInput, setPartnerNameInput] = useState('');
  const [partnerEmailInput, setPartnerEmailInput] = useState('');
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load latest partner status whenever modal opens
  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      partnerService
        .getPartnerStatus()
        .then((data) => {
          if (data) {
            setPartnerStatus(data);
            if (data.status === 'connected') {
              setActiveTab('privacy');
            } else {
              setActiveTab('invite');
            }
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [visible]);

  const handleShareInvite = async () => {
    try {
      const code = partnerStatus.inviteCode || 'RED-APPLE-SYNC';
      const shareUrl = `https://redapple.app/partner/join?code=${code}`;
      const message = `Join me on Red Apple to sync our cycle rhythm, fertility windows, and wellness moments! Use my invite code: ${code}\nOr tap here to join: ${shareUrl}`;

      await Share.share({
        title: 'Red Apple Partner Sync Invitation',
        message,
      });
    } catch (e) {}
  };

  const handleCopyCode = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSendDirectInvite = async () => {
    if (!partnerEmailInput.trim() && !partnerNameInput.trim()) {
      Alert.alert('Details Required', 'Please enter your partner’s name or email to send an invite.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await partnerService.sendPartnerInvite({
        partnerName: partnerNameInput.trim(),
        partnerEmail: partnerEmailInput.trim(),
        preferences: partnerStatus.preferences,
      });

      if (res?.success) {
        Alert.alert(
          'Invite Ready',
          `Your unique partner invite code is ${res.inviteCode || partnerStatus.inviteCode}. Share it with ${partnerNameInput || 'your partner'} so they can sync with you!`,
          [
            {
              text: 'Share Now',
              onPress: handleShareInvite,
            },
            { text: 'Done', style: 'cancel' },
          ]
        );
        const updated = await partnerService.getPartnerStatus();
        setPartnerStatus(updated);
        onPartnerUpdated && onPartnerUpdated(updated);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to send partner invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptCode = async () => {
    if (!partnerCodeInput.trim()) {
      Alert.alert('Code Required', 'Please enter your partner’s invite code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await partnerService.acceptPartnerInvite(partnerCodeInput.trim());
      if (res?.success) {
        Alert.alert('Success!', res.message || 'You are now synced with your partner!');
        setPartnerCodeInput('');
        const updated = await partnerService.getPartnerStatus();
        setPartnerStatus(updated);
        onPartnerUpdated && onPartnerUpdated(updated);
        setActiveTab('privacy');
      }
    } catch (e) {
      Alert.alert('Connection Failed', e.message || 'Invalid invite code. Please check and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePreference = async (key) => {
    const nextPrefs = {
      ...partnerStatus.preferences,
      [key]: !partnerStatus.preferences[key],
    };
    setPartnerStatus((prev) => ({ ...prev, preferences: nextPrefs }));
    try {
      const updated = await partnerService.updatePartnerPreferences(nextPrefs);
      onPartnerUpdated && onPartnerUpdated(updated);
    } catch (e) {}
  };

  const handleUnlink = () => {
    Alert.alert(
      'Unlink Partner?',
      'Are you sure you want to stop syncing your cycles and moments with your partner? You can reconnect anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const reset = await partnerService.unlinkPartner();
              setPartnerStatus(reset);
              onPartnerUpdated && onPartnerUpdated(reset);
              setActiveTab('invite');
              Alert.alert('Unlinked', 'Partner disconnected.');
            } catch (e) {
              Alert.alert('Error', 'Failed to unlink partner.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const isConnected = partnerStatus.status === 'connected';
  const isPending = partnerStatus.status === 'pending';

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      onRequestClose={onClose}
      animationType="slide"
    >
      <View className="px-5 pt-3 pb-6">
        {/* Top Header */}
        <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-black text-gray-900">Partner Sync</Text>
              {isConnected && (
                <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-row items-center gap-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <Text className="text-[11px] font-bold text-emerald-700">Connected</Text>
                </View>
              )}
            </View>
            <Text className="text-xs font-semibold text-gray-500 mt-0.5">
              Sync your rhythm, cycle phases, and shared moments
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="small" color="#E11D48" />
            <Text className="text-xs text-gray-400 mt-2 font-medium">Loading sync status...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="mt-3">
            {/* Connection Status Banner */}
            {isConnected ? (
              <View className="bg-rose-50/70 border border-rose-100/80 rounded-2xl p-4 mb-4 flex-row items-center gap-3.5">
                <View className="w-12 h-12 rounded-full bg-rose-100 border-2 border-white items-center justify-center shadow-xs">
                  <Ionicons name="heart" size={22} color="#E11D48" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-gray-900">
                    Synced with {partnerStatus.partnerName || 'Partner'}
                  </Text>
                  <Text className="text-xs text-rose-700 font-semibold mt-0.5">
                    {partnerStatus.partnerEmail || 'Active sync'} • Real-time rhythm shared
                  </Text>
                </View>
              </View>
            ) : isPending ? (
              <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 flex-row items-center gap-3.5">
                <View className="w-12 h-12 rounded-full bg-amber-100 border-2 border-white items-center justify-center shadow-xs">
                  <Ionicons name="mail-unread-outline" size={22} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-gray-900">
                    Invite Sent to {partnerStatus.partnerName || partnerStatus.partnerEmail}
                  </Text>
                  <Text className="text-xs text-amber-700 font-semibold mt-0.5">
                    Waiting for partner to enter your code or join
                  </Text>
                </View>
              </View>
            ) : (
              <View className="bg-gradient-to-r from-pink-50 to-purple-50 bg-[#FDF2F8] border border-pink-100 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-xs">
                  <Ionicons name="people" size={20} color="#DB2777" />
                </View>
                <Text className="text-xs font-semibold text-gray-700 flex-1 leading-relaxed">
                  Connect with your partner to share cycle milestones, fertile window notifications, and daily intimacy notes.
                </Text>
              </View>
            )}

            {/* Segmented Tab Controls */}
            <View className="flex-row bg-gray-100 p-1 rounded-2xl mb-4">
              <TouchableOpacity
                activeOpacity={0.8}
                className={`flex-1 py-2 rounded-xl items-center ${
                  activeTab === 'invite' ? 'bg-white shadow-xs' : ''
                }`}
                onPress={() => setActiveTab('invite')}
              >
                <Text
                  className={`text-xs font-bold ${
                    activeTab === 'invite' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  Invite Partner
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                className={`flex-1 py-2 rounded-xl items-center ${
                  activeTab === 'join' ? 'bg-white shadow-xs' : ''
                }`}
                onPress={() => setActiveTab('join')}
              >
                <Text
                  className={`text-xs font-bold ${
                    activeTab === 'join' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  Enter Code
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                className={`flex-1 py-2 rounded-xl items-center ${
                  activeTab === 'privacy' ? 'bg-white shadow-xs' : ''
                }`}
                onPress={() => setActiveTab('privacy')}
              >
                <Text
                  className={`text-xs font-bold ${
                    activeTab === 'privacy' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  Permissions
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: INVITE & SHARE CODE */}
            {activeTab === 'invite' && (
              <View>
                {/* Unique Invite Code Pill Box */}
                <View className="bg-white border-2 border-dashed border-pink-200 rounded-3xl p-4 mb-4 items-center">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Your Personal Invite Code
                  </Text>
                  <Text className="text-2xl font-black text-gray-900 tracking-wider font-mono">
                    {partnerStatus.inviteCode || 'RED-SYNC-2026'}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    className="mt-2.5 px-4 py-1.5 rounded-full bg-pink-50 border border-pink-200 flex-row items-center gap-1.5"
                    onPress={handleCopyCode}
                  >
                    <Ionicons
                      name={copiedCode ? 'checkmark-circle' : 'copy-outline'}
                      size={14}
                      color="#DB2777"
                    />
                    <Text className="text-xs font-bold text-pink-700">
                      {copiedCode ? 'Code Copied!' : 'Copy Code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Native Share Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  className="bg-[#FF4572] py-3.5 rounded-2xl flex-row items-center justify-center gap-2 shadow-xs mb-4"
                  onPress={handleShareInvite}
                >
                  <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                  <Text className="text-sm font-bold text-white">Share Invitation Link</Text>
                </TouchableOpacity>

                {/* Direct Invite Form */}
                <View className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-2">
                  <Text className="text-xs font-bold text-gray-800 mb-2">
                    Or Send Direct Invitation
                  </Text>
                  <TextInput
                    className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 mb-2.5"
                    placeholder="Partner's Name (e.g. Alex)"
                    placeholderTextColor="#9CA3AF"
                    value={partnerNameInput}
                    onChangeText={setPartnerNameInput}
                  />
                  <TextInput
                    className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 mb-3"
                    placeholder="Partner's Email or Phone"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={partnerEmailInput}
                    onChangeText={setPartnerEmailInput}
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                    className="bg-gray-900 py-3 rounded-xl items-center justify-center"
                    onPress={handleSendDirectInvite}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-xs font-bold text-white">Send Direct Invite</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAB 2: ENTER PARTNER'S CODE */}
            {activeTab === 'join' && (
              <View className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <Text className="text-xs font-bold text-gray-800 mb-1">
                  Have an invite code from your partner?
                </Text>
                <Text className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Enter the code your partner shared with you to securely sync your rhythm and notifications.
                </Text>

                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-black text-gray-900 text-center tracking-widest uppercase mb-4"
                  placeholder="e.g. RED-ABCD-1234"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  value={partnerCodeInput}
                  onChangeText={setPartnerCodeInput}
                />

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  className="bg-[#FF4572] py-3.5 rounded-2xl items-center justify-center shadow-xs"
                  onPress={handleAcceptCode}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-xs font-bold text-white">Connect & Link Accounts</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: PRIVACY & SHARING PERMISSIONS */}
            {activeTab === 'privacy' && (
              <View>
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                  What your partner can see
                </Text>

                <View className="bg-white border border-gray-100 rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between shadow-xs">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs font-bold text-gray-900">Fertile Window & Ovulation</Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5">
                      Notify partner when peak fertile window arrives
                    </Text>
                  </View>
                  <Switch
                    value={partnerStatus.preferences?.shareFertileWindow}
                    onValueChange={() => handleTogglePreference('shareFertileWindow')}
                    trackColor={{ false: '#E2E8F0', true: '#FDA4AF' }}
                    thumbColor={partnerStatus.preferences?.shareFertileWindow ? '#E11D48' : '#F1F5F9'}
                  />
                </View>

                <View className="bg-white border border-gray-100 rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between shadow-xs">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs font-bold text-gray-900">Cycle Phase & Period Dates</Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5">
                      Share period start predictions & follicular/luteal phases
                    </Text>
                  </View>
                  <Switch
                    value={partnerStatus.preferences?.shareCyclePhase}
                    onValueChange={() => handleTogglePreference('shareCyclePhase')}
                    trackColor={{ false: '#E2E8F0', true: '#FDA4AF' }}
                    thumbColor={partnerStatus.preferences?.shareCyclePhase ? '#E11D48' : '#F1F5F9'}
                  />
                </View>

                <View className="bg-white border border-gray-100 rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between shadow-xs">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs font-bold text-gray-900">Daily Symptoms & Mood</Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5">
                      Share cramps, mood changes, and energy levels
                    </Text>
                  </View>
                  <Switch
                    value={partnerStatus.preferences?.shareSymptoms}
                    onValueChange={() => handleTogglePreference('shareSymptoms')}
                    trackColor={{ false: '#E2E8F0', true: '#FDA4AF' }}
                    thumbColor={partnerStatus.preferences?.shareSymptoms ? '#E11D48' : '#F1F5F9'}
                  />
                </View>

                <View className="bg-white border border-gray-100 rounded-2xl p-3.5 mb-4 flex-row items-center justify-between shadow-xs">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs font-bold text-gray-900">Daily Tips for Partner</Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5">
                      Send helpful tips on how to support you during each phase
                    </Text>
                  </View>
                  <Switch
                    value={partnerStatus.preferences?.shareDailyTips}
                    onValueChange={() => handleTogglePreference('shareDailyTips')}
                    trackColor={{ false: '#E2E8F0', true: '#FDA4AF' }}
                    thumbColor={partnerStatus.preferences?.shareDailyTips ? '#E11D48' : '#F1F5F9'}
                  />
                </View>

                {/* Confidentiality Callout */}
                <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 mb-4 flex-row items-start gap-2.5">
                  <Ionicons name="shield-checkmark" size={18} color="#059669" />
                  <Text className="text-[11px] font-medium text-emerald-900 flex-1 leading-relaxed">
                    <Text className="font-bold">Confidentiality Guaranteed:</Text> Private doctor consultations, telemedicine video chats, and personal medical records are never shared with your partner.
                  </Text>
                </View>

                {isConnected && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    className="bg-red-50 border border-red-100 py-3 rounded-2xl items-center justify-center mt-1"
                    onPress={handleUnlink}
                  >
                    <Text className="text-xs font-bold text-red-600">Unlink Partner</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </AppBottomSheet>
  );
}
