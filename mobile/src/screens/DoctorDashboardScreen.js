import React, { useState, useEffect, useMemo } from 'react';
import {
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
import { DoctorDashboardSkeleton } from '../components/DoctorCareSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'web' ? 6 : (StatusBar.currentHeight || 40);

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
  const [consultationsError, setConsultationsError] = useState('');
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
      setConsultationsError('');
      const bookings = await telemedService.getDoctorBookings();
      setConsultations(bookings || []);

      const slots = await telemedService.getDoctorSlots('doc_mesal_okubor');
      setDoctorSlots(slots || []);
    } catch (e) {
      console.warn('[DoctorDashboard] Load error:', e);
      setConsultationsError(e.message || 'Could not load consultations. Pull down to try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDoctorData();
  };

  // Active Queue: confirmed bookings that haven't been completed
  const activeQueue = useMemo(() => {
    return consultations.filter(
      (c) => c.status === 'requested' || c.status === 'confirmed' || c.status === 'scheduled' || c.status === 'in_progress'
    );
  }, [consultations]);

  // Completed Consultations
  const completedHistory = useMemo(() => {
    return consultations.filter(
      (c) => c.status === 'completed' || c.doctor_notes || c.prescription_summary
    );
  }, [consultations]);

  // Open Video Call
  const handleStartVideoCall = (booking) => {
    setActiveVideoCallBooking(booking);
    setShowVideoModal(true);
  };

  // Open Clinical Notes Editor
  const handleOpenNotes = (booking) => {
    setSelectedBookingForNotes(booking);
    setClinicalNotesText(booking.doctor_notes || '');
    setPrescriptionText(booking.prescription_summary || '');
  };

  // Save Clinical Notes
  const handleSaveNotes = async () => {
    if (!selectedBookingForNotes) return;
    setIsSavingNotes(true);
    try {
      await telemedService.addClinicalNotes(selectedBookingForNotes.booking_id, {
        notes: clinicalNotesText,
        prescription: prescriptionText,
      });

      // Update local state
      setConsultations((prev) =>
        prev.map((c) =>
          c.booking_id === selectedBookingForNotes.booking_id
            ? {
                ...c,
                doctor_notes: clinicalNotesText,
                prescription_summary: prescriptionText,
                status: 'completed',
              }
            : c
        )
      );

      setSelectedBookingForNotes(null);
      Alert.alert('Consultation Updated', 'Clinical notes and prescription saved successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save clinical notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Toggle Slot Availability
  const handleToggleSlot = async (slotId) => {
    try {
      const updated = await telemedService.toggleSlotAvailability(slotId);
      setDoctorSlots((prev) =>
        prev.map((s) => (s.slot_id === slotId ? { ...s, is_booked: updated.is_booked } : s))
      );
    } catch (e) {
      Alert.alert('Error', 'Could not update slot.');
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
    <View className={`flex-1 bg-white ${isLargeScreen ? 'flex-row bg-[#FAF7F7]' : ''}`}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

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

      <View className={isLargeScreen ? 'flex-1 bg-[#FAF7F7]' : 'flex-1'}>
        {/* ========================================================================= */}
        {/* 1. TOP HEADER: DOCTOR IDENTITY & QUICK CONTROLS                           */}
        {/* ========================================================================= */}
        <View
          className="px-4 pb-3 flex-row items-center justify-between border-b border-gray-100 bg-white"
          style={{ paddingTop: STATUSBAR_HEIGHT + 8 }}
        >
          <View className="flex-row items-center">
            <View className="relative">
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
                }}
                className="w-12 h-12 rounded-full border-2 border-red-100"
              />
              <View className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 items-center justify-center border border-white">
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            </View>

            <View className="ml-3">
              <Text className="text-base font-bold text-gray-900">{doctorName}</Text>
              <Text className="text-xs text-gray-500 font-medium">OB-GYN · Telemedicine</Text>
            </View>
          </View>

          {/* Right Header Actions */}
          <View className="flex-row items-center gap-2">
            {onPreviewPatientView && (
              <TouchableOpacity
                activeOpacity={0.75}
                className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 items-center justify-center"
                onPress={onPreviewPatientView}
                accessibilityLabel="Patient View"
              >
                <Ionicons name="eye-outline" size={17} color="#DC2626" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.75}
              className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 items-center justify-center"
              onPress={loadDoctorData}
              accessibilityLabel="Refresh"
            >
              <Ionicons name="refresh-outline" size={17} color="#1C1917" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 items-center justify-center"
              onPress={onSignOut}
              accessibilityLabel="Sign Out"
            >
              <Ionicons name="log-out-outline" size={17} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 2. ON-DUTY STATUS BAR                                                     */}
        {/* ========================================================================= */}
        <View className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <TouchableOpacity
            activeOpacity={0.85}
            className={`flex-row items-center justify-between py-2 px-3.5 rounded-xl border ${
              isOnDuty ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-100 border-gray-200'
            }`}
            onPress={() => setIsOnDuty(!isOnDuty)}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-2 h-2 rounded-full mr-2 relative items-center justify-center">
                {isOnDuty && <View className="w-3 h-3 rounded-full bg-emerald-400/40 absolute" />}
                <View className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              </View>
              <Text className={`text-xs font-semibold ml-1 ${isOnDuty ? 'text-emerald-800' : 'text-gray-500'}`}>
                {isOnDuty ? 'Clinic Online · Accepting Patients' : 'Clinic Offline · Availability Paused'}
              </Text>
            </View>
            <Ionicons
              name={isOnDuty ? 'toggle' : 'toggle-outline'}
              size={20}
              color={isOnDuty ? '#059669' : '#A8A29E'}
              className="ml-1.5"
            />
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* 3. MAIN DASHBOARD CONTENT SCROLL VIEW                                     */}
        {/* ========================================================================= */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 pb-28"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#DC2626"
              colors={['#DC2626', '#B91C1C']}
              progressBackgroundColor="#FFFFFF"
            />
          }
        >
          {isLoading ? (
            <DoctorDashboardSkeleton />
          ) : activeTab === 'queue' ? (
            /* ======================================================================= */
            /* TAB 1: PATIENT QUEUE & TODAY'S SCHEDULE                                 */
            /* ======================================================================= */
            <View>
              {/* Section Heading */}
              <View className="flex-row items-center justify-between mb-3.5">
                <View className="flex-row items-center gap-2">
                  <View className="w-1 h-4 rounded-full bg-red-600" />
                  <Text className="text-base font-bold text-gray-900">Today's Appointments</Text>
                </View>
              </View>

              {activeQueue.length === 0 ? (
                <View className="bg-white rounded-2xl p-6 border border-gray-100 items-center text-center shadow-sm my-2">
                  <View className={`w-14 h-14 rounded-full items-center justify-center mb-3 ${consultationsError ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                    <Ionicons name={consultationsError ? 'alert-circle-outline' : 'checkmark-done-circle'} size={42} color={consultationsError ? '#D97706' : '#059669'} />
                  </View>
                  <Text className="text-base font-bold text-gray-900 mb-1 text-center">
                    {consultationsError ? 'Could not load appointments' : 'Queue is all clear!'}
                  </Text>
                  <Text className="text-xs text-gray-500 text-center leading-relaxed max-w-[280px]">
                    {consultationsError || 'No pending consultations right now. Patients who book your open slots will appear here in real time.'}
                  </Text>
                  {consultationsError ? (
                    <TouchableOpacity activeOpacity={0.8} onPress={loadDoctorData} className="mt-3 px-4 py-2 rounded-full bg-red-600">
                      <Text className="text-xs font-bold text-white">Try again</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                activeQueue.map((item) => (
                  <View key={item.booking_id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3.5">
                    {/* Card Top: Patient Details & Status */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-full bg-red-50 border border-red-100 items-center justify-center">
                          <Text className="text-sm font-bold text-red-600">
                            {(item.user_name || 'Patient')
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </Text>
                        </View>
                        <View className="ml-3">
                          <Text className="text-sm font-bold text-gray-900">{item.user_name || 'Amara Okonkwo'}</Text>
                          <View className="flex-row items-center gap-1 mt-0.5">
                            <Ionicons name="time-outline" size={13} color="#78716C" />
                            <Text className="text-xs text-gray-500 font-medium">{item.scheduled_time || 'Today, 2:30 PM'}</Text>
                          </View>
                        </View>
                      </View>

                      <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${item.status === 'requested' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <View className={`w-1.5 h-1.5 rounded-full ${item.status === 'requested' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <Text className={`text-xs font-bold ${item.status === 'requested' ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {item.status === 'requested' ? 'Payment pending' : 'Confirmed'}
                        </Text>
                      </View>
                    </View>

                    {/* Consultation Reason & Details Box */}
                    <View className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 mb-3">
                      <Text className="text-xs text-gray-600 leading-relaxed">
                        <Text className="text-gray-900 font-semibold">Reason: </Text>
                        {item.reason || 'Routine consultation and check-in'}
                      </Text>
                      {item.symptoms_notes ? (
                        <View className="flex-row items-center gap-1.5 mt-1.5 pt-1.5 border-t border-gray-200/60">
                          <Ionicons name="information-circle-outline" size={13} color="#78716C" />
                          <Text className="text-xs text-gray-500">Symptoms: {item.symptoms_notes}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Doctor Actions: Start Video Call & Notes/Rx */}
                    <View className="flex-row items-center gap-2.5">
                      <TouchableOpacity
                        activeOpacity={0.85}
                        className="flex-1 rounded-xl overflow-hidden shadow-sm"
                        onPress={() => handleStartVideoCall(item)}
                      >
                        <LinearGradient
                          colors={['#DC2626', '#B91C1C']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="py-2.5 px-3 flex-row items-center justify-center gap-2"
                        >
                          <Ionicons name="videocam" size={16} color="#FFFFFF" />
                          <Text className="text-xs font-bold text-white">Start Video Call</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        className="py-2.5 px-3.5 rounded-xl border border-red-200 bg-red-50 flex-row items-center justify-center gap-1.5"
                        onPress={() => handleOpenNotes(item)}
                      >
                        <Ionicons name="create-outline" size={16} color="#DC2626" />
                        <Text className="text-xs font-bold text-red-600">Notes / Rx</Text>
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
              <View className="flex-row items-center justify-between mb-3.5">
                <View className="flex-row items-center gap-2">
                  <View className="w-1 h-4 rounded-full bg-red-600" />
                  <Text className="text-base font-bold text-gray-900">Manage Consultation Slots</Text>
                </View>
                <TouchableOpacity
                  className="flex-row items-center gap-1 bg-red-600 py-1.5 px-3 rounded-xl"
                  activeOpacity={0.85}
                  onPress={() => setShowAddSlotModal(true)}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white">Add Slot</Text>
                </TouchableOpacity>
              </View>

              {/* Day Selector Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 py-1 mb-4"
              >
                {calendarDays.map((day) => {
                  const isSelected = selectedSlotDayIndex === day.index;
                  return (
                    <TouchableOpacity
                      key={day.index}
                      activeOpacity={0.85}
                      className={`w-14 py-2.5 rounded-2xl items-center justify-center shadow-sm ${
                        isSelected ? 'bg-red-600 border border-red-600' : 'bg-white border border-gray-200'
                      }`}
                      onPress={() => setSelectedSlotDayIndex(day.index)}
                    >
                      <Text className={`text-xs font-semibold mb-0.5 ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                        {day.dayName}
                      </Text>
                      <Text className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {day.dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Slots List for Selected Day */}
              <View className="gap-2">
                <View className="flex-row items-center justify-between mb-2 px-1">
                  <Text className="text-xs font-bold text-gray-700">
                    Open Hours for {calendarDays[selectedSlotDayIndex]?.dayName} {calendarDays[selectedSlotDayIndex]?.dayNum}
                  </Text>
                  <Text className="text-xs font-semibold text-gray-400">{selectedDaySlots.length} Slots</Text>
                </View>

                {selectedDaySlots.length === 0 ? (
                  <View className="bg-white rounded-2xl p-6 border border-gray-100 items-center text-center shadow-sm my-2">
                    <Ionicons name="calendar-outline" size={32} color="#A8A29E" />
                    <Text className="text-base font-bold text-gray-900 mb-1 text-center mt-2">No slots open for this date</Text>
                    <Text className="text-xs text-gray-500 text-center leading-relaxed">
                      Tap "+ Add Slot" above to configure patient booking availability.
                    </Text>
                  </View>
                ) : (
                  selectedDaySlots.map((slot) => (
                    <View key={slot.slot_id} className="flex-row items-center justify-between bg-white rounded-xl p-3 border border-gray-100 shadow-sm mb-2">
                      <View className="flex-row items-center gap-3">
                        <View className={`w-9 h-9 rounded-xl items-center justify-center ${
                          slot.is_booked ? 'bg-gray-100 border border-gray-200' : 'bg-emerald-50 border border-emerald-100'
                        }`}>
                          <Ionicons
                            name="time"
                            size={15}
                            color={slot.is_booked ? '#78716C' : '#059669'}
                          />
                        </View>
                        <View>
                          <Text className="text-xs font-bold text-gray-900">
                            {slot.start_time} - {slot.end_time || '30 min'}
                          </Text>
                          <Text className="text-[11px] text-gray-400">Telehealth Video Session</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        className={`flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${
                          slot.is_booked ? 'bg-gray-100 border-gray-200' : 'bg-emerald-50 border-emerald-200'
                        }`}
                        onPress={() => handleToggleSlot(slot.slot_id)}
                      >
                        <View className={`w-1.5 h-1.5 rounded-full ${slot.is_booked ? 'bg-gray-400' : 'bg-emerald-500'}`} />
                        <Text
                          className={`text-xs font-bold ${
                            slot.is_booked ? 'text-gray-500' : 'text-emerald-700'
                          }`}
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
              <View className="flex-row items-center justify-between mb-3.5">
                <View className="flex-row items-center gap-2">
                  <View className="w-1 h-4 rounded-full bg-red-600" />
                  <Text className="text-base font-bold text-gray-900">Completed Consultations</Text>
                </View>
              </View>

              {completedHistory.length === 0 ? (
                <View className="bg-white rounded-2xl p-6 border border-gray-100 items-center text-center shadow-sm my-2">
                  <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-3">
                    <Ionicons name="folder-open-outline" size={38} color="#A8A29E" />
                  </View>
                  <Text className="text-base font-bold text-gray-900 mb-1 text-center">No archived consultations yet</Text>
                  <Text className="text-xs text-gray-500 text-center leading-relaxed">
                    Completed telemedicine sessions and patient clinical summaries will appear here for follow-up reference.
                  </Text>
                </View>
              ) : (
                completedHistory.map((item) => (
                  <View key={item.booking_id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3.5">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1">
                        <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                          <Text className="text-xs font-bold text-gray-600">
                            {(item.user_name || 'Patient')
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </Text>
                        </View>
                        <View className="ml-2.5">
                          <Text className="text-sm font-bold text-gray-900">{item.user_name || 'Patient'}</Text>
                          <Text className="text-xs text-gray-400 mt-0.5">{item.scheduled_time}</Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <Ionicons name="checkmark-done" size={12} color="#059669" />
                        <Text className="text-[11px] font-bold text-emerald-700">Archived</Text>
                      </View>
                    </View>

                    <Text className="text-xs text-gray-500 mb-2.5">
                      Clinical Scope: <Text className="text-gray-900 font-semibold">{item.reason}</Text>
                    </Text>

                    {item.doctor_notes ? (
                      <View className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100 mb-2">
                        <View className="flex-row items-center gap-1.5 mb-1">
                          <Ionicons name="document-text" size={13} color="#166534" />
                          <Text className="text-[11px] font-bold text-emerald-800">Clinical Findings:</Text>
                        </View>
                        <Text className="text-xs text-gray-700 leading-relaxed">{item.doctor_notes}</Text>
                      </View>
                    ) : null}

                    {item.prescription_summary ? (
                      <View className="bg-red-50/50 rounded-xl p-2.5 border border-red-100 mb-2">
                        <View className="flex-row items-center gap-1.5 mb-1">
                          <Ionicons name="medkit" size={13} color="#DC2626" />
                          <Text className="text-[11px] font-bold text-red-800">Prescription Summary (Rx):</Text>
                        </View>
                        <Text className="text-xs text-gray-700 leading-relaxed">{item.prescription_summary}</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      className="flex-row items-center justify-center gap-1 py-2 rounded-xl bg-gray-50 border border-gray-200 mt-1"
                      onPress={() => handleOpenNotes(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={14} color="#DC2626" />
                      <Text className="text-xs font-semibold text-red-600">
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
        <View className="absolute bottom-6 left-4 right-4 items-center">
          <View className="flex-row items-center justify-around bg-white/95 rounded-2xl border border-gray-100 py-2.5 px-4 shadow-lg w-full max-w-[380px]">
            {/* Tab 1: Queue */}
            <TouchableOpacity
              activeOpacity={0.8}
              className={`items-center py-1 px-3 rounded-xl ${activeTab === 'queue' ? 'bg-red-50' : ''}`}
              onPress={() => setActiveTab('queue')}
            >
              <View className="relative items-center justify-center">
                <Ionicons
                  name={activeTab === 'queue' ? 'videocam' : 'videocam-outline'}
                  size={22}
                  color={activeTab === 'queue' ? '#DC2626' : '#78716C'}
                />
                {activeQueue.length > 0 && (
                  <View className="absolute -top-1.5 -right-2 bg-red-600 rounded-full w-4 h-4 items-center justify-center">
                    <Text className="text-[9px] font-black text-white">{activeQueue.length}</Text>
                  </View>
                )}
              </View>
              <Text className={`text-[10px] font-medium mt-0.5 ${activeTab === 'queue' ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                Queue
              </Text>
            </TouchableOpacity>

            {/* Tab 2: Availability */}
            <TouchableOpacity
              activeOpacity={0.8}
              className={`items-center py-1 px-3 rounded-xl ${activeTab === 'slots' ? 'bg-red-50' : ''}`}
              onPress={() => setActiveTab('slots')}
            >
              <View className="relative items-center justify-center">
                <Ionicons
                  name={activeTab === 'slots' ? 'calendar' : 'calendar-outline'}
                  size={22}
                  color={activeTab === 'slots' ? '#DC2626' : '#78716C'}
                />
              </View>
              <Text className={`text-[10px] font-medium mt-0.5 ${activeTab === 'slots' ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                Availability
              </Text>
            </TouchableOpacity>

            {/* Tab 3: Records */}
            <TouchableOpacity
              activeOpacity={0.8}
              className={`items-center py-1 px-3 rounded-xl ${activeTab === 'records' ? 'bg-red-50' : ''}`}
              onPress={() => setActiveTab('records')}
            >
              <View className="relative items-center justify-center">
                <Ionicons
                  name={activeTab === 'records' ? 'document-text' : 'document-text-outline'}
                  size={22}
                  color={activeTab === 'records' ? '#DC2626' : '#78716C'}
                />
              </View>
              <Text className={`text-[10px] font-medium mt-0.5 ${activeTab === 'records' ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
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
            className="w-full rounded-2xl overflow-hidden shadow-sm"
            onPress={handleSaveNotes}
            disabled={isSavingNotes}
          >
            <LinearGradient
              colors={['#DC2626', '#B91C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-3.5 px-4 flex-row items-center justify-center gap-2"
            >
              {isSavingNotes ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                  <Text className="text-sm font-bold text-white">Save & Finalize Consultation</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        }
      >
        <View className="pb-4">
          <Text className="text-xs font-bold text-gray-700 mb-2 mt-1">Clinical Observations & Recommendations</Text>
          <TextInput
            className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs text-gray-800 leading-relaxed mb-3"
            placeholder="Record clinical assessment, ultrasound notes, and medical guidance..."
            placeholderTextColor="#A8A29E"
            multiline
            numberOfLines={4}
            value={clinicalNotesText}
            onChangeText={setClinicalNotesText}
          />

          <Text className="text-xs font-bold text-gray-700 mb-2 mt-1">Prescription Summary (Optional)</Text>
          <TextInput
            className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs text-gray-800 leading-relaxed mb-3"
            placeholder="e.g. Folate 5mg daily, Prenatal Multivitamins 1 tab..."
            placeholderTextColor="#A8A29E"
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
        <View className="pb-4">
          <Text className="text-xs font-bold text-gray-700 mb-2 mt-1">Start Time (e.g. 10:00, 14:30)</Text>
          <TextInput
            className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-sm text-gray-800 font-semibold mb-4"
            placeholder="10:00"
            placeholderTextColor="#A8A29E"
            value={newSlotTime}
            onChangeText={setNewSlotTime}
          />

          <View className="flex-row justify-end gap-3 mt-2">
            <TouchableOpacity
              className="py-2.5 px-4 rounded-xl"
              onPress={() => setShowAddSlotModal(false)}
            >
              <Text className="text-xs font-semibold text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-600 py-2.5 px-5 rounded-xl shadow-sm"
              onPress={handleAddCustomSlot}
              disabled={isAddingSlot}
            >
              {isAddingSlot ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-xs font-bold text-white">Create Slot</Text>
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
