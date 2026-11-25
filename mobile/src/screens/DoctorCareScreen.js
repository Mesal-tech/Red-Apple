import React, { useState, useEffect, useMemo } from 'react';
import {
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
  SafeAreaView,
  TextInput,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AppBottomSheet from '../components/AppBottomSheet';
import ConfirmationModal from '../components/ConfirmationModal';
import AppointmentsListModal from './AppointmentsListModal';
import StreamVideoCallModal from './StreamVideoCallModal';
import DoctorRedVoiceModal from '../components/DoctorRedVoiceModal';
import PaystackCheckoutModal from '../components/PaystackCheckoutModal';
import { initializeConsultationPayment } from '../services/paymentService';
import * as telemedService from '../services/telemedicineService';
import notificationService from '../services/notificationService';
import {
  UpcomingCardSkeleton,
  SpecialistsListSkeleton,
  DoctorSeeAllSkeleton,
} from '../components/DoctorCareSkeleton';

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

const formatDoctorMetric = (value, addPlus = false) => {
  if (value === null || value === undefined || value === '') return '—';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return `${numericValue.toLocaleString()}${addPlus ? '+' : ''}`;
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
  const { width: windowWidth } = useWindowDimensions();
  const isWideLayout = windowWidth >= 1024;
  const isTabletLayout = windowWidth >= 820;
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const profileSurface = theme.card;
  const profileHeroSurface = isDarkMode ? '#242424' : '#F7F7F7';
  const profileSoftSurface = isDarkMode ? '#242424' : '#F8FAFC';
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
  const [consultationType, setConsultationType] = useState('video'); // 'video' | 'in_person' | 'chat'
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorProfileTab, setDoctorProfileTab] = useState('About');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [doctorSlots, setDoctorSlots] = useState([]);
  const browseDates = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  }), []);
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
  const [showSpecialtyFilters, setShowSpecialtyFilters] = useState(false);
  const [sortDoctorsByRating, setSortDoctorsByRating] = useState(false);

  // Filtered doctors for See All modal
  const filteredAllDoctors = useMemo(() => {
    if (!specialists) return [];
    const matches = specialists.filter((d) => {
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
    return sortDoctorsByRating
      ? matches.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
      : matches;
  }, [specialists, seeAllSearchQuery, seeAllFilterSpecialty, sortDoctorsByRating]);

  const specialtyFilters = useMemo(() => (
    ['All', ...new Set((specialists || []).map((doctor) => doctor.specialty).filter(Boolean))]
  ), [specialists]);

  // Paystack Telemedicine Payment State
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [paystackPaymentData, setPaystackPaymentData] = useState(null);

  // Consultations Manager & Video Call State
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [activeVideoCallBooking, setActiveVideoCallBooking] = useState(null);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [showDoctorRedVideoCallModal, setShowDoctorRedVideoCallModal] = useState(false);
  const [doctorRedCallMessages, setDoctorRedCallMessages] = useState([]);

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

  const handleOpenBooking = (doctor, date = new Date(), tab = 'About') => {
    const doc = doctor || (specialists && specialists[0]) || null;
    if (!doc) return;
    setSelectedDoctor(doc);
    setDoctorProfileTab(tab);
    setProfileStep('profile');
    setConsultationType('video');
    setSelectedDate(date);
    setShowProfile(true);
    loadSlotsForDate(doc, date);
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
          paddingTop: STATUSBAR_HEIGHT + (isWideLayout ? 24 : 10),
          paddingBottom: isWideLayout ? 36 : 110,
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
        <View style={{ width: '100%', maxWidth: isWideLayout ? 1120 : isTabletLayout ? 760 : 520, paddingHorizontal: isWideLayout ? 28 : isTabletLayout ? 24 : 20 }}>
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

            <Text className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>Doctor care</Text>

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

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '800' }}>Upcoming</Text>
              <View style={{ minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#303A37' : '#E6EBE9' }}>
                <Text style={{ color: theme.textPrimary, fontSize: 10, fontWeight: '700' }}>{displayedUpcomingBookings.length}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowAppointmentsModal(true)} accessibilityRole="button">
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>See all</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? <UpcomingCardSkeleton /> : displayedUpcomingBookings.length > 0 ? (
            <View style={{ gap: 10, marginBottom: 26 }}>
              {displayedUpcomingBookings.slice(0, 3).map((meeting) => (
                <View key={meeting.booking_id} style={{ padding: 16, borderRadius: 20, backgroundColor: isDarkMode ? '#302333' : '#F1E7F4' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <View>
                      <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>{meeting.date} · {meeting.time}</Text>
                      <Text style={{ color: theme.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 4 }}>Consultation</Text>
                      <Text style={{ color: theme.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>with {meeting.doctor_specialty}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowAppointmentsModal(true)} accessibilityRole="button" accessibilityLabel="View appointment details" style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#403044' : '#FBF7FC' }}>
                      <Ionicons name="arrow-up-outline" size={18} color={theme.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {meeting.doctor_photo ? <Image source={{ uri: meeting.doctor_photo }} style={{ width: 38, height: 38, borderRadius: 12 }} /> : <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#403044' : '#FBF7FC' }}><Ionicons name="person" size={19} color={theme.textSecondary} /></View>}
                      <View style={{ marginLeft: 9, flex: 1 }}>
                        <Text style={{ color: theme.textPrimary, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{meeting.doctor_name}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>{meeting.doctor_specialty}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => meeting.is_paid ? handleJoinVideoCall(meeting.raw) : handlePayForBooking(meeting.raw)} accessibilityRole="button" style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: isDarkMode ? '#403044' : '#FBF7FC' }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 11, fontWeight: '700' }}>{meeting.is_paid ? 'Join' : 'Pay'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ padding: 16, borderRadius: 20, marginBottom: 26, backgroundColor: isDarkMode ? '#302333' : '#F1E7F4', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '700' }}>No visits booked</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 }}>Choose a specialist to schedule a consultation.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSeeAll(true)} accessibilityRole="button" style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D84440' }}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* VERIFIED SPECIALISTS SECTION */}
          <View className="flex-row items-center justify-between w-full mb-3.5 px-1 mt-6">
            <Text className="text-lg font-extrabold" style={{ color: theme.textPrimary }}>
              Available specialists
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
            <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 24 }}>
              {displayedSpecialistsList.map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  activeOpacity={0.82}
                  onPress={() => handleDoctorPress(item)}
                  style={{ width: isWideLayout ? '48.5%' : '100%', minHeight: 88, padding: 12, borderRadius: 17, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Image
                    source={{ uri: item.photo || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80' }}
                    style={{ width: 52, height: 58, borderRadius: 13, backgroundColor: isDarkMode ? '#292929' : '#F3F4F6' }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, marginLeft: 11, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{item.name}</Text>
                      <Ionicons name="checkmark-circle" size={14} color="#39A873" />
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 3 }} numberOfLines={1}>{item.specialty}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 10, marginTop: 4 }}>Available for consultation</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="star" size={11} color="#D99A32" />
                      <Text style={{ color: theme.textPrimary, fontSize: 11, fontWeight: '700' }}>{item.time.replace('★ ', '')}</Text>
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: 10, marginTop: 5 }}>{item.date}</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textMuted} style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
        noPadding={true}
        scrollable={false}
        title="Find a doctor"
        subtitle={`${specialists?.length || 0} ${(specialists?.length || 0) === 1 ? 'doctor' : 'doctors'} available`}
      >
        <View className="flex-1" style={{ flex: 1, width: '100%' }}>
          {/* SEARCH BAR */}
          <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 22, paddingHorizontal: 15, paddingVertical: 12, marginHorizontal: 20, marginTop: 14, marginBottom: 8, backgroundColor: isDarkMode ? '#222222' : '#FFFFFF', borderWidth: 1, borderColor: theme.cardBorder }}>
            <Ionicons name="search" size={19} color={theme.textMuted} />
            <TextInput
              style={{ flex: 1, fontSize: 14, fontWeight: '500', color: theme.textPrimary, marginLeft: 10, paddingVertical: 0 }}
              placeholder="Search specialty or condition"
              placeholderTextColor={theme.textMuted}
              value={seeAllSearchQuery}
              onChangeText={setSeeAllSearchQuery}
            />
            {seeAllSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSeeAllSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ minHeight: 48, marginHorizontal: 22, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600' }}>{filteredAllDoctors.length} {filteredAllDoctors.length === 1 ? 'doctor' : 'doctors'} found</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setSortDoctorsByRating((value) => !value)} accessibilityRole="button" accessibilityLabel="Sort doctors by rating" style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: sortDoctorsByRating ? (isDarkMode ? '#382326' : '#FCE8E6') : theme.card, borderWidth: 1, borderColor: sortDoctorsByRating ? '#D84440' : theme.cardBorder }}>
                <Ionicons name="swap-vertical-outline" size={18} color={sortDoctorsByRating ? '#D84440' : theme.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSpecialtyFilters((value) => !value)} accessibilityRole="button" accessibilityLabel="Filter doctors by specialty" accessibilityState={{ expanded: showSpecialtyFilters }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: showSpecialtyFilters ? (isDarkMode ? '#382326' : '#FCE8E6') : theme.card, borderWidth: 1, borderColor: showSpecialtyFilters ? '#D84440' : theme.cardBorder }}>
                <Ionicons name="options-outline" size={18} color={showSpecialtyFilters ? '#D84440' : theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {showSpecialtyFilters && (
            <ScrollView horizontal style={{ height: 48, flexGrow: 0, flexShrink: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, height: 44, alignItems: 'center', gap: 8 }}>
              {specialtyFilters.map((specialty) => {
                const selected = seeAllFilterSpecialty === specialty;
                return (
                  <TouchableOpacity key={specialty} onPress={() => setSeeAllFilterSpecialty(specialty)} accessibilityRole="button" accessibilityState={{ selected }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: selected ? '#D84440' : theme.cardBorder, backgroundColor: selected ? (isDarkMode ? '#382326' : '#FCE8E6') : theme.card }}>
                    <Text style={{ color: selected ? '#D84440' : theme.textSecondary, fontSize: 12, fontWeight: selected ? '700' : '500' }}>{specialty}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* SPECIALIST LIST (FLUSH CARDS) */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 12 }}
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
              filteredAllDoctors.map((doc, index) => {
                const cardIsDark = isDarkMode || index % 2 === 1;
                const cardBackground = isDarkMode
                  ? (index % 2 === 0 ? '#232323' : '#171717')
                  : (index % 2 === 0 ? '#F1F2F3' : '#292625');
                const cardText = cardIsDark ? '#FFFFFF' : '#202020';
                const cardMuted = cardIsDark ? '#C4C0BF' : '#777777';
                const openProfile = (date = new Date(), tab = 'About') => {
                  setShowSeeAll(false);
                  handleOpenBooking(doc, date, tab);
                };
                return (
                  <View key={doc.doctor_id} style={{ minHeight: 194, padding: 14, borderRadius: 20, overflow: 'hidden', backgroundColor: cardBackground }}>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => openProfile()} style={{ minHeight: 100 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, backgroundColor: cardIsDark ? '#3A3838' : '#FFFFFF' }}>
                            <Ionicons name="star" size={11} color="#D99A32" />
                            <Text style={{ color: cardText, fontSize: 10, fontWeight: '700' }}>{Number(doc.rating || 5).toFixed(1)}</Text>
                            <View style={{ width: 1, height: 12, backgroundColor: cardMuted, marginHorizontal: 2 }} />
                            <Text style={{ color: cardText, fontSize: 10, fontWeight: '600' }}>₦{Number(doc.fee_ngn || 0).toLocaleString()}</Text>
                          </View>
                          <Text style={{ color: cardText, fontSize: 14, fontWeight: '700', marginTop: 12 }} numberOfLines={1}>{doc.name}</Text>
                          <Text style={{ color: cardMuted, fontSize: 11, marginTop: 3 }} numberOfLines={1}>{doc.specialty || 'General practitioner'}</Text>
                          <Text style={{ color: cardMuted, fontSize: 10, marginTop: 12 }}>Choose a day to check availability</Text>
                        </View>
                        <Image
                          source={{ uri: doc.photo_url || doc.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80' }}
                          style={{ width: 112, height: 106, borderRadius: 16, backgroundColor: cardIsDark ? '#3B3939' : '#E5E5E5' }}
                          resizeMode="cover"
                        />
                      </View>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 10 }}>
                      {browseDates.map((date) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                          <TouchableOpacity
                            key={date.toISOString()}
                            onPress={() => openProfile(date, 'Availability')}
                            accessibilityRole="button"
                            accessibilityLabel={`Check availability on ${date.toLocaleDateString()}`}
                            style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? (cardIsDark ? '#111111' : '#202020') : (cardIsDark ? '#3A3838' : '#FFFFFF') }}
                          >
                            <Text style={{ color: isToday || cardIsDark ? '#FFFFFF' : '#777777', fontSize: 9 }}>{date.toLocaleDateString(undefined, { weekday: 'short' })}</Text>
                            <Text style={{ color: isToday || cardIsDark ? '#FFFFFF' : '#202020', fontSize: 11, fontWeight: '700', marginTop: 1 }}>{date.getDate()}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
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
        height={isWideLayout ? '78%' : '88%'}
        maxHeight={isWideLayout ? '84%' : '92%'}
        showHandle={false}
        noPadding={true}
        scrollable={true}
        cardStyle={{ backgroundColor: theme.card, width: isWideLayout ? 620 : undefined }}
        footerStyle={{ backgroundColor: theme.card, borderTopColor: theme.cardBorder, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 16 }}
        footer={
          profileStep === 'profile' ? (
            <TouchableOpacity
              activeOpacity={0.88}
              style={{
                width: isWideLayout ? 420 : '100%',
                maxWidth: '100%',
                alignSelf: 'center',
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
                Book Now
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
                  width: isWideLayout ? 420 : '100%',
                  maxWidth: '100%',
                  alignSelf: 'center',
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
          <View style={{ width: '100%', flex: 1, backgroundColor: profileSurface }}>
            {/* Compact doctor summary, matching the discovery profile reference */}
            <View
              style={{
                backgroundColor: profileHeroSurface,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 26,
                alignItems: 'stretch',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary, letterSpacing: -0.2, marginBottom: 16 }}>
                Doctors Profile
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14, backgroundColor: profileSurface }}>
                    <Ionicons name="star" size={12} color="#D99A32" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textPrimary }}>{Number(selectedDoctor?.rating || 5).toFixed(1)}</Text>
                    <View style={{ width: 1, height: 12, backgroundColor: '#D5D5D5', marginHorizontal: 3 }} />
                    <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textPrimary }}>{selectedDoctor?.fee_ngn ? `₦${Number(selectedDoctor.fee_ngn).toLocaleString()}/session` : 'Fee not listed'}</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginTop: 12 }} numberOfLines={2}>{selectedDoctor?.name || 'Doctor'}</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 3 }} numberOfLines={2}>{selectedDoctor?.specialty || 'General Consultation'}</Text>
                  <TouchableOpacity
                    onPress={() => { setConsultationType('chat'); setProfileStep('booking'); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Message ${selectedDoctor?.name || 'doctor'} about a chat consultation`}
                    style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: isDarkMode ? '#4A4A4A' : '#D8D8D8' }}
                  >
                    <Text style={{ color: theme.textPrimary, fontSize: 11, fontWeight: '600' }}>Message</Text>
                  </TouchableOpacity>
                </View>
                <Image
                  source={{ uri: selectedDoctor?.photo_url || selectedDoctor?.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80' }}
                  style={{ width: 126, height: 136, borderRadius: 18, backgroundColor: '#E2E8F0' }}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Overlapping White Body Card */}
            <View
              style={{
                backgroundColor: profileSurface,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                marginTop: -14,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 18,
                flex: 1,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 13, marginBottom: 14, borderRadius: 15, backgroundColor: profileSoftSurface }}>
                {[
                  { value: selectedDoctor?.years_experience ? `${formatDoctorMetric(selectedDoctor.years_experience)} years` : '—', label: 'Experience' },
                  { value: formatDoctorMetric(selectedDoctor?.patients_served ?? selectedDoctor?.patients_count ?? selectedDoctor?.patient_count, true), label: 'Patients' },
                  { value: formatDoctorMetric(selectedDoctor?.operations_count ?? selectedDoctor?.procedures_count), label: 'Operations' },
                ].map((stat) => (
                  <View key={stat.label} style={{ alignItems: 'center', paddingHorizontal: 4 }}>
                    <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '800' }}>{stat.value}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 10, marginTop: 3 }}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: theme.divider, marginBottom: 16 }}>
                {['About', 'Reviews', 'Availability'].map((tab) => {
                  const active = doctorProfileTab === tab;
                  return (
                    <TouchableOpacity key={tab} onPress={() => setDoctorProfileTab(tab)} style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: active ? 2 : 0, borderBottomColor: '#D84440' }}>
                      <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? theme.textPrimary : theme.textSecondary }}>{tab}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {doctorProfileTab === 'About' && (
                <View style={{ flexDirection: isWideLayout ? 'row' : 'column', alignItems: 'stretch', gap: isWideLayout ? 20 : 0, marginBottom: 18 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 7 }}>About the doctor</Text>
                    <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
                      {selectedDoctor?.bio || `Dr. ${selectedDoctor?.name || 'This specialist'} provides ${selectedDoctor?.specialty || 'clinical'} consultations through Red Apple.`}
                    </Text>
                  </View>
                  <View style={{ flex: isWideLayout ? 0.82 : undefined, marginTop: isWideLayout ? 0 : 20, padding: 14, borderRadius: 16, backgroundColor: profileSoftSurface }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>Reviews & ratings</Text>
                      <View style={{ minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: profileSurface }}>
                        <Text style={{ color: theme.textPrimary, fontSize: 10, fontWeight: '700' }}>{selectedDoctor?.reviews_count || 0}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 30, fontWeight: '700', color: theme.textPrimary }}>{Number(selectedDoctor?.rating || 5).toFixed(1)}</Text>
                      <View>
                        <View style={{ flexDirection: 'row', gap: 2 }}>{[1, 2, 3, 4, 5].map((star) => { const rating = Number(selectedDoctor?.rating || 5); const name = rating >= star ? 'star' : rating >= star - 0.5 ? 'star-half' : 'star-outline'; return <Ionicons key={star} name={name} size={16} color="#D9A62E" />; })}</View>
                        <Text style={{ color: theme.textSecondary, fontSize: 10, marginTop: 3 }}>Overall rating</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {doctorProfileTab === 'Reviews' && (
                <View style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 12 }}>Reviews & ratings</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 34, fontWeight: '700', color: theme.textPrimary }}>{Number(selectedDoctor?.rating || 5).toFixed(1)}</Text>
                    <View>
                      <View style={{ flexDirection: 'row', gap: 2 }}>{[1, 2, 3, 4, 5].map((star) => { const rating = Number(selectedDoctor?.rating || 5); const name = rating >= star ? 'star' : rating >= star - 0.5 ? 'star-half' : 'star-outline'; return <Ionicons key={star} name={name} size={16} color="#D9A62E" />; })}</View>
                      <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 3 }}>{selectedDoctor?.reviews_count || 0} ratings</Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 14 }}>{selectedDoctor?.reviews_count ? 'Patient feedback will appear here.' : 'No written reviews yet.'}</Text>
                </View>
              )}

              {doctorProfileTab === 'Availability' && (
                <View style={{ marginBottom: 18 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>Available dates</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 12 }}>
                    {upcomingDateStrip.map((item, index) => {
                      const isSelected = item.date.toDateString() === selectedDate.toDateString();
                      return (
                        <TouchableOpacity key={`${item.date.toISOString()}-${index}`} onPress={() => handleSelectDate(item.date)} style={{ width: 48, paddingVertical: 8, alignItems: 'center', borderRadius: 13, backgroundColor: isSelected ? '#D84440' : (isDarkMode ? '#292929' : '#F1F3F5') }}>
                          <Text style={{ color: isSelected ? '#FFFFFF' : theme.textSecondary, fontSize: 9 }}>{item.dayName}</Text>
                          <Text style={{ color: isSelected ? '#FFFFFF' : theme.textPrimary, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{item.monthDay}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {isLoadingSlots ? <ActivityIndicator color="#D84440" style={{ paddingVertical: 14 }} /> : doctorSlots.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {doctorSlots.map((slot) => {
                        const disabled = Boolean(slot.is_booked) || isSlotInPast(slot, selectedDate);
                        const active = selectedSlot?.slot_id === slot.slot_id && !disabled;
                        return <TouchableOpacity key={slot.slot_id} disabled={disabled} onPress={() => setSelectedSlot(slot)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: active ? '#D84440' : theme.cardBorder, backgroundColor: active ? (isDarkMode ? '#382326' : '#FCE8E6') : profileSurface, opacity: disabled ? 0.45 : 1 }}><Text style={{ color: active ? '#D84440' : theme.textPrimary, fontSize: 11, fontWeight: '600' }}>{formatSlotDisplayTime(slot)}</Text></TouchableOpacity>;
                      })}
                    </View>
                  ) : (
                    <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, paddingVertical: 5 }}>{`No times available for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}. Choose another day.`}</Text>
                  )}
                </View>
              )}


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
                  {consultationType === 'chat' ? 'Message consultation' : 'Book Appointment'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {consultationType === 'chat' ? 'Choose a time to message this doctor.' : 'Choose your preferred date and time to continue.'}
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

      <DoctorRedVoiceModal
        visible={showDoctorRedVideoCallModal}
        onClose={() => setShowDoctorRedVideoCallModal(false)}
        callMode
        user={user}
        healthContext={{
          userName: user?.name || '',
          activeMode: user?.pregnancy_mode ? 'pregnancy' : (user?.health_profile?.stage || 'cycle'),
          medicalProfile: {
            reproductiveGoal: user?.health_profile?.reproductiveGoal || 'track_cycle',
            birthControl: user?.health_profile?.birthControl || 'None reported',
            knownConditions: user?.health_profile?.knownConditions || user?.health_profile?.conditions || [],
            medications: user?.health_profile?.medications || [],
            allergies: user?.health_profile?.allergies || [],
            notes: user?.health_profile?.notes || '',
          },
          cycle: {
            currentCycleDay: user?.health_profile?.currentCycleDay,
            cycleLength: user?.health_profile?.cycleLength,
            phaseName: user?.health_profile?.phaseName,
            nextPeriodDate: user?.health_profile?.nextPeriodDate,
            ovulationDate: user?.health_profile?.ovulationDate,
          },
          pregnancy: {
            week: user?.health_profile?.pregnancyWeek || user?.health_profile?.currentWeek,
            dueDate: user?.health_profile?.dueDate,
          },
        }}
        messages={doctorRedCallMessages}
        setMessages={setDoctorRedCallMessages}
      />

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
