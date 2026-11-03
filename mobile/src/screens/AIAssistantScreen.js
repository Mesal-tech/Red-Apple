import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StatusBar,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DoctorRedVoiceModal from '../components/DoctorRedVoiceModal';
import aiService from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import {
  getHealthProfileSafe,
  getCachedActiveHealthMode,
  getAIChatHistorySafe,
  saveAIChatHistorySafe,
  clearAIChatHistorySafe,
} from '../utils/storage';
import { getUserBookings } from '../services/telemedicineService';
import cycleService from '../services/cycleService';
import { useTheme } from '../context/ThemeContext';

// Keep assistant replies easy to scan without requiring a native Markdown package.
function AssistantReply({ content, color }) {
  const paragraphs = String(content || '').split(/\n\s*\n/).filter(Boolean);

  return (
    <View className="w-full" style={{ gap: 12 }}>
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph.split('\n').filter(Boolean);
        return (
          <View key={`paragraph-${index}`} style={{ gap: 6 }}>
            {lines.map((line, lineIndex) => {
              const isListItem = /^\s*(?:[-*•]|\d+[.)])\s+/.test(line);
              const cleanLine = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '');
              const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
              return (
                <View key={`line-${lineIndex}`} className="flex-row" style={{ alignItems: 'flex-start' }}>
                  {isListItem && <Text style={{ color, fontSize: 16, lineHeight: 25, marginRight: 8 }}>•</Text>}
                  <Text style={{ color, fontSize: 16, lineHeight: 25, flex: 1, letterSpacing: 0.05 }}>
                    {parts.map((part, partIndex) => part.startsWith('**') && part.endsWith('**')
                      ? <Text key={partIndex} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>
                      : <Text key={partIndex}>{part}</Text>)}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

export default function AIAssistantScreen({ navigation, route, healthContext = {}, onClose }) {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [showQuickActionSheet, setShowQuickActionSheet] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);
  const composerInputRef = useRef(null);
  const isComposerExpanded = isComposerFocused || inputText.trim().length > 0;

  const selectedDateKey = route?.params?.selectedDateKey || new Date().toISOString().split('T')[0];

  const [userBookingsList, setUserBookingsList] = useState([]);
  const [cyclePrediction, setCyclePrediction] = useState({});

  // Restore previous AI chat conversations on mount
  useEffect(() => {
    let isMounted = true;
    getAIChatHistorySafe(user?.id).then((saved) => {
      if (isMounted && Array.isArray(saved) && saved.length > 0) {
        setMessages(saved);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 120);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;
    getUserBookings()
      .then((res) => {
        if (isMounted && Array.isArray(res)) setUserBookingsList(res);
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchCycleData() {
      try {
        const stored = (await getHealthProfileSafe()) || user?.health_profile || {};
        const pred = await cycleService.getFertilityPrediction({
          cycleLength: Number(stored.cycleLength || 28),
          periodDuration: Number(stored.periodDuration || 5),
          lastPeriodDate: stored.lastPeriodDate,
        });
        if (isMounted && pred) setCyclePrediction(pred);
      } catch (e) { }
    }
    fetchCycleData();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Support incoming initial queries (e.g. from Home screen "Talk with Dr. Red")
  useEffect(() => {
    if (route?.params?.initialQuery) {
      const q = route.params.initialQuery;
      if (route.params.autoSend) {
        const timer = setTimeout(() => {
          handleSendMessage(q);
        }, 350);
        return () => clearTimeout(timer);
      } else {
        setInputText(q);
      }
    }
  }, [route?.params?.initialQuery, route?.params?.timestamp]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const h = e?.endCoordinates?.height || 0;
      setAndroidKeyboardHeight(h);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 60);
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Sileo Toaster State & Animation
  const [sileoToast, setSileoToast] = useState({
    visible: false,
    title: 'Connection Issue',
    message: 'There was a problem connecting to the AI. Please try again.',
  });
  const sileoTranslateY = useRef(new Animated.Value(-120)).current;
  const sileoOpacity = useRef(new Animated.Value(0)).current;
  const sileoScale = useRef(new Animated.Value(0.88)).current;
  const sileoTimerRef = useRef(null);

  const hideSileoToast = useCallback(() => {
    if (sileoTimerRef.current) {
      clearTimeout(sileoTimerRef.current);
      sileoTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(sileoTranslateY, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sileoOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sileoScale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSileoToast((prev) => ({ ...prev, visible: false }));
    });
  }, [sileoTranslateY, sileoOpacity, sileoScale]);

  const showSileoToast = useCallback(
    ({ title = 'Connection Issue', message = 'There was a problem connecting to the AI. Please try again.', duration = 4000 }) => {
      if (sileoTimerRef.current) {
        clearTimeout(sileoTimerRef.current);
      }
      setSileoToast({ visible: true, title, message });

      sileoTranslateY.setValue(-120);
      sileoOpacity.setValue(0);
      sileoScale.setValue(0.88);

      Animated.parallel([
        Animated.spring(sileoTranslateY, {
          toValue: 0,
          friction: 6.5,
          tension: 75,
          useNativeDriver: true,
        }),
        Animated.timing(sileoOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(sileoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      sileoTimerRef.current = setTimeout(() => {
        hideSileoToast();
      }, duration);
    },
    [sileoTranslateY, sileoOpacity, sileoScale, hideSileoToast]
  );

  const activeMode = getCachedActiveHealthMode() || user?.health_profile?.stage || (user?.pregnancy_mode ? 'pregnancy' : 'cycle');

  const resolvedHealthContext = useMemo(() => {
    return {
      userId: user?.id || user?.user_id,
      activeMode,
      userName: user?.name ? user.name.split(' ')[0] : 'there',
      medicalProfile: {
        reproductiveGoal: user?.health_profile?.reproductiveGoal || 'track_cycle',
        birthControl: user?.health_profile?.birthControl || 'None reported',
        conditions: user?.health_profile?.conditions || [],
        notes: user?.health_profile?.notes || '',
      },
      appointments: userBookingsList.map((b) => ({
        id: b.booking_id,
        doctorId: b.doctor_id,
        doctorName: b.doctor_name,
        doctorSpecialty: b.doctor_specialty,
        scheduledTime: b.scheduled_time,
        consultationType: b.consultation_type,
        status: b.status,
      })),
      cycle: {
        currentCycleDay: cyclePrediction.currentCycleDay || 1,
        cycleLength: user?.health_profile?.cycleLength || 28,
        phaseName: cyclePrediction.currentPhase
          ? cyclePrediction.currentPhase.charAt(0).toUpperCase() + cyclePrediction.currentPhase.slice(1) + ' Phase'
          : 'Menstrual Phase',
        nextPeriodDate: cyclePrediction.nextPeriodStartDate || '',
        ovulationDate: cyclePrediction.estimatedOvulationDate || '',
      },
      ...healthContext,
    };
  }, [user, userBookingsList, cyclePrediction, healthContext, activeMode]);

  const quickPrompts = useMemo(() => [
    { id: 'p1', label: '🩸 Cycle & Fertile Window', prompt: 'When is my next estimated period and peak fertile window?' },
    { id: 'p2', label: '🥑 Pregnancy & Fetal Care', prompt: 'What are essential prenatal milestones, kicks tracking, and nutrition tips?' },
    { id: 'p3', label: '🩺 Doctor Consultation', prompt: 'How do I book or prepare for a consultation with an OB-GYN specialist?' },
    { id: 'p4', label: '🌡️ Hormones & Menopause', prompt: 'What natural remedies help regulate hormonal fluctuations and hot flashes?' },
  ], []);

  const handleSendMessage = async (textToSend) => {
    const userText = (textToSend || inputText).trim();
    if (!userText || isProcessing) return;

    setInputText('');
    setShowQuickActionSheet(false);

    const userMessageId = `user_${Date.now()}`;
    const assistantMessageId = `assistant_${Date.now()}`;

    const newHistory = [
      ...messages.map((m) => (m.suggestedQuickReplies ? { ...m, suggestedQuickReplies: [] } : m)),
      {
        id: userMessageId,
        role: 'user',
        content: userText,
      },
    ];

    setMessages([
      ...newHistory,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      },
    ]);
    setIsProcessing(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);

    const historyPayload = newHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    aiService.streamChatWithAgent(
      userText,
      historyPayload,
      {
        ...resolvedHealthContext,
        selectedDate: selectedDateKey,
      },
      (accumulatedText) => {
        setIsProcessing(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: accumulatedText, isStreaming: true }
              : m
          )
        );
        scrollViewRef.current?.scrollToEnd({ animated: true });
      },
      (finalResult) => {
        setIsProcessing(false);
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === assistantMessageId
              ? {
                ...m,
                content: finalResult.reply,
                triage: finalResult.triage,
                toolActions: finalResult.toolActions || m.toolActions || [],
                suggestedQuickReplies: finalResult.suggestedQuickReplies || [],
                isAiGenerated: true,
                isStreaming: false,
              }
              : m
          );
          saveAIChatHistorySafe(user?.id, next);
          return next;
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (_err) => {
        setIsProcessing(false);
        setInputText(userText);
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== userMessageId && m.id !== assistantMessageId);
          saveAIChatHistorySafe(user?.id, filtered);
          return filtered;
        });
        showSileoToast({
          title: 'Connection Issue',
          message: 'There was a problem connecting to the AI. Please try again.',
        });
      },
      (action) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                ...m,
                toolActions: m.toolActions ? [...m.toolActions, action] : [action],
              }
              : m
          )
        );
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    );
  };

  const handleClearChat = () => {
    clearAIChatHistorySafe(user?.id);
    setMessages([]);
    setShowOptionsMenu(false);
  };

  const shortcutItems = [
    { id: 't1', label: '🩺 Consult an OB-GYN', text: 'I would like to consult an OB-GYN specialist about my reproductive health' },
    { id: 't2', label: '📅 Upcoming appointment', text: 'Do I have any upcoming consultations booked with a specialist?' },
    { id: 't3', label: '📋 Prep visit notes', text: 'Help me prepare questions for my doctor consultation' },
    { id: 'c1', label: '🩸 Period: Light flow', text: 'Period active with light flow' },
    { id: 'c2', label: '🩸 Period: Medium / Heavy', text: 'Period active with medium flow' },
    { id: 'c3', label: '🤕 Cramps', text: 'Lower abdominal cramps' },
    { id: 'c4', label: '🌸 Ovulation pain', text: 'Mild one-sided ovulation cramping' },
    { id: 'k1', label: '🥑 Baby kicks noticed', text: 'Noticed active baby kicks today' },
    { id: 'k2', label: '🤢 Morning sickness', text: 'Experiencing morning sickness and nausea' },
    { id: 'm1', label: '🌡️ Hot flash', text: 'Experiencing intense hot flashes' },
    { id: 'm2', label: '🌙 Night sweats', text: 'Disruptive night sweats' },
    { id: 'w1', label: '⚡ Low energy / Fatigue', text: 'Feeling drained with low energy' },
    { id: 'w2', label: '🤕 Headache', text: 'Throbbing headache' },
    { id: 'w3', label: '😊 Calm & happy', text: 'Feeling calm, happy, and energized' },
  ];

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent={true} />

      {/* Sileo Toast Banner */}
      {sileoToast.visible && (
        <Animated.View
          className="absolute top-12 left-4 right-4 z-50 shadow-lg"
          style={{
            opacity: sileoOpacity,
            transform: [{ translateY: sileoTranslateY }, { scale: sileoScale }],
          }}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={hideSileoToast}
            className="flex-row items-center bg-gray-900 rounded-2xl p-3.5 border border-gray-700/60 shadow-xl"
          >
            <View className="w-8 h-8 rounded-full bg-red-950 items-center justify-center mr-3 border border-red-500/30">
              <Ionicons name="cloud-offline" size={17} color="#EF4444" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-white">{sileoToast.title}</Text>
              <Text className="text-[11px] text-gray-300 mt-0.5" numberOfLines={2}>
                {sileoToast.message}
              </Text>
            </View>
            <TouchableOpacity onPress={hideSileoToast} className="p-1 ml-2">
              <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Header Bar */}
      <View
        className="flex-row items-center justify-between px-4 py-3"
        style={{
          backgroundColor: theme.background,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDarkMode ? '#2B2B2B' : '#F9FAFB',
            borderColor: theme.cardBorder,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={handleBack}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDarkMode ? '#2B2B2B' : '#F9FAFB',
            borderColor: theme.cardBorder,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setShowOptionsMenu(!showOptionsMenu)}
          accessibilityLabel="Options menu"
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Options Dropdown Menu */}
      {showOptionsMenu && (
        <View
          className="absolute top-16 right-4 z-50 rounded-2xl p-2 shadow-xl w-52"
          style={{
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
            borderWidth: 1,
          }}
        >
          <TouchableOpacity
            className="flex-row items-center gap-2.5 px-3 py-2.5 rounded-xl"
            onPress={handleClearChat}
          >
            <Ionicons name="refresh-outline" size={17} color={theme.textPrimary} />
            <Text className="text-xs font-semibold" style={{ color: theme.textPrimary }}>Clear Conversation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-2.5 px-3 py-2.5 rounded-xl mt-1"
            style={{ borderTopWidth: 1, borderTopColor: theme.divider }}
            onPress={() => {
              setShowOptionsMenu(false);
              navigation?.navigate('Telemed');
            }}
          >
            <Ionicons name="videocam-outline" size={17} color="#008080" />
            <Text className="text-xs font-semibold text-teal-600">Consult Doctor</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Chat Thread */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={Platform.OS === 'android' && androidKeyboardHeight > 0 ? { paddingBottom: androidKeyboardHeight } : {}}
      >
        {messages.length === 0 ? (
          /* Empty Hero State */
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingTop: 42, paddingBottom: 30, alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-5"
              style={{
                backgroundColor: isDarkMode ? '#35181D' : '#FEF2F2',
                borderColor: isDarkMode ? '#5C222A' : '#FEE2E2',
                borderWidth: 1,
              }}
            >
              <Ionicons name="sparkles" size={28} color="#DC2626" />
            </View>
            <Text className="text-[27px] font-bold text-center tracking-tight" style={{ color: theme.textPrimary, letterSpacing: -0.7 }}>
              Your health, with more clarity.
            </Text>
            <Text className="text-[15px] text-center mt-2 px-4 leading-6" style={{ color: theme.textSecondary }}>
              Ask Dr. Red about your cycle, symptoms, pregnancy, or reproductive wellness.
            </Text>

            {/* Quick Starters */}
            <View className="w-full mt-8">
              <Text className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: theme.textSecondary }}>
                Start with a topic
              </Text>
              <View className="flex-row flex-wrap justify-between">
                {quickPrompts.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.8}
                    className="rounded-[20px] p-3.5 mb-2.5"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: theme.cardBorder,
                      borderWidth: 1,
                      width: '48.5%',
                      minHeight: 104,
                    }}
                    onPress={() => handleSendMessage(p.prompt)}
                  >
                    <View className="flex-1 justify-between">
                      <Text className="text-[12px] font-bold leading-5" style={{ color: theme.textPrimary }}>{p.label}</Text>
                      <Text className="text-[11px] mt-2 leading-4" style={{ color: theme.textSecondary }} numberOfLines={2}>
                        {p.prompt}
                      </Text>
                    </View>
                    <View className="absolute right-3 bottom-3">
                      <Ionicons name="arrow-forward" size={14} color="#DC2626" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : (
          /* Conversation Thread */
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-5"
            contentContainerStyle={{ paddingTop: 22, paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((item, index) => {
              const isLatestAssistant =
                index ===
                messages
                  .map((m, idx) => (m.role === 'assistant' ? idx : -1))
                  .filter((idx) => idx !== -1)
                  .pop();

              return (
                <View
                  key={item.id}
                  className="mb-5"
                  style={{ width: '100%', alignItems: item.role === 'assistant' ? 'flex-start' : 'flex-end' }}
                >
                  {item.role === 'assistant' ? (
                    <View className="items-start w-full">
                      {item.content ? (
                        <AssistantReply content={item.content} color={theme.textPrimary} />
                      ) : (
                        <View className="flex-row items-center gap-2 py-2">
                          <ActivityIndicator size="small" color="#DC2626" />
                          <Text className="text-sm font-medium" style={{ color: theme.textSecondary }}>Dr. Red is thinking</Text>
                        </View>
                      )}

                      {/* Production Agent Action Cards */}
                      {item.toolActions && item.toolActions.length > 0 && (
                        <View className="w-full mt-2 gap-2">
                          {item.toolActions.map((action, actIdx) => {
                            if (action.tool === 'log_symptoms') {
                              const symptomsList = Array.isArray(action.args?.symptoms) ? action.args.symptoms : [];
                              const flow = action.args?.flowIntensity;
                              return (
                                <View
                                  key={action.id || `act_${actIdx}`}
                                  className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 w-full shadow-2xs"
                                >
                                  <View className="flex-row items-center justify-between mb-1.5">
                                    <View className="flex-row items-center gap-1.5">
                                      <View className="w-5 h-5 rounded-full bg-emerald-600 items-center justify-center">
                                        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                      </View>
                                      <Text className="text-xs font-bold text-emerald-950">
                                        Logged to Health Tracker
                                      </Text>
                                    </View>
                                    <Text className="text-[10px] font-semibold text-emerald-700 uppercase">Today</Text>
                                  </View>

                                  {symptomsList.length > 0 && (
                                    <View className="flex-row flex-wrap gap-1.5 mt-1">
                                      {symptomsList.map((symp, sIdx) => (
                                        <View key={sIdx} className="bg-white border border-emerald-200/80 rounded-lg px-2 py-0.5">
                                          <Text className="text-[11px] font-semibold text-emerald-800 capitalize">{symp}</Text>
                                        </View>
                                      ))}
                                      {flow && flow !== 'None' && (
                                        <View className="bg-red-50 border border-red-200 rounded-lg px-2 py-0.5">
                                          <Text className="text-[11px] font-bold text-red-700">{flow} Flow</Text>
                                        </View>
                                      )}
                                    </View>
                                  )}

                                  {action.args?.notes ? (
                                    <Text className="text-[11px] text-emerald-800/80 mt-1.5 italic" numberOfLines={2}>
                                      "{action.args.notes}"
                                    </Text>
                                  ) : null}

                                  <TouchableOpacity
                                    activeOpacity={0.75}
                                    className="mt-2 pt-2 border-t border-emerald-200/60 flex-row items-center justify-between"
                                    onPress={() => navigation?.navigate('CycleTracking')}
                                  >
                                    <Text className="text-[11px] font-bold text-emerald-800">View Cycle Calendar</Text>
                                    <Ionicons name="arrow-forward" size={13} color="#065F46" />
                                  </TouchableOpacity>
                                </View>
                              );
                            }

                            if (action.tool === 'find_available_doctors') {
                              const doctors = action.result?.doctors || [];
                              return (
                                <View
                                  key={action.id || `act_${actIdx}`}
                                  className="bg-white border border-teal-200 rounded-2xl p-3 w-full shadow-xs"
                                >
                                  <View className="flex-row items-center justify-between mb-2 pb-1.5 border-b border-gray-100">
                                    <View className="flex-row items-center gap-1.5">
                                      <Ionicons name="medical" size={15} color="#0F766E" />
                                      <Text className="text-xs font-bold text-teal-950">Verified Specialists</Text>
                                    </View>
                                    <Text className="text-[10px] font-semibold text-teal-700">Telemedicine</Text>
                                  </View>

                                  {doctors.length === 0 ? (
                                    <Text className="text-xs text-gray-500 py-1">No specialists found matching criteria.</Text>
                                  ) : (
                                    doctors.slice(0, 3).map((doc, docIdx) => (
                                      <View
                                        key={doc.doctorId || `doc_${docIdx}`}
                                        className="bg-teal-50/50 border border-teal-100 rounded-xl p-2.5 mb-2 last:mb-0"
                                      >
                                        <View className="flex-row items-center justify-between">
                                          <View className="flex-1 pr-2">
                                            <Text className="text-xs font-bold text-gray-900">{doc.name}</Text>
                                            <Text className="text-[11px] font-semibold text-teal-800">{doc.specialty}</Text>
                                            <Text className="text-[10px] text-gray-500 mt-0.5" numberOfLines={1}>
                                              {doc.hospital || 'Accredited Hospital'} • ★ {doc.rating || '4.9'}
                                            </Text>
                                            <Text className="text-[11px] font-bold text-gray-800 mt-1">
                                              ₦{Number(doc.feeNgn || 15000).toLocaleString()}
                                            </Text>
                                          </View>
                                          <TouchableOpacity
                                            activeOpacity={0.8}
                                            className="bg-primary px-3 py-2 rounded-xl shadow-xs"
                                            onPress={() => navigation?.navigate('Telemed', { selectedDoctorId: doc.doctorId })}
                                          >
                                            <Text className="text-xs font-bold text-white">Consult</Text>
                                          </TouchableOpacity>
                                        </View>
                                      </View>
                                    ))
                                  )}
                                </View>
                              );
                            }

                            if (action.tool === 'set_reminder') {
                              const trigTime = action.args?.remindAt;
                              let formattedTime = trigTime;
                              try {
                                const d = new Date(trigTime);
                                if (!isNaN(d.getTime())) {
                                  formattedTime = d.toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  });
                                }
                              } catch { }

                              return (
                                <View
                                  key={action.id || `act_${actIdx}`}
                                  className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 w-full shadow-2xs"
                                >
                                  <View className="flex-row items-center justify-between mb-1">
                                    <View className="flex-row items-center gap-1.5">
                                      <View className="w-5 h-5 rounded-full bg-indigo-600 items-center justify-center">
                                        <Ionicons name="notifications" size={12} color="#FFFFFF" />
                                      </View>
                                      <Text className="text-xs font-bold text-indigo-950">Reminder Scheduled</Text>
                                    </View>
                                    <Text className="text-[10px] font-bold text-indigo-600 uppercase">{action.args?.type || 'Medication'}</Text>
                                  </View>
                                  <Text className="text-xs font-medium text-indigo-900 mt-1">
                                    "{action.args?.message || 'Check-in reminder'}"
                                  </Text>
                                  <Text className="text-[11px] font-semibold text-indigo-700 mt-1">
                                    Trigger: {formattedTime}
                                  </Text>
                                </View>
                              );
                            }

                            if (action.tool === 'get_cycle_history') {
                              return (
                                <View
                                  key={action.id || `act_${actIdx}`}
                                  className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 w-full flex-row items-center justify-between"
                                >
                                  <View className="flex-row items-center gap-1.5">
                                    <Ionicons name="analytics-outline" size={15} color="#475569" />
                                    <Text className="text-xs font-medium text-slate-800">
                                      Retrieved {action.result?.totalLogs || 0} cycle records ({action.args?.days || 60} days)
                                    </Text>
                                  </View>
                                </View>
                              );
                            }

                            if (action.tool === 'book_consultation') {
                              const isSuccess = action.result?.success;
                              return (
                                <View
                                  key={action.id || `act_${actIdx}`}
                                  className={`rounded-2xl p-3 w-full border ${isSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}
                                >
                                  <View className="flex-row items-center gap-1.5 mb-1">
                                    <Ionicons
                                      name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
                                      size={16}
                                      color={isSuccess ? '#059669' : '#D97706'}
                                    />
                                    <Text className={`text-xs font-bold ${isSuccess ? 'text-emerald-900' : 'text-amber-900'}`}>
                                      {isSuccess ? 'Consultation Confirmed' : 'Consultation Needs Confirmation'}
                                    </Text>
                                  </View>
                                  <Text className={`text-xs leading-relaxed ${isSuccess ? 'text-emerald-800' : 'text-amber-800'}`}>
                                    {action.result?.message || (isSuccess ? 'Your appointment has been booked!' : 'Please confirm your appointment.')}
                                  </Text>
                                </View>
                              );
                            }

                            return null;
                          })}
                        </View>
                      )}

                      {/* Clinical Triage Alert Banner */}
                      {(item.triage?.suggestTelemedicine || item.triage?.emergencyCare) && (
                        <View className="mt-2.5 bg-red-50 border border-red-200 rounded-2xl p-3.5 w-full">
                          <View className="flex-row items-center gap-1.5 mb-1">
                            <Ionicons name="warning-outline" size={16} color="#DC2626" />
                            <Text className="text-xs font-bold text-red-900">
                              {item.triage.emergencyCare ? '🚨 URGENT MEDICAL EMERGENCY' : 'Clinical Advisory'}
                            </Text>
                          </View>
                          <Text className="text-xs text-red-700 leading-relaxed font-medium">
                            {item.triage.warningNote ||
                              (item.triage.emergencyCare
                                ? 'Please go immediately to the nearest hospital emergency room or call emergency services (112).'
                                : 'Your symptoms indicate noticeable discomfort. Please consider consulting an OB-GYN specialist.')}
                          </Text>
                          {item.triage.emergencyCare ? (
                            <View className="mt-2.5 flex-row items-center justify-center gap-1.5 bg-red-600 py-2.5 rounded-xl shadow-xs">
                              <Ionicons name="call" size={16} color="#FFFFFF" />
                              <Text className="text-xs font-bold text-white">Call Emergency Services (112)</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              activeOpacity={0.85}
                              className="mt-2.5 flex-row items-center justify-center gap-1.5 bg-primary py-2.5 rounded-xl shadow-xs"
                              onPress={() => navigation?.navigate('Telemed')}
                            >
                              <Ionicons name="videocam" size={16} color="#FFFFFF" />
                              <Text className="text-xs font-bold text-white">Consult Doctor on Telemedicine</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Quick Follow-up Chips */}
                      {item.suggestedQuickReplies &&
                        item.suggestedQuickReplies.length > 0 &&
                        isLatestAssistant &&
                        !isProcessing && (
                          <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                            {item.suggestedQuickReplies.map((qr, idx) => (
                              <TouchableOpacity
                                key={idx}
                                activeOpacity={0.7}
                                className="bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-2xs"
                                onPress={() => handleSendMessage(qr)}
                              >
                                <Text className="text-xs font-semibold text-gray-700">{qr}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                    </View>
                  ) : (
                    <View className="items-end max-w-[85%] self-end">
                      <View
                        className="rounded-[24px] px-4 py-3"
                        style={{
                          backgroundColor: isDarkMode ? '#2B2B2B' : '#F0EDEA',
                          borderTopRightRadius: 8,
                        }}
                      >
                        <Text className="text-[16px] leading-6 font-normal" style={{ color: theme.textPrimary }}>
                          {item.content}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {isProcessing && !messages.some((m) => m.isStreaming) && (
              <View className="flex-row items-center gap-2 px-1 py-2 self-start">
                <ActivityIndicator size="small" color="#DC2626" />
                <Text className="text-sm font-medium" style={{ color: theme.textSecondary }}>Dr. Red is thinking</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Compact idle composer expands into a full writing surface on focus. */}
        <View
          className="px-4 pt-2"
          style={{ backgroundColor: theme.background, paddingBottom: 22 }}
        >
          <View className="flex-row items-end gap-2.5">
            <View
              className="flex-1 rounded-[28px] px-3"
              style={{
                backgroundColor: isComposerExpanded
                  ? (isDarkMode ? '#202124' : '#F1EFEC')
                  : (isDarkMode ? '#202124' : '#F3F1EF'),
                borderColor: isComposerFocused ? (isDarkMode ? '#7F3437' : '#E7B7B3') : theme.cardBorder,
                borderWidth: 1,
                paddingTop: isComposerExpanded ? 9 : 4,
                paddingBottom: isComposerExpanded ? 8 : 4,
                shadowColor: '#142033',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDarkMode ? 0 : (isComposerFocused ? 0.1 : 0.055),
                shadowRadius: isComposerFocused ? 15 : 10,
                elevation: isDarkMode ? 0 : (isComposerFocused ? 3 : 1),
              }}
            >
              <View className="flex-row items-center">
                <TextInput
                  ref={composerInputRef}
                  className="flex-1 text-base px-2 py-2"
                  style={{
                    color: theme.textPrimary,
                    minHeight: 44,
                    maxHeight: isComposerExpanded ? 112 : 48,
                    lineHeight: 23,
                    fontSize: isComposerExpanded ? 16 : 15,
                    paddingTop: 10,
                    paddingBottom: 8,
                  }}
                  placeholder="Ask a follow-up..."
                  placeholderTextColor={isDarkMode ? '#8B8B91' : '#8A8B90'}
                  value={inputText}
                  onChangeText={setInputText}
                  onFocus={() => setIsComposerFocused(true)}
                  onBlur={() => setTimeout(() => setIsComposerFocused(false), 100)}
                  multiline
                  scrollEnabled={isComposerExpanded}
                  textAlignVertical="top"
                  returnKeyType="default"
                  blurOnSubmit={false}
                  accessibilityLabel="Message Dr. Red"
                />

                {!isComposerExpanded && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setIsVoiceChatActive(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Talk with Dr. Red"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isVoiceChatActive ? '#DC2626' : (isDarkMode ? '#2B2B2B' : '#FCE3E1'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View className="flex-row items-center justify-center gap-[2px]" style={{ height: 20, width: 20 }}>
                      {[7, 13, 18, 11, 6].map((barHeight, index) => (
                        <View
                          key={index}
                          style={{
                            width: 2.5,
                            height: barHeight,
                            borderRadius: 2,
                            backgroundColor: isVoiceChatActive ? '#FFFFFF' : '#D84440',
                          }}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {isComposerExpanded && (
                <View className="flex-row items-center justify-between pt-1">
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: isDarkMode ? '#2B2B2B' : '#FFFFFF',
                        borderColor: theme.cardBorder,
                        borderWidth: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => setShowQuickActionSheet(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Open health shortcuts"
                    >
                      <Ionicons name="add" size={21} color={theme.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center gap-2">
                    {inputText.trim().length > 0 ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => handleSendMessage()}
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? '#F5F5F5' : '#202124', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="arrow-up" size={19} color={isDarkMode ? '#202124' : '#FFFFFF'} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setIsVoiceChatActive(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Talk with Dr. Red"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: isVoiceChatActive ? '#DC2626' : (isDarkMode ? '#2B2B2B' : '#FCE3E1'),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <View className="flex-row items-center justify-center gap-[2px]" style={{ height: 20, width: 20 }}>
                          {[7, 13, 18, 11, 6].map((barHeight, index) => (
                            <View
                              key={index}
                              style={{
                                width: 2.5,
                                height: barHeight,
                                borderRadius: 2,
                                backgroundColor: isVoiceChatActive ? '#FFFFFF' : '#D84440',
                              }}
                            />
                          ))}
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Quick Health Shortcuts Modal */}
      {showQuickActionSheet && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={showQuickActionSheet}
          onRequestClose={() => setShowQuickActionSheet(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/60 justify-end"
            activeOpacity={1}
            onPress={() => setShowQuickActionSheet(false)}
          >
            <View
              className="rounded-t-3xl p-5 shadow-2xl max-h-[60%]"
              style={{
                backgroundColor: theme.card,
                borderTopColor: theme.cardBorder,
                borderTopWidth: 1,
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-extrabold" style={{ color: theme.textPrimary }}>Quick Health Shortcuts</Text>
                <TouchableOpacity onPress={() => setShowQuickActionSheet(false)} className="p-1">
                  <Ionicons name="close" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text className="text-xs mb-4" style={{ color: theme.textSecondary }}>
                Tap to inject a symptom or question directly into your conversation:
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap gap-2 pb-6">
                  {shortcutItems.map((chip) => (
                    <TouchableOpacity
                      key={chip.id}
                      activeOpacity={0.7}
                      className="rounded-2xl px-3.5 py-2.5"
                      style={{
                        backgroundColor: isDarkMode ? '#212121' : '#F9FAFB',
                        borderColor: theme.cardBorder,
                        borderWidth: 1,
                      }}
                      onPress={() => {
                        setShowQuickActionSheet(false);
                        handleSendMessage(chip.text);
                      }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: theme.textPrimary }}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Doctor Red AI Clinical Voice Companion Modal */}
      <DoctorRedVoiceModal
        visible={isVoiceChatActive}
        onClose={() => setIsVoiceChatActive(false)}
        onOpenQuickActions={() => {
          setIsVoiceChatActive(false);
          setShowQuickActionSheet(true);
        }}
        healthContext={resolvedHealthContext}
        user={user}
        messages={messages}
        setMessages={setMessages}
        selectedDateKey={selectedDateKey}
      />
    </SafeAreaView>
  );
}
