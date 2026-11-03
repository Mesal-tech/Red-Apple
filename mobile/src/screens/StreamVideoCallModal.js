import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
  Dimensions,
  PanResponder,
  Platform,
  PermissionsAndroid,
  Alert,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getStreamToken } from '../services/telemedicineService';
import { getAuthSessionSafe } from '../utils/storage';
import AppBottomSheet from '../components/AppBottomSheet';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
const buildStreamCallTheme = (theme, isDarkMode) => {
  const stage = isDarkMode ? theme.card : '#E7E9EE';
  const videoSurface = isDarkMode ? theme.subtleSurface : '#D3D6DC';
  return {
  colors: {
    buttonPrimary: '#F34F62',
    sheetPrimary: stage,
  },
  callParticipantsSpotlight: {
    container: { paddingTop: 142, paddingBottom: 116, backgroundColor: stage },
    spotlightContainer: {
      flex: 2.1,
      borderRadius: 22,
      marginHorizontal: 18,
      marginTop: 4,
      marginBottom: 6,
      overflow: 'hidden',
      backgroundColor: videoSurface,
    },
    callParticipantsListContainer: { flex: 1, minHeight: 128 },
  },
  callContent: {
    container: { backgroundColor: stage },
    topContainer: {
      top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 56,
      bottom: 116,
      left: 0,
      right: 0,
    },
  },
  participantView: {
    container: {
      borderRadius: 18,
      borderWidth: 0,
      borderColor: 'transparent',
      backgroundColor: videoSurface,
    },
    highlightedContainer: {
      borderColor: 'transparent',
      borderWidth: 0,
    },
  },
  participantLabel: {
    container: {
      backgroundColor: 'rgba(27, 31, 38, 0.48)',
      borderRadius: 14,
      margin: 10,
      marginBottom: 8,
      paddingHorizontal: 10,
    },
    userNameLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
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
      backgroundColor: isDarkMode ? theme.subtleSurface : '#E1E4E9',
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
};

// Fallback high-resolution doctor/patient photos matching reference design
const DEFAULT_DOCTOR_PHOTO =
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&auto=format&fit=crop&q=80';
const DEFAULT_PATIENT_PHOTO =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';

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

function InviteParticipantsSheet({ visible, onClose, participants = [], canMuteParticipants = false, onMuteParticipant, mutingParticipantIds = [] }) {
  const { theme, isDarkMode } = useTheme();
  const activeParticipants = Array.isArray(participants) ? participants : [];
  const mutingIds = new Set(mutingParticipantIds);

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="People"
      subtitle={`${activeParticipants.length} in this call`}
      showCloseChevron
      scrollable={false}
      maxHeight="48%"
    >
      {activeParticipants.length ? activeParticipants.map((participant) => {
        const name = participant.isLocalParticipant
          ? 'You'
          : participant.name || participant.userId || 'Participant';
        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

        return (
          <View key={participant.sessionId || participant.userId || name} className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.divider }}>
            {participant.image ? (
              <Image source={{ uri: participant.image }} className="w-11 h-11 rounded-full bg-gray-100" />
            ) : (
              <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: theme.subtleSurface }}>
                <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>{initials}</Text>
              </View>
            )}
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold" style={{ color: theme.textPrimary }} numberOfLines={1}>{name}</Text>
              <Text className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>{participant.isLocalParticipant ? 'You' : 'In call'}</Text>
            </View>
            {!participant.isLocalParticipant && canMuteParticipants ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={mutingIds.has(participant.userId)
                  ? `${name} is muted`
                  : `Mute ${name}`}
                accessibilityState={{ disabled: mutingIds.has(participant.userId) }}
                disabled={mutingIds.has(participant.userId)}
                onPress={() => onMuteParticipant?.(participant)}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: mutingIds.has(participant.userId) ? (isDarkMode ? '#4A292D' : '#FDE8EB') : theme.subtleSurface }}
              >
                <Ionicons name={mutingIds.has(participant.userId) ? 'mic-off' : 'mic'} size={19} color={mutingIds.has(participant.userId) ? '#D94355' : theme.textSecondary} />
              </TouchableOpacity>
            ) : (
              <View className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </View>
        );
      }) : (
        <View className="py-8 items-center">
          <Ionicons name="people-outline" size={24} color={theme.textMuted} />
          <Text className="text-sm mt-2" style={{ color: theme.textSecondary }}>No participants are connected yet.</Text>
        </View>
      )}
    </AppBottomSheet>
  );
}

/**
 * Stream Call HUD Overlay
 * Bound inside <StreamCall> to sync with real call state and controls.
 */
function StreamCallHudOverlay({
  call,
  audioMode = 'speaker',
  isSpeakerOn = true,
  onToggleSpeaker,
  onOpenInvite,
  onHangup,
}) {
  const { useCameraState, useMicrophoneState } =
    StreamVideoSDK.useCallStateHooks();

  const { isMute: isCameraMuted } = useCameraState();
  const { isMute: isMicMuted } = useMicrophoneState();
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
    <CallRoomControlDock
      isCameraMuted={Boolean(isCameraMuted)}
      isMicMuted={Boolean(isMicMuted)}
      audioMode={audioMode || (isSpeakerOn ? 'speaker' : 'earpiece')}
      onToggleSpeaker={onToggleSpeaker}
      onOpenParticipants={onOpenInvite}
      onToggleCamera={handleToggleCamera}
      onToggleMic={handleToggleMic}
      onHangup={onHangup}
    />
  );
}

