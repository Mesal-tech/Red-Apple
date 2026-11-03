import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioContext, AudioManager, AudioRecorder, RecordingNotificationManager } from 'react-native-audio-api';
import { useTheme } from '../context/ThemeContext';
import { apiRequest, getBaseApiUrl } from '../services/apiClient';
import { saveAIChatHistorySafe } from '../utils/storage';

const GEMINI_INPUT_RATE = 16000;
const GEMINI_OUTPUT_RATE = 24000;
const OUTPUT_JITTER_BUFFER_SECONDS = 0.12;
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeBase64(bytes) {
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    result += BASE64_CHARS[a >> 2]
      + BASE64_CHARS[((a & 3) << 4) | (b >> 4)]
      + (index + 1 < bytes.length ? BASE64_CHARS[((b & 15) << 2) | (c >> 6)] : '=')
      + (index + 2 < bytes.length ? BASE64_CHARS[c & 63] : '=');
  }
  return result;
}

function decodeBase64(value) {
  const clean = String(value || '').replace(/[^A-Za-z0-9+/=]/g, '');
  const output = new Uint8Array(Math.max(0, Math.floor(clean.length * 3 / 4) - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0)));
  let out = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const a = BASE64_CHARS.indexOf(clean[index]);
    const b = BASE64_CHARS.indexOf(clean[index + 1]);
    const c = BASE64_CHARS.indexOf(clean[index + 2]);
    const d = BASE64_CHARS.indexOf(clean[index + 3]);
    if (a < 0 || b < 0) continue;
    const bits = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    if (out < output.length) output[out++] = (bits >> 16) & 255;
    if (out < output.length) output[out++] = (bits >> 8) & 255;
    if (out < output.length) output[out++] = bits & 255;
  }
  return output;
}

function floatAudioToPcm16(samples, inputRate) {
  const step = inputRate / GEMINI_INPUT_RATE;
  const length = Math.max(1, Math.floor(samples.length / step));
  const bytes = new Uint8Array(length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < length; index += 1) {
    const position = index * step;
    const left = Math.floor(position);
    const fraction = position - left;
    const first = samples[Math.min(left, samples.length - 1)] || 0;
    const second = samples[Math.min(left + 1, samples.length - 1)] || 0;
    const sample = Math.max(-1, Math.min(1, first + (second - first) * fraction));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return encodeBase64(bytes);
}

function pcm16Base64ToFloat(value) {
  const bytes = decodeBase64(value);
  const samples = new Float32Array(Math.floor(bytes.length / 2));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(index * 2, true) / 0x8000;
  }
  return samples;
}

function mergeTranscriptText(previous, incoming) {
  const current = String(previous || '').trim();
  const next = String(incoming || '').trim();
  if (!current) return next;
  if (!next || current === next || current.startsWith(next)) return current;
  if (next.startsWith(current)) return next;
  const maxOverlap = Math.min(current.length, next.length);
  for (let overlap = maxOverlap; overlap > 1; overlap -= 1) {
    const currentBoundary = overlap === current.length || /[\s,.;:!?\-–—]/.test(current[current.length - overlap - 1] || '');
    const nextBoundary = overlap === next.length || /[\s,.;:!?\-–—]/.test(next[overlap] || '');
    if (currentBoundary && nextBoundary && current.slice(-overlap).toLowerCase() === next.slice(0, overlap).toLowerCase()) {
      return `${current}${next.slice(overlap)}`.replace(/\s+([,.;!?])/g, '$1');
    }
  }
  const separator = /[\s\-–—]$/.test(current) || /^[,.;:!?\s\-–—]/.test(next) ? '' : ' ';
  return `${current}${separator}${next}`.replace(/\s+([,.;!?])/g, '$1');
}

