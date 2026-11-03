import React, { useState, useEffect, useMemo } from 'react';
import {
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Dimensions,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
  SafeAreaView,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AppBottomSheet from '../components/AppBottomSheet';
import ConfirmationModal from '../components/ConfirmationModal';
import AppointmentsListModal from './AppointmentsListModal';
import StreamVideoCallModal from './StreamVideoCallModal';
import PaystackCheckoutModal from '../components/PaystackCheckoutModal';
import { initializeConsultationPayment } from '../services/paymentService';
import * as telemedService from '../services/telemedicineService';
import notificationService from '../services/notificationService';
import {
  UpcomingCardSkeleton,
  SpecialistsListSkeleton,
  DoctorSeeAllSkeleton,
} from '../components/DoctorCareSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUSBAR_HEIGHT =
  Platform.OS === 'android'
    ? (StatusBar.currentHeight || 38)
    : Platform.OS === 'ios'
      ? 44
      : 0;

const formatSlotDisplayTime = (slot) => {
  if (!slot) return 'Select Time';
  let raw = slot.start_time || slot.formatted_time || '';
  if (typeof raw !== 'string') return 'Select Time';
  if (raw.includes(',')) {
    raw = raw.split(',').pop().trim();
  }
  if (raw.includes('T')) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  }
  const match24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    let hour = parseInt(match24[1], 10);
    const minute = match24[2];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
  }
  return raw || 'Select Time';
};

const isSlotInPast = (slot, date) => {
  if (!slot || !date) return false;
  const now = new Date();

  const slotDate = new Date(date);
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDay = now.getDate();

  const slotYear = slotDate.getFullYear();
  const slotMonth = slotDate.getMonth();
  const slotDay = slotDate.getDate();

  const targetDateOnly = new Date(slotYear, slotMonth, slotDay);
  const todayDateOnly = new Date(nowYear, nowMonth, nowDay);

  if (targetDateOnly < todayDateOnly) return true;
  if (targetDateOnly > todayDateOnly) return false;

  let raw = slot.start_time || slot.formatted_time || '';
  if (typeof raw !== 'string') return false;
  if (raw.includes(',')) {
    raw = raw.split(',').pop().trim();
  }
  if (raw.includes('T')) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d <= now;
    }
  }

  let hours = 0;
  let minutes = 0;

  const match24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    hours = parseInt(match24[1], 10);
    minutes = parseInt(match24[2], 10);
  } else {
    const match12 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (match12) {
      hours = parseInt(match12[1], 10);
      minutes = parseInt(match12[2], 10);
      const ampm = (match12[3] || '').toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else {
      return false;
    }
  }

  const slotDateTime = new Date(nowYear, nowMonth, nowDay, hours, minutes, 0);
  return slotDateTime <= now;
};

