import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import StreamVideoCallModal from './StreamVideoCallModal';
import * as telemedService from '../services/telemedicineService';
import WebSidebar from '../components/WebSidebar';
import AppBottomSheet from '../components/AppBottomSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'web' ? 6 : (StatusBar.currentHeight || 40);

// SIGNATURE RED APPLE CLINICAL THEME
const THEME = {
  // Brand Reds
  primary: '#DC2626',            // Signature Apple Red
  primaryDark: '#B91C1C',        // Deep Apple Crimson
  primaryDeep: '#880E18',        // Garnet Shade
  primarySoft: '#FFF1F2',        // Delicate Rose Highlight
  primaryBlush: '#FFE4E6',       // Rose Border / Tint
  primaryGlow: 'rgba(220, 38, 38, 0.08)',

  // Surfaces & Backgrounds
  bg: '#FFFFFF',
  pageBg: '#FAF7F7',             // Warm Off-White / Sand Canvas
  cardBg: '#FFFFFF',
  cardMuted: '#FBF9F9',
  border: '#F0E8E6',
  borderSubtle: '#F7EFEF',

  // Typography
  textPrimary: '#1C1917',        // Rich Warm Obsidian / Charcoal
  textSecondary: '#78716C',      // Warm Muted Gray
  textMuted: '#A8A29E',          // Tertiary Gray
  textLight: '#FFFFFF',

  // Telemedicine & Verification Accents
  emerald: '#059669',            // Verified Medical Green
  emeraldLight: '#ECFDF5',
  emeraldBorder: '#A7F3D0',
  amber: '#D97706',              // Review Star Amber
  amberLight: '#FEF3C7',
};

