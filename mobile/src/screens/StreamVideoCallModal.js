import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  StatusBar,
  Dimensions,
  Platform,
  PermissionsAndroid,
  Alert,
  Linking,
  TextInput,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getStreamToken } from '../services/telemedicineService';
import { getAuthSessionSafe } from '../utils/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Safely resolve Stream Video SDK to prevent crashes in environments without native WebRTC linking
let StreamVideoSDK = null;
try {
  StreamVideoSDK = require('@stream-io/video-react-native-sdk');
} catch (e) {
  // Graceful fallback for non-native development environments (e.g. Expo Go)
  console.log('[StreamVideoCallModal] Stream Video SDK native modules not linked, using webview fallback');
}

// Stable null component to prevent re-mounting sub-trees on every timer tick
const NullComponent = () => null;

// Stable theme override: removes blue border, positions PiP safely below status bar, and enables edge-to-edge video
const STREAM_CALL_THEME = {
  colors: {
    buttonPrimary: 'transparent',
  },
  callContent: {
    topContainer: {
      top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 56,
      bottom: 150,
      left: 0,
      right: 0,
    },
  },
  participantView: {
    container: {
      borderRadius: 0,
      borderWidth: 0,
      borderColor: 'transparent',
    },
    highlightedContainer: {
      borderColor: 'transparent',
      borderWidth: 0,
    },
  },
  floatingParticipantsView: {
    container: {
      overflow: 'hidden',
    },
    participantViewContainer: {
      width: 138,
      height: 186,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      backgroundColor: '#1E1E1E',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 0,
    },
    videoFallback: {
      overflow: 'hidden',
      borderRadius: 18,
    },
  },
};

// Fallback high-resolution doctor/patient photos matching reference design
const DEFAULT_DOCTOR_PHOTO =
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&auto=format&fit=crop&q=80';
const DEFAULT_PATIENT_PHOTO =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';

// Verified Telemedicine Care Team specialists for the Invite Sheet
const CARE_TEAM_MEMBERS = [
  {
    id: 'doc_lead',
    name: 'Consulting Specialist',
    handle: '@leadDoctor',
    role: 'Lead Obstetrician & Gynecologist',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
    initials: 'MO',
  },
  {
    id: 'spec_sophia',
    name: 'Sophia Williams',
    handle: '@sophiaW',
    role: 'Reproductive Endocrinologist',
    avatar: 'https://images.unsplash.com/photo-1594824813588-e99994c6f9e3?w=300&auto=format&fit=crop&q=80',
    initials: 'SW',
  },
  {
    id: 'spec_michael',
    name: 'Michael Johnson',
    handle: '@johnnyMichael',
    role: 'Senior Clinical Embryologist',
    avatar: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=300&auto=format&fit=crop&q=80',
    initials: 'MJ',
  },
  {
    id: 'spec_james',
    name: 'James Smith',
    handle: '@smithNurse',
    role: 'Maternal Care Coordinator',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    initials: 'JS',
  },
  {
    id: 'spec_olivia',
    name: 'Olivia Brown',
    handle: '@oliviaB',
    role: 'Pediatric Care Specialist',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
    initials: 'OB',
  },
];

/**
 * Request camera & microphone permissions on Android prior to starting WebRTC stream.
 */
