import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import aiService from '../services/aiService';

export default function AIAssistantDrawer({
  visible,
  onClose,
  healthContext = {},
  cycleContext = {},
  selectedDateKey,
  onSaveLog,
  onNavigateTelemedicine,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQuickActionSheet, setShowQuickActionSheet] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);

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

  // Unify and resolve full health life stage context
  const resolvedHealthContext = useMemo(() => {
    if (healthContext && healthContext.activeMode) {
      return healthContext;
    }
    return {
      activeMode: 'cycle',
      cycle: cycleContext,
    };
  }, [healthContext, cycleContext]);

  // Unified multi-domain starter prompt suggestions
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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: finalResult.reply,
                  triage: finalResult.triage,
                  suggestedQuickReplies: finalResult.suggestedQuickReplies || [],
                  isAiGenerated: true,
                  isStreaming: false,
                }
              : m
          )
        );
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (_err) => {
        setIsProcessing(false);
        setInputText(userText);
        setMessages((prev) => prev.filter((m) => m.id !== userMessageId && m.id !== assistantMessageId));
        showSileoToast({
          title: 'Connection Issue',
          message: 'There was a problem connecting to the AI. Please try again.',
        });
      }
    );
  };

  const handleClearChat = () => {
    setMessages([]);
    setShowOptionsMenu(false);
  };

  // Unified quick health shortcuts for + popup
  const shortcutItems = [
    // Doctor & Telemed
    { id: 't1', label: '🩺 Consult an OB-GYN', text: 'I would like to consult an OB-GYN specialist about my reproductive health' },
    { id: 't2', label: '📅 Upcoming appointment', text: 'Do I have any upcoming consultations booked with a specialist?' },
    { id: 't3', label: '📋 Prep visit notes', text: 'Help me prepare questions for my doctor consultation' },
    { id: 't4', label: '🧪 Lab test review', text: 'What routine women\'s health screenings should I discuss with my doctor?' },
    // Cycle
    { id: 'c1', label: '🩸 Period: Light flow', text: 'Period active with light flow' },
    { id: 'c2', label: '🩸 Period: Medium / Heavy', text: 'Period active with medium flow' },
    { id: 'c3', label: '🤕 Cramps', text: 'Lower abdominal cramps' },
    { id: 'c4', label: '🌸 Ovulation pain', text: 'Mild one-sided ovulation cramping' },
    // Pregnancy
    { id: 'k1', label: '🥑 Baby kicks noticed', text: 'Noticed active baby kicks today' },
    { id: 'k2', label: '🤢 Morning sickness', text: 'Experiencing morning sickness and nausea' },
    { id: 'k3', label: '🤰 Braxton Hicks', text: 'Mild Braxton Hicks false contractions' },
    { id: 'k4', label: '💊 Prenatal vitamins', text: 'Took my daily prenatal vitamins with DHA' },
    // Menopause
    { id: 'm1', label: '🌡️ Hot flash', text: 'Experiencing intense hot flashes' },
    { id: 'm2', label: '🌙 Night sweats', text: 'Disruptive night sweats' },
    { id: 'm3', label: '💤 Sleep disruption', text: 'Difficulty falling and staying asleep' },
    { id: 'm4', label: '🦴 Joint stiffness', text: 'Joint stiffness and muscle aches' },
    // Wellness & General
    { id: 'w1', label: '⚡ Low energy / Fatigue', text: 'Feeling drained with low energy' },
    { id: 'w2', label: '🤕 Headache', text: 'Throbbing headache' },
    { id: 'w3', label: '😊 Calm & happy', text: 'Feeling calm, happy, and energized' },
    { id: 'w4', label: '💊 Took birth control', text: 'Took daily birth control pill on time' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        {/* ========================================================================= */}
        {/* SILEO TOASTER NOTIFICATION BANNER                                         */}
        {/* ========================================================================= */}
        {sileoToast.visible && (
          <Animated.View
            style={[
              styles.sileoToastWrapper,
              {
                opacity: sileoOpacity,
                transform: [
                  { translateY: sileoTranslateY },
                  { scale: sileoScale },
                ],
              },
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={hideSileoToast}
              style={styles.sileoToastCard}
            >
              <View style={styles.sileoIconBadge}>
                <Ionicons name="cloud-offline" size={18} color="#EF4444" />
              </View>

              <View style={styles.sileoContentWrap}>
                <Text style={styles.sileoTitleText}>{sileoToast.title}</Text>
                <Text style={styles.sileoMessageText} numberOfLines={2}>
                  {sileoToast.message}
                </Text>
              </View>

              <TouchableOpacity
                onPress={hideSileoToast}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.sileoCloseBtn}
              >
                <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ========================================================================= */}
        {/* TOP BAR: CLEAN LIGHT THEMED HEADER WITH OPTIONS MENU                      */}
        {/* ========================================================================= */}
        <View style={styles.topHeaderBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.headerIconBtn}
            onPress={onClose}
          >
            <Ionicons name="close" size={22} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerBrandText}>Red Apple AI</Text>
          </View>

          {/* Right Hamburger / Menu Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.headerMenuBtn}
            onPress={() => setShowOptionsMenu(!showOptionsMenu)}
          >
            <Ionicons name="menu" size={22} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* Options Dropdown Menu */}
        {showOptionsMenu && (
          <View style={styles.optionsDropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleClearChat}
            >
              <Ionicons name="refresh-outline" size={18} color="#1E293B" />
              <Text style={styles.dropdownItemText}>Clear Conversation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowOptionsMenu(false);
                onClose();
              }}
            >
              <Ionicons name="exit-outline" size={18} color="#DC2626" />
              <Text style={[styles.dropdownItemText, { color: '#DC2626' }]}>Exit AI Companion</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================================= */}
        {/* MAIN BODY: EMPTY HERO STATE OR MESSAGE THREAD                             */}
        {/* ========================================================================= */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            { flex: 1 },
            Platform.OS === 'android' && androidKeyboardHeight > 0 && {
              paddingBottom: androidKeyboardHeight,
            },
          ]}
        >
          {messages.length === 0 ? (
            /* HERO CENTER STATE: Warm Senior Sister Greeting */
            <View style={styles.heroCenterContainer}>
              <View style={styles.heroTitleGroup}>
                <Text style={styles.heroMainTitle}>Hey sis! 💕</Text>
                <Text style={styles.heroDescription}>How are you feeling today? I'm right here with you.</Text>
              </View>
            </View>
          ) : (
            /* CONVERSATION MESSAGE THREAD */
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
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
                  <View key={item.id} style={styles.messageRow}>
                  {item.role === 'assistant' ? (
                    <View style={styles.assistantMsgContainer}>
                      <View style={styles.assistantBubble}>
                        {item.content ? (
                          <Text style={styles.assistantText}>{item.content}</Text>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 }}>
                            <ActivityIndicator size="small" color="#DC2626" />
                            <Text style={[styles.assistantText, { color: '#94A3B8' }]}>Thinking...</Text>
                          </View>
                        )}
                      </View>

                      {/* Triage Alert Banner */}
                      {item.triage?.suggestTelemedicine && (
                        <View style={styles.triageAlertCard}>
                          <View style={styles.triageAlertHeader}>
                            <Ionicons name="warning-outline" size={18} color="#DC2626" />
                            <Text style={styles.triageAlertTitle}>Clinical Advisory</Text>
                          </View>
                          <Text style={styles.triageAlertText}>
                            {item.triage.warningNote ||
                              'Your symptoms indicate noticeable pain or acute changes. Please consider consulting a doctor.'}
                          </Text>
                          {onNavigateTelemedicine && (
                            <TouchableOpacity
                              activeOpacity={0.85}
                              style={styles.telemedicineActionBtn}
                              onPress={() => {
                                onClose();
                                onNavigateTelemedicine();
                              }}
                            >
                              <Ionicons name="videocam" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                              <Text style={styles.telemedicineActionText}>
                                Consult Doctor on Telemedicine
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Quick Follow-up Chips - Only show on latest assistant message when not typing */}
                      {item.suggestedQuickReplies &&
                        item.suggestedQuickReplies.length > 0 &&
                        isLatestAssistant &&
                        !isProcessing && (
                        <View style={styles.quickRepliesContainer}>
                          {item.suggestedQuickReplies.map((qr, idx) => (
                            <TouchableOpacity
                              key={idx}
                              activeOpacity={0.7}
                              style={styles.quickReplyChip}
                              onPress={() => handleSendMessage(qr)}
                            >
                              <Text style={styles.quickReplyText}>{qr}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.userMsgContainer}>
                      <View style={styles.userBubble}>
                        <Text style={styles.userText}>{item.content}</Text>
                      </View>
                    </View>
                  )}
                </View>
                );
              })}

              {isProcessing && !messages.some((m) => m.isStreaming) && (
                <View style={styles.typingContainer}>
                  <View style={styles.typingBubble}>
                    <ActivityIndicator size="small" color="#DC2626" />
                    <Text style={styles.typingText}>Replying...</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* ========================================================================= */}
          {/* FLOATING LIGHT-THEMED CAPSULE INPUT                                       */}
          {/* ========================================================================= */}
          <View style={styles.bottomCapsuleWrapper}>
            <View style={styles.bottomCapsuleCard}>
              {/* Row 1: Text Input */}
              <TextInput
                style={styles.capsuleTextInput}
                placeholder="Ask anything..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 120);
                }}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={() => handleSendMessage()}
              />

              {/* Row 2: Capsule Action Bar */}
              <View style={styles.capsuleActionBar}>
                {/* Left Action Controls */}
                <View style={styles.capsuleLeftGroup}>
                  {/* Plus Button */}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.capsuleCircleBtn}
                    onPress={() => setShowQuickActionSheet(!showQuickActionSheet)}
                  >
                    <Ionicons name="add" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>

                {/* Right Action Controls */}
                <View style={styles.capsuleRightGroup}>
                  {/* Mic Button */}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.capsuleCircleBtn}
                    onPress={() => {
                      setInputText('Can you review my reproductive, cycle, and hormonal health status?');
                    }}
                  >
                    <Ionicons name="mic-outline" size={20} color="#374151" />
                  </TouchableOpacity>

                  {/* Audio Waveform / Send Button */}
                  {inputText.trim().length > 0 ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.capsuleWaveformCircle, { backgroundColor: '#DC2626' }]}
                      onPress={() => handleSendMessage()}
                    >
                      <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.capsuleWaveformCircle}
                      onPress={() => {
                        handleSendMessage('Provide a comprehensive review of my current health status, cycle, and clinical recommendations.');
                      }}
                    >
                      <View style={styles.waveformBarsRow}>
                        <View style={[styles.waveformBar, { height: 7 }]} />
                        <View style={[styles.waveformBar, { height: 15 }]} />
                        <View style={[styles.waveformBar, { height: 11 }]} />
                        <View style={[styles.waveformBar, { height: 6 }]} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* ========================================================================= */}
        {/* MULTI-DOMAIN BIOMARKER SHORTCUTS POPUP (When tapping +)                   */}
        {/* ========================================================================= */}
        {showQuickActionSheet && (
          <Modal transparent={true} animationType="fade" visible={showQuickActionSheet} onRequestClose={() => setShowQuickActionSheet(false)}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowQuickActionSheet(false)}
            >
              <View style={styles.pickerCard}>
                <Text style={styles.pickerCardTitle}>Quick Health Shortcuts</Text>
                <Text style={styles.pickerCardSub}>Tap to inject biomarker or topic into your chat:</Text>

                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.quickChipsWrap}>
                    {shortcutItems.map((chip) => (
                      <TouchableOpacity
                        key={chip.id}
                        style={styles.quickInsertChip}
                        onPress={() => {
                          setInputText((prev) => (prev ? `${prev}, ${chip.text}` : chip.text));
                          setShowQuickActionSheet(false);
                        }}
                      >
                        <Text style={styles.quickInsertChipText}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeaderBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerBrandText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  phaseIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  phaseIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phaseIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },

  /* Options Dropdown */
  optionsDropdown: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
    minWidth: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },

  /* HERO CENTER */
  heroCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroTitleGroup: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroMainTitle: {
    fontSize: 32,
    fontWeight: '500',
    color: '#1E293B',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  heroPromptsGrid: {
    width: '100%',
    gap: 10,
  },
  heroPromptCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroPromptLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  heroPromptDetail: {
    fontSize: 11,
    color: '#64748B',
  },

  /* CHAT SCROLL */
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  messageRow: {
    marginBottom: 16,
  },
  assistantMsgContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  assistantBubble: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 14,
    maxWidth: '92%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assistantText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#1E293B',
    fontWeight: '500',
  },
  userMsgContainer: {
    alignItems: 'flex-end',
    width: '100%',
  },
  userBubble: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    borderTopRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
  },
  userText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  typingContainer: {
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },

  /* Biomarker Card */
  biomarkerCard: {
    marginTop: 10,
    width: '95%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  biomarkerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  biomarkerCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  biomarkerDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  biomarkerTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagPeriodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagPeriodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'capitalize',
  },
  tagSymptomPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagSymptomText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  tagMoodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagMoodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  confirmLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmLogBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  savedSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savedSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  /* Triage Alert */
  triageAlertCard: {
    marginTop: 10,
    width: '95%',
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  triageAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  triageAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#BE123C',
  },
  triageAlertText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9F1239',
    marginBottom: 10,
  },
  telemedicineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BE123C',
    paddingVertical: 9,
    borderRadius: 10,
  },
  telemedicineActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  quickReplyChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickReplyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  /* FLOATING CAPSULE INPUT */
  bottomCapsuleWrapper: {
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    paddingTop: 6,
    backgroundColor: '#FFFFFF',
  },
  bottomCapsuleCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  capsuleTextInput: {
    fontSize: 16,
    color: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 6,
    minHeight: 38,
  },
  capsuleActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  capsuleLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capsuleRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capsuleCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modelPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  capsuleWaveformCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
  },
  waveformBar: {
    width: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },

  /* MODALS & POPUPS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  pickerCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  pickerCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  pickerOptionActive: {
    backgroundColor: '#FEF2F2',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  pickerOptionTextActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  quickChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  quickInsertChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickInsertChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  sileoToastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 14 : 10,
    left: 16,
    right: 16,
    zIndex: 999999,
    alignItems: 'center',
    elevation: 9999,
  },
  sileoToastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#0F172A',
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  sileoIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sileoContentWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  sileoTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  sileoMessageText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CBD5E1',
    lineHeight: 16,
  },
  sileoCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