export default function DoctorCareScreen({
  route,
  navigation,
  onBookDoctor,
  initialDoctor,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onNavigateHome,
  onOpenAIAssistant,
}) {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const isDoctorAccount = user?.role === 'doctor';

  const userName = isDoctorAccount
    ? (user?.name || 'Consulting Doctor')
    : (user?.name || 'Patient');

  // Specialists state (Real doctors from backend)
  const [specialists, setSpecialists] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fullscreen Booking Modal State (2-Step Flow: Step 1 Profile -> Step 2 Book Appointment)
  const [showProfile, setShowProfile] = useState(false);
  const [profileStep, setProfileStep] = useState('profile'); // 'profile' (Step 1) | 'booking' (Step 2)
  const [isFavoriteDoctor, setIsFavoriteDoctor] = useState(false);
  const [consultationType, setConsultationType] = useState('video'); // 'video' | 'in_person' | 'chat'
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [doctorSlots, setDoctorSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [consultationReason, setConsultationReason] = useState('Reproductive Health Consultation');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [showBookingSuccessModal, setShowBookingSuccessModal] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);

  // Reusable Confirmation Modal state for booking & payment feedback
  const [confirmationModalConfig, setConfirmationModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    icon: 'alert-circle-outline',
    iconColor: '#DC2626',
    iconBg: '#FEF2F2',
    onConfirm: () => { },
  });

  // See all doctors modal state
  const [showSeeAll, setShowSeeAll] = useState(false);
  const [seeAllSearchQuery, setSeeAllSearchQuery] = useState('');
  const [seeAllFilterSpecialty, setSeeAllFilterSpecialty] = useState('All');

  // Filtered doctors for See All modal
  const filteredAllDoctors = useMemo(() => {
    if (!specialists) return [];
    return specialists.filter((d) => {
      const q = seeAllSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        d.name?.toLowerCase().includes(q) ||
        d.specialty?.toLowerCase().includes(q) ||
        d.hospital_affiliation?.toLowerCase().includes(q);
      const matchesSpec =
        seeAllFilterSpecialty === 'All' ||
        d.specialty?.toLowerCase() === seeAllFilterSpecialty.toLowerCase();
      return matchesSearch && matchesSpec;
    });
  }, [specialists, seeAllSearchQuery, seeAllFilterSpecialty]);

  // Paystack Telemedicine Payment State
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [paystackPaymentData, setPaystackPaymentData] = useState(null);

  // Consultations Manager & Video Call State
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [activeVideoCallBooking, setActiveVideoCallBooking] = useState(null);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);

  // Dynamic 7-day horizontal date strip
  const upcomingDateStrip = useMemo(() => {
    const days = [];
    const baseDate = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isSelected =
        selectedDate &&
        d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate();

      days.push({
        date: d,
        dayName,
        monthDay,
        isSelected,
      });
    }
    return days;
  }, [selectedDate]);

  // Fetch verified doctors & user bookings directly from backend database API
  const loadData = async () => {
    setIsLoading(true);
    try {
      const docs = await telemedService.getDoctors();
      setSpecialists(docs || []);
    } catch (e) {
      console.warn('Error fetching doctors from backend:', e);
      setSpecialists([]);
    }
    try {
      const bookings = await telemedService.getUserBookings();
      setUserBookings(bookings || []);
    } catch (e) {
      console.warn('Error fetching bookings from backend:', e);
      setUserBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Handle external book doctor trigger (via initialDoctor prop or navigation route params)
  useEffect(() => {
    if (initialDoctor) {
      handleOpenBooking(initialDoctor);
      return;
    }
    const targetDocId = route?.params?.selectedDoctorId;
    if (targetDocId && specialists && specialists.length > 0) {
      const found = specialists.find((d) => d.doctor_id === targetDocId);
      if (found) {
        handleOpenBooking(found);
      }
    }
  }, [initialDoctor, route?.params?.selectedDoctorId, specialists]);

  const loadSlotsForDate = async (doctor, date) => {
    if (!doctor) return;
    setIsLoadingSlots(true);
    try {
      const dateYear = date.getFullYear();
      const dateMonth = String(date.getMonth() + 1).padStart(2, '0');
      const dateDay = String(date.getDate()).padStart(2, '0');
      const dateStr = `${dateYear}-${dateMonth}-${dateDay}`;

      const slots = await telemedService.getDoctorSlots(doctor.doctor_id, dateStr);
      const availableSlots = Array.isArray(slots) ? slots : [];
      setDoctorSlots(availableSlots);
      const firstAvailable = availableSlots.find((s) => !s.is_booked && !isSlotInPast(s, date));
      setSelectedSlot(firstAvailable || null);
    } catch (err) {
      console.warn('Error loading doctor slots:', err);
      setDoctorSlots([]);
      setSelectedSlot(null);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleOpenBooking = (doctor) => {
    const doc = doctor || (specialists && specialists[0]) || null;
    if (!doc) return;
    setSelectedDoctor(doc);
    setProfileStep('profile');
    setConsultationType('video');
    const initialDate = new Date();
    setSelectedDate(initialDate);
    setShowProfile(true);
    loadSlotsForDate(doc, initialDate);
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    if (selectedDoctor) {
      loadSlotsForDate(selectedDoctor, date);
    }
  };

  const handleOpenSeeAll = () => {
    setShowSeeAll(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor) return;
    if (!selectedSlot || selectedSlot.is_booked) {
      setConfirmationModalConfig({
        visible: true,
        title: 'Select a Time Slot',
        message: 'Please choose an available appointment time slot on the calendar.',
        confirmText: 'OK',
        cancelText: null,
        icon: 'calendar-outline',
        iconColor: '#DC2626',
        iconBg: '#FEF2F2',
        onConfirm: () => setConfirmationModalConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (isSlotInPast(selectedSlot, selectedDate)) {
      setConfirmationModalConfig({
        visible: true,
        title: 'Time Slot Unavailable',
        message: 'This time slot has already passed. Please select an upcoming time slot.',
        confirmText: 'OK',
        cancelText: null,
        icon: 'time-outline',
        iconColor: '#DC2626',
        iconBg: '#FEF2F2',
        onConfirm: () => setConfirmationModalConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const dateFormatted = selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const rawSlotTime = formatSlotDisplayTime(selectedSlot);
      const scheduledTime = `${dateFormatted}, ${rawSlotTime}`;

      const booking = await telemedService.bookConsultation({
        doctorId: selectedDoctor.doctor_id,
        slotId: selectedSlot.slot_id,
        scheduledTime,
        reason: consultationReason || 'Reproductive Health Consultation',
        consultationType: consultationType || 'video',
      });

      // Launch Paystack Secure Checkout
      try {
        const payRes = await initializeConsultationPayment(booking.booking_id);
        if (payRes.success && payRes.payment) {
          setPaystackPaymentData({
            booking,
            authorizationUrl: payRes.payment.authorization_url,
            reference: payRes.payment.reference,
            amount: payRes.payment.amount,
          });
          setShowProfile(false);
          setShowPaystackModal(true);
          return;
        }
      } catch (payErr) {
        console.warn('[DoctorCareScreen] Payment initialization error:', payErr);
      }

      setShowProfile(false);
      setConfirmationModalConfig({
        visible: true,
        title: 'Payment Incomplete',
        message:
          'Your consultation booking has been requested, but payment was not completed. Please pay the consultation fee in "My Appointments" to confirm your session.',
        confirmText: 'View Appointments',
        cancelText: 'OK',
        icon: 'card-outline',
        iconColor: '#DC2626',
        iconBg: '#FEF2F2',
        onConfirm: () => {
          setConfirmationModalConfig((prev) => ({ ...prev, visible: false }));
          setShowAppointmentsModal(true);
        },
      });

      const updatedBookings = await telemedService.getUserBookings();
      setUserBookings(updatedBookings || []);
    } catch (e) {
      setConfirmationModalConfig({
        visible: true,
        title: 'Booking Notice',
        message: e.message || 'Could not schedule appointment.',
        confirmText: 'OK',
        cancelText: null,
        icon: 'alert-circle-outline',
        iconColor: '#DC2626',
        iconBg: '#FEF2F2',
        onConfirm: () => setConfirmationModalConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handlePaymentSuccess = (confirmedBooking, payment) => {
    setShowPaystackModal(false);
    const booking = confirmedBooking || paystackPaymentData?.booking;
    setConfirmedBookingData(booking);
    setShowBookingSuccessModal(true);
    loadData();

    if (booking) {
      notificationService.addInAppNotification({
        id: `rem_book_${booking.booking_id}`,
        title: `Consultation Booked: ${booking.doctor_name || selectedDoctor?.name || 'Doctor'}`,
        body: `Scheduled for ${booking.scheduled_time}. Your encrypted HD video consultation room is ready.`,
        type: 'appointment',
        time: 'Just now',
        icon: 'videocam-outline',
        iconBg: '#E6F4EA',
        iconColor: '#059669',
        data: {
          screen: 'DoctorCareScreen',
          bookingId: booking.booking_id,
          videoRoomUrl: booking.video_room_url,
        },
      });

      notificationService.syncAllReminders({
        bookings: [booking, ...userBookings],
      });
    }
  };

  const activeUpcomingCount = userBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'requested' || b.status === 'in_progress'
  ).length;

  // Paystack checkout for an existing booking
  const handlePayForBooking = async (booking) => {
    if (!booking) {
      if (specialists && specialists.length > 0) {
        handleOpenBooking(specialists[0]);
      } else {
        setShowSeeAll(true);
      }
      return;
    }
    try {
      if (booking.booking_id) {
        const payRes = await initializeConsultationPayment(booking.booking_id);
        if (payRes.success && payRes.payment) {
          setPaystackPaymentData({
            booking,
            authorizationUrl: payRes.payment.authorization_url,
            reference: payRes.payment.reference,
            amount: payRes.payment.amount,
          });
          setShowPaystackModal(true);
          return;
        }
      }
      setConfirmationModalConfig({
        visible: true,
        title: 'Payment Notice',
        message: 'Payment authorization could not be started. Please try again.',
        confirmText: 'OK',
        cancelText: null,
        icon: 'card-outline',
        iconColor: '#DC2626',
        iconBg: '#FEF2F2',
        onConfirm: () => setConfirmationModalConfig((prev) => ({ ...prev, visible: false })),
      });
    } catch (err) {
      setConfirmationModalConfig({
        visible: true,
        title: 'Payment Error',
        message: err.message || 'Could not initiate payment.',
        confirmText: 'OK',
        cancelText: null,
        icon: 'alert-circle-outline',
        iconColor: '#DC2626',
        iconBg: '#FEF2F2',
        onConfirm: () => setConfirmationModalConfig((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const handleJoinVideoCall = (booking) => {
    setActiveVideoCallBooking(booking);
    setShowVideoCallModal(true);
  };

  // Helper to format date & time strings
  const formatBookingDateTime = (str) => {
    if (!str) return { date: 'Scheduled Visit', time: 'Consultation', full: 'Scheduled Consultation' };

    try {
      // 1. Try ISO string parse first (e.g. '2026-10-25T14:00:00Z')
      if (typeof str === 'string' && (str.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(str))) {
        if (!str.includes(',')) {
          const d = new Date(str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str);
          if (!isNaN(d.getTime())) {
            const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            return { date, time, full: `${date} • ${time}` };
          }
        }
      }

      // 2. Handle comma-separated strings like 'Mon, Oct 19, 2026-10-19, 09:00' or 'Mon, Oct 19, 09:00 AM'
      if (typeof str === 'string' && str.includes(',')) {
        const parts = str.split(',').map((s) => s.trim());
        let timePart = parts[parts.length - 1]; // e.g. '09:00' or '9:00 AM'

        // Format 24hr time '09:00' or '14:30' into 12hr format '9:00 AM'
        const match24 = timePart.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (match24) {
          let h = parseInt(match24[1], 10);
          const m = match24[2];
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          timePart = `${h}:${m} ${ampm}`;
        }

        // Date part: prefer 'Mon, Oct 19' if available
        let datePart = parts[0];
        if (
          parts.length >= 2 &&
          !/^\d{4}-\d{2}-\d{2}$/.test(parts[1]) &&
          !/^(\d{1,2}):(\d{2})/.test(parts[1])
        ) {
          datePart = `${parts[0]}, ${parts[1]}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
          const d = new Date(parts[0]);
          if (!isNaN(d.getTime())) {
            datePart = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          }
        }

        return { date: datePart, time: timePart, full: `${datePart} • ${timePart}` };
      }
    } catch (_) { }

    return { date: str, time: 'Consultation', full: str };
  };

  // Upcoming consultation cards use real bookings, ordered by their scheduled time.
  const displayedUpcomingBookings = useMemo(() => (
    (userBookings || [])
      .filter((booking) => ['confirmed', 'requested', 'in_progress'].includes(booking.status))
      .sort((a, b) => new Date(a.scheduled_time || 0).getTime() - new Date(b.scheduled_time || 0).getTime())
      .map((booking) => {
        const { date, time } = formatBookingDateTime(booking.scheduled_time);
        return {
          booking_id: booking.booking_id,
          doctor_name: booking.doctor_name || 'Verified Specialist',
          doctor_specialty: booking.doctor_specialty || 'Obstetrics & Gynecologist',
          doctor_photo: booking.doctor_photo_url || booking.doctor_photo || null,
          date,
          time,
          is_paid: booking.payment_status === 'paid' || booking.status === 'confirmed',
          raw: booking,
        };
      })
  ), [userBookings]);

  // Unique verified specialists directly from backend database (strictly de-duplicated)
  const displayedSpecialistsList = useMemo(() => {
    if (!specialists || specialists.length === 0) return [];
    const seen = new Set();
    const unique = [];
    for (const doc of specialists) {
      const key = doc.doctor_id || doc.name;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push({
          id: doc.doctor_id,
          name: doc.name,
          specialty: doc.specialty,
          date: `₦${Number(doc.fee_ngn || 15000).toLocaleString()}`,
          time: `★ ${Number(doc.rating || 5.0).toFixed(1)}`,
          photo: doc.photo_url || doc.avatar_url,
          rawDoc: doc,
        });
      }
    }
    return unique.slice(0, 4);
  }, [specialists]);

  const handleDoctorPress = (item) => {
    if (item?.rawDoc) {
      handleOpenBooking(item.rawDoc);
    } else {
      setShowSeeAll(true);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent={true} />

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{
          paddingTop: STATUSBAR_HEIGHT + 10,
          paddingBottom: 110,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.textPrimary}
            colors={[isDarkMode ? '#FFFFFF' : '#111827', '#DC2626']}
            progressBackgroundColor={theme.card}
          />
        }
      >
        <View className="w-full max-w-[520px] px-5">
          {/* TOP NAV BAR */}
          <View className="flex-row items-center justify-between w-full mb-6">
            <TouchableOpacity
              activeOpacity={0.75}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isDarkMode ? '#2B2B2B' : '#FFFFFF',
                borderColor: theme.cardBorder,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="shadow-sm"
              onPress={() => {
                if (onNavigateHome) onNavigateHome();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>

            <Text className="text-xl font-black tracking-tight" style={{ color: theme.textPrimary }}>Appointments</Text>

            <TouchableOpacity
              activeOpacity={0.75}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isDarkMode ? '#2B2B2B' : '#FFFFFF',
                borderColor: theme.cardBorder,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="shadow-sm"
              onPress={() => setShowAppointmentsModal(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Consultation History"
            >
              <Ionicons name="time-outline" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* UPCOMING SECTION */}
          <View className="flex-row items-center justify-between w-full mb-3.5 px-1">
            <Text className="text-lg font-extrabold" style={{ color: theme.textPrimary }}>Upcoming</Text>
            {userBookings.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowAppointmentsModal(true)}
              >
                <Text className="text-sm font-bold" style={{ color: theme.textSecondary }}>View all</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* UPCOMING CONSULTATION CARDS */}
          {isLoading ? (
            <UpcomingCardSkeleton />
          ) : displayedUpcomingBookings.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20, paddingRight: 8 }}>
              {displayedUpcomingBookings.map((meeting, index) => {
                const cardColors = isDarkMode
                  ? ['#30243A', '#21333A', '#3A3021']
                  : ['#F8E7EC', '#E6EEF9', '#EAF2E4'];
                const cardTextColor = isDarkMode ? '#FFFFFF' : '#17212B';
                return (
                  <View
                    key={meeting.booking_id || `${meeting.doctor_name}-${index}`}
                    style={{
                      width: 208,
                      minHeight: 180,
                      marginRight: 12,
                      borderRadius: 20,
                      padding: 14,
                      backgroundColor: cardColors[index % cardColors.length],
                      borderWidth: isDarkMode ? 1 : 0,
                      borderColor: theme.cardBorder,
                      justifyContent: 'space-between',
                    }}
                  >
                    <View>
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.72)' }}>
                          <Ionicons name="medical-outline" size={17} color={cardTextColor} />
                        </View>
                        <View className="flex-row items-center">
                          <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: meeting.is_paid ? '#55CF79' : '#F5A623' }} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary }} numberOfLines={1}>
                            {meeting.is_paid ? 'Confirmed' : 'Payment due'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: cardTextColor, fontSize: 15, lineHeight: 19, fontWeight: '800' }} numberOfLines={1}>
                        {meeting.doctor_name}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 3 }} numberOfLines={1}>
                        {meeting.doctor_specialty}
                      </Text>
                      <View className="flex-row items-center mt-3">
                        {meeting.doctor_photo ? (
                          <Image source={{ uri: meeting.doctor_photo }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                        ) : (
                          <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.75)' }}>
                            <Ionicons name="person" size={14} color={theme.textSecondary} />
                          </View>
                        )}
                        <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600', marginLeft: 7 }} numberOfLines={1}>
                          {meeting.date} · {meeting.time}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center justify-between mt-3">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`${meeting.is_paid ? 'Join' : 'Pay for'} consultation with ${meeting.doctor_name}`}
                        onPress={() => meeting.is_paid ? handleJoinVideoCall(meeting.raw) : handlePayForBooking(meeting.raw)}
                      >
                        <Text style={{ color: cardTextColor, fontSize: 12, fontWeight: '800' }}>
                          {meeting.is_paid ? 'Join meeting' : 'Pay now'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="View all appointments"
                        onPress={() => setShowAppointmentsModal(true)}
                        className="w-7 h-7 rounded-full items-center justify-center"
                        style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)' }}
                      >
                        <Ionicons name="add" size={17} color={cardTextColor} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View
              className="w-full rounded-3xl p-5 mb-6 shadow-sm"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                borderWidth: 1,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View
                  className="w-14 h-14 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: isDarkMode ? '#241B2E' : '#FAF5FF' }}
                >
                  <Ionicons name="calendar-outline" size={26} color="#A78BFA" />
                </View>
                <View className="flex-1 ml-3.5">
                  <Text className="text-base font-black mb-1" style={{ color: theme.textPrimary }}>No Consultations Scheduled</Text>
                  <Text className="text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                    Schedule a 1-on-1 virtual HD video visit with an accredited specialist.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                className="w-full h-12 bg-red-600 rounded-full items-center justify-center flex-row shadow-xs"
                onPress={() => {
                  if (specialists && specialists.length > 0) {
                    handleOpenBooking(specialists[0]);
                  } else {
                    setShowSeeAll(true);
                  }
                }}
              >
                <Ionicons name="videocam" size={18} color="#FFFFFF" className="mr-1.5" />
                <Text className="text-sm font-bold text-white ml-1.5">Book a Specialist</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TALK WITH DR. RED — keeps the single featured-card treatment. */}
          <View
            className="w-full rounded-3xl p-5 mb-6 shadow-sm"
            style={{
              backgroundColor: isDarkMode ? '#241B2E' : '#E8D7F9',
              borderColor: isDarkMode ? '#3E294B' : 'transparent',
              borderWidth: isDarkMode ? 1 : 0,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View
                className="w-14 h-14 rounded-full items-center justify-center"
                style={{ backgroundColor: isDarkMode ? '#49325D' : '#D8C4F0' }}
              >
                <Ionicons name="sparkles" size={25} color={isDarkMode ? '#E8D5FF' : '#6D45A0'} />
              </View>
              <View className="flex-1 ml-3.5">
                <Text className="text-lg font-black" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} numberOfLines={1}>
                  Talk with Dr. Red
                </Text>
                <Text className="text-sm font-semibold mt-0.5" style={{ color: isDarkMode ? '#C7B9D2' : '#4B3C5C' }} numberOfLines={2}>
                  Your AI health companion is here to help.
                </Text>
              </View>
              <View
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)' }}
              >
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-xs font-bold" style={{ color: isDarkMode ? '#FFFFFF' : '#1F2937' }}>Ready</Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.88}
              className="w-full h-12 rounded-full items-center justify-center flex-row"
              style={{ backgroundColor: '#584988' }}
              onPress={onOpenAIAssistant}
              accessibilityRole="button"
              accessibilityLabel="Talk with Dr. Red"
            >
              <Ionicons name="chatbubble-ellipses" size={17} color="#FFFFFF" />
              <Text className="text-sm font-extrabold text-white ml-2">Start a conversation</Text>
            </TouchableOpacity>
          </View>

          {/* VERIFIED SPECIALISTS SECTION */}
          <View className="flex-row items-center justify-between w-full mb-3.5 px-1 mt-6">
            <Text className="text-lg font-extrabold" style={{ color: theme.textPrimary }}>
              Verified Specialists
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowSeeAll(true)}
            >
              <Text className="text-sm font-bold" style={{ color: theme.textSecondary }}>View all</Text>
            </TouchableOpacity>
          </View>

          {/* VERIFIED SPECIALISTS CARD */}
          {isLoading ? (
            <SpecialistsListSkeleton count={3} />
          ) : displayedSpecialistsList.length === 0 ? (
            <View
              className="w-full rounded-3xl p-5 shadow-sm mb-6"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                borderWidth: 1,
              }}
            >
              <View className="items-center justify-center py-6 px-4">
                <Text className="text-sm text-center leading-relaxed" style={{ color: theme.textSecondary }}>
                  No specialists available at the moment. Pull down to refresh.
                </Text>
              </View>
            </View>
          ) : (
            <View
              className="w-full rounded-3xl p-4 shadow-sm mb-6"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                borderWidth: 1,
              }}
            >
              {displayedSpecialistsList.map((item, idx) => (
                <View key={item.id || idx}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    className="flex-row items-center py-2.5"
                    onPress={() => handleDoctorPress(item)}
                  >
                    <Image
                      source={{
                        uri:
                          item.photo ||
                          'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                      }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: isDarkMode ? '#212121' : '#F3F4F6',
                      }}
                      resizeMode="cover"
                    />

                    <View className="flex-1 ml-3.5">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-base font-black" style={{ color: theme.textPrimary }} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                      </View>
                      <Text className="text-sm font-semibold mt-0.5" style={{ color: theme.textSecondary }} numberOfLines={1}>
                        {item.specialty}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-sm font-black" style={{ color: theme.textPrimary }}>{item.date}</Text>
                      <Text className="text-xs font-bold text-amber-500 mt-0.5">{item.time}</Text>
                    </View>
                  </TouchableOpacity>

                  {idx < displayedSpecialistsList.length - 1 && (
                    <View className="h-[1px] my-2" style={{ backgroundColor: theme.divider }} />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* BOTTOM PROMO CARD */}
          <TouchableOpacity
            activeOpacity={0.88}
            className="w-full rounded-3xl p-5 flex-row items-center justify-between mb-8 shadow-sm"
            style={{
              backgroundColor: isDarkMode ? '#1B2A30' : '#D2EDF6',
              borderColor: isDarkMode ? '#26424D' : 'transparent',
              borderWidth: isDarkMode ? 1 : 0,
            }}
            onPress={() => setShowSeeAll(true)}
          >
            <View className="flex-1 mr-3">
              <Text className="text-lg font-black mb-1" style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}>Get a Check-up Today</Text>
              <Text className="text-sm font-medium leading-snug" style={{ color: isDarkMode ? '#ABABAB' : '#374151' }}>
                Complete health screening at a special price
              </Text>
            </View>

            <View className="w-12 h-12 rounded-full bg-red-600 items-center justify-center shadow-xs">
              <Ionicons
                name="arrow-up"
                size={22}
                color="#FFFFFF"
                style={{ transform: [{ rotate: '45deg' }] }}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET: ALL SPECIALISTS (USING AppBottomSheet)                      */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showSeeAll}
        onClose={() => setShowSeeAll(false)}
        height="92%"
        maxHeight="94%"
        showHandle={true}
        showCloseChevron={false}
        noPadding={true}
        scrollable={false}
        headerLeft={
          <TouchableOpacity
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full items-center justify-center"
            onPress={() => setShowSeeAll(false)}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
        }
        title="All Specialists"
        subtitle={`${specialists?.length || 0} Specialists Available`}
      >
        <View className="flex-1" style={{ flex: 1, width: '100%' }}>
          {/* SEARCH BAR */}
          <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-3 mx-5 my-3">
            <Ionicons name="search" size={20} color="#9CA3AF" className="mr-2" />
            <TextInput
              className="flex-1 text-sm font-medium text-gray-900 ml-2"
              placeholder="Search by doctor name or specialty..."
              placeholderTextColor="#9CA3AF"
              value={seeAllSearchQuery}
              onChangeText={setSeeAllSearchQuery}
            />
            {seeAllSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSeeAllSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* SPECIALIST LIST (FLUSH CARDS) */}
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-10 gap-3"
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <DoctorSeeAllSkeleton count={4} />
            ) : filteredAllDoctors.length === 0 ? (
              <View className="items-center justify-center py-8 px-4">
                <Ionicons name="medical-outline" size={44} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
                <Text className="text-sm text-center leading-relaxed mt-3" style={{ color: theme.textSecondary }}>
                  {seeAllSearchQuery
                    ? `No specialists found matching "${seeAllSearchQuery}".`
                    : 'No specialists listed at the moment. Pull down to refresh.'}
                </Text>
              </View>
            ) : (
              filteredAllDoctors.map((doc) => (
                <TouchableOpacity
                  key={doc.doctor_id}
                  activeOpacity={0.85}
                  className="flex-row rounded-2xl p-3.5 shadow-sm gap-3.5"
                  style={{
                    backgroundColor: isDarkMode ? '#212121' : '#FFFFFF',
                    borderColor: theme.cardBorder,
                    borderWidth: 1,
                  }}
                  onPress={() => {
                    setShowSeeAll(false);
                    handleOpenBooking(doc);
                  }}
                >
                  <View className="relative">
                    <Image
                      source={{
                        uri:
                          doc.photo_url ||
                          'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                      }}
                      style={{ width: 84, height: 100, borderRadius: 16 }}
                      className="rounded-2xl bg-gray-100"
                      resizeMode="cover"
                    />
                    <View
                      className="absolute bottom-1.5 right-1.5 flex-row items-center px-2 py-0.5 rounded-full gap-0.5 shadow-xs"
                      style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.95)' }}
                    >
                      <Ionicons name="star" size={11} color="#DC2626" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                        {Number(doc.rating || 5.0).toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-1 justify-between py-0.5">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 mr-1.5">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-base font-black" style={{ color: theme.textPrimary }} numberOfLines={1}>
                            {doc.name}
                          </Text>
                          <Ionicons name="checkmark-circle" size={16} color="#059669" />
                        </View>
                        <Text className="text-sm text-red-600 font-bold mt-0.5" numberOfLines={1}>
                          {doc.specialty}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-xs font-medium mt-1" style={{ color: theme.textSecondary }} numberOfLines={1}>
                      {doc.hospital_affiliation || 'Red Apple Telemedicine Clinic'}
                    </Text>

                    <View
                      className="flex-row items-center justify-between mt-2.5 pt-2"
                      style={{ borderTopWidth: 1, borderTopColor: theme.divider }}
                    >
                      <Text className="text-sm font-black" style={{ color: theme.textPrimary }}>
                        ₦{Number(doc.fee_ngn || 0).toLocaleString()}
                        <Text className="text-xs font-normal" style={{ color: theme.textSecondary }}> / session</Text>
                      </Text>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        className="flex-row items-center bg-red-600 px-4 py-2 rounded-full gap-1 shadow-xs"
                        onPress={() => {
                          setShowSeeAll(false);
                          handleOpenBooking(doc);
                        }}
                      >
                        <Text className="text-xs font-extrabold text-white">View Profile</Text>
                        <Ionicons name="arrow-forward" size={13} color="#FFFFFF" className="ml-0.5" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}

            <View className="h-10" />
          </ScrollView>
        </View>
      </AppBottomSheet>

      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN DOCTOR PROFILE WITH COMPLETE DETAILS                    */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL: 2-STEP DOCTOR PROFILE & BOOKING FLOW (MATCHING REFERENCE UI)       */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        height="88%"
        maxHeight="92%"
        showHandle={false}
        showCloseChevron={false}
        noPadding={true}
        scrollable={true}
        cardStyle={{ backgroundColor: theme.card }}
        footerStyle={{ paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 16 }}
        footer={
          profileStep === 'profile' ? (
            <TouchableOpacity
              activeOpacity={0.88}
              style={{
                backgroundColor: '#DC2626',
                height: 52,
                borderRadius: 26,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#DC2626',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.28,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={() => setProfileStep('booking')}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                Book Appointment
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: '100%', paddingBottom: 6 }}>
              {/* Doctor Summary Preview Card Pinned Right Above Continue */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 18,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                  <Image
                    source={{
                      uri:
                        selectedDoctor?.photo_url ||
                        selectedDoctor?.avatar_url ||
                        'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                    }}
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0' }}
                    resizeMode="cover"
                  />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                      {selectedDoctor?.name || 'Doctor'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                      {selectedDoctor?.specialty || 'General Consultation'} • Video Consultation
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0F172A' }}>
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '800',
                      color: selectedSlot && !isSlotInPast(selectedSlot, selectedDate) ? '#DC2626' : '#94A3B8',
                      marginTop: 1,
                    }}
                  >
                    {selectedSlot ? formatSlotDisplayTime(selectedSlot) : 'No slot selected'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                style={{
                  backgroundColor:
                    !selectedSlot || isSlotInPast(selectedSlot, selectedDate)
                      ? '#CBD5E1'
                      : isSubmittingBooking
                        ? '#EF4444'
                        : '#DC2626',
                  height: 52,
                  borderRadius: 26,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  shadowColor: '#DC2626',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: !selectedSlot || isSlotInPast(selectedSlot, selectedDate) ? 0 : 0.28,
                  shadowRadius: 8,
                  elevation: !selectedSlot || isSlotInPast(selectedSlot, selectedDate) ? 0 : 4,
                }}
                onPress={handleConfirmBooking}
                disabled={isSubmittingBooking || !selectedSlot || isSlotInPast(selectedSlot, selectedDate)}
              >
                {isSubmittingBooking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                      {!selectedSlot || isSlotInPast(selectedSlot, selectedDate)
                        ? 'Select an Available Time'
                        : 'Continue'}
                    </Text>
                    {selectedSlot && !isSlotInPast(selectedSlot, selectedDate) && (
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          )
        }
      >
        {/* ========================================================================= */}
        {/* STEP 1: DOCTOR PROFILE VIEW (SCREEN 1 IN REFERENCE DESIGN)                */}
        {/* ========================================================================= */}
        {profileStep === 'profile' && (
          <View style={{ width: '100%', flex: 1, backgroundColor: '#FFFFFF' }}>
            {/* Soft Rose Hero Section with Back, Heart & Doctor Portrait */}
            <View
              style={{
                backgroundColor: '#FFF1F2',
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 26,
                alignItems: 'center',
              }}
            >
              {/* Top Navigation Row: Back Button Left, Favorite Heart Right */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  onPress={() => setShowProfile(false)}
                >
                  <Ionicons name="arrow-back" size={20} color="#1E293B" />
                </TouchableOpacity>

                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 }}>
                  Doctor Profile
                </Text>

                <TouchableOpacity
                  activeOpacity={0.75}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  onPress={() => setIsFavoriteDoctor(!isFavoriteDoctor)}
                >
                  <Ionicons
                    name={isFavoriteDoctor ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isFavoriteDoctor ? '#DC2626' : '#1E293B'}
                  />
                </TouchableOpacity>
              </View>

              {/* Centered Doctor Portrait with Floating "Top Rated" Badge */}
              <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                <Image
                  source={{
                    uri:
                      selectedDoctor?.photo_url ||
                      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                  }}
                  style={{
                    width: 122,
                    height: 122,
                    borderRadius: 61,
                    borderWidth: 4,
                    borderColor: '#FFFFFF',
                    backgroundColor: '#E2E8F0',
                  }}
                  resizeMode="cover"
                />

                {/* Floating Top Rated Pill Badge */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: -10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 12,
                    paddingVertical: 4.5,
                    borderRadius: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: '#FEE2E2',
                  }}
                >
                  <Ionicons name="star" size={13} color="#D97706" />
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#DC2626' }}>Top Rated</Text>
                </View>
              </View>
            </View>

            {/* Overlapping White Body Card */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                marginTop: -14,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 18,
                flex: 1,
              }}
            >
              {/* Doctor Name */}
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 }}>
                {selectedDoctor?.name || 'Doctor'}
              </Text>

              {/* Specialty, Rating & Experience Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 18 }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="shield-checkmark" size={16} color="#059669" />
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#475569' }}>
                      {selectedDoctor?.specialty || 'General Consultation'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Ionicons name="star" size={14} color="#D97706" />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#64748B' }}>
                      {Number(selectedDoctor?.rating || 5.0).toFixed(1)} ({selectedDoctor?.reviews_count || 0} reviews)
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>
                    {selectedDoctor?.years_experience ? `${selectedDoctor.years_experience}+ Years` : '5+ Years'}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 1 }}>
                    Experience
                  </Text>
                </View>
              </View>

              {/* About Doctor */}
              <View style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 6 }}>
                  About Doctor
                </Text>
                <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20 }}>
                  {selectedDoctor?.bio ||
                    (selectedDoctor?.specialty
                      ? `Specialist in ${selectedDoctor.specialty} providing verified clinical consultations and telemedicine care on Red Apple.`
                      : 'Verified clinical specialist providing telemedicine consultations on Red Apple.')}
                </Text>
              </View>

              {/* Specializations */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 8 }}>
                  Specializations
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(() => {
                    const tags = [];
                    if (selectedDoctor?.specialty) tags.push(selectedDoctor.specialty);
                    if (selectedDoctor?.sub_specialty && selectedDoctor.sub_specialty !== selectedDoctor.specialty) {
                      tags.push(selectedDoctor.sub_specialty);
                    }
                    if (selectedDoctor?.subspecialty && selectedDoctor.subspecialty !== selectedDoctor.specialty) {
                      tags.push(selectedDoctor.subspecialty);
                    }
                    tags.push('Telemedicine', 'Virtual Care');
                    return tags.map((tag) => (
                      <View key={tag} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{tag}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </View>


            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: BOOK APPOINTMENT VIEW (SCREEN 2 IN REFERENCE DESIGN)               */}
        {/* ========================================================================= */}
        {profileStep === 'booking' && (
          <View style={{ width: '100%', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28, backgroundColor: '#FFFFFF' }}>
            {/* Header with Circular Back Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity
                activeOpacity={0.75}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F8FAFC',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginRight: 12,
                }}
                onPress={() => setProfileStep('profile')}
              >
                <Ionicons name="arrow-back" size={20} color="#1E293B" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 21, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 }}>
                  Book Appointment
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Choose your preferred date and time to continue.
                </Text>
              </View>
            </View>

            {/* Select Date Section */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 10 }}>
                Select Date
              </Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {upcomingDateStrip.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    style={{
                      width: 68,
                      height: 72,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: item.isSelected ? '#DC2626' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: item.isSelected ? '#DC2626' : '#E2E8F0',
                    }}
                    onPress={() => handleSelectDate(item.date)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: item.isSelected ? '#FFFFFF' : '#64748B' }}>
                      {item.dayName}
                    </Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '900', color: item.isSelected ? '#FFFFFF' : '#0F172A', marginTop: 4 }}>
                      {item.monthDay}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Available Time Section */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 10 }}>
                Available Time
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {doctorSlots.map((slot) => {
                  const isPast = isSlotInPast(slot, selectedDate);
                  const isBooked = Boolean(slot.is_booked);
                  const isDisabled = isPast || isBooked;
                  const isSelected = !isDisabled && selectedSlot?.slot_id === slot.slot_id;
                  const timeText = formatSlotDisplayTime(slot);

                  return (
                    <TouchableOpacity
                      key={slot.slot_id}
                      activeOpacity={isDisabled ? 1 : 0.8}
                      disabled={isDisabled}
                      style={{
                        width: '30.5%',
                        paddingVertical: 10,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? '#DC2626' : isDisabled ? '#F1F5F9' : '#F8FAFC',
                        borderWidth: 1,
                        borderColor: isSelected ? '#DC2626' : '#E2E8F0',
                        opacity: isDisabled ? 0.45 : 1,
                      }}
                      onPress={() => {
                        if (!isDisabled) {
                          setSelectedSlot(slot);
                        }
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '800',
                          color: isSelected ? '#FFFFFF' : isDisabled ? '#94A3B8' : '#1E293B',
                          textDecorationLine: isPast ? 'line-through' : 'none',
                        }}
                      >
                        {timeText}
                      </Text>
                      {isPast ? (
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#94A3B8', marginTop: 2 }}>
                          Passed
                        </Text>
                      ) : isBooked ? (
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#94A3B8', marginTop: 2 }}>
                          Booked
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {!isLoadingSlots && doctorSlots.length === 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginTop: 12 }}>
                  <Ionicons name="calendar-outline" size={17} color="#64748B" />
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600', flex: 1 }}>
                    No appointment times are available for this date. Please choose another date.
                  </Text>
                </View>
              )}

              {doctorSlots.length > 0 && doctorSlots.every((s) => isSlotInPast(s, selectedDate) || s.is_booked) && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: '#FEF2F2',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: '#FECACA',
                  }}
                >
                  <Ionicons name="information-circle-outline" size={18} color="#DC2626" />
                  <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600', flex: 1 }}>
                    All slots for this date have passed or are booked. Please select an upcoming date above.
                  </Text>
                </View>
              )}
            </View>


          </View>
        )}
      </AppBottomSheet>


      {/* ========================================================================= */}
      {/* BOTTOM SHEET: BOOKING CONFIRMED SUCCESS (USING AppBottomSheet)            */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showBookingSuccessModal}
        onClose={() => setShowBookingSuccessModal(false)}
        showHandle={true}
        scrollable={false}
      >
        <View className="items-center py-4 px-2">
          <View className="w-18 h-18 rounded-full bg-emerald-500 items-center justify-center mb-4 shadow-sm" style={{ width: 68, height: 68, borderRadius: 34 }}>
            <Ionicons name="checkmark" size={36} color="#FFFFFF" />
          </View>
          <Text className="text-xl font-black text-gray-900 mb-1.5 text-center">Consultation Confirmed!</Text>
          <Text className="text-sm text-gray-600 text-center leading-relaxed px-4 mb-6">
            Your appointment with {confirmedBookingData?.doctor_name || selectedDoctor?.name} is booked for {confirmedBookingData?.scheduled_time || 'Wed 12, 12:00'}.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            className="flex-row items-center justify-center bg-red-600 h-13 py-3.5 px-6 rounded-full w-full gap-2 mb-2.5 shadow-sm"
            onPress={() => {
              setShowBookingSuccessModal(false);
              setActiveVideoCallBooking(confirmedBookingData);
              setShowVideoCallModal(true);
            }}
          >
            <Ionicons name="videocam" size={20} color="#FFFFFF" />
            <Text className="text-base font-extrabold text-white">Enter Video Room</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            className="h-11 px-6 rounded-full w-full items-center justify-center"
            onPress={() => setShowBookingSuccessModal(false)}
          >
            <Text className="text-sm font-bold text-gray-600">Done</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>

      {/* ========================================================================= */}
      {/* MODAL: APPOINTMENTS MANAGER LIST (CALENDAR BUTTON)                        */}
      {/* ========================================================================= */}
      <AppointmentsListModal
        visible={showAppointmentsModal}
        bookings={userBookings}
        onClose={() => setShowAppointmentsModal(false)}
        onRefreshBookings={loadData}
        onJoinVideoCall={(b) => {
          setShowAppointmentsModal(false);
          setActiveVideoCallBooking(b);
          setShowVideoCallModal(true);
        }}
        onCancelBooking={async (bookingId) => {
          try {
            await telemedService.cancelBooking(bookingId);
            await loadData();
          } catch (err) {
            console.warn('Cancel booking error:', err);
          }
        }}
        onBookNewConsultation={() => {
          setShowAppointmentsModal(false);
          if (specialists && specialists.length > 0) {
            handleOpenBooking(specialists[0]);
          }
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL: ENCRYPTED VIDEO CONSULTATION ROOM                                  */}
      {/* ========================================================================= */}
      {showVideoCallModal && (
        <StreamVideoCallModal
          visible={showVideoCallModal}
          booking={activeVideoCallBooking}
          isDoctorView={Boolean(isDoctorAccount)}
          onClose={() => setShowVideoCallModal(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAYSTACK TELEMEDICINE CHECKOUT                                     */}
      {/* ========================================================================= */}
      <PaystackCheckoutModal
        visible={showPaystackModal}
        authorizationUrl={paystackPaymentData?.authorizationUrl}
        reference={paystackPaymentData?.reference}
        amount={paystackPaymentData?.amount}
        doctorName={selectedDoctor?.name || 'Consulting Specialist'}
        onSuccess={handlePaymentSuccess}
        onClose={() => {
          setShowPaystackModal(false);
          loadData();
          setConfirmationModalConfig({
            visible: true,
            title: 'Payment Incomplete',
            message:
              'Your consultation booking has been requested, but payment was not completed. Please pay the consultation fee in "My Appointments" to confirm your session.',
            confirmText: 'View Appointments',
            cancelText: 'OK',
            icon: 'card-outline',
            iconColor: '#DC2626',
            iconBg: '#FEF2F2',
            onConfirm: () => {
              setConfirmationModalConfig((prev) => ({ ...prev, visible: false }));
              setShowAppointmentsModal(true);
            },
          });
        }}
      />

      {/* ========================================================================= */}
      {/* CONFIRMATION / ALERT MODAL (BRANDED RED APPLE MODAL)                      */}
      {/* ========================================================================= */}
      <ConfirmationModal
        visible={confirmationModalConfig.visible}
        title={confirmationModalConfig.title}
        message={confirmationModalConfig.message}
        confirmText={confirmationModalConfig.confirmText || 'Confirm'}
        cancelText={confirmationModalConfig.cancelText}
        icon={confirmationModalConfig.icon || 'alert-circle-outline'}
        iconColor={confirmationModalConfig.iconColor || '#DC2626'}
        iconBg={confirmationModalConfig.iconBg || '#FEF2F2'}
        onConfirm={() => {
          if (confirmationModalConfig.onConfirm) {
            confirmationModalConfig.onConfirm();
          } else {
            setConfirmationModalConfig((prev) => ({ ...prev, visible: false }));
          }
        }}
        onCancel={() => {
          if (confirmationModalConfig.onCancel) {
            confirmationModalConfig.onCancel();
          }
          setConfirmationModalConfig((prev) => ({ ...prev, visible: false }));
        }}
        onClose={() => {
          if (confirmationModalConfig.onClose) {
            confirmationModalConfig.onClose();
          }
          setConfirmationModalConfig((prev) => ({ ...prev, visible: false }));
        }}
      />
    </View>
  );
}