function CallRoomHeader({ title, subtitle, participantPhotos = [], participantCount, onBack, onMore, immersive = false }) {
  const { theme } = useTheme();
  const visiblePhotos = participantPhotos.filter(Boolean).slice(0, 3);

  return (
    <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-20" pointerEvents="box-none">
      <View className="px-[18px] pt-2" pointerEvents="box-none">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Leave video call"
            activeOpacity={0.75}
            onPress={onBack}
            className="w-[42px] h-[42px] rounded-full items-center justify-center shadow-sm"
            style={{ backgroundColor: immersive ? 'rgba(20,24,30,0.48)' : theme.card }}
          >
            <Ionicons name="arrow-back" size={20} color={immersive ? '#FFFFFF' : theme.textPrimary} />
          </TouchableOpacity>
          {onMore ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Call options and participants"
              activeOpacity={0.75}
              onPress={onMore}
              className="w-[42px] h-[42px] rounded-full items-center justify-center shadow-sm"
              style={{ backgroundColor: immersive ? 'rgba(20,24,30,0.48)' : theme.card }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={immersive ? '#FFFFFF' : theme.textPrimary} />
            </TouchableOpacity>
          ) : <View className="w-[42px] h-[42px]" />}
        </View>

        <View className="flex-row items-center justify-between mt-4">
          <View className="flex-1 pr-3">
            <Text className="text-[19px] font-bold" style={{ color: immersive ? '#FFFFFF' : theme.textPrimary }} numberOfLines={1}>{title}</Text>
            <Text className="text-[12px] mt-1" style={{ color: immersive ? 'rgba(255,255,255,0.82)' : theme.textSecondary }} numberOfLines={1}>{subtitle}</Text>
          </View>
          <View className="flex-row items-center pl-2">
            {visiblePhotos.map((uri, index) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                className="w-[32px] h-[32px] rounded-full border-2"
                style={{ marginLeft: index === 0 ? 0 : -11, borderColor: immersive ? '#FFFFFF' : theme.background }}
              />
            ))}
            <View className="w-[32px] h-[32px] rounded-full bg-[#303641] items-center justify-center border-2" style={{ marginLeft: -8, borderColor: immersive ? '#FFFFFF' : theme.background }}>
              <Text className="text-[10px] font-bold text-white">{participantCount ?? Math.max(1, participantPhotos.length)}</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ThemedParticipantVideoFallback({ participant }) {
  const { theme, isDarkMode } = useTheme();
  const name = participant?.name || participant?.userId || 'Participant';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: isDarkMode ? theme.subtleSurface : '#E1E4E9' }}>
      {participant?.image ? (
        <Image
          source={{ uri: participant.image }}
          className="w-[76px] h-[76px] rounded-full"
          style={{ backgroundColor: theme.card }}
          resizeMode="cover"
        />
      ) : (
        <View className="w-[76px] h-[76px] rounded-full items-center justify-center" style={{ backgroundColor: theme.card }}>
          <Text className="text-xl font-semibold" style={{ color: theme.textSecondary }}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

function StreamParticipantTile({ participant, onPress, fullscreen = false }) {
  const { theme, isDarkMode } = useTheme();
  const displayName = participant.isLocalParticipant ? 'You' : participant.name || participant.userId || 'Participant';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${participant.isLocalParticipant ? 'Your' : `${participant.name || 'Participant'}’s`} video${fullscreen ? ', exit fullscreen' : ', view fullscreen'}`}
      activeOpacity={0.96}
      onPress={onPress}
      className="flex-1 overflow-hidden"
      style={{
        borderRadius: fullscreen ? 0 : 20,
        backgroundColor: isDarkMode ? theme.subtleSurface : '#D3D6DC',
      }}
    >
      <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: isDarkMode ? theme.subtleSurface : '#D3D6DC' }} pointerEvents="none">
        {participant.image ? (
          <Image source={{ uri: participant.image }} className="w-[76px] h-[76px] rounded-full" resizeMode="cover" />
        ) : (
          <View className="w-[76px] h-[76px] rounded-full items-center justify-center" style={{ backgroundColor: theme.card }}>
            <Text className="text-xl font-semibold" style={{ color: theme.textSecondary }}>{initials}</Text>
          </View>
        )}
      </View>
      <StreamVideoSDK.ParticipantView
        participant={participant}
        objectFit="cover"
        ParticipantVideoFallback={ThemedParticipantVideoFallback}
        ParticipantLabel={NullComponent}
        ParticipantNetworkQualityIndicator={NullComponent}
        ParticipantReaction={NullComponent}
        style={{ flex: 1 }}
      />
      {!fullscreen && (
        <View className="absolute left-3 bottom-3 rounded-full bg-black/55 px-3 py-2 flex-row items-center" style={{ maxWidth: '88%' }}>
          <View className="w-2 h-2 rounded-full bg-[#69D69D] mr-2" />
          <Text className="text-white text-[11px] font-semibold" numberOfLines={1}>{displayName}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function StreamCallParticipantStage({
  waitingForName,
  subtitle,
  doctorPhoto,
  callDuration,
  onBack,
  onMore,
  onRingParticipant,
  ringStatus,
}) {
  const { theme, isDarkMode } = useTheme();
  const [focusedSessionId, setFocusedSessionId] = useState(null);
  const floatingTileWidth = 120;
  const floatingTileHeight = 160;
  const defaultFloatingPosition = {
    x: Math.max(12, SCREEN_WIDTH - floatingTileWidth - 16),
    y: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 176 : 210,
  };
  const [floatingPosition, setFloatingPosition] = useState(defaultFloatingPosition);
  const floatingPositionRef = useRef(defaultFloatingPosition);
  const dragStartRef = useRef(defaultFloatingPosition);
  const didDragRef = useRef(false);
  const updateFloatingPosition = (nextPosition) => {
    floatingPositionRef.current = nextPosition;
    setFloatingPosition(nextPosition);
  };
  const floatingTilePanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gestureState) => (
      Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5
    ),
    onPanResponderGrant: () => {
      dragStartRef.current = floatingPositionRef.current;
      didDragRef.current = false;
    },
    onPanResponderMove: (_event, gestureState) => {
      if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) didDragRef.current = true;
      const { width, height } = Dimensions.get('window');
      const minY = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 58 : 72;
      const maxX = Math.max(8, width - floatingTileWidth - 8);
      const maxY = Math.max(minY, height - floatingTileHeight - 126);
      updateFloatingPosition({
        x: Math.min(maxX, Math.max(8, dragStartRef.current.x + gestureState.dx)),
        y: Math.min(maxY, Math.max(minY, dragStartRef.current.y + gestureState.dy)),
      });
    },
  }), []);
  const stageColor = isDarkMode ? theme.background : '#E7E9EE';
  const videoSurfaceColor = isDarkMode ? theme.subtleSurface : '#D3D6DC';
  const { useRemoteParticipants, useLocalParticipant } = StreamVideoSDK.useCallStateHooks();
  const remoteParticipants = useRemoteParticipants() || [];
  const localParticipant = useLocalParticipant();
  const participants = [
    ...remoteParticipants,
    ...(localParticipant ? [localParticipant] : []),
  ];
  // Keep the consultation waiting card visible until Stream reports a remote participant.
  const featuredParticipant = remoteParticipants.length === 0
    ? null
    : remoteParticipants[0] || null;
  const secondaryParticipants = participants.filter((participant) => participant.sessionId !== featuredParticipant?.sessionId);
  const focusedParticipant = participants.find((participant) => participant.sessionId === focusedSessionId);
  const isFullscreen = Boolean(focusedParticipant);
  const mainParticipant = isFullscreen ? focusedParticipant : featuredParticipant;
  const floatingParticipants = isFullscreen
    ? participants.filter((participant) => participant.sessionId !== focusedParticipant.sessionId)
    : secondaryParticipants;
  const photos = participants.map((participant) => participant.image).filter(Boolean);

  useEffect(() => {
    floatingPositionRef.current = defaultFloatingPosition;
    setFloatingPosition(defaultFloatingPosition);
  }, [focusedSessionId]);

  return (
    <View className="flex-1" style={{ backgroundColor: stageColor }}>
      <View
        className="absolute inset-0"
        style={{
          paddingHorizontal: isFullscreen ? 0 : 12,
          paddingTop: isFullscreen ? 0 : 150,
          paddingBottom: isFullscreen ? 0 : 100,
        }}
      >
        <View className="flex-1" style={{ gap: isFullscreen ? 0 : 12 }}>
          <View
            className="flex-1 overflow-hidden"
            style={{
              borderRadius: isFullscreen ? 0 : 22,
              backgroundColor: videoSurfaceColor,
            }}
          >
            {mainParticipant ? (
              <StreamParticipantTile
                participant={mainParticipant}
                fullscreen={isFullscreen}
                onPress={() => setFocusedSessionId(isFullscreen ? null : mainParticipant.sessionId)}
              />
            ) : (
              <>
                <Image source={{ uri: doctorPhoto || DEFAULT_DOCTOR_PHOTO }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
                <LinearGradient colors={['transparent', 'rgba(18,22,28,0.66)']} locations={[0.48, 1]} className="absolute inset-0" pointerEvents="none" />
                <View className="absolute top-4 left-4 rounded-full bg-black/45 px-3 py-2 flex-row items-center">
                  <Ionicons name="lock-closed" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text className="text-white text-xs font-semibold">Waiting for participant</Text>
                </View>
                <WaitingParticipantRingButton onPress={onRingParticipant} status={ringStatus} />
                <View className="absolute bottom-4 left-4 right-4">
                  <Text className="text-white/80 text-xs font-medium">SECURE CONSULTATION</Text>
                  <Text className="text-white text-sm font-semibold mt-1" numberOfLines={1}>{waitingForName}</Text>
                  <Text className="text-white/85 text-xs mt-1">Your video is ready. The other participant hasn’t joined yet.</Text>
                </View>
              </>
            )}
          </View>

          {floatingParticipants.length > 0 && (
            <View
              className="overflow-hidden"
              style={isFullscreen
                ? {
                  position: 'absolute',
                  left: floatingPosition.x,
                  top: floatingPosition.y,
                  width: floatingTileWidth,
                  height: floatingTileHeight,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.82)',
                  backgroundColor: isDarkMode ? theme.subtleSurface : '#D3D6DC',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.28,
                  shadowRadius: 12,
                  elevation: 12,
                  zIndex: 12,
                }
                : {
                  flex: 1,
                  borderRadius: 22,
                  backgroundColor: videoSurfaceColor,
                }}
              {...(isFullscreen ? floatingTilePanResponder.panHandlers : {})}
            >
              <StreamParticipantTile
                participant={floatingParticipants[0]}
                onPress={() => {
                  if (didDragRef.current) {
                    didDragRef.current = false;
                    return;
                  }
                  setFocusedSessionId(floatingParticipants[0].sessionId);
                }}
              />
            </View>
          )}
        </View>
      </View>

      {isFullscreen && (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(10,13,18,0.58)', 'rgba(10,13,18,0.18)', 'transparent']}
          locations={[0, 0.56, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280, zIndex: 10 }}
        />
      )}

      <CallRoomHeader
        title={isFullscreen
          ? (focusedParticipant.isLocalParticipant ? 'You' : focusedParticipant.name || focusedParticipant.userId || 'Participant')
          : 'Video consultation'}
        subtitle={`${subtitle}  ·  ${formatDuration(callDuration)}`}
        participantPhotos={photos.length ? photos : [doctorPhoto]}
        participantCount={Math.max(1, participants.length)}
        onBack={onBack}
        onMore={onMore}
        immersive={isFullscreen}
      />
    </View>
  );
}

function WaitingParticipantRingButton({ onPress, status = 'idle' }) {
  const { theme } = useTheme();
  const isBusy = status === 'sending' || status === 'ringing';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={status === 'ringing' ? 'Ringing participant' : 'Ring participant'}
      accessibilityState={{ disabled: isBusy }}
      disabled={isBusy}
      activeOpacity={0.8}
      onPress={onPress}
      className="absolute top-4 right-4 rounded-full px-3 h-9 flex-row items-center justify-center border"
      style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
    >
      {isBusy ? (
        <ActivityIndicator size="small" color={theme.textSecondary} />
      ) : (
        <Ionicons name="notifications-outline" size={16} color={theme.textPrimary} />
      )}
      <Text className="text-xs font-semibold ml-1.5" style={{ color: theme.textPrimary }}>
        {status === 'ringing' ? 'Ringing…' : status === 'sending' ? 'Calling…' : 'Ring'}
      </Text>
    </TouchableOpacity>
  );
}

function ConnectingCallContent({ displayName, displaySubtitle, displayPhoto, onCancel }) {
  const { theme, isDarkMode } = useTheme();
  const stageColor = isDarkMode ? theme.background : '#E7E9EE';
  const videoSurfaceColor = isDarkMode ? theme.subtleSurface : '#D3D6DC';
  return (
    <View className="flex-1" style={{ backgroundColor: stageColor }}>
      <View className="flex-1 px-[18px]" style={{ paddingTop: 164, paddingBottom: 104 }}>
        <View className="flex-[2.1] rounded-[22px] overflow-hidden" style={{ backgroundColor: videoSurfaceColor }}>
          <Image source={{ uri: displayPhoto || DEFAULT_DOCTOR_PHOTO }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
          <LinearGradient colors={['rgba(18,22,28,0.12)', 'transparent', 'rgba(18,22,28,0.64)']} locations={[0, 0.42, 1]} className="absolute inset-0" pointerEvents="none" />
          <View className="absolute top-4 left-4 rounded-full bg-black/45 px-3 py-2 flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-[#69D69D] mr-2" />
            <Text className="text-white text-xs font-semibold">Securing line…</Text>
          </View>
          <View className="absolute bottom-4 left-4 right-4">
            <Text className="text-white/80 text-xs font-medium">RED APPLE VIDEO CONSULTATION</Text>
            <Text className="text-white text-lg font-bold mt-1" numberOfLines={1}>{displayName}</Text>
            <Text className="text-white/85 text-sm mt-1" numberOfLines={1}>{displaySubtitle}</Text>
          </View>
        </View>
        <View className="flex-1 mt-3 rounded-[18px] border items-center justify-center" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
          <Ionicons name="videocam-outline" size={25} color={theme.textSecondary} />
          <Text className="text-sm font-semibold mt-2" style={{ color: theme.textPrimary }}>Connecting your camera and microphone</Text>
          <Text className="text-xs mt-1" style={{ color: theme.textSecondary }}>This can take a few seconds</Text>
        </View>
      </View>
      <CallRoomHeader
        title="Video consultation"
        subtitle={`${displayName}  ·  Connecting securely`}
        participantPhotos={[displayPhoto]}
        participantCount={1}
        onBack={onCancel}
      />
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 z-30" pointerEvents="box-none">
        <View className="items-center pb-3 px-4">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cancel call"
            activeOpacity={0.82}
            onPress={onCancel}
            className="w-[62px] h-[62px] rounded-full bg-[#F0525F] items-center justify-center shadow-lg"
          >
            <Ionicons name="call" size={23} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function CallRoomControlDock({
  isCameraMuted,
  isMicMuted,
  audioMode,
  onToggleCamera,
  onToggleMic,
  onToggleSpeaker,
  onOpenParticipants,
  onHangup,
}) {
  const { theme, isDarkMode } = useTheme();
  const controlClass = 'w-[46px] h-[46px] rounded-full items-center justify-center';
  const mutedSurface = isDarkMode ? '#4A292D' : '#FDE8EB';

  return (
    <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 z-30" pointerEvents="box-none">
      <View className="items-center pb-3 px-4" pointerEvents="box-none">
        <View className="flex-row items-center justify-between rounded-full px-3 py-2 border shadow-lg" style={{ minWidth: 260, maxWidth: 330, backgroundColor: theme.card, borderColor: theme.cardBorder }} pointerEvents="auto">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isMicMuted ? 'Turn microphone on' : 'Mute microphone'}
            activeOpacity={0.75}
            onPress={onToggleMic}
            className={controlClass}
            style={{ backgroundColor: isMicMuted ? mutedSurface : theme.card }}
          >
            <Ionicons name={isMicMuted ? 'mic-off' : 'mic'} size={21} color={isMicMuted ? '#D94355' : theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isCameraMuted ? 'Turn camera on' : 'Turn camera off'}
            activeOpacity={0.75}
            onPress={onToggleCamera}
            className={controlClass}
            style={{ backgroundColor: isCameraMuted ? mutedSurface : theme.card }}
          >
            <Ionicons name={isCameraMuted ? 'videocam-off' : 'videocam'} size={21} color={isCameraMuted ? '#D94355' : theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Audio output: ${audioMode}`}
            activeOpacity={0.75}
            onPress={onToggleSpeaker}
            className={controlClass}
            style={{ backgroundColor: theme.card }}
          >
            <Ionicons name={audioMode === 'earpiece' ? 'volume-low' : 'volume-high'} size={21} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Participants and call options"
            activeOpacity={0.75}
            onPress={onOpenParticipants}
            className={controlClass}
            style={{ backgroundColor: theme.card }}
          >
            <Ionicons name="people-outline" size={21} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="End call"
            activeOpacity={0.82}
            onPress={onHangup}
            className="w-[46px] h-[46px] rounded-full bg-[#F0525F] items-center justify-center shadow-sm"
          >
            <Ionicons name="call" size={20} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
  const { theme, isDarkMode } = useTheme();
  const stageColor = isDarkMode ? theme.background : '#E7E9EE';
  const videoSurfaceColor = isDarkMode ? theme.subtleSurface : '#D3D6DC';
  const [cameraMuted, setCameraMuted] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  return (
    <View className="flex-1" style={{ backgroundColor: stageColor }}>
      <View className="flex-1 pt-[142px] pb-[116px]">
        <View className="flex-[2.1] mx-[18px] mb-2 rounded-[22px] overflow-hidden" style={{ backgroundColor: videoSurfaceColor }}>
          <Image source={{ uri: displayPhoto || DEFAULT_DOCTOR_PHOTO }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(18,22,28,0.62)']} locations={[0.55, 1]} className="absolute inset-0" pointerEvents="none" />
          <View className="absolute top-4 left-4 rounded-full bg-black/40 px-3 py-2 flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-[#69D69D] mr-2" />
            <Text className="text-white text-xs font-semibold" numberOfLines={1}>{displayName}</Text>
          </View>
          <View className="absolute bottom-4 left-4 right-4">
            <Text className="text-white/80 text-xs font-medium">LIVE CONSULTATION</Text>
            <Text className="text-white text-sm font-semibold mt-1" numberOfLines={1}>{displaySubtitle}</Text>
          </View>
        </View>
        <View className="flex-1 flex-row px-[10px] pt-1">
          {[{ name: 'You', photo: DEFAULT_PATIENT_PHOTO }, { name: 'Care team', photo: DEFAULT_DOCTOR_PHOTO }].map((person, index) => (
            <View key={person.name} className="flex-1 mx-2 rounded-[18px] overflow-hidden" style={{ backgroundColor: videoSurfaceColor }}>
              <Image source={{ uri: person.photo }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
              <View className="absolute bottom-3 left-3 rounded-full bg-black/45 px-2.5 py-1.5 flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-[#69D69D] mr-1.5" />
                <Text className="text-white text-[11px] font-semibold">{person.name}</Text>
              </View>
              <View className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/35 items-center justify-center">
                <Ionicons name={index === 0 && micMuted ? 'mic-off' : 'mic'} size={15} color="#FFFFFF" />
              </View>
            </View>
          ))}
        </View>
      </View>
      <CallRoomHeader
        title="Video consultation"
        subtitle={`${displayName}  ·  ${formatDuration(callDuration)}`}
        participantPhotos={[displayPhoto, DEFAULT_PATIENT_PHOTO]}
        onBack={onHangup}
        onMore={onOpenInvite}
      />
      <CallRoomControlDock
        isCameraMuted={cameraMuted}
        isMicMuted={micMuted}
        audioMode={audioMode || (isSpeakerOn ? 'speaker' : 'earpiece')}
        onToggleCamera={() => setCameraMuted((value) => !value)}
        onToggleMic={() => setMicMuted((value) => !value)}
        onToggleSpeaker={onToggleSpeaker}
        onOpenParticipants={onOpenInvite}
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
  const { theme, isDarkMode } = useTheme();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [callParticipants, setCallParticipants] = useState([]);
  const [ringRecipientId, setRingRecipientId] = useState(null);
  const [ringStatus, setRingStatus] = useState('idle');
  const [mutedParticipantIds, setMutedParticipantIds] = useState([]);
  const [mutingParticipantIds, setMutingParticipantIds] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [endConfirmation, setEndConfirmation] = useState(null);
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [audioMode, setAudioMode] = useState('earpiece'); // 'earpiece' (normal) | 'speaker' (louder)
  const streamCallTheme = useMemo(
    () => buildStreamCallTheme(theme, isDarkMode),
    [theme, isDarkMode],
  );

  const timerRef = useRef(null);
  const ringTimerRef = useRef(null);
  const callRef = useRef(null);
  const clientRef = useRef(null);
  const endConfirmationRef = useRef(null);
  const callParticipantsRef = useRef(callParticipants);
  const isEndingForEveryoneRef = useRef(false);
  callParticipantsRef.current = callParticipants;

  const updateEndConfirmation = (next) => {
    endConfirmationRef.current = next;
    setEndConfirmation(next);
  };

  const handleSetAudioMode = (targetMode) => {
    setAudioMode(targetMode);
    if (StreamVideoSDK?.callManager?.speaker) {
      try {
        if (targetMode === 'earpiece') {
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
    handleSetAudioMode(audioMode === 'speaker' ? 'earpiece' : 'speaker');
  };

  const handleMuteParticipant = async (participant) => {
    const participantId = participant?.userId;
    if (!call || !participantId || participant.isLocalParticipant || !isDoctor) return;
    setMutingParticipantIds((ids) => [...ids, participantId]);
    try {
      await call.muteUser(participantId, 'audio');
      setMutedParticipantIds((ids) => (ids.includes(participantId) ? ids : [...ids, participantId]));
    } catch (error) {
      console.warn('[StreamVideoCallModal] Could not mute participant:', error);
      Alert.alert('Could not mute participant', 'Your call permissions may not allow muting this participant.');
    } finally {
      setMutingParticipantIds((ids) => ids.filter((id) => id !== participantId));
    }
  };

  const handleRingParticipant = async () => {
    if (!call || !ringRecipientId || ringStatus === 'sending' || ringStatus === 'ringing') {
      if (!ringRecipientId) {
        Alert.alert('Can’t ring participant', 'This consultation is missing the other participant’s account ID.');
      }
      return;
    }

    setRingStatus('sending');
    try {
      const isCallMember = (call.state.members || []).some((member) => member.user_id === ringRecipientId);
      if (!isCallMember) {
        if (!call.state.ownCapabilities?.includes('update-call-member')) {
          throw new Error('The other participant is not a member of this call.');
        }
        await call.updateCallMembers({ update_members: [{ user_id: ringRecipientId }] });
      }

      const ringResponse = await call.ring({ members_ids: [ringRecipientId], video: true });
      if (!ringResponse?.members_ids?.includes(ringRecipientId)) {
        if (!callParticipantsRef.current.some((participant) => !participant.isLocalParticipant)) {
          throw new Error('Stream did not deliver the ring to the other participant.');
        }
        setRingStatus('idle');
        return;
      }
      if (!callParticipantsRef.current.some((participant) => !participant.isLocalParticipant)) {
        setRingStatus('ringing');
        const configuredTimeout = Number(call.state.settings?.ring?.auto_cancel_timeout_ms);
        if (configuredTimeout > 0) {
          if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
          ringTimerRef.current = setTimeout(() => {
            setRingStatus('idle');
            ringTimerRef.current = null;
          }, configuredTimeout);
        }
      } else {
        setRingStatus('idle');
      }
    } catch (error) {
      setRingStatus('idle');
      console.warn('[StreamVideoCallModal] Could not ring participant:', error);
      Alert.alert('Could not ring participant', error?.message || 'Check your connection and call permissions, then try again.');
    }
  };

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  useEffect(() => {
    if (!call) {
      setCallParticipants([]);
      setMutedParticipantIds([]);
      return undefined;
    }

    setCallParticipants(call.state.participants || []);
    const subscription = call.state.participants$.subscribe(setCallParticipants);
    return () => subscription.unsubscribe();
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

  const hasRemoteParticipant = callParticipants.some(
    (participant) => !participant.isLocalParticipant,
  );

  useEffect(() => {
    if (hasRemoteParticipant) {
      setRingStatus('idle');
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, [hasRemoteParticipant]);

  useEffect(() => {
    if (visible) setCallDuration(0);
  }, [visible]);

  // Start consultation duration once another participant joins. Pause during
  // disconnects, then resume from the elapsed duration if they reconnect.
  useEffect(() => {
    if (visible && isCallAccepted && hasRemoteParticipant) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, isCallAccepted, hasRemoteParticipant]);

  // Initialize Stream Video Client and join room
  useEffect(() => {
    let isCancelled = false;

    async function initStreamVideo() {
      if (!visible || !booking) return;

      setIsConnecting(true);
      setIsCallAccepted(false);
      setRingStatus('idle');
      setRingRecipientId(null);

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

        const otherUserId = isDoctor
          ? (booking?.user_id || booking?.patient_id || booking?.patient?.id)
          : 'doc_mesal_okubor';
        setRingRecipientId(otherUserId && otherUserId !== userId ? otherUserId : null);

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

        // Keep voice processing explicitly enabled on native capture. This protects
        // against speaker-to-microphone feedback on devices that don't apply the
        // WebRTC defaults consistently.
        activeCall.microphone?.setDefaultConstraints?.({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: { ideal: 1 },
        });

        try {
          // Explicitly disable local audio loopback to prevent echo feedback into speakers
          await activeCall.join({
            create: true,
            data: otherUserId && otherUserId !== userId
              ? { members: [{ user_id: otherUserId }] }
              : undefined,
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
        if (StreamVideoSDK?.callManager?.speaker) {
          StreamVideoSDK.callManager.speaker.setMute(false);
          StreamVideoSDK.callManager.speaker.setForceSpeakerphoneOn(false);
        }

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
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
      setRingStatus('idle');
      setRingRecipientId(null);
    };
  }, [visible, booking, isDoctor]);

  const handleHangup = async () => {
    updateEndConfirmation(null);
    setRingStatus('idle');
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
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

  const getLocalParticipant = () => callParticipantsRef.current.find((participant) => participant.isLocalParticipant);
  const getParticipantIds = () => [...new Set(callParticipantsRef.current.map((participant) => participant.userId).filter(Boolean))];
  const canEndCallForEveryone = () => Boolean(call?.state?.ownCapabilities?.includes('end-call'));

  const finishCallForEveryone = async () => {
    if (!call || isEndingForEveryoneRef.current) return;
    isEndingForEveryoneRef.current = true;
    try {
      await call.endCall();
      await handleHangup();
    } catch (error) {
      isEndingForEveryoneRef.current = false;
      console.warn('[StreamVideoCallModal] Could not end call for everyone:', error);
      updateEndConfirmation(null);
      Alert.alert('Could not end call', 'The call could not be ended for everyone. Please try again.');
    }
  };

  const handleRequestEndCall = async () => {
    const remoteIsPresent = callParticipantsRef.current.some((participant) => !participant.isLocalParticipant);
    if (!call || !remoteIsPresent) {
      await handleHangup();
      return;
    }

    const localParticipant = getLocalParticipant();
    const requestId = `${localParticipant?.sessionId || localParticipant?.userId || 'call'}-${Date.now()}`;
    const request = {
      requestId,
      requesterId: localParticipant?.userId,
      requesterName: localParticipant?.name || currentUser?.name || 'A participant',
      responses: [],
      responseSent: false,
    };
    updateEndConfirmation(request);
    try {
      await call.sendCustomEvent({
        redAppleCallAction: 'end_confirmation_request',
        requestId,
        requesterId: request.requesterId,
        requesterName: request.requesterName,
      });
    } catch (error) {
      console.warn('[StreamVideoCallModal] Could not send end-call confirmation:', error);
      updateEndConfirmation(null);
      Alert.alert('Unable to request call end', 'Check your connection and try again.');
    }
  };

  const respondToEndConfirmation = async (accepted) => {
    const request = endConfirmationRef.current;
    const localParticipant = getLocalParticipant();
    if (!request || !call || !localParticipant?.userId) return;
    if (accepted && request.responseSent) return;

    try {
      await call.sendCustomEvent({
        redAppleCallAction: 'end_confirmation_response',
        requestId: request.requestId,
        participantId: localParticipant.userId,
        accepted,
      });
      if (!accepted) {
        updateEndConfirmation(null);
        return;
      }

      const responses = [...new Set([...request.responses, localParticipant.userId])];
      const updated = { ...request, responses, responseSent: true };
      updateEndConfirmation(updated);
      if (canEndCallForEveryone() && getParticipantIds().every((id) => responses.includes(id))) {
        await finishCallForEveryone();
      }
    } catch (error) {
      console.warn('[StreamVideoCallModal] Could not send end-call confirmation response:', error);
      Alert.alert('Unable to confirm', 'Check your connection and try again.');
    }
  };

  useEffect(() => {
    if (!call) return undefined;
    isEndingForEveryoneRef.current = false;
    updateEndConfirmation(null);

    const handleCustomEvent = (event) => {
      const data = event.custom || {};
      const localParticipant = getLocalParticipant();
      if (data.redAppleCallAction === 'end_confirmation_request') {
        const requesterId = event.user?.id;
        if (!requesterId || requesterId === localParticipant?.userId || !getParticipantIds().includes(requesterId)) return;
        updateEndConfirmation({
          requestId: data.requestId,
          requesterId,
          requesterName: data.requesterName || event.user?.name || 'A participant',
          responses: [],
          responseSent: false,
        });
        return;
      }

      const activeRequest = endConfirmationRef.current;
      if (data.redAppleCallAction !== 'end_confirmation_response' || !activeRequest || data.requestId !== activeRequest.requestId) return;
      if (!data.accepted) {
        updateEndConfirmation(null);
        return;
      }

      const responderId = event.user?.id;
      if (!responderId || !getParticipantIds().includes(responderId)) return;
      const responses = [...new Set([...activeRequest.responses, responderId])];
      const updated = { ...activeRequest, responses };
      updateEndConfirmation(updated);
      if (canEndCallForEveryone() && getParticipantIds().every((id) => responses.includes(id))) {
        finishCallForEveryone();
      }
    };

    const handleCallEnded = () => {
      if (!isEndingForEveryoneRef.current) handleHangup();
    };
    const unsubscribeCustom = call.on('custom', handleCustomEvent);
    const unsubscribeEnded = call.on('call.ended', handleCallEnded);
    return () => {
      unsubscribeCustom();
      unsubscribeEnded();
    };
  }, [call]);

  useEffect(() => {
    if (!call) return undefined;
    const handleRingEnded = (event) => {
      if (event.user?.id !== ringRecipientId) return;
      setRingStatus('idle');
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    };
    return call.on('call.rejected', handleRingEnded);
  }, [call, ringRecipientId]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => (endConfirmation ? respondToEndConfirmation(false) : handleRequestEndCall())}
    >
      <View className="flex-1 bg-black">
        <StatusBar
          barStyle={theme.statusBar}
          translucent
          backgroundColor="transparent"
        />

        {/* CONNECTING / RINGING STAGE */}
        {isConnecting && !isCallAccepted ? (
          <ConnectingCallContent
            displayName={defaultDisplayName}
            displaySubtitle={defaultDisplaySubtitle}
            displayPhoto={defaultDisplayPhoto}
            onCancel={handleHangup}
          />
        ) : client && call && StreamVideoSDK ? (
          /* ACTIVE STREAM WEBRTC CALL - Spotlight video layout with a floating control dock */
          <StreamVideoSDK.StreamVideo
            client={client}
            style={streamCallTheme}
          >
            <StreamVideoSDK.StreamCall call={call}>
              <View className="flex-1" style={{ backgroundColor: isDarkMode ? theme.background : '#E7E9EE' }}>
                <StreamCallParticipantStage
                  waitingForName={defaultDisplayName}
                  subtitle={defaultDisplaySubtitle}
                  doctorPhoto={defaultDisplayPhoto}
                  callDuration={callDuration}
                  onBack={handleRequestEndCall}
                  onMore={() => setIsInviteOpen(true)}
                  onRingParticipant={handleRingParticipant}
                  ringStatus={ringStatus}
                />

                <StreamCallHudOverlay
                  call={call}
                  audioMode={audioMode}
                  onToggleSpeaker={handleCycleAudioMode}
                  onOpenInvite={() => setIsInviteOpen(true)}
                  onHangup={handleRequestEndCall}
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
            onHangup={handleRequestEndCall}
            onOpenInvite={() => setIsInviteOpen(true)}
          />
        )}

        {/* INVITE / PARTICIPANTS SHEET MODAL */}
        <InviteParticipantsSheet
          visible={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          participants={callParticipants}
          canMuteParticipants={isDoctor}
          onMuteParticipant={handleMuteParticipant}
          mutingParticipantIds={[...mutedParticipantIds, ...mutingParticipantIds]}
        />

        {endConfirmation ? (() => {
          const localParticipantId = getLocalParticipant()?.userId;
          const isRequester = endConfirmation.requesterId === localParticipantId;
          const otherParticipant = callParticipants.find((participant) => participant.userId !== localParticipantId);
          const otherName = isRequester
            ? (otherParticipant?.name || 'the other participant')
            : endConfirmation.requesterName;

          return (
            <View
              className="items-center justify-center px-6"
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, elevation: 100, backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <View className="w-full rounded-[28px] p-6" style={{ maxWidth: 400, backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1 }}>
                <View className="w-12 h-12 rounded-full items-center justify-center mb-4" style={{ backgroundColor: isDarkMode ? '#4A292D' : '#FDE8EB' }}>
                  <Ionicons name="call" size={21} color="#D94355" style={{ transform: [{ rotate: '135deg' }] }} />
                </View>
                <Text className="text-xl font-bold" style={{ color: theme.textPrimary }}>End call for everyone?</Text>
                <Text className="text-sm leading-5 mt-2" style={{ color: theme.textSecondary }}>
                  {isRequester
                    ? `Confirm with ${otherName} to end this consultation for both of you.`
                    : `${otherName} wants to end this consultation. You both need to confirm to end the call.`}
                </Text>
                {endConfirmation.responseSent && (
                  <Text className="text-sm font-medium mt-4" style={{ color: theme.textSecondary }}>
                    Waiting for {otherName} to confirm…
                  </Text>
                )}
                <View className="flex-row mt-6" style={{ gap: 10 }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => respondToEndConfirmation(false)}
                    className="flex-1 h-12 rounded-full items-center justify-center border"
                    style={{ backgroundColor: theme.subtleSurface, borderColor: theme.cardBorder }}
                  >
                    <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Keep call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={endConfirmation.responseSent}
                    onPress={() => respondToEndConfirmation(true)}
                    className="flex-1 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: endConfirmation.responseSent ? theme.textMuted : '#F0525F', opacity: endConfirmation.responseSent ? 0.75 : 1 }}
                  >
                    <Text className="text-sm font-semibold text-white">End for both</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })() : null}
      </View>
    </Modal>
  );
}