async function requestCallPermissions() {
  if (Platform.OS !== 'android') return { cameraGranted: true, audioGranted: true };

  try {
    const permissionsToRequest = [
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ];

    if (Platform.Version >= 31) {
      permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    }

    const checkCamera = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    const checkAudio = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

    if (checkCamera && checkAudio) {
      return { cameraGranted: true, audioGranted: true };
    }

    const statuses = await PermissionsAndroid.requestMultiple(permissionsToRequest);

    const cameraGranted = statuses[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
    const audioGranted = statuses[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;

    if (!cameraGranted || !audioGranted) {
      Alert.alert(
        'Permissions Needed',
        'Camera and microphone access are required for video consultations. Please allow access in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }

    return { cameraGranted, audioGranted };
  } catch (err) {
    console.warn('[StreamVideoCallModal] Error requesting Android permissions:', err);
    return { cameraGranted: false, audioGranted: false };
  }
}

/**
 * Helper: format seconds to MM:SS
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Top Floating Navigation Bar
 * Frosted circular back button + 256-bit Encrypted pill positioned on the top-left.
 */
function TopFloatingNav({
  onBack,
  isConnecting = false,
  audioMode = 'speaker',
  isSpeakerOn = true,
  onToggleSpeaker,
}) {
  const effectiveMode = audioMode || (isSpeakerOn ? 'speaker' : 'earpiece');

  return (
    <SafeAreaView edges={['top']} style={styles.topNavSafeArea} pointerEvents="box-none">
      <View style={styles.topNavRow} pointerEvents="box-none">
        <View style={styles.topNavLeftGroup} pointerEvents="auto">
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onBack}
            style={styles.topNavCircleButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topNavEncryptedPill}>
            <Ionicons name="lock-closed" size={12} color="#34D399" style={{ marginRight: 5 }} />
            <Text style={styles.topNavEncryptedText}>
              {isConnecting ? 'Securing Line...' : '256-bit Encrypted'}
            </Text>
          </View>
        </View>

        {!isConnecting && onToggleSpeaker && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onToggleSpeaker}
            style={[
              styles.topNavAudioPill,
              effectiveMode === 'earpiece' && styles.topNavAudioPillEarpiece,
              effectiveMode === 'muted' && styles.topNavAudioPillMuted,
            ]}
            pointerEvents="auto"
            accessibilityLabel={`Audio output: ${effectiveMode}`}
          >
            <Ionicons
              name={
                effectiveMode === 'muted'
                  ? 'volume-mute'
                  : effectiveMode === 'earpiece'
                    ? 'ear-outline'
                    : 'volume-high'
              }
              size={14}
              color={
                effectiveMode === 'muted'
                  ? '#F87171'
                  : effectiveMode === 'earpiece'
                    ? '#34D399'
                    : '#FFFFFF'
              }
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.topNavAudioText,
                effectiveMode === 'earpiece' && styles.topNavAudioTextEarpiece,
                effectiveMode === 'muted' && styles.topNavAudioTextMuted,
              ]}
            >
              {effectiveMode === 'muted'
                ? 'Muted'
                : effectiveMode === 'earpiece'
                  ? 'Earpiece'
                  : 'Speaker'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

/**
 * Bottom Floating Frosted Glass HUD Card
 * Matches the left mockup in user's design reference:
 * - Upper row: Caller avatar, Name, Subtitle, Live Duration Timer
 * - Lower row: 5 round glass buttons (More, Flip, Video, Mic, Red Hangup)
 */
function BottomGlassHudCard({
  name,
  subtitle,
  avatarUrl,
  durationSeconds,
  isCameraMuted,
  isMicMuted,
  audioMode = 'speaker',
  isSpeakerOn = true,
  onToggleSpeaker,
  onOpenMore,
  onFlipCamera,
  onToggleCamera,
  onToggleMic,
  onHangup,
}) {
  const resolvedAvatar = avatarUrl || DEFAULT_DOCTOR_PHOTO;
  const effectiveMode = audioMode || (isSpeakerOn ? 'speaker' : 'earpiece');

  return (
    <SafeAreaView edges={['bottom']} style={styles.bottomHudSafeArea} pointerEvents="box-none">
      <View style={styles.bottomHudCardWrapper} pointerEvents="auto">
        <LinearGradient
          colors={['rgba(38, 20, 16, 0.78)', 'rgba(22, 10, 8, 0.90)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.bottomHudCard}
        >
          {/* TOP ROW: AVATAR, CALLER INFO, DURATION TIMER & AUDIO ROUTE */}
          <View style={styles.hudTopRow}>
            <View style={styles.hudCallerInfo}>
              <Image source={{ uri: resolvedAvatar }} style={styles.hudAvatarImage} />
              <View style={styles.hudTextCol}>
                <Text style={styles.hudNameText} numberOfLines={1}>
                  {name || 'Consultation'}
                </Text>
                <Text style={styles.hudSubtitleText} numberOfLines={1}>
                  {subtitle || 'Telehealth Session'}
                </Text>
              </View>
            </View>

            {/* Right badges: Audio toggle + Duration Timer */}
            <View style={styles.hudRightBadges}>
              {onToggleSpeaker && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={onToggleSpeaker}
                  style={[
                    styles.hudAudioBadge,
                    effectiveMode === 'earpiece' && styles.hudAudioBadgeEarpiece,
                    effectiveMode === 'muted' && styles.hudAudioBadgeMuted,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Audio output: ${effectiveMode}`}
                >
                  <Ionicons
                    name={
                      effectiveMode === 'muted'
                        ? 'volume-mute'
                        : effectiveMode === 'earpiece'
                          ? 'ear-outline'
                          : 'volume-high'
                    }
                    size={13}
                    color={
                      effectiveMode === 'muted'
                        ? '#F87171'
                        : effectiveMode === 'earpiece'
                          ? '#34D399'
                          : '#FFFFFF'
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.hudAudioText,
                      effectiveMode === 'earpiece' && styles.hudAudioTextEarpiece,
                      effectiveMode === 'muted' && styles.hudAudioTextMuted,
                    ]}
                  >
                    {effectiveMode === 'muted'
                      ? 'Muted'
                      : effectiveMode === 'earpiece'
                        ? 'Earpiece'
                        : 'Speaker'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Duration Timer */}
              <View style={styles.hudTimerBadge}>
                <Text style={styles.hudTimerText}>{formatDuration(durationSeconds)}</Text>
              </View>
            </View>
          </View>

          {/* BOTTOM ROW: 5 ACTION CONTROL BUTTONS */}
          <View style={styles.hudControlsRow}>
            {/* 1. More / Invite sheet */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.hudControlButton}
              onPress={onOpenMore}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* 2. Switch Camera (Front/Back) */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.hudControlButton}
              onPress={onFlipCamera}
            >
              <Ionicons name="camera-reverse" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {/* 3. Video Camera Toggle */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[
                styles.hudControlButton,
                isCameraMuted && styles.hudControlButtonMuted,
              ]}
              onPress={onToggleCamera}
            >
              <Ionicons
                name={isCameraMuted ? 'videocam-off' : 'videocam'}
                size={22}
                color={isCameraMuted ? '#FCA5A5' : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* 4. Microphone Toggle */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[
                styles.hudControlButton,
                isMicMuted && styles.hudControlButtonMuted,
              ]}
              onPress={onToggleMic}
            >
              <Ionicons
                name={isMicMuted ? 'mic-off' : 'mic'}
                size={22}
                color={isMicMuted ? '#FCA5A5' : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* 5. End Call Button (Vivid Red Circle) */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.hudEndCallButton}
              onPress={onHangup}
            >
              <Ionicons
                name="call"
                size={22}
                color="#FFFFFF"
                style={{ transform: [{ rotate: '135deg' }] }}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

/**
 * Invite / Care Team Participants Frosted Sheet
 * Matches top-right mockup in user's design reference
 */
function InviteParticipantsSheet({
  visible,
  onClose,
  audioMode = 'speaker',
  isSpeakerOn = true,
  onSelectAudioMode,
  onToggleSpeaker,
}) {
  const effectiveMode = audioMode || (isSpeakerOn ? 'speaker' : 'earpiece');
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedIds, setInvitedIds] = useState(new Set(['spec_sophia']));

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return CARE_TEAM_MEMBERS;
    const q = searchQuery.toLowerCase();
    return CARE_TEAM_MEMBERS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.handle.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const toggleInvite = (id) => {
    setInvitedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          <LinearGradient
            colors={['rgba(38, 20, 16, 0.96)', 'rgba(20, 10, 8, 0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.sheetGradient}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetSearchRow}>
              <View style={styles.sheetSearchCapsule}>
                <Ionicons name="search" size={17} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 8 }} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search specialists..."
                  placeholderTextColor="rgba(255, 255, 255, 0.45)"
                  style={styles.sheetSearchInput}
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.sheetCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Audio Route Control & Acoustic Echo Advisory */}
            <View style={styles.sheetAudioSection}>
              <View style={styles.sheetAudioHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="volume-medium" size={16} color="#FBBF24" style={{ marginRight: 6 }} />
                  <Text style={styles.sheetAudioSectionTitle}>Audio Output</Text>
                </View>
              </View>

              <View style={styles.sheetAudioPillsRow}>
                {/* 1. Loudspeaker */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => (onSelectAudioMode ? onSelectAudioMode('speaker') : onToggleSpeaker?.())}
                  style={[
                    styles.sheetAudioRouteBtn,
                    effectiveMode === 'speaker' && styles.sheetAudioRouteBtnActive,
                  ]}
                >
                  <Ionicons
                    name="volume-high"
                    size={14}
                    color={effectiveMode === 'speaker' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.sheetAudioRouteBtnText,
                      effectiveMode === 'speaker' && styles.sheetAudioRouteBtnTextActive,
                    ]}
                  >
                    Speaker
                  </Text>
                </TouchableOpacity>

                {/* 2. Earpiece */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => (onSelectAudioMode ? onSelectAudioMode('earpiece') : onToggleSpeaker?.())}
                  style={[
                    styles.sheetAudioRouteBtn,
                    effectiveMode === 'earpiece' && styles.sheetAudioRouteBtnActiveEarpiece,
                  ]}
                >
                  <Ionicons
                    name="ear-outline"
                    size={14}
                    color={effectiveMode === 'earpiece' ? '#34D399' : 'rgba(255, 255, 255, 0.7)'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.sheetAudioRouteBtnText,
                      effectiveMode === 'earpiece' && styles.sheetAudioRouteBtnTextActiveEarpiece,
                    ]}
                  >
                    Earpiece
                  </Text>
                </TouchableOpacity>

                {/* 3. Mute Audio */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => (onSelectAudioMode ? onSelectAudioMode('muted') : onToggleSpeaker?.())}
                  style={[
                    styles.sheetAudioRouteBtn,
                    effectiveMode === 'muted' && styles.sheetAudioRouteBtnActiveMuted,
                  ]}
                >
                  <Ionicons
                    name="volume-mute"
                    size={14}
                    color={effectiveMode === 'muted' ? '#F87171' : 'rgba(255, 255, 255, 0.7)'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.sheetAudioRouteBtnText,
                      effectiveMode === 'muted' && styles.sheetAudioRouteBtnTextActiveMuted,
                    ]}
                  >
                    Mute Audio
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sheetAudioTipText}>
                Same-Room Testing: When two phones are in the same room, set one phone to Earpiece or Mute Audio to eliminate loudspeaker acoustic feedback.
              </Text>
            </View>

            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.sheetListContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isInvited = invitedIds.has(item.id);
                return (
                  <View style={styles.sheetMemberRow}>
                    <View style={styles.sheetMemberLeft}>
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.sheetMemberAvatar} />
                      ) : (
                        <View style={styles.sheetMemberFallback}>
                          <Text style={styles.sheetMemberFallbackText}>{item.initials}</Text>
                        </View>
                      )}
                      <View style={styles.sheetMemberTextCol}>
                        <Text style={styles.sheetMemberName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.sheetMemberHandle} numberOfLines={1}>
                          {item.handle}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => toggleInvite(item.id)}
                      style={[
                        styles.sheetInvitePill,
                        isInvited ? styles.sheetInvitedPill : styles.sheetNotInvitedPill,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sheetInvitePillText,
                          isInvited ? styles.sheetInvitedPillText : styles.sheetNotInvitedPillText,
                        ]}
                      >
                        {isInvited ? 'Invited' : 'Invite'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Incoming / Connecting Floating Banner
 */
function IncomingConnectingBanner({ name, subtitle, avatarUrl, onDecline, onAccept }) {
  const resolvedAvatar = avatarUrl || DEFAULT_DOCTOR_PHOTO;

  return (
    <View style={styles.incomingBannerWrapper}>
      <LinearGradient
        colors={['rgba(38, 20, 16, 0.85)', 'rgba(20, 10, 8, 0.94)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.incomingBannerCard}
      >
        <View style={styles.incomingBannerLeft}>
          <Image source={{ uri: resolvedAvatar }} style={styles.incomingAvatarImage} />
          <View style={styles.incomingTextCol}>
            <Text style={styles.incomingNameText} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.incomingSubtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.incomingActionsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onDecline}
            style={styles.incomingDeclineBtn}
          >
            <Ionicons
              name="call"
              size={18}
              color="#FFFFFF"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onAccept}
            style={styles.incomingAcceptBtn}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

/**
 * Stream Call HUD Overlay
 * Bound inside <StreamCall> to sync with real call state and controls.
 */
function StreamCallHudOverlay({
  call,
  fallbackName,
  fallbackSubtitle,
  fallbackPhoto,
  callDuration,
  audioMode = 'speaker',
  isSpeakerOn = true,
  onToggleSpeaker,
  onOpenInvite,
  onHangup,
}) {
  const { useCameraState, useMicrophoneState, useRemoteParticipants } =
    StreamVideoSDK.useCallStateHooks();

  const { isMute: isCameraMuted } = useCameraState();
  const { isMute: isMicMuted } = useMicrophoneState();
  const remoteParticipants = useRemoteParticipants();

  // If a remote participant is connected and has a valid, personalized name from Stream, use it!
  const remoteParticipant =
    remoteParticipants && remoteParticipants.length > 0 ? remoteParticipants[0] : null;

  const hasRealRemoteName =
    remoteParticipant?.name &&
    remoteParticipant.name !== 'Red Apple Guest' &&
    remoteParticipant.name.trim().length > 0;

  const targetName = hasRealRemoteName ? remoteParticipant.name : fallbackName;
  const targetImage = remoteParticipant?.image || fallbackPhoto;

  const handleFlipCamera = async () => {
    try {
      if (call?.camera?.flip) await call.camera.flip();
    } catch (e) {
      console.warn('[StreamVideoCallModal] Camera flip failed:', e);
    }
  };

  const handleToggleCamera = async () => {
    try {
      if (call?.camera?.toggle) await call.camera.toggle();
    } catch (e) {
      console.warn('[StreamVideoCallModal] Camera toggle failed:', e);
    }
  };

  const handleToggleMic = async () => {
    try {
      if (call?.microphone?.toggle) await call.microphone.toggle();
    } catch (e) {
      console.warn('[StreamVideoCallModal] Microphone toggle failed:', e);
    }
  };

  return (
    <BottomGlassHudCard
      name={targetName}
      subtitle={fallbackSubtitle}
      avatarUrl={targetImage}
      durationSeconds={callDuration}
      isCameraMuted={Boolean(isCameraMuted)}
      isMicMuted={Boolean(isMicMuted)}
      audioMode={audioMode}
      isSpeakerOn={isSpeakerOn}
      onToggleSpeaker={onToggleSpeaker}
      onOpenMore={onOpenInvite}
      onFlipCamera={handleFlipCamera}
      onToggleCamera={handleToggleCamera}
      onToggleMic={handleToggleMic}
      onHangup={onHangup}
    />
  );
}

/**
 * Simulated Call Room View (Dev fallback)
 */
function SimulatedCallContent({
  displayName,
  displaySubtitle,
  displayPhoto,
  callDuration,
  audioMode = 'speaker',
  isSpeakerOn = true,
  onToggleSpeaker,
  onHangup,
  onOpenInvite,
}) {
  const [cameraMuted, setCameraMuted] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  return (
    <View style={styles.activeCallContainer}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={['#2D1008', '#6E2512', '#C84F1E', '#E46B2C', '#260D06']}
          locations={[0, 0.22, 0.52, 0.78, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <Image
          source={{ uri: displayPhoto }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(20, 10, 8, 0.35)', 'transparent', 'rgba(15, 8, 6, 0.72)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </View>

      <TopFloatingNav
        onBack={onHangup}
        audioMode={audioMode}
        isSpeakerOn={isSpeakerOn}
        onToggleSpeaker={onToggleSpeaker}
      />

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => setIsFrontCamera(!isFrontCamera)}
        style={styles.localPipContainer}
      >
        <LinearGradient
          colors={['#2D1510', '#542315', '#1F0D08']}
          style={styles.localPipPlaceholder}
        >
          <View style={styles.localPipAvatarCircle}>
            <Ionicons name="person" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.localPipPlaceholderText}>
            {isFrontCamera ? 'Front Cam' : 'Rear Cam'}
          </Text>
        </LinearGradient>
        <View style={styles.localPipFlipBadge}>
          <Ionicons name="camera-reverse" size={13} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      <BottomGlassHudCard
        name={displayName}
        subtitle={displaySubtitle}
        avatarUrl={displayPhoto}
        durationSeconds={callDuration}
        isCameraMuted={cameraMuted}
        isMicMuted={micMuted}
        audioMode={audioMode}
        isSpeakerOn={isSpeakerOn}
        onToggleSpeaker={onToggleSpeaker}
        onOpenMore={onOpenInvite}
        onFlipCamera={() => setIsFrontCamera(!isFrontCamera)}
        onToggleCamera={() => setCameraMuted(!cameraMuted)}
        onToggleMic={() => setMicMuted(!micMuted)}
        onHangup={onHangup}
      />
    </View>
  );
}

/**
 * StreamVideoCallModal
 *
 * Full-screen encrypted telehealth consultation room:
 * - Powered by GetStream Video SDK WebRTC CallContent
 * - Two-sided aware: doctor sees patient info, patient sees doctor info
 * - Floating glass HUD card with live duration timer and 5 round action buttons
 * - Local PiP in top-right with no blue focus border
 */
export default function StreamVideoCallModal({
  visible,
  booking,
  isDoctorView = false,
  onClose,
  onCallCompleted,
}) {
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [audioMode, setAudioMode] = useState('speaker'); // 'speaker' | 'earpiece' | 'muted'

  const timerRef = useRef(null);
  const callRef = useRef(null);
  const clientRef = useRef(null);

  const handleSetAudioMode = (targetMode) => {
    setAudioMode(targetMode);
    if (StreamVideoSDK?.callManager?.speaker) {
      try {
        if (targetMode === 'muted') {
          StreamVideoSDK.callManager.speaker.setMute(true);
        } else if (targetMode === 'earpiece') {
          StreamVideoSDK.callManager.speaker.setMute(false);
          StreamVideoSDK.callManager.speaker.setForceSpeakerphoneOn(false);
        } else {
          // speaker
          StreamVideoSDK.callManager.speaker.setMute(false);
          StreamVideoSDK.callManager.speaker.setForceSpeakerphoneOn(true);
        }
      } catch (e) {
        console.warn('[StreamVideoCallModal] Failed to set audio mode:', e);
      }
    }
  };

  const handleCycleAudioMode = () => {
    let nextMode = 'speaker';
    if (audioMode === 'speaker') nextMode = 'earpiece';
    else if (audioMode === 'earpiece') nextMode = 'muted';
    else nextMode = 'speaker';
    handleSetAudioMode(nextMode);
  };

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  // Load auth user to automatically detect doctor vs patient
  useEffect(() => {
    getAuthSessionSafe().then((session) => {
      if (session?.user) setCurrentUser(session.user);
    });
  }, []);

  // Determine if current viewer is the doctor:
  // If isDoctorView is explicitly a boolean, strictly respect it; otherwise inspect role/email
  const isDoctor =
    typeof isDoctorView === 'boolean'
      ? isDoctorView
      : Boolean(
        booking?.is_doctor ||
        booking?.is_doctor_view ||
        currentUser?.role === 'doctor' ||
        currentUser?.email === 'doctor@redapple.health'
      );

  // Two-sided aware display info:
  // Doctor views -> show PATIENT (e.g. Amara Okonkwo)
  // Patient views -> show DOCTOR (Consulting Specialist)
  const defaultDisplayName = isDoctor
    ? (booking?.user_name || booking?.patient_name || 'Amara Okonkwo')
    : (booking?.doctor_name || 'Consulting Specialist');

  const defaultDisplaySubtitle = isDoctor
    ? (booking?.reason || 'General Consultation')
    : (booking?.doctor_specialty || 'Obstetrician & Gynecologist');

  const defaultDisplayPhoto = isDoctor
    ? (booking?.user_image || booking?.patient_photo || DEFAULT_PATIENT_PHOTO)
    : (booking?.doctor_photo_url || DEFAULT_DOCTOR_PHOTO);

  // Duration timer
  useEffect(() => {
    if (visible && (!isConnecting || isCallAccepted)) {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, isConnecting, isCallAccepted]);

  // Initialize Stream Video Client and join room
  useEffect(() => {
    let isCancelled = false;

    async function initStreamVideo() {
      if (!visible || !booking) return;

      setIsConnecting(true);
      setIsCallAccepted(false);

      try {
        if (!StreamVideoSDK) {
          console.info('[StreamVideoCallModal] Operating in interactive design preview mode.');
          setIsConnecting(false);
          setIsCallAccepted(true);
          return;
        }

        const { StreamVideoClient } = StreamVideoSDK;

        // 1. Request permissions
        const { cameraGranted, audioGranted } = await requestCallPermissions();
        if (isCancelled) return;

        // 2. Fetch authenticated session to ensure exact user ID matching
        let effectiveUser = currentUser;
        if (!effectiveUser) {
          const session = await getAuthSessionSafe().catch(() => null);
          if (session?.user) {
            effectiveUser = session.user;
            setCurrentUser(session.user);
          }
        }

        const userId = isDoctor
          ? 'doc_mesal_okubor'
          : (effectiveUser?.id || booking?.user_id || 'usr_patient_amara');

        const userName = isDoctor
          ? (effectiveUser?.name || 'Consulting Doctor')
          : (effectiveUser?.name || booking?.user_name || 'Amara Okonkwo');

        const userRole = isDoctor ? 'doctor' : 'user';

        const userImage = isDoctor
          ? DEFAULT_DOCTOR_PHOTO
          : (effectiveUser?.avatar || booking?.user_image || DEFAULT_PATIENT_PHOTO);

        // 3. Fetch authenticated Stream credentials for this EXACT user ID
        const streamData = await getStreamToken(userId, userName, userRole);
        if (isCancelled) return;

        const apiKey = streamData?.apiKey || 'dwzr6jexepdf';
        const token = streamData?.token;

        const user = {
          id: userId,
          name: userName,
          image: userImage,
          ...(token ? {} : { type: 'guest' }),
        };

        const tokenProvider = async () => {
          const refreshed = await getStreamToken(userId, userName, userRole);
          return refreshed?.token || '';
        };

        // 4. Initialize Stream Video Client
        const videoClient = StreamVideoClient.getOrCreateInstance({
          apiKey,
          user,
          token: token || undefined,
          tokenProvider: token ? tokenProvider : undefined,
          options: {
            logLevel: 'error',
            logger: (level, msg) => {
              if (
                typeof msg === 'string' &&
                (msg.includes('coordinator') ||
                  msg.includes('location-hint') ||
                  msg.includes('SfuStatsReporter') ||
                  msg.includes('call_client_event'))
              ) {
                return;
              }
              if (level === 'error') {
                console.warn('[StreamVideo]', msg);
              }
            },
          },
        });

        if (isCancelled) {
          videoClient.disconnectUser().catch(() => { });
          return;
        }
        clientRef.current = videoClient;
        setClient(videoClient);

        // 5. Pre-configure native audio manager:
        // Setting audioRole to 'communicator' activates hardware Acoustic Echo Cancellation (AEC),
        // Noise Suppression (NS), and MODE_IN_COMMUNICATION on Android / iOS
        if (StreamVideoSDK?.callManager?.start) {
          try {
            StreamVideoSDK.callManager.start({
              audioRole: 'communicator',
              deviceEndpointType: 'speaker',
            });
          } catch (mgrErr) {
            console.warn('[StreamVideoCallModal] CallManager communicator mode init note:', mgrErr);
          }
        }

        // 6. Create or join call with clean sanitized Call ID
        const rawCallId = booking.booking_id || booking.slot_id || 'red_apple_consultation';
        const callId = rawCallId.replace(/[^a-zA-Z0-9_-]/g, '_');

        const activeCall = videoClient.call('default', callId);

        try {
          // Explicitly disable local audio loopback to prevent echo feedback into speakers
          await activeCall.join({
            create: true,
            allowOwnTracksLoopback: false,
          });
        } catch (joinErr) {
          console.warn('[StreamVideoCallModal] Media room join note:', joinErr?.message || joinErr);
        }

        if (isCancelled) {
          activeCall.leave().catch(() => { });
          videoClient.disconnectUser().catch(() => { });
          return;
        }

        setCall(activeCall);
        setIsConnecting(false);
        setIsCallAccepted(true);

        // Auto-enable camera and microphone
        if (cameraGranted && activeCall?.camera) {
          activeCall.camera.enable().catch((err) => {
            console.warn('[StreamVideoCallModal] Camera auto-enable failed:', err);
          });
        }
        if (audioGranted && activeCall?.microphone) {
          activeCall.microphone.enable().catch((err) => {
            console.warn('[StreamVideoCallModal] Microphone auto-enable failed:', err);
          });
        }
      } catch (err) {
        console.error('[StreamVideoCallModal] Initialization error:', err);
        if (!isCancelled) {
          setIsConnecting(false);
          setIsCallAccepted(true);
        }
      }
    }

    if (visible) {
      initStreamVideo();
    }

    return () => {
      isCancelled = true;
      if (StreamVideoSDK?.callManager?.speaker) {
        try {
          StreamVideoSDK.callManager.speaker.setMute(false);
        } catch (e) { }
      }
      if (StreamVideoSDK?.callManager?.stop) {
        try {
          StreamVideoSDK.callManager.stop();
        } catch (e) { }
      }
      if (callRef.current) {
        callRef.current.leave().catch(() => { });
        callRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.disconnectUser().catch(() => { });
        clientRef.current = null;
      }
      setCall(null);
      setClient(null);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, booking, isDoctor]);

  const handleHangup = async () => {
    try {
      if (call) {
        await call.leave().catch(() => { });
      }
    } catch (err) {
      console.warn('[StreamVideoCallModal] Hangup error:', err);
    }
    if (StreamVideoSDK?.callManager?.speaker) {
      try {
        StreamVideoSDK.callManager.speaker.setMute(false);
      } catch (e) { }
    }
    if (StreamVideoSDK?.callManager?.stop) {
      try {
        StreamVideoSDK.callManager.stop();
      } catch (e) { }
    }
    if (clientRef.current) {
      clientRef.current.disconnectUser().catch(() => { });
      clientRef.current = null;
    }
    setCall(null);
    setClient(null);
    setIsCallAccepted(false);
    if (onCallCompleted) onCallCompleted(booking);
    if (onClose) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleHangup}
    >
      <View style={styles.modalContainer}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* CONNECTING / RINGING STAGE */}
        {isConnecting && !isCallAccepted ? (
          <View style={StyleSheet.absoluteFillObject}>
            <View style={StyleSheet.absoluteFillObject}>
              <LinearGradient
                colors={['#2D1008', '#6E2512', '#C84F1E', '#E46B2C', '#260D06']}
                locations={[0, 0.22, 0.52, 0.78, 1]}
                style={StyleSheet.absoluteFillObject}
              />
              <Image
                source={{ uri: defaultDisplayPhoto }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(20, 10, 8, 0.35)', 'transparent', 'rgba(15, 8, 6, 0.72)']}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
            </View>

            <TopFloatingNav onBack={handleHangup} isConnecting={true} />

            <IncomingConnectingBanner
              name={defaultDisplayName}
              subtitle={defaultDisplaySubtitle}
              avatarUrl={defaultDisplayPhoto}
              onDecline={handleHangup}
              onAccept={() => {
                setIsConnecting(false);
                setIsCallAccepted(true);
              }}
            />
          </View>
        ) : client && call && StreamVideoSDK ? (
          /* ACTIVE STREAM WEBRTC CALL - Full screen video, Top-right PiP, zero blue border */
          <StreamVideoSDK.StreamVideo
            client={client}
            style={STREAM_CALL_THEME}
          >
            <StreamVideoSDK.StreamCall call={call}>
              <View style={styles.streamSdkContainer}>
                {/* 1. Real WebRTC CallContent with Top-Right PiP */}
                <StreamVideoSDK.CallContent
                  onHangupCallHandler={handleHangup}
                  initialInCallManagerAudioMode="video"
                  CallControls={NullComponent}
                  ParticipantLabel={NullComponent}
                  ParticipantNetworkQualityIndicator={NullComponent}
                  ParticipantReaction={NullComponent}
                />

                {/* 2. Top Floating Navigation Bar (Back button, 256-bit Encrypted, and Audio Mode pill) */}
                <TopFloatingNav
                  onBack={handleHangup}
                  audioMode={audioMode}
                  onToggleSpeaker={handleCycleAudioMode}
                />

                {/* 3. Bottom Floating Frosted Glass HUD Card */}
                <StreamCallHudOverlay
                  call={call}
                  fallbackName={defaultDisplayName}
                  fallbackSubtitle={defaultDisplaySubtitle}
                  fallbackPhoto={defaultDisplayPhoto}
                  callDuration={callDuration}
                  audioMode={audioMode}
                  onToggleSpeaker={handleCycleAudioMode}
                  onOpenInvite={() => setIsInviteOpen(true)}
                  onHangup={handleHangup}
                />
              </View>
            </StreamVideoSDK.StreamCall>
          </StreamVideoSDK.StreamVideo>
        ) : (
          /* SIMULATED / DEV ENVIRONMENT INTERACTIVE ROOM */
          <SimulatedCallContent
            displayName={defaultDisplayName}
            displaySubtitle={defaultDisplaySubtitle}
            displayPhoto={defaultDisplayPhoto}
            callDuration={callDuration}
            audioMode={audioMode}
            onToggleSpeaker={handleCycleAudioMode}
            onHangup={handleHangup}
            onOpenInvite={() => setIsInviteOpen(true)}
          />
        )}

        {/* INVITE / PARTICIPANTS SHEET MODAL */}
        <InviteParticipantsSheet
          visible={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          audioMode={audioMode}
          onSelectAudioMode={handleSetAudioMode}
          onToggleSpeaker={handleCycleAudioMode}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  activeCallContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  streamSdkContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  /* -------------------------------------------------------------------------- */
  /* TOP FLOATING NAV BAR                                                       */
  /* -------------------------------------------------------------------------- */
  topNavSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 118,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
  },
  topNavLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topNavCircleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  topNavEncryptedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  topNavEncryptedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  topNavAudioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  topNavAudioPillEarpiece: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#34D399',
  },
  topNavAudioPillMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
  },
  topNavAudioText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  topNavAudioTextEarpiece: {
    color: '#34D399',
  },
  topNavAudioTextMuted: {
    color: '#F87171',
  },

  /* -------------------------------------------------------------------------- */
  /* TOP-RIGHT FLOATING PARTICIPANT VIEW (PIP)                                  */
  /* -------------------------------------------------------------------------- */
  customFloatingParticipantView: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },

  /* -------------------------------------------------------------------------- */
  /* SIMULATED LOCAL PIP (DEV FALLBACK)                                         */
  /* -------------------------------------------------------------------------- */
  localPipContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 54,
    right: 14,
    width: 96,
    height: 136,
    borderRadius: 18,
    backgroundColor: 'rgba(40, 18, 12, 0.90)',
    overflow: 'hidden',
    zIndex: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  localPipPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  localPipPlaceholderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F3F4F6',
    marginTop: 6,
    textAlign: 'center',
  },
  localPipAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  localPipFlipBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  /* -------------------------------------------------------------------------- */
  /* BOTTOM FLOATING FROSTED GLASS HUD CARD                                     */
  /* -------------------------------------------------------------------------- */
  bottomHudSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  bottomHudCardWrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 10 : 16,
  },
  bottomHudCard: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  hudCallerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  hudAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  hudTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  hudNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  hudSubtitleText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 2,
  },
  hudRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudAudioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  hudAudioBadgeEarpiece: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    borderColor: '#34D399',
  },
  hudAudioBadgeMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderColor: '#EF4444',
  },
  hudAudioText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hudAudioTextEarpiece: {
    color: '#34D399',
  },
  hudAudioTextMuted: {
    color: '#F87171',
  },
  hudTimerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  hudTimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  hudControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  hudControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  hudControlButtonMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.28)',
    borderColor: 'rgba(239, 68, 68, 0.55)',
  },
  hudEndCallButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },

  /* -------------------------------------------------------------------------- */
  /* INCOMING / CONNECTING FLOATING BANNER                                      */
  /* -------------------------------------------------------------------------- */
  incomingBannerWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 28,
    left: 18,
    right: 18,
    zIndex: 35,
  },
  incomingBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  incomingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  incomingAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  incomingTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  incomingNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  incomingSubtitleText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  incomingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  incomingDeclineBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingAcceptBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C81E3A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* -------------------------------------------------------------------------- */
  /* INVITE / PARTICIPANTS FROSTED SHEET                                        */
  /* -------------------------------------------------------------------------- */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.65,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  sheetGradient: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sheetSearchCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    padding: 0,
  },
  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetAudioSection: {
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sheetAudioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  sheetAudioSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetAudioPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sheetAudioRouteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  sheetAudioRouteBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderColor: '#FFFFFF',
  },
  sheetAudioRouteBtnActiveEarpiece: {
    backgroundColor: 'rgba(16, 185, 129, 0.24)',
    borderColor: '#34D399',
  },
  sheetAudioRouteBtnActiveMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.24)',
    borderColor: '#EF4444',
  },
  sheetAudioRouteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  sheetAudioRouteBtnTextActive: {
    color: '#FFFFFF',
  },
  sheetAudioRouteBtnTextActiveEarpiece: {
    color: '#34D399',
  },
  sheetAudioRouteBtnTextActiveMuted: {
    color: '#F87171',
  },
  sheetAudioTipText: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 15,
  },
  sheetListContent: {
    paddingBottom: 20,
  },
  sheetMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetMemberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  sheetMemberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  sheetMemberFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetMemberFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetMemberTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  sheetMemberName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetMemberHandle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  sheetInvitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  sheetNotInvitedPill: {
    backgroundColor: '#FFFFFF',
  },
  sheetInvitedPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sheetInvitePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sheetNotInvitedPillText: {
    color: '#1C0E0A',
  },
  sheetInvitedPillText: {
    color: '#FFFFFF',
  },
});
