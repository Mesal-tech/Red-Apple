import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
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
import AppBottomSheet from '../components/AppBottomSheet';
import AppointmentsListModal from './AppointmentsListModal';
import StreamVideoCallModal from './StreamVideoCallModal';
import PaystackCheckoutModal from '../components/PaystackCheckoutModal';
import { initializeConsultationPayment } from '../services/paymentService';
import * as telemedService from '../services/telemedicineService';
import { fetchNearbyReproductiveClinics } from '../services/clinicLocatorService';
import LeafletClinicsMap from '../components/LeafletClinicsMap';
import DoctorAppointmentCalendar from '../components/DoctorAppointmentCalendar';
import { LinearGradient } from 'expo-linear-gradient';
import notificationService from '../services/notificationService';
import {
  UpcomingCardSkeleton,
  SpecialistsListSkeleton,
  SlotsGridSkeleton,
  DoctorSeeAllSkeleton,
} from '../components/DoctorCareSkeleton';

const getClinicPhoto = (clinic) => {
  if (clinic?.photo_url) return clinic.photo_url;
  if (clinic?.photoUrl) return clinic.photoUrl;
  if (clinic?.category === 'fertility') {
    return 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop&q=80';
  }
  if (clinic?.category === 'birthing_center') {
    return 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&auto=format&fit=crop&q=80';
  }
  if (clinic?.category === 'gynaecology') {
    return 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80';
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUSBAR_HEIGHT =
  Platform.OS === 'android'
    ? (StatusBar.currentHeight || 38)
    : Platform.OS === 'ios'
      ? 44
      : 0;

// THEME PALETTE: WARM CREAM, PASTEL LAVENDER & SKY BLUE TELEMEDICINE DESIGN
const THEME = {
  bg: '#F4F6F0',             // Warm sage/cream canvas from design mockup
  cardBg: '#FFFFFF',         // White card surface
  photoCardBg: '#F8F9FA',    // Crisp light surface for doctor photo card
  cardBorder: '#EFEFEF',     // Subtle border for clean definition
  textPrimary: '#111827',    // Deep slate / charcoal
  textSecondary: '#6B7280',  // Muted gray
  accentOrange: '#DC2626',   // App Signature Apple Red
  subtlePill: '#F3F4F6',     // Light pill background
  pillBorder: '#E5E7EB',     // Pill border
  lavenderCard: '#E8D7F9',   // Upcoming consultation pastel lavender card
  lavenderBadge: '#CBB7E2',  // Lavender circle for warning exclamation mark
  blueCard: '#D2EDF6',       // Check-up promo pastel sky blue card
  darkBtn: '#000000',        // Black pill button
};

const AVAILABLE_HOURS = ['8:00', '9:00', '10:00', '11:00', '12:00'];

export default function DoctorCareScreen({
  onBookDoctor,
  initialDoctor,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onNavigateHome,
}) {
  const { user } = useAuth();
  const isDoctorAccount =
    user?.role === 'doctor' ||
    user?.email?.toLowerCase() === 'mesalokubor63@gmail.com';

  const userName = isDoctorAccount
    ? (user?.name || 'Consulting Doctor')
    : (user?.name || 'Patient');

  const userSubtitle = isDoctorAccount
    ? 'Doctor / Telemedicine Specialist'
    : 'Patient';

  // Specialists state (Real doctors from backend)
  const [specialists, setSpecialists] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fullscreen Booking Modal State
  const [showProfile, setShowProfile] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [doctorSlots, setDoctorSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [consultationReason, setConsultationReason] = useState('Reproductive Health Consultation');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [showBookingSuccessModal, setShowBookingSuccessModal] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);

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

  // Partner Clinics State (Accredited physical facilities)
  const [partnerClinics, setPartnerClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [showSeeAllClinics, setShowSeeAllClinics] = useState(false);
  const [clinicCategoryFilter, setClinicCategoryFilter] = useState('all');
  const [clinicSearchQuery, setClinicSearchQuery] = useState('');

  // Top Nav & Map Options State
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // Filtered partner clinics for carousel and modal
  const filteredPartnerClinics = useMemo(() => {
    if (!partnerClinics) return [];
    return partnerClinics.filter((clinic) => {
      let matchesCategory = true;
      if (clinicCategoryFilter === 'partner') {
        matchesCategory = clinic.isPartner !== false && clinic.is_partner !== false;
      } else if (clinicCategoryFilter !== 'all') {
        matchesCategory = clinic.category === clinicCategoryFilter;
      }

      const q = clinicSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        clinic.name?.toLowerCase().includes(q) ||
        clinic.address?.toLowerCase().includes(q) ||
        clinic.city?.toLowerCase().includes(q) ||
        clinic.category_label?.toLowerCase().includes(q) ||
        clinic.categoryLabel?.toLowerCase().includes(q) ||
        clinic.services?.some((s) => s.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [partnerClinics, clinicCategoryFilter, clinicSearchQuery]);

  // Doctors affiliated with the currently selected clinic
  const clinicAffiliatedDoctors = useMemo(() => {
    if (!selectedClinic || !specialists) return [];
    const clinicName = (selectedClinic.name || '').toLowerCase();
    const leadDoc = (selectedClinic.leadDoctor || selectedClinic.lead_doctor || '').toLowerCase();
    const affIds = selectedClinic.affiliated_doctor_ids || [];

    return specialists.filter((doc) => {
      if (affIds.includes(doc.doctor_id)) return true;
      if (leadDoc && doc.name?.toLowerCase().includes(leadDoc)) return true;
      if (doc.hospital_affiliation && clinicName.includes(doc.hospital_affiliation.toLowerCase())) return true;
      if (doc.hospital_affiliation && doc.hospital_affiliation.toLowerCase().includes(clinicName)) return true;
      return false;
    });
  }, [selectedClinic, specialists]);

  // Fetch verified doctors, bookings & partner clinics directly from backend database API
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
    }
    try {
      const clinics = await telemedService.fetchPartnerClinics();
      if (clinics && clinics.length > 0) {
        setPartnerClinics(clinics);
      } else {
        const mapClinics = await fetchNearbyReproductiveClinics(6.5244, 3.3792, 10000);
        setPartnerClinics(mapClinics || []);
      }
    } catch (e) {
      console.warn('Error fetching partner clinics from backend:', e);
      try {
        const mapClinics = await fetchNearbyReproductiveClinics(6.5244, 3.3792, 10000);
        setPartnerClinics(mapClinics || []);
      } catch (_) { }
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

  // Handle external book doctor trigger
  useEffect(() => {
    if (initialDoctor) {
      handleOpenBooking(initialDoctor);
    }
  }, [initialDoctor]);

  const loadSlotsForDate = async (doctor, date) => {
    if (!doctor) return;
    setIsLoadingSlots(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const slots = await telemedService.getDoctorSlots(doctor.doctor_id, dateStr);
      setDoctorSlots(slots || []);
      const firstAvailable = (slots || []).find((s) => !s.is_booked);
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
      Alert.alert('Select a Time Slot', 'Please choose an available appointment time slot on the calendar.');
      return;
    }
    setIsSubmittingBooking(true);
    try {
      const dateFormatted = selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const scheduledTime = `${dateFormatted}, ${selectedSlot.formatted_time || selectedSlot.start_time}`;

      const booking = await telemedService.bookConsultation({
        doctorId: selectedDoctor.doctor_id,
        slotId: selectedSlot.slot_id,
        scheduledTime,
        reason: consultationReason || 'Reproductive Health Consultation',
        consultationType: 'video',
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
      Alert.alert(
        'Payment Incomplete',
        'Your consultation booking has been requested, but payment was not completed. Please pay the consultation fee in "My Appointments" to confirm your session.',
        [
          { text: 'View Appointments', onPress: () => setShowAppointmentsModal(true) },
          { text: 'OK' },
        ]
      );

      const updatedBookings = await telemedService.getUserBookings();
      setUserBookings(updatedBookings || []);
    } catch (e) {
      Alert.alert('Booking Error', e.message || 'Could not schedule appointment.');
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
      Alert.alert('Payment Notice', 'Payment authorization could not be started. Please try again.');
    } catch (err) {
      Alert.alert('Payment Error', err.message || 'Could not initiate payment.');
    }
  };

  const handleJoinVideoCall = (booking) => {
    setActiveVideoCallBooking(booking);
    setShowVideoCallModal(true);
  };

  // Helper to format date & time strings
  const formatBookingDateTime = (scheduledTimeStr) => {
    if (!scheduledTimeStr) {
      return { date: 'Scheduled Visit', time: 'Consultation' };
    }
    try {
      if (scheduledTimeStr.includes(',')) {
        const parts = scheduledTimeStr.split(',').map((s) => s.trim());
        if (parts.length >= 3) {
          return {
            date: `${parts[0]}, ${parts[1]}`,
            time: parts.slice(2).join(', '),
          };
        } else if (parts.length === 2) {
          return {
            date: parts[0],
            time: parts[1],
          };
        }
      }
      const d = new Date(scheduledTimeStr);
      if (!isNaN(d.getTime())) {
        return {
          date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
      }
    } catch (_) { }
    return { date: scheduledTimeStr, time: 'Consultation' };
  };

  // Active upcoming booking from database
  const activeUpcomingBooking = useMemo(() => {
    return (userBookings || []).find(
      (b) => b.status === 'confirmed' || b.status === 'requested' || b.status === 'in_progress'
    );
  }, [userBookings]);

  const displayedUpcoming = useMemo(() => {
    if (!activeUpcomingBooking) {
      return null;
    }
    const { date, time } = formatBookingDateTime(activeUpcomingBooking.scheduled_time);
    const isPaid =
      activeUpcomingBooking.payment_status === 'paid' ||
      activeUpcomingBooking.status === 'confirmed';
    return {
      booking_id: activeUpcomingBooking.booking_id,
      doctor_name: activeUpcomingBooking.doctor_name || 'Verified Specialist',
      doctor_specialty: activeUpcomingBooking.doctor_specialty || 'Obstetrics & Gynecologist',
      doctor_photo: activeUpcomingBooking.doctor_photo_url || activeUpcomingBooking.doctor_photo || null,
      date,
      time,
      is_paid: isPaid,
      raw: activeUpcomingBooking,
    };
  }, [activeUpcomingBooking]);

  // Dynamic recent consultations or verified specialists directly from backend database
  const displayedRecentList = useMemo(() => {
    const completed = (userBookings || []).filter(
      (b) => b.status === 'completed' || b.status === 'cancelled'
    );
    if (completed && completed.length > 0) {
      return completed.slice(0, 3).map((b, idx) => {
        const { date, time } = formatBookingDateTime(b.scheduled_time);
        return {
          id: b.booking_id || `booking_hist_${idx}`,
          name: b.doctor_name || 'Doctor',
          specialty: b.doctor_specialty || 'Specialist',
          date,
          time,
          photo:
            b.doctor_photo_url ||
            b.doctor_photo,
          raw: b,
        };
      });
    }
    // If no past consultations yet, display verified specialists directly from backend
    if (specialists && specialists.length > 0) {
      return specialists.slice(0, 3).map((doc) => ({
        id: doc.doctor_id,
        name: doc.name,
        specialty: doc.specialty,
        date: `₦${Number(doc.fee_ngn || 0).toLocaleString()}`,
        time: `★ ${Number(doc.rating || 5.0).toFixed(1)}`,
        photo:
          doc.photo_url,
        rawDoc: doc,
      }));
    }
    return [];
  }, [userBookings, specialists]);

  const handleRecentDoctorPress = (item) => {
    if (item.rawDoc) {
      handleOpenBooking(item.rawDoc);
      return;
    }
    const matched = (specialists || []).find(
      (d) =>
        d.doctor_id === item.id ||
        d.name?.toLowerCase().includes(item.name?.toLowerCase() || '') ||
        d.specialty?.toLowerCase().includes(item.specialty?.toLowerCase() || '')
    );
    if (matched) {
      handleOpenBooking(matched);
    } else {
      setShowAppointmentsModal(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6F0" translucent={true} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#111827"
            colors={['#111827', '#DC2626']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        <View style={styles.contentWrapper}>
          {/* TOP NAV BAR */}
          <View style={styles.navBarRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.navCircleBtn}
              onPress={() => {
                if (onNavigateHome) onNavigateHome();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </TouchableOpacity>

            <Text style={styles.navBarTitle}>Appointments</Text>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.navCircleBtn}
              onPress={() => setShowOptionsMenu(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* UPCOMING SECTION */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Upcoming</Text>
            {userBookings.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowAppointmentsModal(true)}
              >
                <Text style={styles.viewAllBtnText}>View all</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* UPCOMING CARD (ACTIVE BOOKING OR EMPTY STATE) */}
          {isLoading ? (
            <UpcomingCardSkeleton />
          ) : displayedUpcoming ? (
            <View style={styles.upcomingCard}>
              {/* Top Doctor Profile Row */}
              <View style={styles.upcomingTopRow}>
                {displayedUpcoming.doctor_photo ? (
                  <Image
                    source={{ uri: displayedUpcoming.doctor_photo }}
                    style={styles.doctorAvatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.doctorAvatarImg, { backgroundColor: '#CBB7E2', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="medical" size={24} color="#7C3AED" />
                  </View>
                )}

                <View style={styles.doctorInfoCol}>
                  <Text style={styles.doctorNameText} numberOfLines={1}>
                    {displayedUpcoming.doctor_name}
                  </Text>
                  <Text style={styles.doctorSpecText} numberOfLines={1}>
                    {displayedUpcoming.doctor_specialty}
                  </Text>
                </View>

                {/* Status Badge */}
                <View style={styles.statusBadgeWrap}>
                  <Text style={styles.statusBadgeLabel}>
                    {displayedUpcoming.is_paid ? 'Paid' : 'Not paid'}
                  </Text>
                  <View
                    style={[
                      styles.statusBadgeIconCircle,
                      displayedUpcoming.is_paid && styles.statusBadgeIconCirclePaid,
                    ]}
                  >
                    {displayedUpcoming.is_paid ? (
                      <Ionicons name="checkmark" size={11} color="#059669" />
                    ) : (
                      <Text style={styles.statusBadgeExclamationText}>!</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Date & Time Row */}
              <View style={styles.dateTimeRow}>
                <Text style={styles.dateTimeText}>{displayedUpcoming.date}</Text>
                <Text style={styles.dateTimeText}>{displayedUpcoming.time}</Text>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.payNowPillBtn}
                onPress={() => {
                  if (displayedUpcoming.is_paid && displayedUpcoming.raw) {
                    handleJoinVideoCall(displayedUpcoming.raw);
                  } else if (displayedUpcoming.raw) {
                    handlePayForBooking(displayedUpcoming.raw);
                  }
                }}
              >
                <Text style={styles.payNowPillBtnText}>
                  {displayedUpcoming.is_paid ? 'Join consultation' : 'Pay now'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyUpcomingCard}>
              <View style={styles.emptyUpcomingTop}>
                <View style={styles.emptyUpcomingIconCircle}>
                  <Ionicons name="calendar-outline" size={22} color="#7C3AED" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.emptyUpcomingTitle}>No Consultations Scheduled</Text>
                  <Text style={styles.emptyUpcomingSub}>
                    Schedule a 1-on-1 virtual HD video visit with an accredited specialist.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.emptyUpcomingBookBtn}
                onPress={() => {
                  if (specialists && specialists.length > 0) {
                    handleOpenBooking(specialists[0]);
                  } else {
                    setShowSeeAll(true);
                  }
                }}
              >
                <Ionicons name="videocam" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyUpcomingBookBtnText}>Book a Specialist</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* RECENT / VERIFIED SPECIALISTS SECTION */}
          <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
            <Text style={styles.sectionHeaderTitle}>
              {userBookings.some((b) => b.status === 'completed')
                ? 'Recent Consultations'
                : 'Verified Specialists'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (userBookings.some((b) => b.status === 'completed')) {
                  setShowAppointmentsModal(true);
                } else {
                  setShowSeeAll(true);
                }
              }}
            >
              <Text style={styles.viewAllBtnText}>View all</Text>
            </TouchableOpacity>
          </View>

          {/* RECENT WHITE CARD */}
          {isLoading ? (
            <SpecialistsListSkeleton count={3} />
          ) : displayedRecentList.length === 0 ? (
            <View style={styles.recentWhiteCard}>
              <View style={styles.emptyRecentWrap}>
                <Text style={styles.emptyRecentText}>
                  No specialists available at the moment. Pull down to refresh.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.recentWhiteCard}>
              {displayedRecentList.map((item, idx) => (
                <View key={item.id || idx}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.recentDoctorItem}
                    onPress={() => handleRecentDoctorPress(item)}
                  >
                    <Image
                      source={{ uri: item.photo }}
                      style={styles.recentAvatarImg}
                      resizeMode="cover"
                    />

                    <View style={styles.recentDoctorInfoCol}>
                      <Text style={styles.recentDoctorName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.recentDoctorSpec} numberOfLines={1}>
                        {item.specialty}
                      </Text>
                    </View>

                    <View style={styles.recentDateCol}>
                      <Text style={styles.recentDateText}>{item.date}</Text>
                      <Text style={styles.recentTimeText}>{item.time}</Text>
                    </View>
                  </TouchableOpacity>

                  {idx < displayedRecentList.length - 1 && (
                    <View style={styles.recentDivider} />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* BOTTOM PROMO CARD */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.promoSkyBlueCard}
            onPress={() => setShowSeeAll(true)}
          >
            <View style={styles.promoTextCol}>
              <Text style={styles.promoTitleText}>Get a Check-up Today</Text>
              <Text style={styles.promoSubText}>
                Complete health screening at a special price
              </Text>
            </View>

            <View style={styles.promoArrowCircle}>
              <Ionicons
                name="arrow-up"
                size={20}
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
        maxHeight="94%"
        showHandle={true}
        showCloseChevron={false}
        noPadding={true}
        scrollable={false}
        headerLeft={
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.profileModalBackBtn}
            onPress={() => setShowSeeAll(false)}
          >
            <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
        }
        title="All Specialists"
        subtitle={`${specialists?.length || 0} Specialists Available`}
      >
        <View style={{ flex: 1 }}>

          {/* SEARCH BAR */}
          <View style={styles.seeAllSearchContainer}>
            <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.seeAllSearchInput}
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
            style={{ flex: 1 }}
            contentContainerStyle={styles.seeAllScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <DoctorSeeAllSkeleton count={4} />
            ) : filteredAllDoctors.length === 0 ? (
              <View style={styles.emptyRecentWrap}>
                <Ionicons name="medical-outline" size={42} color="#9CA3AF" />
                <Text style={[styles.emptyRecentText, { marginTop: 10 }]}>
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
                  style={styles.horizontalDoctorCard}
                  onPress={() => {
                    setShowSeeAll(false);
                    handleOpenBooking(doc);
                  }}
                >
                  <View style={styles.horizontalPhotoWrap}>
                    <Image
                      source={{
                        uri:
                          doc.photo_url ||
                          'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                      }}
                      style={styles.horizontalPhoto}
                      resizeMode="cover"
                    />
                    <View style={styles.horizontalRatingPill}>
                      <Ionicons name="star" size={10} color="#DC2626" />
                      <Text style={styles.horizontalRatingScore}>
                        {Number(doc.rating || 5.0).toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.horizontalContentCol}>
                    <View style={styles.horizontalNameHeader}>
                      <View style={{ flex: 1, marginRight: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={styles.horizontalDoctorName} numberOfLines={1}>
                            {doc.name}
                          </Text>
                          <Ionicons name="checkmark-circle" size={15} color="#059669" />
                        </View>
                        <Text style={styles.horizontalDoctorSpec} numberOfLines={1}>
                          {doc.specialty}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.horizontalHospitalText} numberOfLines={1}>
                      {doc.hospital_affiliation || 'Red Apple Telemedicine Clinic'}
                    </Text>

                    <View style={styles.horizontalFooterRow}>
                      <Text style={styles.horizontalFeeText}>
                        ₦{Number(doc.fee_ngn || 0).toLocaleString()}
                        <Text style={styles.horizontalFeeSubText}> / session</Text>
                      </Text>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.horizontalBookBtn}
                        onPress={() => {
                          setShowSeeAll(false);
                          handleOpenBooking(doc);
                        }}
                      >
                        <Text style={styles.horizontalBookBtnText}>View Profile</Text>
                        <Ionicons name="arrow-forward" size={12} color="#FFFFFF" style={{ marginLeft: 3 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </AppBottomSheet>

      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN DOCTOR PROFILE WITH COMPLETE DETAILS                    */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        maxHeight="95%"
        showHandle={true}
        showCloseChevron={false}
        noPadding={true}
        scrollable={true}
        headerLeft={
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.profileModalBackBtn}
            onPress={() => setShowProfile(false)}
          >
            <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
        }
        headerRight={
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.profileModalIconBtn}
            onPress={() => Alert.alert('Share Profile', `Share ${selectedDoctor?.name}'s profile on Red Apple.`)}
          >
            <Ionicons name="share-outline" size={20} color={THEME.textPrimary} />
          </TouchableOpacity>
        }
        title={selectedDoctor?.name || 'Doctor Profile'}
        subtitle={selectedDoctor?.specialty || 'Specialist Consultant'}
        footer={
          <View style={styles.profileModalFooterRow}>
            <View style={styles.profileModalPriceCol}>
              <Text style={styles.profileModalPriceLabel}>Consultation Fee</Text>
              <Text style={styles.profileModalPriceAmount}>
                ₦{Number(selectedDoctor?.fee_ngn || 15000).toLocaleString()}
                <Text style={styles.profileModalPriceSub}> / 30 mins</Text>
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.profileModalBookBtn,
                (!selectedSlot || isSubmittingBooking) && styles.profileModalBookBtnDisabled,
              ]}
              onPress={handleConfirmBooking}
              disabled={isSubmittingBooking}
            >
              {isSubmittingBooking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="videocam" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.profileModalBookBtnText}>
                    {selectedSlot ? 'Book Consultation' : 'Select a Time Slot'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        }
      >
        <View style={styles.profileModalScrollContent}>
          {/* HERO SECTION: LARGE DOCTOR PORTRAIT & ESSENTIAL DETAILS */}
          <View style={styles.doctorHeroCard}>
            <View style={styles.doctorHeroImageWrap}>
              <Image
                source={{
                  uri:
                    selectedDoctor?.photo_url ||
                    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                }}
                style={styles.doctorHeroImage}
                resizeMode="cover"
              />
              <View style={styles.doctorHeroVerifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.doctorHeroTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.doctorHeroName}>{selectedDoctor?.name}</Text>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
              </View>
              <Text style={styles.doctorHeroCredentials}>{selectedDoctor?.credentials || 'MBBS, FWACS'}</Text>
              <Text style={styles.doctorHeroSpecialty}>{selectedDoctor?.specialty}</Text>

              {selectedDoctor?.hospital_affiliation && (
                <View style={styles.doctorHospitalPill}>
                  <Ionicons name="business-outline" size={12} color="#4B5563" />
                  <Text style={styles.doctorHospitalPillText} numberOfLines={1}>
                    {selectedDoctor.hospital_affiliation}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* KEY METRICS / STATS HIGHLIGHTS ROW */}
          <View style={styles.doctorStatsRow}>
            <View style={styles.doctorStatCard}>
              <View style={styles.doctorStatIconWrapYellow}>
                <Ionicons name="star" size={16} color="#EAB308" />
              </View>
              <Text style={styles.doctorStatValue}>{Number(selectedDoctor?.rating || 5.0).toFixed(1)}</Text>
              <Text style={styles.doctorStatLabel}>{selectedDoctor?.reviews_count || 64} Reviews</Text>
            </View>

            <View style={styles.doctorStatCard}>
              <View style={styles.doctorStatIconWrapBlue}>
                <Ionicons name="ribbon-outline" size={16} color="#2563EB" />
              </View>
              <Text style={styles.doctorStatValue}>{selectedDoctor?.years_experience || 12}+ Yrs</Text>
              <Text style={styles.doctorStatLabel}>Experience</Text>
            </View>

            <View style={styles.doctorStatCard}>
              <View style={styles.doctorStatIconWrapGreen}>
                <Ionicons name="videocam-outline" size={16} color="#059669" />
              </View>
              <Text style={styles.doctorStatValue}>1,200+</Text>
              <Text style={styles.doctorStatLabel}>Consultations</Text>
            </View>

            <View style={styles.doctorStatCard}>
              <View style={styles.doctorStatIconWrapRed}>
                <Ionicons name="heart" size={16} color="#DC2626" />
              </View>
              <Text style={styles.doctorStatValue}>99%</Text>
              <Text style={styles.doctorStatLabel}>Positive</Text>
            </View>
          </View>

          {/* ABOUT THE DOCTOR (FULL CLINICAL BIO) */}
          <View style={styles.profileSectionBox}>
            <Text style={styles.profileSectionTitle}>About Doctor</Text>
            <Text style={styles.profileBioText}>
              {selectedDoctor?.bio ||
                'Consultant Obstetrician & Gynecologist specializing in reproductive health, virtual maternal care, fertility counseling, and patient-first telemedicine consultations.'}
            </Text>
          </View>

          {/* AREAS OF CLINICAL EXPERTISE & SPECIALIZATION TAGS */}
          <View style={styles.profileSectionBox}>
            <Text style={styles.profileSectionTitle}>Areas of Expertise</Text>
            <View style={styles.expertiseTagsWrap}>
              {[
                selectedDoctor?.sub_specialty,
                'Reproductive Wellness',
                'Virtual Maternal Care',
                'Fertility & Ovulation Guidance',
                'Hormonal Health',
                'Confidential Telemedicine',
              ]
                .filter(Boolean)
                .map((item, idx) => (
                  <View key={idx} style={styles.expertiseTagPill}>
                    <Ionicons name="checkmark" size={12} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={styles.expertiseTagText}>{item}</Text>
                  </View>
                ))}
            </View>
          </View>

          {/* LANGUAGES & PROFESSIONAL DETAILS */}
          <View style={styles.profileSectionBox}>
            <Text style={styles.profileSectionTitle}>Professional Details</Text>
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Ionicons name="language-outline" size={18} color="#4B5563" style={styles.detailIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailRowLabel}>Languages Spoken</Text>
                  <Text style={styles.detailRowValue}>
                    {selectedDoctor?.spoken_languages?.join(', ') || 'English, Pidgin'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="medkit-outline" size={18} color="#4B5563" style={styles.detailIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailRowLabel}>Medical Affiliation</Text>
                  <Text style={styles.detailRowValue}>
                    {selectedDoctor?.hospital_affiliation || 'Red Apple Telemedicine Clinic'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="videocam-outline" size={18} color="#4B5563" style={styles.detailIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailRowLabel}>Consultation Format</Text>
                  <Text style={styles.detailRowValue}>
                    1-on-1 End-to-End Encrypted HD Video Consultation (30 mins)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* DATE & TIME SLOT PICKER */}
          <View style={styles.profileSectionBox}>
            <Text style={styles.profileSectionTitle}>Select Appointment Date</Text>
            <DoctorAppointmentCalendar
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />

            <Text style={[styles.profileSectionTitle, { marginTop: 18 }]}>Available Time Slots</Text>
            {isLoadingSlots ? (
              <SlotsGridSkeleton count={6} />
            ) : doctorSlots.length === 0 ? (
              <View style={styles.noSlotsWrap}>
                <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
                <Text style={styles.noSlotsText}>No slots available for this date. Please pick another date.</Text>
              </View>
            ) : (
              <View style={styles.slotsGridWrap}>
                {doctorSlots.map((slot) => {
                  const isSelected = selectedSlot?.slot_id === slot.slot_id;
                  const isBooked = slot.is_booked;
                  return (
                    <TouchableOpacity
                      key={slot.slot_id}
                      activeOpacity={0.8}
                      disabled={isBooked}
                      style={[
                        styles.slotPill,
                        isSelected && styles.slotPillSelected,
                        isBooked && styles.slotPillBooked,
                      ]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Ionicons
                        name={isSelected ? 'time' : 'time-outline'}
                        size={13}
                        color={isSelected ? '#FFFFFF' : isBooked ? '#9CA3AF' : '#111827'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.slotPillText,
                          isSelected && styles.slotPillTextSelected,
                          isBooked && styles.slotPillTextBooked,
                        ]}
                      >
                        {slot.formatted_time || slot.start_time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* CONSULTATION REASON */}
          <View style={styles.profileSectionBox}>
            <Text style={styles.profileSectionTitle}>Reason for Consultation</Text>
            <View style={styles.reasonChipsWrap}>
              {[
                'Reproductive Health Consultation',
                'Fertility & Conception Guidance',
                'Pregnancy & Maternal Care',
                'Menstrual Irregularities',
                'Pelvic Pain & Discomfort',
                'Postmenopause Review',
              ].map((reason) => {
                const isChosen = consultationReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    activeOpacity={0.8}
                    style={[
                      styles.reasonChip,
                      isChosen && styles.reasonChipChosen,
                    ]}
                    onPress={() => setConsultationReason(reason)}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        isChosen && styles.reasonChipTextChosen,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 24 }} />
        </View>
      </AppBottomSheet>

      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN PARTNER CLINIC DETAILS                                 */}
      {/* ========================================================================= */}
      {/* BOTTOM SHEET: PARTNER CLINIC DETAILS (USING AppBottomSheet)               */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showClinicModal}
        onClose={() => setShowClinicModal(false)}
        maxHeight="95%"
        showHandle={true}
        showCloseChevron={false}
        noPadding={true}
        scrollable={true}
        headerLeft={
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.profileModalBackBtn}
            onPress={() => setShowClinicModal(false)}
          >
            <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
        }
        headerRight={
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.profileModalIconBtn}
            onPress={() =>
              Alert.alert(
                'Share Clinic',
                `Share ${selectedClinic?.name} with someone who needs care.`
              )
            }
          >
            <Ionicons name="share-outline" size={20} color={THEME.textPrimary} />
          </TouchableOpacity>
        }
        title={selectedClinic?.name || 'Partner Clinic'}
        subtitle={selectedClinic?.city || 'Accredited Facility'}
      >
        <View style={styles.profileModalScrollContent}>
            {/* HERO IMAGE BANNER */}
            <View style={styles.clinicModalHeroCard}>
              <Image
                source={{ uri: getClinicPhoto(selectedClinic) }}
                style={styles.clinicModalHeroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                style={styles.clinicModalHeroGradient}
              >
                <View style={styles.clinicModalHeroBadgeRow}>
                  <View style={styles.clinicModalVerifiedBadge}>
                    <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
                    <Text style={styles.clinicModalVerifiedText}>Red Apple Partner</Text>
                  </View>
                  <View style={styles.clinicModalRatingBadge}>
                    <Ionicons name="star" size={12} color="#DC2626" />
                    <Text style={styles.clinicModalRatingText}>
                      {Number(selectedClinic?.rating || 4.8).toFixed(1)} ({selectedClinic?.reviewsCount || selectedClinic?.reviews_count || 120})
                    </Text>
                  </View>
                </View>

                <Text style={styles.clinicModalHeroTitle}>{selectedClinic?.name}</Text>
                <Text style={styles.clinicModalHeroSub}>
                  {selectedClinic?.categoryLabel || selectedClinic?.category_label || 'Physical Healthcare Center'}
                </Text>
              </LinearGradient>
            </View>

            {/* LOCATION & DIRECTIONS BOX */}
            <View style={styles.profileSectionBox}>
              <Text style={styles.profileSectionTitle}>Location & Directions</Text>
              <View style={styles.clinicLocationBox}>
                <View style={styles.clinicLocationRow}>
                  <Ionicons name="location-sharp" size={20} color="#DC2626" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.clinicLocationAddress}>{selectedClinic?.address}</Text>
                    {selectedClinic?.distanceKm ? (
                      <Text style={styles.clinicLocationDistance}>
                        📍 {selectedClinic?.distanceKm} km from your current location
                      </Text>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.clinicDirectionsActionBtn}
                  onPress={() => {
                    if (selectedClinic) {
                      const q = encodeURIComponent(`${selectedClinic.name} ${selectedClinic.address}`);
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
                    }
                  }}
                >
                  <Ionicons name="navigate" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.clinicDirectionsActionText}>Open in Maps / Get Directions</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CONTACT & WORKING HOURS */}
            <View style={styles.profileSectionBox}>
              <Text style={styles.profileSectionTitle}>Contact & Hours</Text>
              <View style={styles.clinicContactBox}>
                <View style={styles.clinicContactRow}>
                  <Ionicons name="time-outline" size={18} color="#6B7280" />
                  <Text style={styles.clinicContactText}>
                    {selectedClinic?.openingHours || selectedClinic?.opening_hours || 'Mon - Sun: 24/7'}
                  </Text>
                </View>

                {selectedClinic?.phone && (
                  <View style={styles.clinicContactRow}>
                    <Ionicons name="call-outline" size={18} color="#6B7280" />
                    <Text style={styles.clinicContactText}>{selectedClinic?.phone}</Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.clinicQuickCallBtn}
                      onPress={() =>
                        Linking.openURL(`tel:${selectedClinic?.phone?.replace(/[^0-9+]/g, '')}`)
                      }
                    >
                      <Text style={styles.clinicQuickCallBtnText}>Call Now</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* ACCREDITED CLINICAL SERVICES */}
            <View style={styles.profileSectionBox}>
              <Text style={styles.profileSectionTitle}>Accredited Medical Services</Text>
              <View style={styles.clinicServicesGrid}>
                {(selectedClinic?.services || [
                  'Virtual Video Consultation',
                  'In-Person Gynaecological Exam',
                  'Prenatal & Antenatal Care',
                  'Fertility Ultrasound Profiling',
                  'Well-Woman Health Checkup',
                ]).map((srv, idx) => (
                  <View key={idx} style={styles.clinicServiceFullPill}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 8 }} />
                    <Text style={styles.clinicServiceFullText}>{srv}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* AFFILIATED TELEMEDICINE SPECIALISTS */}
            {clinicAffiliatedDoctors.length > 0 && (
              <View style={styles.profileSectionBox}>
                <Text style={styles.profileSectionTitle}>Affiliated Specialists</Text>
                <Text style={styles.clinicAffiliatedSub}>
                  Consult virtually with verified doctors practicing at or affiliated with this clinic
                </Text>

                {clinicAffiliatedDoctors.map((doc) => (
                  <View key={doc.doctor_id} style={styles.affiliatedDoctorCard}>
                    <Image
                      source={{
                        uri:
                          doc.photo_url ||
                          'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                      }}
                      style={styles.affiliatedDocPhoto}
                      resizeMode="cover"
                    />
                    <View style={styles.affiliatedDocInfo}>
                      <Text style={styles.affiliatedDocName}>{doc.name}</Text>
                      <Text style={styles.affiliatedDocSpec}>{doc.specialty}</Text>
                      <Text style={styles.affiliatedDocFee}>
                        ₦{Number(doc.fee_ngn || 15000).toLocaleString()} / session
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.affiliatedDocBookBtn}
                      onPress={() => {
                        setShowClinicModal(false);
                        handleOpenBooking(doc);
                      }}
                    >
                      <Text style={styles.affiliatedDocBookBtnText}>Book</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 24 }} />
        </View>
      </AppBottomSheet>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET: ALL NEARBY PARTNER CLINICS (USING AppBottomSheet)           */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showSeeAllClinics}
        onClose={() => setShowSeeAllClinics(false)}
        maxHeight="94%"
        showHandle={true}
        showCloseChevron={false}
        noPadding={true}
        scrollable={false}
        headerLeft={
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.profileModalBackBtn}
            onPress={() => setShowSeeAllClinics(false)}
          >
            <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
        }
        title="Nearby Partner Clinics"
        subtitle={`${partnerClinics?.length || 0} Accredited Healthcare Facilities`}
      >
        <View style={{ flex: 1 }}>

          {/* SEARCH BAR */}
          <View style={styles.seeAllSearchContainer}>
            <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.seeAllSearchInput}
              placeholder="Search by clinic name, city, service..."
              placeholderTextColor="#9CA3AF"
              value={clinicSearchQuery}
              onChangeText={setClinicSearchQuery}
            />
            {clinicSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setClinicSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* CATEGORY FILTER PILLS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.clinicFilterChipsRow, { marginHorizontal: 20, marginBottom: 8 }]}
          >
            {[
              { id: 'all', label: 'All Nearby' },
              { id: 'partner', label: 'Verified Partners' },
              { id: 'fertility', label: 'Fertility & IVF' },
              { id: 'birthing_center', label: 'Maternity' },
              { id: 'gynaecology', label: "Women's Clinics" },
            ].map((cat) => {
              const isSelected = clinicCategoryFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.8}
                  style={[
                    styles.clinicFilterChip,
                    isSelected && styles.clinicFilterChipActive,
                  ]}
                  onPress={() => setClinicCategoryFilter(cat.id)}
                >
                  <Text
                    style={[
                      styles.clinicFilterChipText,
                      isSelected && styles.clinicFilterChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* CLINICS VERTICAL LIST */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.seeAllScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredPartnerClinics.map((clinic) => {
              const clinicPhoto = getClinicPhoto(clinic);
              const isPartnerClinic = clinic.isPartner !== false && clinic.is_partner !== false;
              const distText = clinic.distanceKm ? `${clinic.distanceKm} km away` : 'Nearby';

              return (
                <TouchableOpacity
                  key={clinic.id || clinic.clinic_id}
                  activeOpacity={0.85}
                  style={styles.horizontalDoctorCard}
                  onPress={() => {
                    setSelectedClinic(clinic);
                    setShowClinicModal(true);
                  }}
                >
                  <View style={styles.horizontalPhotoWrap}>
                    <Image
                      source={{ uri: clinicPhoto }}
                      style={styles.horizontalPhoto}
                      resizeMode="cover"
                    />
                    <View style={styles.horizontalRatingPill}>
                      <Ionicons name="star" size={10} color="#DC2626" />
                      <Text style={styles.horizontalRatingScore}>
                        {Number(clinic.rating || 4.8).toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.horizontalContentCol}>
                    <View style={styles.horizontalNameHeader}>
                      <View style={{ flex: 1, marginRight: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={styles.horizontalDoctorName} numberOfLines={1}>
                            {clinic.name}
                          </Text>
                          {isPartnerClinic && (
                            <Ionicons name="shield-checkmark" size={14} color="#059669" />
                          )}
                        </View>
                        <Text style={styles.horizontalDoctorSpec} numberOfLines={1}>
                          {clinic.categoryLabel || clinic.category_label || "Women's Health"}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.horizontalHospitalText} numberOfLines={1}>
                      {clinic.address}
                    </Text>

                    <View style={styles.horizontalFooterRow}>
                      <Text style={styles.clinicDistanceTagText}>
                        📍 {distText}
                      </Text>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.horizontalBookBtn}
                        onPress={() => {
                          setSelectedClinic(clinic);
                          setShowClinicModal(true);
                        }}
                      >
                        <Text style={styles.horizontalBookBtnText}>View Details</Text>
                        <Ionicons name="arrow-forward" size={12} color="#FFFFFF" style={{ marginLeft: 3 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
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
        <View style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 }}>
          <View style={styles.successCheckCircle}>
            <Ionicons name="checkmark" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Consultation Confirmed!</Text>
          <Text style={styles.successSub}>
            Your appointment with {confirmedBookingData?.doctor_name || selectedDoctor?.name} is booked for {confirmedBookingData?.scheduled_time || 'Wed 12, 12:00'}.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.successJoinBtn}
            onPress={() => {
              setShowBookingSuccessModal(false);
              setActiveVideoCallBooking(confirmedBookingData);
              setShowVideoCallModal(true);
            }}
          >
            <Ionicons name="videocam" size={18} color="#FFFFFF" />
            <Text style={styles.successJoinBtnText}>Enter Video Room</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.successDismissBtn}
            onPress={() => setShowBookingSuccessModal(false)}
          >
            <Text style={styles.successDismissBtnText}>Done</Text>
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
          Alert.alert(
            'Payment Pending',
            'Your consultation booking is saved but not confirmed until payment is completed. You can pay anytime under "My Appointments".',
            [
              { text: 'View Appointments', onPress: () => setShowAppointmentsModal(true) },
              { text: 'Got it' },
            ]
          );
        }}
      />

      {/* ========================================================================= */}
      {/* BOTTOM SHEET: OPTIONS MENU (USING AppBottomSheet)                         */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        title="Appointments & Telemedicine"
        showHandle={true}
        scrollable={false}
      >
        <View style={{ paddingBottom: 12 }}>
          <TouchableOpacity
            style={styles.menuOptionBtn}
            onPress={() => {
              setShowOptionsMenu(false);
              setShowSeeAll(true);
            }}
          >
            <Ionicons name="medical" size={20} color="#DC2626" />
            <Text style={styles.menuOptionBtnText}>Browse All Specialists</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuOptionBtn}
            onPress={() => {
              setShowOptionsMenu(false);
              setShowMapModal(true);
            }}
          >
            <Ionicons name="map" size={20} color="#059669" />
            <Text style={styles.menuOptionBtnText}>Nearby Partner Clinics & Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuOptionBtn}
            onPress={() => {
              setShowOptionsMenu(false);
              setShowAppointmentsModal(true);
            }}
          >
            <Ionicons name="calendar" size={20} color="#3B82F6" />
            <Text style={styles.menuOptionBtnText}>My Appointments History</Text>
          </TouchableOpacity>

          {isDoctorAccount && (
            <TouchableOpacity
              style={styles.menuOptionBtn}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowAppointmentsModal(true);
              }}
            >
              <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
              <Text style={styles.menuOptionBtnText}>Doctor Clinical Management</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuOptionBtn}
            onPress={() => {
              setShowOptionsMenu(false);
              handleRefresh();
            }}
          >
            <Ionicons name="refresh" size={20} color="#6B7280" />
            <Text style={styles.menuOptionBtnText}>Refresh Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuOptionBtn, styles.menuCancelBtn]}
            onPress={() => setShowOptionsMenu(false)}
          >
            <Text style={styles.menuCancelBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET: NEARBY CLINICS & LEAFLET MAP (USING AppBottomSheet)        */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        maxHeight="95%"
        showHandle={true}
        showCloseChevron={false}
        noPadding={true}
        scrollable={false}
        headerLeft={
          <TouchableOpacity
            style={styles.navCircleBtn}
            onPress={() => setShowMapModal(false)}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
        }
        title="Nearby Partner Clinics"
        subtitle="Accredited physical facilities & hospitals"
      >
        <View style={{ flex: 1, minHeight: 450 }}>
          <LeafletClinicsMap
            style={{ width: '100%', height: '100%' }}
            onBookDoctor={handleOpenBooking}
            onClinicsLoaded={(loadedClinics) => {
              if (Array.isArray(loadedClinics) && loadedClinics.length > 0) {
                setPartnerClinics(loadedClinics);
              }
            }}
          />
        </View>
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  scrollView: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  scrollContent: {
    paddingTop: STATUSBAR_HEIGHT + 10,
    paddingBottom: 44,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 20,
  },

  /* -------------------------------------------------------------------------- */
  /* TOP NAV BAR WITH CIRCULAR BUTTONS                                          */
  /* -------------------------------------------------------------------------- */
  navBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    height: 48,
  },
  navCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  navBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  /* -------------------------------------------------------------------------- */
  /* SECTION HEADERS                                                            */
  /* -------------------------------------------------------------------------- */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  viewAllBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  /* -------------------------------------------------------------------------- */
  /* UPCOMING LAVENDER CARD                                                     */
  /* -------------------------------------------------------------------------- */
  upcomingCard: {
    backgroundColor: '#E8D7F9',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  upcomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorAvatarImg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  doctorInfoCol: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  doctorNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  doctorSpecText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555160',
    marginTop: 2,
  },
  statusBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadgeIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CBB7E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeIconCirclePaid: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeExclamationText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 14,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 18,
  },
  dateTimeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  payNowPillBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  payNowPillBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* -------------------------------------------------------------------------- */
  /* EMPTY UPCOMING CARD                                                        */
  /* -------------------------------------------------------------------------- */
  emptyUpcomingCard: {
    backgroundColor: '#E8D7F9',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyUpcomingTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyUpcomingIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyUpcomingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  emptyUpcomingSub: {
    fontSize: 13,
    color: '#555160',
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyUpcomingBookBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyUpcomingBookBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* -------------------------------------------------------------------------- */
  /* RECENT WHITE CARD                                                          */
  /* -------------------------------------------------------------------------- */
  recentWhiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyRecentWrap: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRecentText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  recentDoctorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  recentAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  recentDoctorInfoCol: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  recentDoctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  recentDoctorSpec: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  recentDateCol: {
    alignItems: 'flex-end',
  },
  recentDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  recentTimeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  recentDivider: {
    height: 1,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 4,
  },

  /* -------------------------------------------------------------------------- */
  /* PROMO SKY BLUE CARD                                                        */
  /* -------------------------------------------------------------------------- */
  promoSkyBlueCard: {
    backgroundColor: '#D2EDF6',
    borderRadius: 28,
    padding: 20,
    marginTop: 18,
    marginBottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  promoTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  promoTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  promoSubText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginTop: 4,
    lineHeight: 18,
  },
  promoArrowCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },

  /* -------------------------------------------------------------------------- */
  /* MORE OPTIONS MENU BOTTOM SHEET & MAP MODAL                                 */
  /* -------------------------------------------------------------------------- */
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  menuSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  menuHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  menuOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  menuOptionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  menuCancelBtn: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    marginTop: 8,
  },
  menuCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    width: '100%',
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  /* -------------------------------------------------------------------------- */
  /* LEAFLET MAP HERO AT TOP WITH OVERLAPPING STATUS BAR & HEADER               */
  /* -------------------------------------------------------------------------- */
  mapHeroContainer: {
    width: '100%',
    height: 350,
    position: 'relative',
    backgroundColor: '#F8F9FA',
    zIndex: 2,
  },
  heroMap: {
    width: '100%',
    height: '100%',
  },
  overlappingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: STATUSBAR_HEIGHT + 6,
    paddingBottom: 14,
    zIndex: 10,
    pointerEvents: 'box-none',
  },

  /* -------------------------------------------------------------------------- */
  /* NATIVE BOTTOM SHEET TUCKED UNDER MAP                                       */
  /* -------------------------------------------------------------------------- */
  sheetContentContainer: {
    marginTop: -22,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingVertical: 30,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 14,
  },

  /* -------------------------------------------------------------------------- */
  /* TOP BAR: USER PROFILE & ACTION BUTTONS                                     */
  /* -------------------------------------------------------------------------- */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  userAvatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarBtnDark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative',
  },
  calendarBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: THEME.accentOrange,
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  calendarBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  /* Standard Notification Button from HomeScreen */
  bellBtnDark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative',
  },
  bellBadgeGlow: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  bellBadgeGlowText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  /* Doctor Live Banner */
  doctorStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  doctorStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doctorLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  doctorStatusTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  doctorManageSlotsBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  doctorManageSlotsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* -------------------------------------------------------------------------- */
  /* SECTION: OUR BEST SPECIALISTS                                              */
  /* -------------------------------------------------------------------------- */
  specialistsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textPrimary,
    textDecorationLine: 'underline',
  },
  specialistsHorizontalList: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  specialistsLoadingBox: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  specialistsLoadingText: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  horizontalDoctorCard: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 0,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  horizontalPhotoWrap: {
    width: 76,
    height: 76,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  horizontalPhoto: {
    width: '100%',
    height: '100%',
  },
  horizontalRatingPill: {
    position: 'absolute',
    top: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  horizontalRatingScore: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#111827',
  },
  horizontalContentCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  horizontalNameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  horizontalDoctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textPrimary,
    letterSpacing: -0.2,
  },
  horizontalDoctorSpec: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
    marginTop: 2,
  },
  horizontalHospitalText: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  horizontalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  horizontalFeeText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  horizontalFeeSubText: {
    fontSize: 11,
    fontWeight: '400',
    color: THEME.textSecondary,
  },
  horizontalBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accentOrange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: THEME.accentOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  horizontalBookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* -------------------------------------------------------------------------- */
  /* FULLSCREEN MODAL SHARED STYLES                                             */
  /* -------------------------------------------------------------------------- */
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* SEE ALL SPECIALISTS MODAL */
  seeAllNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 38) + 8 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  seeAllNavTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  seeAllNavSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  seeAllSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
  },
  seeAllSearchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.textPrimary,
    paddingVertical: 0,
  },
  seeAllScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  /* DOCTOR PROFILE FULLSCREEN MODAL */
  profileModalTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 38) + 8 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileModalBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileModalTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  profileModalNavTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textPrimary,
    letterSpacing: -0.2,
  },
  profileModalNavSub: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 1,
  },
  profileModalTopNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileModalIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileModalScrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileModalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  /* DOCTOR HERO SECTION */
  doctorHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  doctorHeroImageWrap: {
    position: 'relative',
    width: 84,
    height: 84,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  doctorHeroImage: {
    width: '100%',
    height: '100%',
  },
  doctorHeroVerifiedBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: '#059669',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorHeroTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  doctorHeroName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  doctorHeroCredentials: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  doctorHeroSpecialty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 2,
  },
  doctorHospitalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  doctorHospitalPillText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },

  /* STATS ROW */
  doctorStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  doctorStatCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  doctorStatIconWrapYellow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  doctorStatIconWrapBlue: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  doctorStatIconWrapGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  doctorStatIconWrapRed: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  doctorStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  doctorStatLabel: {
    fontSize: 9.5,
    color: THEME.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },

  /* SECTION BOXES */
  profileSectionBox: {
    marginBottom: 20,
  },
  profileSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  profileBioText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4B5563',
  },
  expertiseTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  expertiseTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  expertiseTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  detailsList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  detailRowLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  detailRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginTop: 1,
  },

  /* SLOTS */
  slotsLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  slotsLoadingText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  noSlotsWrap: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  noSlotsText: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  slotsGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  slotPillSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  slotPillBooked: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.5,
  },
  slotPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  slotPillTextSelected: {
    color: '#FFFFFF',
  },
  slotPillTextBooked: {
    color: '#9CA3AF',
  },

  /* REASONS */
  reasonChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonChipChosen: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  reasonChipTextChosen: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* BOTTOM BAR */
  profileModalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  profileModalBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  profileModalPriceCol: {
    flex: 1,
    marginRight: 14,
  },
  profileModalPriceLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  profileModalPriceAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  profileModalPriceSub: {
    fontSize: 11,
    fontWeight: '400',
    color: THEME.textSecondary,
  },
  profileModalBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
  },
  profileModalBookBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  profileModalBookBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* -------------------------------------------------------------------------- */
  /* MODAL: "SELECT A SPECIALIST"                         */
  /* -------------------------------------------------------------------------- */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  selectSpecialistModalContainer: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 38,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  selectTitleText: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.textPrimary,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  filterCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  counterCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
  },

  /* Stacked Cards Simulation */
  stackedCardsWrapper: {
    position: 'relative',
    marginTop: 8,
  },
  cardStackBack: {
    backgroundColor: '#E5E7EB',
    borderRadius: 24,
    height: 50,
    marginHorizontal: 24,
    marginBottom: -42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    opacity: 0.7,
  },
  cardStackMiddle: {
    backgroundColor: '#ECEEF1',
    borderRadius: 24,
    height: 50,
    marginHorizontal: 12,
    marginBottom: -40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    opacity: 0.85,
  },
  stackAvatarSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 8,
  },
  stackNameSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    flex: 1,
  },
  stackRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stackRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.accentOrange,
  },

  /* Front Active Card */
  frontDoctorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '80%',
    alignSelf: 'center',
  },
  frontDoctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  frontDoctorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  frontDoctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  frontDoctorSpecialty: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  frontRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  frontRatingScore: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.accentOrange,
  },

  slotSubtitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 12,
  },
  daysPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dayPill: {
    flex: 1,
    minWidth: 46,
    marginHorizontal: 2,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillSelected: {
    backgroundColor: THEME.accentOrange,
  },
  dayPillUnselected: {
    backgroundColor: THEME.subtlePill,
    borderWidth: 1,
    borderColor: THEME.pillBorder,
  },
  dayPillName: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  dayPillNum: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayPillTextSelected: {
    color: '#FFFFFF',
  },
  dayPillTextUnselected: {
    color: THEME.textPrimary,
  },

  hoursPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  hourPill: {
    flex: 1,
    minWidth: 46,
    marginHorizontal: 2,
    paddingVertical: 9,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourPillSelected: {
    backgroundColor: THEME.accentOrange,
  },
  hourPillUnselected: {
    backgroundColor: THEME.subtlePill,
    borderWidth: 1,
    borderColor: THEME.pillBorder,
  },
  hourPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hourPillTextSelected: {
    color: '#FFFFFF',
  },
  hourPillTextUnselected: {
    color: THEME.textPrimary,
  },

  modalBookNowBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBookNowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* -------------------------------------------------------------------------- */
  /* SUCCESS MODAL                                                              */
  /* -------------------------------------------------------------------------- */
  successModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  successCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C81E3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  successJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accentOrange,
    height: 48,
    borderRadius: 24,
    width: '100%',
    gap: 8,
    marginBottom: 10,
  },
  successJoinBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successDismissBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successDismissBtnText: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  upcomingConsultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3E8E2',
    shadowColor: '#C34119',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  upcomingConsultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  upcomingConsultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: THEME.accentOrange,
  },
  upcomingConsultInfo: {
    marginLeft: 11,
    flex: 1,
  },
  upcomingConsultDoctor: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  upcomingLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  upcomingLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#C81E3A',
    marginRight: 4,
  },
  upcomingLiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  upcomingConsultTime: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  upcomingJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C34119',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#C34119',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  upcomingJoinBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* -------------------------------------------------------------------------- */
  /* NEARBY PARTNER CLINICS SECTION STYLES                                      */
  /* -------------------------------------------------------------------------- */
  partnerClinicsSection: {
    marginTop: 26,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 22,
  },
  partnerClinicsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  partnerBadgeCount: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  partnerBadgeCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  partnerClinicsSubtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  seeAllBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  clinicFilterChipsRow: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 14,
  },
  clinicFilterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clinicFilterChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  clinicFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  clinicFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  partnerClinicsScrollList: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 8,
  },
  partnerClinicCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  clinicCardImageWrap: {
    width: '100%',
    height: 105,
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  clinicCardImage: {
    width: '100%',
    height: '100%',
  },
  clinicVerifiedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(5, 150, 105, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  clinicVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clinicRatingPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  clinicRatingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
  },
  clinicCardBody: {
    padding: 10,
  },
  clinicCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
    letterSpacing: -0.2,
    lineHeight: 17,
    marginBottom: 4,
    height: 34,
  },
  clinicLocationRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clinicCardAddress: {
    flex: 1,
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  emptyClinicsBox: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyClinicsText: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyClinicsResetBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  emptyClinicsResetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  clinicDistanceTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },

  /* CLINIC DETAILS MODAL STYLES */
  clinicModalHeroCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 14,
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1F2937',
  },
  clinicModalHeroImage: {
    width: '100%',
    height: '100%',
  },
  clinicModalHeroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: 'flex-end',
  },
  clinicModalHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clinicModalVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5, 150, 105, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  clinicModalVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clinicModalRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  clinicModalRatingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  clinicModalHeroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  clinicModalHeroSub: {
    fontSize: 13,
    color: '#E5E7EB',
    marginTop: 2,
  },
  clinicLocationBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  clinicLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clinicLocationAddress: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
    lineHeight: 18,
  },
  clinicLocationDistance: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
  },
  clinicDirectionsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  clinicDirectionsActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clinicContactBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  clinicContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clinicContactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: THEME.textPrimary,
  },
  clinicQuickCallBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  clinicQuickCallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clinicServicesGrid: {
    gap: 8,
  },
  clinicServiceFullPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  clinicServiceFullText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
    flex: 1,
  },
  clinicAffiliatedSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginBottom: 10,
  },
  affiliatedDoctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  affiliatedDocPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  affiliatedDocInfo: {
    flex: 1,
    marginLeft: 10,
  },
  affiliatedDocName: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  affiliatedDocSpec: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  affiliatedDocFee: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  affiliatedDocBookBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  affiliatedDocBookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