function getErrorMessage(error) {
  if (error?.status === 401) return 'Sign in to start a private voice session.';
  if (error?.status === 503) return 'Gemini voice is not configured on the backend yet.';
  if (error?.status === 429) return 'The voice service is busy right now. Please try again shortly.';
  if (error?.name === 'NotAllowedError' || /permission/i.test(error?.message || '')) {
    return 'Allow microphone access in your device settings to talk with Dr. Red.';
  }
  if (error?.name === 'AbortError' || /cannot reach|network|timeout/i.test(error?.message || '')) {
    return 'The connection dropped while starting the call. Check your internet and try again.';
  }
  return 'Dr. Red could not start a Gemini voice session. Please try again.';
}

export default function DoctorRedVoiceModal({
  visible,
  onClose,
  onOpenQuickActions,
  healthContext = {},
  user = {},
  messages = [],
  setMessages,
}) {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [liveText, setLiveText] = useState('');
  const [voiceStartedAt, setVoiceStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isUninterruptedMode, setIsUninterruptedMode] = useState(false);
  const [hasManualAudio, setHasManualAudio] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const resourcesRef = useRef(null);
  const mountedRef = useRef(false);
  const phaseRef = useRef('idle');
  const sessionConnectedRef = useRef(false);
  const uninterruptedModeRef = useRef(false);
  const retryTimerRef = useRef(null);
  const isMutedRef = useRef(false);
  const messagesRef = useRef(messages);
  const inputTranscriptIdRef = useRef(null);
  const outputTranscriptIdRef = useRef(null);
  const outputTranscriptRef = useRef('');
  const voiceSessionStartIndexRef = useRef(0);
  messagesRef.current = messages;

  const setVoicePhase = useCallback((next) => {
    phaseRef.current = next;
    if (mountedRef.current) setPhase(next);
  }, []);

  const sessionContext = useMemo(() => ({
    ...healthContext,
  }), [healthContext]);

  const saveTranscriptMessage = useCallback((role, itemId, text, isFinal = false) => {
    const content = String(text || '').trim();
    if (!content || !setMessages) return;
    const id = `realtime_${role}_${itemId || Date.now()}`;
    setMessages((current) => {
      const existingIndex = current.findIndex((item) => item.id === id);
      const updatedItem = {
        id,
        role,
        content,
        isAiGenerated: role === 'assistant' ? true : undefined,
        isStreaming: role === 'assistant' ? !isFinal : undefined,
      };
      const updated = existingIndex >= 0
        ? current.map((item, index) => index === existingIndex ? { ...item, ...updatedItem } : item)
        : [...current, updatedItem];
      if (isFinal) saveAIChatHistorySafe(user?.id, updated);
      return updated;
    });
  }, [setMessages, user?.id]);

  const startRealtimeSession = useCallback(async () => {
    if (resourcesRef.current) return;
    mountedRef.current = true;
    setErrorMessage('');
    setLiveText('Connecting securely to Dr. Red…');
    setVoicePhase('connecting');
    resourcesRef.current = {};
    try {
      const permission = await AudioManager.requestRecordingPermissions();
      if (permission !== 'Granted') throw new Error('Microphone permission is required to start voice.');
      AudioManager.setAudioSessionOptions({
        iosCategory: 'playAndRecord',
        iosMode: 'voiceChat',
        iosOptions: ['defaultToSpeaker', 'allowBluetoothHFP'],
      });
      await AudioManager.setAudioSessionActivity(true);
      if (!mountedRef.current || !resourcesRef.current) return;
      if (AppState.currentState !== 'active') {
        resourcesRef.current = null;
        Promise.resolve(AudioManager.setAudioSessionActivity(false)).catch(() => {});
        setErrorMessage('Return to Red Apple and tap Try again to start the voice session.');
        setLiveText('Your health companion is ready when you are.');
        setVoicePhase('idle');
        return;
      }
      const recentChat = messagesRef.current.slice(-8).map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: String(message.content || '').slice(0, 600),
      })).filter((message) => message.content);
      const tokenResponse = await apiRequest('/ai/realtime/session', {
        method: 'POST',
        body: JSON.stringify({ healthContext: { ...sessionContext, userName: sessionContext.userName || user?.name }, recentChat, uninterruptedMode: uninterruptedModeRef.current }),
      }, 15000);
      const session = tokenResponse?.data;
      if (!session?.ticket) {
        throw new Error(tokenResponse?.error || 'Gemini voice session setup failed.');
      }
      if (!mountedRef.current || !resourcesRef.current) return;
      if (AppState.currentState !== 'active') {
        resourcesRef.current = null;
        Promise.resolve(AudioManager.setAudioSessionActivity(false)).catch(() => {});
        setErrorMessage('Return to Red Apple and tap Try again to start the voice session.');
        setLiveText('Your health companion is ready when you are.');
        setVoicePhase('idle');
        return;
      }

      const audioContext = new AudioContext({ sampleRate: GEMINI_OUTPUT_RATE });
      await audioContext.resume();
      const socketBase = getBaseApiUrl().replace(/^http/i, 'ws').replace(/\/$/, '');
      const socket = new WebSocket(`${socketBase}/ai/realtime/stream?ticket=${encodeURIComponent(session.ticket)}`);
      const recorder = new AudioRecorder();
      const resources = { socket, audioContext, recorder, sources: new Set(), nextPlayTime: 0, ready: false, setupTimer: null, micPausedForOutput: false, turnComplete: false, speechProvider: session.speechProvider || 'gemini', uninterruptedMode: uninterruptedModeRef.current, waitingForManualResponse: false, manualHasAudio: false };
      resourcesRef.current = resources;

      const resumeRecorder = () => {
        if (isMutedRef.current || socket.readyState !== WebSocket.OPEN || resources.waitingForManualResponse) return;
        if (resources.uninterruptedMode) {
          resources.manualHasAudio = false;
          setHasManualAudio(false);
          socket.send(JSON.stringify({ realtimeInput: { activityStart: {} } }));
        }
        try { recorder.resume(); } catch {}
      };

      resources.setupTimer = setTimeout(() => {
        if (resources.ready || socket.readyState >= WebSocket.CLOSING) return;
        console.warn('[DoctorRedVoice] Gemini Live setup timed out.');
        if (mountedRef.current) {
          setErrorMessage('Gemini voice did not finish connecting. Check your network and backend configuration, then try again.');
          setVoicePhase('idle');
        }
        try { socket.close(4000, 'Gemini setup timed out'); } catch {}
      }, 25_000);
      socket.onerror = (event) => {
        console.warn('[DoctorRedVoice] Gemini Live WebSocket error:', event?.message || 'Connection failed');
        if (!resources.ready && mountedRef.current) {
          setErrorMessage('Could not connect to Gemini voice. Check your internet and try again.');
          setVoicePhase('idle');
        }
      };
      socket.onclose = () => {
        if (resources.setupTimer) {
          clearTimeout(resources.setupTimer);
          resources.setupTimer = null;
        }
        sessionConnectedRef.current = false;
        if (resourcesRef.current === resources) resourcesRef.current = null;
        try { recorder.clearOnAudioReady(); } catch {}
        try { recorder.clearOnError(); } catch {}
        Promise.resolve(recorder.stop()).catch(() => {});
        resources.sources.forEach((source) => { try { source.stop(); } catch {} });
        if (audioContext.state !== 'closed') Promise.resolve(audioContext.close()).catch(() => {});
        Promise.resolve(AudioManager.setAudioSessionActivity(false)).catch(() => {});
        if (mountedRef.current && phaseRef.current !== 'idle') {
          setErrorMessage('The Gemini voice session ended. Tap reconnect to start another call.');
          setVoicePhase('idle');
        }
      };

      const playPcmChunk = (base64Audio) => {
        if (isMutedRef.current || audioContext.state !== 'running') return;
        const samples = pcm16Base64ToFloat(base64Audio);
        if (!samples.length) return;
        if (!resources.micPausedForOutput) {
          recorder.pause();
          resources.micPausedForOutput = true;
        }
        resources.turnComplete = false;
        const buffer = audioContext.createBuffer(1, samples.length, GEMINI_OUTPUT_RATE);
        buffer.copyToChannel(samples, 0);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        const startAt = Math.max(audioContext.currentTime + OUTPUT_JITTER_BUFFER_SECONDS, resources.nextPlayTime);
        resources.nextPlayTime = startAt + buffer.duration;
        resources.sources.add(source);
        source.onEnded = () => {
          resources.sources.delete(source);
          if (!resources.sources.size && resources.turnComplete) {
            resources.micPausedForOutput = false;
            resumeRecorder();
            if (mountedRef.current) setVoicePhase('listening');
          }
        };
        source.start(startAt);
        if (mountedRef.current) setVoicePhase('speaking');
      };

      const stopPlayback = () => {
        resources.sources.forEach((source) => { try { source.stop(); } catch {} });
        resources.sources.clear();
        resources.nextPlayTime = audioContext.currentTime;
        resources.turnComplete = false;
        if (resources.micPausedForOutput) {
          resources.micPausedForOutput = false;
          resumeRecorder();
        }
      };

      const speakWithConfiguredVoice = async (text) => {
        const reply = String(text || '').trim();
        if (!reply || !mountedRef.current || resourcesRef.current !== resources) return;
        setVoicePhase('speaking');
        setLiveText(reply);
        try {
          const result = await apiRequest('/ai/realtime/speech', {
            method: 'POST',
            body: JSON.stringify({ text: reply }),
          }, 25000);
          const audio = result?.data?.audio;
          if (!audio || resourcesRef.current !== resources || socket.readyState !== WebSocket.OPEN) return;
          playPcmChunk(audio);
          resources.turnComplete = true;
          if (!resources.sources.size) {
            resources.micPausedForOutput = false;
            resumeRecorder();
            if (mountedRef.current) setVoicePhase('listening');
          }
        } catch (error) {
          console.warn('[DoctorRedVoice] Nigerian voice synthesis failed:', error?.message || error);
          resources.turnComplete = true;
          if (resources.micPausedForOutput && !resources.sources.size) {
            resources.micPausedForOutput = false;
            resumeRecorder();
          }
          if (mountedRef.current) {
            setErrorMessage(error?.status === 503
              ? 'The Nigerian voice is not configured on the backend yet.'
              : 'Dr. Red could not speak that reply. Please try again.');
            setVoicePhase('listening');
          }
        }
      };

      const sendToolResult = async (toolCall) => {
        const calls = Array.isArray(toolCall?.functionCalls) ? toolCall.functionCalls : [];
        for (const call of calls) {
          if (call.name !== 'consult_red_apple_agent') continue;
          setVoicePhase('thinking');
          setLiveText('Checking securely with your Dr. Red assistant…');
          let response;
          try {
            const result = await apiRequest('/ai/realtime/tool', {
              method: 'POST',
              body: JSON.stringify({ request: call.args?.request, healthContext: sessionContext }),
            }, 30000);
            response = result?.data || { error: 'The health assistant returned no result.' };
          } catch (error) {
            response = { error: error?.status === 401
              ? 'The user session expired. Ask them to sign in again.'
              : 'The health assistant could not complete that request. Explain this and offer to try again.' };
          }
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response }] } }));
          }
        }
      };

      socket.onmessage = async (event) => {
        let message;
        try { message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data)); } catch { return; }
        if (message.setupComplete) {
          if (resources.ready) return;
          resources.ready = true;
          if (resources.setupTimer) {
            clearTimeout(resources.setupTimer);
            resources.setupTimer = null;
          }
          sessionConnectedRef.current = true;
          setErrorMessage('');
          setLiveText('I’m here. What’s on your mind?');
          setVoicePhase('listening');
          recorder.onError((error) => {
            console.warn('[DoctorRedVoice] Microphone error:', error?.message || 'Unknown error');
            if (mountedRef.current) setErrorMessage('Microphone audio stopped. Tap reconnect to continue.');
          });
          recorder.onAudioReady({ sampleRate: GEMINI_INPUT_RATE, bufferLength: 2048, channelCount: 1 }, ({ buffer, numFrames }) => {
            if (!mountedRef.current || isMutedRef.current || resources.micPausedForOutput || resources.waitingForManualResponse || socket.readyState !== WebSocket.OPEN) return;
            const samples = buffer.getChannelData(0).subarray(0, numFrames);
            socket.send(JSON.stringify({ realtimeInput: { audio: { data: floatAudioToPcm16(samples, buffer.sampleRate || GEMINI_INPUT_RATE), mimeType: `audio/pcm;rate=${GEMINI_INPUT_RATE}` } } }));
            if (resources.uninterruptedMode && !resources.manualHasAudio) {
              resources.manualHasAudio = true;
              setHasManualAudio(true);
            }
          });
          try {
            if (resources.uninterruptedMode && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ realtimeInput: { activityStart: {} } }));
            }
            await recorder.start();
            if (Platform.OS === 'android') {
              RecordingNotificationManager.show({
                title: 'Dr. Red voice conversation',
                contentText: 'Voice call active. Return to Red Apple to end it.',
                showStopAction: false,
                dismissible: false,
              }).catch((error) => console.warn('[DoctorRedVoice] Background audio notification unavailable:', error?.message || error));
            }
            setVoiceStartedAt(Date.now());
          } catch (error) {
            console.warn('[DoctorRedVoice] Could not start microphone:', error?.message || error);
            setErrorMessage(getErrorMessage(error));
            setVoicePhase('idle');
            socket.close(1011, 'Microphone unavailable');
          }
          return;
        }
        if (message.error?.message) {
          const error = new Error(message.error.message);
          console.warn('[DoctorRedVoice] Gemini Live error:', error.message);
          if (mountedRef.current) {
            setErrorMessage(getErrorMessage(error));
            setVoicePhase('idle');
          }
          return;
        }
        if (message.toolCall) {
          await sendToolResult(message.toolCall);
          return;
        }
        const content = message.serverContent;
        if (!content) return;
        if (content.interrupted) stopPlayback();
        if (content.interimInputTranscription?.text) {
          const id = inputTranscriptIdRef.current || `gemini_input_${Date.now()}`;
          inputTranscriptIdRef.current = id;
          setLiveText(content.interimInputTranscription.text);
          saveTranscriptMessage('user', id, content.interimInputTranscription.text, false);
        }
        if (content.inputTranscription?.text) {
          const id = inputTranscriptIdRef.current || `gemini_input_${Date.now()}`;
          inputTranscriptIdRef.current = null;
          setLiveText(content.inputTranscription.text);
          saveTranscriptMessage('user', id, content.inputTranscription.text, true);
        }
        if (content.outputTranscription?.text) {
          const id = outputTranscriptIdRef.current || `gemini_output_${Date.now()}`;
          outputTranscriptIdRef.current = id;
          outputTranscriptRef.current = mergeTranscriptText(outputTranscriptRef.current, content.outputTranscription.text);
          setLiveText(outputTranscriptRef.current);
          saveTranscriptMessage('assistant', id, outputTranscriptRef.current, false);
        }
        const textParts = (content.modelTurn?.parts || []).map((part) => part?.text || '').filter(Boolean);
        if (resources.speechProvider === 'azure' && textParts.length) {
          const id = outputTranscriptIdRef.current || `gemini_output_${Date.now()}`;
          outputTranscriptIdRef.current = id;
          outputTranscriptRef.current = mergeTranscriptText(outputTranscriptRef.current, textParts.join(' '));
          setLiveText(outputTranscriptRef.current);
          saveTranscriptMessage('assistant', id, outputTranscriptRef.current, false);
          if (!resources.micPausedForOutput) {
            recorder.pause();
            resources.micPausedForOutput = true;
          }
        }
        for (const part of content.modelTurn?.parts || []) {
          if (part.inlineData?.data && String(part.inlineData.mimeType || '').startsWith('audio/pcm')) playPcmChunk(part.inlineData.data);
        }
        if (content.turnComplete) {
          const assistantReply = outputTranscriptRef.current.trim();
          const useConfiguredVoice = resources.speechProvider === 'azure' && Boolean(assistantReply);
          resources.turnComplete = !useConfiguredVoice;
          resources.waitingForManualResponse = false;
          if (outputTranscriptIdRef.current) {
            saveTranscriptMessage('assistant', outputTranscriptIdRef.current, outputTranscriptRef.current, true);
            outputTranscriptIdRef.current = null;
            outputTranscriptRef.current = '';
          }
          if (useConfiguredVoice) {
            void speakWithConfiguredVoice(assistantReply);
          } else if (!resources.sources.size) {
            if (resources.micPausedForOutput) {
              resources.micPausedForOutput = false;
              resumeRecorder();
            }
            if (mountedRef.current) setVoicePhase('listening');
          }
        }
      };
    } catch (error) {
      if (resourcesRef.current) {
        resourcesRef.current = null;
      }
      Promise.resolve(AudioManager.setAudioSessionActivity(false)).catch(() => {});
      if (mountedRef.current) {
        setErrorMessage(getErrorMessage(error));
        setLiveText('Your health companion is ready when you are.');
        setVoicePhase('idle');
      }
    }
  }, [sessionContext, setVoicePhase, user?.name]);

  const startRealtimeSessionRef = useRef(startRealtimeSession);
  startRealtimeSessionRef.current = startRealtimeSession;

  const stopRealtimeSession = useCallback(() => {
    mountedRef.current = false;
    sessionConnectedRef.current = false;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    const resources = resourcesRef.current;
    const hasSession = Boolean(resources);
    resourcesRef.current = null;
    if (hasSession) {
      if (resources?.recorder) {
        try { resources.recorder.clearOnAudioReady(); } catch {}
        try { resources.recorder.clearOnError(); } catch {}
        Promise.resolve(resources.recorder.stop()).catch(() => {});
      }
      resources?.sources?.forEach((source) => { try { source.stop(); } catch {} });
      if (resources?.setupTimer) clearTimeout(resources.setupTimer);
      if (resources?.socket && resources.socket.readyState < WebSocket.CLOSING) {
        try { resources.socket.close(1000, 'Session ended'); } catch {}
      }
      if (resources?.audioContext && resources.audioContext.state !== 'closed') {
        Promise.resolve(resources.audioContext.close()).catch(() => {});
      }
      Promise.resolve(AudioManager.setAudioSessionActivity(false)).catch(() => {});
    }
    if (Platform.OS === 'android') {
      Promise.resolve(RecordingNotificationManager.hide()).catch(() => {});
    }
    isMutedRef.current = false;
    setIsMuted(false);
    setVoiceStartedAt(null);
    setElapsedSeconds(0);
    phaseRef.current = 'idle';
    setPhase('idle');
  }, []);

  useEffect(() => {
    if (!visible) {
      stopRealtimeSession();
      return undefined;
    }
    mountedRef.current = true;
    setIsMuted(false);
    isMutedRef.current = false;
    setVoiceStartedAt(null);
    const timer = setTimeout(() => startRealtimeSessionRef.current(), 250);
    return () => {
      clearTimeout(timer);
      stopRealtimeSession();
    };
  }, [visible, stopRealtimeSession]);

  useEffect(() => {
    if (!voiceStartedAt || !visible) return undefined;
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - voiceStartedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [voiceStartedAt, visible]);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.075, duration: 1050, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1050, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const toggleMute = () => {
    const nextMuted = !isMutedRef.current;
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);
    const recorder = resourcesRef.current?.recorder;
    if (recorder) {
      try {
        if (nextMuted) recorder.pause();
        else if (!resourcesRef.current?.micPausedForOutput) recorder.resume();
      } catch (error) {
        console.warn('[DoctorRedVoice] Microphone mute toggle failed:', error?.message || error);
      }
    }
  };

  const toggleUninterruptedMode = () => {
    if (phaseRef.current === 'connecting') return;
    const nextMode = !uninterruptedModeRef.current;
    uninterruptedModeRef.current = nextMode;
    setIsUninterruptedMode(nextMode);
    setHasManualAudio(false);
    reconnect();
  };

  const finishUninterruptedTurn = () => {
    const resources = resourcesRef.current;
    if (!resources?.uninterruptedMode || resources.waitingForManualResponse || !resources.manualHasAudio) return;
    resources.waitingForManualResponse = true;
    resources.manualHasAudio = false;
    setHasManualAudio(false);
    try {
      resources.recorder.pause();
      if (resources.socket.readyState === WebSocket.OPEN) {
        resources.socket.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }));
      }
    } catch (error) {
      console.warn('[DoctorRedVoice] Could not finish manual voice turn:', error?.message || error);
    }
    setLiveText('Thinking…');
    setVoicePhase('thinking');
  };

  const endSession = () => {
    stopRealtimeSession();
    onClose?.();
  };

  const reconnect = () => {
    if (phaseRef.current === 'connecting') return;
    stopRealtimeSession();
    setVoicePhase('connecting');
    setErrorMessage('');
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      if (visible) {
        mountedRef.current = true;
        startRealtimeSession();
      }
    }, 120);
  };

  const statusColor = errorMessage ? '#D64A42' : theme.textSecondary;

  const sheetStatus = errorMessage || (phase === 'connecting' ? 'Waking up…' : phase === 'thinking' ? 'Thinking…' : phase === 'speaking' ? 'Dr. Red is speaking…' : isUninterruptedMode ? 'Speak without interruptions' : phase === 'listening' ? 'Say something…' : 'Ready when you are');
  const voiceSessionMessages = messages.slice(voiceSessionStartIndexRef.current);
  const showTranscript = isTranscriptOpen && voiceSessionMessages.some((item) => item?.content);

  useEffect(() => {
    voiceSessionStartIndexRef.current = messagesRef.current.length;
    setIsTranscriptOpen(false);
    uninterruptedModeRef.current = false;
    setIsUninterruptedMode(false);
    setHasManualAudio(false);
  }, [visible]);

  useEffect(() => {
    if (visible && messages.length > voiceSessionStartIndexRef.current) {
      setIsTranscriptOpen(true);
    }
  }, [messages.length, visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={endSession} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' }}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <View style={{
          minHeight: showTranscript ? '51%' : 220,
          maxHeight: '72%',
          paddingTop: 9,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: 22,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          backgroundColor: isDarkMode ? '#18191B' : 'rgba(255,255,255,0.97)',
          borderWidth: 1,
          borderColor: isDarkMode ? '#303135' : '#ECE9E6',
          shadowColor: '#17212E',
          shadowOffset: { width: 0, height: -7 },
          shadowOpacity: 0.14,
          shadowRadius: 20,
          elevation: 18,
        }}>
          <View style={{ width: 46, height: 5, borderRadius: 3, backgroundColor: isDarkMode ? '#4A4B50' : '#DDDAD7', alignSelf: 'center', marginBottom: 15 }} />
          {showTranscript && (
            <ScrollView style={{ flexGrow: 0, maxHeight: 180, marginBottom: 10 }} contentContainerStyle={{ paddingBottom: 6 }}>
              {voiceSessionMessages.slice(-4).map((item) => item?.content ? (
                <Text key={item.id} numberOfLines={4} style={{ color: item.role === 'assistant' ? theme.textSecondary : theme.textPrimary, fontSize: 15, lineHeight: 22, marginBottom: 8 }}>
                  {item.role === 'user' ? `You: ${item.content}` : item.content}
                </Text>
              ) : null)}
            </ScrollView>
          )}
          <Text numberOfLines={1} style={{ color: statusColor, fontSize: 16, textAlign: 'center', marginTop: showTranscript ? 0 : 3, marginBottom: 15 }}>
            {phase === 'connecting' ? 'Waking up…' : errorMessage ? 'Could not connect' : sheetStatus}
          </Text>
          {isUninterruptedMode && !errorMessage && (
            <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: -12, marginBottom: 14 }}>
              When you’re finished, tap Done to get a response
            </Text>
          )}
          {!!errorMessage && (
            <TouchableOpacity onPress={reconnect} accessibilityRole="button" accessibilityLabel="Try voice connection again" style={{ alignSelf: 'center', marginTop: -7, marginBottom: 8 }}>
              <Text style={{ color: '#D84440', fontSize: 14, fontWeight: '700' }}>Try again</Text>
            </TouchableOpacity>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
            <Animated.View style={{ width: 68, height: 68, borderRadius: 34, overflow: 'hidden', transform: [{ scale: phase === 'listening' || phase === 'speaking' ? pulse : 1 }] }}>
              <LinearGradient colors={['#6CE6E4', '#42B9D2', '#1689B2']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', top: 5, left: 8 }} />
                <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' }} />
              </LinearGradient>
            </Animated.View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: isUninterruptedMode ? 218 : 164, height: 54, borderRadius: 28, backgroundColor: isDarkMode ? '#252629' : '#F5F3F0', borderWidth: 1, borderColor: isDarkMode ? '#333438' : '#EEEAE6' }}>
              <TouchableOpacity onPress={onOpenQuickActions} accessibilityRole="button" accessibilityLabel="Open health shortcuts" style={{ width: 42, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={25} color={theme.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleMute} disabled={phase === 'idle' || phase === 'connecting'} accessibilityRole="button" accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'} style={{ width: 42, height: 46, alignItems: 'center', justifyContent: 'center', opacity: phase === 'idle' || phase === 'connecting' ? 0.5 : 1 }}>
                <Ionicons name={isMuted ? 'mic-off-outline' : 'mic-outline'} size={22} color={isMuted ? '#D84440' : theme.textPrimary} />
              </TouchableOpacity>
              {isUninterruptedMode ? (
                <TouchableOpacity onPress={finishUninterruptedTurn} disabled={phase !== 'listening' || !hasManualAudio} accessibilityRole="button" accessibilityLabel="Done speaking and get a response" style={{ minWidth: 72, height: 42, paddingHorizontal: 14, borderRadius: 22, backgroundColor: isDarkMode ? '#F4F4F5' : '#FFFFFF', alignItems: 'center', justifyContent: 'center', opacity: phase !== 'listening' || !hasManualAudio ? 0.55 : 1 }}>
                  <Text style={{ color: '#202124', fontSize: 15, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={toggleUninterruptedMode} disabled={phase === 'connecting'} accessibilityRole="button" accessibilityLabel="Speak without interruptions" style={{ width: 42, height: 46, alignItems: 'center', justifyContent: 'center', opacity: phase === 'connecting' ? 0.5 : 1 }}>
                  <Ionicons name="ear-outline" size={22} color={theme.textPrimary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={endSession} accessibilityRole="button" accessibilityLabel="End voice conversation" style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: isDarkMode ? '#252629' : '#F5F3F0', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={23} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