export default function DoctorDashboardScreen({ onSignOut, onPreviewPatientView }) {
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = (Platform.OS === 'web' && windowWidth >= 768) || windowWidth >= 1024;
  const doctorName = user?.name || 'Consulting Doctor';
  const doctorEmail = user?.email || 'doctor@redapple.health';

  // Active Tab: 'queue' | 'slots' | 'records'
  const [activeTab, setActiveTab] = useState('queue');

  // Duty status
  const [isOnDuty, setIsOnDuty] = useState(true);

  // Appointments & Consultations State
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Video Consultation Room
  const [activeVideoCallBooking, setActiveVideoCallBooking] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Clinical Notes Modal State
  const [selectedBookingForNotes, setSelectedBookingForNotes] = useState(null);
  const [clinicalNotesText, setClinicalNotesText] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Doctor Slots Management State
  const [doctorSlots, setDoctorSlots] = useState([]);
  const [selectedSlotDayIndex, setSelectedSlotDayIndex] = useState(0);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('15:00');
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  // Calendar days for slot manager
  const calendarDays = useMemo(() => {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      days.push({
        index: i,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        dateStr: d.toISOString().split('T')[0],
      });
    }
    return days;
  }, []);

  const loadDoctorData = async () => {
    try {
      setIsLoading(true);
      const bookings = await telemedService.getUserBookings();
      setConsultations(bookings || []);

      const slots = await telemedService.getDoctorSlots('doc_mesal_okubor');
      setDoctorSlots(slots || []);
    } catch (e) {
      console.warn('Error loading doctor dashboard data:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDoctorData();
  };

  useEffect(() => {
    loadDoctorData();
  }, []);

  // Filter queues
  const activeQueue = useMemo(() => {
    return consultations.filter(
      (c) => c.status === 'confirmed' || c.status === 'requested' || c.status === 'in_progress'
    );
  }, [consultations]);

  const completedHistory = useMemo(() => {
    return consultations.filter(
      (c) => c.status === 'completed' || c.status === 'cancelled'
    );
  }, [consultations]);

  // Handle Starting Video Call
  const handleStartVideoCall = (booking) => {
    setActiveVideoCallBooking(booking);
    setShowVideoModal(true);
  };

  // Open Notes Drawer
  const handleOpenNotes = (booking) => {
    setSelectedBookingForNotes(booking);
    setClinicalNotesText(booking.doctor_notes || '');
    setPrescriptionText(booking.prescription_summary || '');
  };

  // Save Clinical Notes & Complete Consult
  const handleSaveNotes = async () => {
    if (!selectedBookingForNotes) return;
    setIsSavingNotes(true);
    try {
      await telemedService.completeConsultation(
        selectedBookingForNotes.booking_id,
        clinicalNotesText,
        prescriptionText
      );
      Alert.alert('Success', 'Clinical consultation notes & prescription saved.');
      setSelectedBookingForNotes(null);
      await loadDoctorData();
    } catch (e) {
      Alert.alert('Error', 'Could not save notes. Please try again.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Toggle Slot availability
  const handleToggleSlot = async (slotId) => {
    try {
      await telemedService.toggleDoctorSlot(slotId);
      const updated = doctorSlots.map((s) =>
        s.slot_id === slotId ? { ...s, is_booked: !s.is_booked } : s
      );
      setDoctorSlots(updated);
    } catch (e) {
      Alert.alert('Error', 'Could not update slot status.');
    }
  };

  // Add Custom Time Slot
  const handleAddCustomSlot = async () => {
    if (!newSlotTime) return;
    setIsAddingSlot(true);
    try {
      const chosenDay = calendarDays[selectedSlotDayIndex] || calendarDays[0];
      const slot = await telemedService.addDoctorSlot({
        doctorId: 'doc_mesal_okubor',
        date: chosenDay.dateStr,
        startTime: newSlotTime,
        formattedTime: `${chosenDay.dayName} ${chosenDay.dayNum}, ${newSlotTime}`,
      });
      setDoctorSlots((prev) => [...prev, slot]);
      setShowAddSlotModal(false);
      Alert.alert('Slot Added', `New appointment slot open for ${chosenDay.dayName} ${chosenDay.dayNum} at ${newSlotTime}.`);
    } catch (e) {
      Alert.alert('Error', 'Could not create new slot.');
    } finally {
      setIsAddingSlot(false);
    }
  };

  const selectedDaySlots = useMemo(() => {
    const chosenDay = calendarDays[selectedSlotDayIndex] || calendarDays[0];
    return doctorSlots.filter((s) => s.date === chosenDay.dateStr);
  }, [doctorSlots, selectedSlotDayIndex, calendarDays]);

  return (
    <View style={[styles.container, isLargeScreen && styles.desktopContainer]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* WEB SIDEBAR ON LARGER SCREENS (PC / WEB) */}
      {isLargeScreen && (
        <WebSidebar
          variant="doctor"
          currentPage={activeTab}
          onNavigateTab={(tabId) => setActiveTab(tabId)}
          user={user}
          onSignOut={onSignOut}
          isDoctor={true}
          onPreviewPatientView={onPreviewPatientView}
          activeQueueCount={activeQueue.length}
        />
      )}

      <View style={isLargeScreen ? styles.desktopMainContent : { flex: 1 }}>
        {/* ========================================================================= */}
        {/* 1. TOP HEADER: DOCTOR IDENTITY & QUICK CONTROLS                           */}
        {/* ========================================================================= */}
        <View style={styles.topHeader}>
        <View style={styles.doctorHeaderLeft}>
          <View style={styles.doctorAvatarRing}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
              }}
              style={styles.doctorAvatar}
            />
            <View style={styles.verifiedCheckBadge}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.doctorHeaderTextCol}>
            <Text style={styles.doctorNameTitle}>{doctorName}</Text>
            <Text style={styles.doctorSpecialtySubtitle}>OB-GYN · Telemedicine</Text>
          </View>
        </View>

        {/* Right Header Actions */}
        <View style={styles.doctorHeaderRightActions}>
          {onPreviewPatientView && (
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.headerSquareBtn, styles.patientViewBtn]}
              onPress={onPreviewPatientView}
              accessibilityLabel="Patient View"
            >
              <Ionicons name="eye-outline" size={17} color={THEME.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.headerSquareBtn}
            onPress={loadDoctorData}
            accessibilityLabel="Refresh"
          >
            <Ionicons name="refresh-outline" size={17} color={THEME.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.headerSquareBtn, styles.logoutBtn]}
            onPress={onSignOut}
            accessibilityLabel="Sign Out"
          >
            <Ionicons name="log-out-outline" size={17} color={THEME.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 2. ON-DUTY STATUS BAR                                                     */}
      {/* ========================================================================= */}
      <View style={styles.dutyStatusBar}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.dutyTogglePill, isOnDuty ? styles.dutyPillActive : styles.dutyPillInactive]}
          onPress={() => setIsOnDuty(!isOnDuty)}
        >
          <View style={[styles.statusDot, isOnDuty ? styles.dotGreen : styles.dotGray]}>
            {isOnDuty && <View style={styles.statusDotPulse} />}
          </View>
          <Text style={[styles.dutyText, isOnDuty ? styles.dutyTextActive : styles.dutyTextInactive]}>
            {isOnDuty ? 'Clinic Online · Accepting Patients' : 'Clinic Offline · Availability Paused'}
          </Text>
          <Ionicons
            name={isOnDuty ? 'toggle' : 'toggle-outline'}
            size={20}
            color={isOnDuty ? THEME.emerald : THEME.textMuted}
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT SCROLL VIEW                                     */}
      {/* ========================================================================= */}

      {/* ========================================================================= */}
      {/* 5. TAB CONTENT                                                            */}
      {/* ========================================================================= */}
      <ScrollView
        style={styles.mainContentScroll}
        contentContainerStyle={styles.mainContentScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={THEME.primary}
            colors={[THEME.primary, THEME.primaryDark]}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={THEME.primary} />
            <Text style={styles.loadingText}>Syncing clinical telemedicine feed...</Text>
          </View>
        ) : activeTab === 'queue' ? (
          /* ======================================================================= */
          /* TAB 1: PATIENT QUEUE & TODAY'S SCHEDULE                                 */
          /* ======================================================================= */
          <View>
            {/* Section Heading */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderTitleRow}>
                <View style={styles.sectionRedPillIndicator} />
                <Text style={styles.sectionHeaderTitle}>Today's Appointments</Text>
              </View>
            </View>

            {activeQueue.length === 0 ? (
              <View style={styles.emptyQueueCard}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="checkmark-done-circle" size={42} color={THEME.emerald} />
                </View>
                <Text style={styles.emptyTitle}>Queue is all clear!</Text>
                <Text style={styles.emptySubtitle}>
                  No pending consultations right now. Patients who book your open slots will appear here in real time.
                </Text>
              </View>
            ) : (
              activeQueue.map((item) => (
                <View key={item.booking_id} style={styles.patientAppointmentCard}>
                  {/* Card Top: Patient Details & Status */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.patientInfoLeft}>
                      <View style={styles.patientAvatarCircle}>
                        <Text style={styles.patientAvatarText}>
                          {(item.user_name || 'Patient')
                            .split(' ')
                            .map((w) => w[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.patientName}>{item.user_name || 'Amara Okonkwo'}</Text>
                        <View style={styles.patientTimeRow}>
                          <Ionicons name="time-outline" size={13} color={THEME.textSecondary} />
                          <Text style={styles.patientTimeSlot}>{item.scheduled_time || 'Today, 2:30 PM'}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.confirmedPill}>
                      <View style={styles.confirmedDot} />
                      <Text style={styles.confirmedPillText}>Confirmed</Text>
                    </View>
                  </View>

                  {/* Consultation Reason & Details Box */}
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonBodyText}>
                      <Text style={{ color: THEME.textPrimary, fontWeight: '600' }}>Reason: </Text>
                      {item.reason || 'Routine consultation and check-in'}
                    </Text>
                    {item.symptoms_notes ? (
                      <View style={styles.symptomsRow}>
                        <Ionicons name="information-circle-outline" size={13} color={THEME.textSecondary} />
                        <Text style={styles.symptomsText}>Symptoms: {item.symptoms_notes}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Doctor Actions: Start Video Call & Notes/Rx */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.startCallTouchWrapper}
                      onPress={() => handleStartVideoCall(item)}
                    >
                      <LinearGradient
                        colors={['#DC2626', '#B91C1C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.startCallBtn}
                      >
                        <Ionicons name="videocam" size={16} color="#FFFFFF" />
                        <Text style={styles.startCallBtnText}>Start Video Call</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.addNotesBtn}
                      onPress={() => handleOpenNotes(item)}
                    >
                      <Ionicons name="create-outline" size={16} color={THEME.primary} />
                      <Text style={styles.addNotesBtnText}>Notes / Rx</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : activeTab === 'slots' ? (
          /* ======================================================================= */
          /* TAB 2: AVAILABILITY & SLOTS MANAGER                                     */
          /* ======================================================================= */
          <View>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderTitleRow}>
                <View style={styles.sectionRedPillIndicator} />
                <Text style={styles.sectionHeaderTitle}>Manage Consultation Slots</Text>
              </View>
              <TouchableOpacity
                style={styles.addNewSlotBtn}
                activeOpacity={0.85}
                onPress={() => setShowAddSlotModal(true)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addNewSlotBtnText}>Add Slot</Text>
              </TouchableOpacity>
            </View>

            {/* Day Selector Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.slotsDaysScroll}
            >
              {calendarDays.map((day) => {
                const isSelected = selectedSlotDayIndex === day.index;
                return (
                  <TouchableOpacity
                    key={day.index}
                    activeOpacity={0.85}
                    style={[styles.slotDayPill, isSelected && styles.slotDayPillActive]}
                    onPress={() => setSelectedSlotDayIndex(day.index)}
                  >
                    <Text style={[styles.slotDayPillName, isSelected && styles.slotDayTextActive]}>
                      {day.dayName}
                    </Text>
                    <Text style={[styles.slotDayPillNum, isSelected && styles.slotDayTextActive]}>
                      {day.dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Slots List for Selected Day */}
            <View style={styles.slotsGridContainer}>
              <View style={styles.slotsHeaderRow}>
                <Text style={styles.slotsSubheaderTitle}>
                  Open Hours for {calendarDays[selectedSlotDayIndex]?.dayName} {calendarDays[selectedSlotDayIndex]?.dayNum}
                </Text>
                <Text style={styles.slotsSubheaderCount}>{selectedDaySlots.length} Slots</Text>
              </View>

              {selectedDaySlots.length === 0 ? (
                <View style={styles.emptySlotsCard}>
                  <Ionicons name="calendar-outline" size={32} color={THEME.textMuted} />
                  <Text style={styles.emptyTitle}>No slots open for this date</Text>
                  <Text style={styles.emptySubtitle}>
                    Tap "+ Add Slot" above to configure patient booking availability.
                  </Text>
                </View>
              ) : (
                selectedDaySlots.map((slot) => (
                  <View key={slot.slot_id} style={styles.slotRowItem}>
                    <View style={styles.slotTimeInfo}>
                      <View style={[styles.slotClockCircle, slot.is_booked ? styles.slotClockBlocked : styles.slotClockOpen]}>
                        <Ionicons
                          name="time"
                          size={15}
                          color={slot.is_booked ? THEME.textSecondary : THEME.emerald}
                        />
                      </View>
                      <View>
                        <Text style={styles.slotTimeLabel}>
                          {slot.start_time} - {slot.end_time || '30 min'}
                        </Text>
                        <Text style={styles.slotTimeSub}>Telehealth Video Session</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.slotStatusBadge,
                        slot.is_booked ? styles.slotBadgeBlocked : styles.slotBadgeOpen,
                      ]}
                      onPress={() => handleToggleSlot(slot.slot_id)}
                    >
                      <View style={[styles.slotStatusDot, slot.is_booked ? styles.dotGray : styles.dotGreen]} />
                      <Text
                        style={[
                          styles.slotStatusText,
                          slot.is_booked ? styles.slotTextBlocked : styles.slotTextOpen,
                        ]}
                      >
                        {slot.is_booked ? 'Blocked / Booked' : 'Available'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : (
          /* ======================================================================= */
          /* TAB 3: COMPLETED CONSULTATION RECORDS                                   */
          /* ======================================================================= */
          <View>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderTitleRow}>
                <View style={styles.sectionRedPillIndicator} />
                <Text style={styles.sectionHeaderTitle}>Completed Consultations</Text>
              </View>
            </View>

            {completedHistory.length === 0 ? (
              <View style={styles.emptyQueueCard}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="folder-open-outline" size={38} color={THEME.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No archived consultations yet</Text>
                <Text style={styles.emptySubtitle}>
                  Completed telemedicine sessions and patient clinical summaries will appear here for follow-up reference.
                </Text>
              </View>
            ) : (
              completedHistory.map((item) => (
                <View key={item.booking_id} style={styles.completedRecordCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.patientInfoLeft}>
                      <View style={styles.recordAvatarCircle}>
                        <Text style={styles.recordAvatarText}>
                          {(item.user_name || 'Patient')
                            .split(' ')
                            .map((w) => w[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 10 }}>
                        <Text style={styles.patientName}>{item.user_name || 'Patient'}</Text>
                        <Text style={styles.recordDateText}>{item.scheduled_time}</Text>
                      </View>
                    </View>
                    <View style={styles.completedPill}>
                      <Ionicons name="checkmark-done" size={12} color={THEME.emerald} />
                      <Text style={styles.completedPillText}>Archived</Text>
                    </View>
                  </View>

                  <Text style={styles.recordReasonText}>
                    Clinical Scope: <Text style={{ color: THEME.textPrimary, fontWeight: '600' }}>{item.reason}</Text>
                  </Text>

                  {item.doctor_notes ? (
                    <View style={styles.notesBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <Ionicons name="document-text" size={13} color="#166534" />
                        <Text style={styles.notesLabel}>Clinical Findings:</Text>
                      </View>
                      <Text style={styles.notesContent}>{item.doctor_notes}</Text>
                    </View>
                  ) : null}

                  {item.prescription_summary ? (
                    <View style={styles.rxBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <Ionicons name="medkit" size={13} color={THEME.primary} />
                        <Text style={styles.rxLabel}>Prescription Summary (Rx):</Text>
                      </View>
                      <Text style={styles.rxContent}>{item.prescription_summary}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.editNotesBtn}
                    onPress={() => handleOpenNotes(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={14} color={THEME.primary} />
                    <Text style={styles.editNotesBtnText}>
                      {item.doctor_notes ? 'Update Clinical Notes' : 'Add Clinical Notes'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      </View>

      {/* ========================================================================= */}
      {/* 4. FLOATING BOTTOM NAVIGATION BAR (MOBILE ONLY)                           */}
      {/* ========================================================================= */}
      {!isLargeScreen && (
        <View style={styles.floatingBottomBarContainer}>
          <View style={styles.floatingBottomBar}>
            {/* Tab 1: Queue */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.floatingTabItem, activeTab === 'queue' && styles.floatingTabItemActive]}
              onPress={() => setActiveTab('queue')}
            >
              <View style={styles.floatingTabIconWrapper}>
                <Ionicons
                  name={activeTab === 'queue' ? 'videocam' : 'videocam-outline'}
                  size={22}
                  color={activeTab === 'queue' ? THEME.primary : THEME.textSecondary}
                />
                {activeQueue.length > 0 && (
                  <View style={styles.floatingBadge}>
                    <Text style={styles.floatingBadgeText}>{activeQueue.length}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.floatingTabLabel, activeTab === 'queue' && styles.floatingTabLabelActive]}>
                Queue
              </Text>
            </TouchableOpacity>

            {/* Tab 2: Availability */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.floatingTabItem, activeTab === 'slots' && styles.floatingTabItemActive]}
              onPress={() => setActiveTab('slots')}
            >
              <View style={styles.floatingTabIconWrapper}>
                <Ionicons
                  name={activeTab === 'slots' ? 'calendar' : 'calendar-outline'}
                  size={22}
                  color={activeTab === 'slots' ? THEME.primary : THEME.textSecondary}
                />
              </View>
              <Text style={[styles.floatingTabLabel, activeTab === 'slots' && styles.floatingTabLabelActive]}>
                Availability
              </Text>
            </TouchableOpacity>

            {/* Tab 3: Records */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.floatingTabItem, activeTab === 'records' && styles.floatingTabItemActive]}
              onPress={() => setActiveTab('records')}
            >
              <View style={styles.floatingTabIconWrapper}>
                <Ionicons
                  name={activeTab === 'records' ? 'document-text' : 'document-text-outline'}
                  size={22}
                  color={activeTab === 'records' ? THEME.primary : THEME.textSecondary}
                />
              </View>
              <Text style={[styles.floatingTabLabel, activeTab === 'records' && styles.floatingTabLabelActive]}>
                Records
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 6. BOTTOM SHEET: CLINICAL NOTES & PRESCRIPTION WRITER (AppBottomSheet)    */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={!!selectedBookingForNotes}
        onClose={() => setSelectedBookingForNotes(null)}
        title="Consultation Notes & Rx"
        subtitle={`Patient: ${selectedBookingForNotes?.user_name || 'Patient'}`}
        showHandle={true}
        showCloseChevron={true}
        scrollable={true}
        footer={
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.saveNotesTouchWrapper}
            onPress={handleSaveNotes}
            disabled={isSavingNotes}
          >
            <LinearGradient
              colors={['#DC2626', '#B91C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveNotesBtn}
            >
              {isSavingNotes ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                  <Text style={styles.saveNotesBtnText}>Save & Finalize Consultation</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        }
      >
        <View style={{ paddingBottom: 16 }}>
          <Text style={styles.inputLabel}>Clinical Observations & Recommendations</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Record clinical assessment, ultrasound notes, and medical guidance..."
            placeholderTextColor={THEME.textMuted}
            multiline
            numberOfLines={4}
            value={clinicalNotesText}
            onChangeText={setClinicalNotesText}
          />

          <Text style={styles.inputLabel}>Prescription Summary (Optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g. Folate 5mg daily, Prenatal Multivitamins 1 tab..."
            placeholderTextColor={THEME.textMuted}
            multiline
            numberOfLines={3}
            value={prescriptionText}
            onChangeText={setPrescriptionText}
          />
        </View>
      </AppBottomSheet>

      {/* ========================================================================= */}
      {/* 7. BOTTOM SHEET: ADD TIME SLOT (AppBottomSheet)                           */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showAddSlotModal}
        onClose={() => setShowAddSlotModal(false)}
        title="Add Appointment Slot"
        subtitle={`Date: ${calendarDays[selectedSlotDayIndex]?.dayName} ${calendarDays[selectedSlotDayIndex]?.dayNum}`}
        showHandle={true}
        showCloseChevron={true}
        scrollable={false}
      >
        <View style={{ paddingBottom: 16 }}>
          <Text style={styles.inputLabel}>Start Time (e.g. 10:00, 14:30)</Text>
          <TextInput
            style={styles.singleLineInput}
            placeholder="10:00"
            placeholderTextColor={THEME.textMuted}
            value={newSlotTime}
            onChangeText={setNewSlotTime}
          />

          <View style={styles.modalActionsRow}>
            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => setShowAddSlotModal(false)}
            >
              <Text style={styles.cancelModalBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmSlotBtn}
              onPress={handleAddCustomSlot}
              disabled={isAddingSlot}
            >
              {isAddingSlot ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmSlotBtnText}>Create Slot</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </AppBottomSheet>

      {/* ========================================================================= */}
      {/* 8. FULLSCREEN VIDEO CONSULTATION ROOM                                     */}
      {/* ========================================================================= */}
      {showVideoModal && (
        <StreamVideoCallModal
          visible={showVideoModal}
          booking={activeVideoCallBooking}
          isDoctorView={true}
          onClose={() => {
            setShowVideoModal(false);
            loadDoctorData();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  /* -------------------------------------------------------------------------- */
  /* 1. TOP HEADER                                                              */
  /* -------------------------------------------------------------------------- */
  topHeader: {
    paddingTop: STATUSBAR_HEIGHT + 8,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderSubtle,
  },
  doctorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doctorAvatarRing: {
    position: 'relative',
    padding: 2,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: THEME.primaryBlush,
  },
  doctorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3ECE7',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  doctorHeaderTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  doctorNameTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  doctorSpecialtySubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginTop: 2,
  },
  doctorHeaderRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientViewBtn: {
    backgroundColor: THEME.primarySoft,
    borderColor: THEME.primaryBlush,
    borderRadius: 18,
  },
  headerSquareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF7F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  logoutBtn: {
    backgroundColor: THEME.primarySoft,
    borderColor: THEME.primaryBlush,
  },

  /* -------------------------------------------------------------------------- */
  /* 2. DUTY STATUS BAR                                                         */
  /* -------------------------------------------------------------------------- */
  dutyStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderSubtle,
  },
  dutyTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dutyPillActive: {
    backgroundColor: THEME.emeraldLight,
    borderWidth: 1,
    borderColor: THEME.emeraldBorder,
  },
  dutyPillInactive: {
    backgroundColor: '#F5EBE8',
    borderWidth: 1,
    borderColor: '#E7DDD8',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotPulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(5, 150, 105, 0.25)',
  },
  dotGreen: {
    backgroundColor: THEME.emerald,
  },
  dotGray: {
    backgroundColor: THEME.textMuted,
  },
  dutyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dutyTextActive: {
    color: THEME.emerald,
  },
  dutyTextInactive: {
    color: THEME.textSecondary,
  },

  /* -------------------------------------------------------------------------- */
  /* 3. MAIN CONTENT SCROLL CANVAS                                              */
  /* -------------------------------------------------------------------------- */
  mainContentScroll: {
    flex: 1,
    backgroundColor: THEME.pageBg,
  },
  mainContentScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionRedPillIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: THEME.primary,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  activeQueueCountChip: {
    backgroundColor: THEME.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.primaryBlush,
  },
  activeQueueCountChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 10,
    fontWeight: '500',
  },

  /* Patient Card */
  patientAppointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.primaryBlush,
  },
  patientAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.primary,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  patientTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  patientTimeSlot: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.emeraldLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.emeraldBorder,
  },
  confirmedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.emerald,
  },
  confirmedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.emerald,
  },

  /* Reason Box */
  reasonBox: {
    backgroundColor: '#FAF7F7',
    borderRadius: 14,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
  },
  reasonBodyText: {
    fontSize: 13,
    fontWeight: '400',
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  symptomsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EFE6E4',
  },
  symptomsText: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '500',
  },

  /* Card Action Buttons */
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  startCallTouchWrapper: {
    flex: 1,
  },
  startCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    gap: 6,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  startCallBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  addNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 6,
  },
  addNotesBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
  },

  /* Empty State */
  emptyQueueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    marginTop: 6,
  },
  emptyIconCircle: {
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  /* -------------------------------------------------------------------------- */
  /* TAB 2: SLOTS STYLES                                                        */
  /* -------------------------------------------------------------------------- */
  addNewSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addNewSlotBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  slotsDaysScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  slotDayPill: {
    width: 60,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
  },
  slotDayPillActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  slotDayPillName: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  slotDayPillNum: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginTop: 2,
  },
  slotDayTextActive: {
    color: '#FFFFFF',
  },
  slotsGridContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  slotsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderSubtle,
    marginBottom: 4,
  },
  slotsSubheaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  slotsSubheaderCount: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  slotRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderSubtle,
  },
  slotTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotClockCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotClockOpen: {
    backgroundColor: THEME.emeraldLight,
  },
  slotClockBlocked: {
    backgroundColor: '#F3ECE7',
  },
  slotTimeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  slotTimeSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  slotStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  slotStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slotBadgeOpen: {
    backgroundColor: THEME.emeraldLight,
    borderWidth: 1,
    borderColor: THEME.emeraldBorder,
  },
  slotBadgeBlocked: {
    backgroundColor: '#F5EBE8',
    borderWidth: 1,
    borderColor: '#E7DDD8',
  },
  slotStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  slotTextOpen: {
    color: THEME.emerald,
  },
  slotTextBlocked: {
    color: THEME.textSecondary,
  },
  emptySlotsCard: {
    paddingVertical: 28,
    alignItems: 'center',
  },

  /* -------------------------------------------------------------------------- */
  /* TAB 3: RECORDS STYLES                                                      */
  /* -------------------------------------------------------------------------- */
  completedRecordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  recordAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.primaryBlush,
  },
  recordAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  recordDateText: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.emeraldLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  completedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.emerald,
  },
  recordReasonText: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 10,
  },
  notesBox: {
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  notesContent: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  rxBox: {
    backgroundColor: THEME.primarySoft,
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: THEME.primaryBlush,
  },
  rxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primaryDeep,
  },
  rxContent: {
    fontSize: 13,
    color: THEME.primaryDeep,
    lineHeight: 18,
  },
  editNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  editNotesBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },

  /* -------------------------------------------------------------------------- */
  /* MODALS                                                                     */
  /* -------------------------------------------------------------------------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  notesDrawerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E7DDD8',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF7F7',
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  textArea: {
    backgroundColor: '#FAF7F7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    fontSize: 13,
    color: THEME.textPrimary,
    textAlignVertical: 'top',
  },
  saveNotesTouchWrapper: {
    marginTop: 20,
  },
  saveNotesBtn: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveNotesBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  addSlotCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  singleLineInput: {
    backgroundColor: '#FAF7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: THEME.textPrimary,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  confirmSlotBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmSlotBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* -------------------------------------------------------------------------- */
  /* DESKTOP SIDEBAR & LAYOUT STYLES                                            */
  /* -------------------------------------------------------------------------- */
  desktopContainer: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  desktopMainContent: {
    flex: 1,
    height: '100%',
    backgroundColor: THEME.pageBg,
    overflow: 'hidden',
  },

  /* -------------------------------------------------------------------------- */
  /* FLOATING BOTTOM NAVIGATION BAR                                             */
  /* -------------------------------------------------------------------------- */
  floatingBottomBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  floatingBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 24,
    marginHorizontal: 4,
  },
  floatingTabItemActive: {
    backgroundColor: THEME.primarySoft,
  },
  floatingTabIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginTop: 2,
  },
  floatingTabLabelActive: {
    color: THEME.primary,
    fontWeight: '800',
  },
  floatingBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  floatingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
