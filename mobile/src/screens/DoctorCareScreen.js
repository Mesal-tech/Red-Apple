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

// THEME PALETTE: PURE CLEAN WHITE SCREEN BACKGROUND
const THEME = {
  bg: '#FFFFFF',             // Pure clean white background
  cardBg: '#FFFFFF',         // White card surface
  photoCardBg: '#F8F9FA',    // Crisp light surface for doctor photo card
  cardBorder: '#EFEFEF',     // Subtle border for clean definition
  textPrimary: '#111827',    // Deep slate / charcoal
  textSecondary: '#6B7280',  // Muted gray
  accentOrange: '#DC2626',   // App Signature Apple Red
  subtlePill: '#F3F4F6',     // Light pill background
  pillBorder: '#E5E7EB',     // Pill border
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
    : (user?.name || 'Denise Smith');

  const userSubtitle = isDoctorAccount
    ? 'Doctor / Telemedicine Specialist'
    : 'Patient';

  // Specialists state (Real doctors from backend)
  const [specialists, setSpecialists] = useState();
  const [userBookings, setUserBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fullscreen Booking Modal State
  const [showProfile, setShowProfile] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState();
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

  const cardWidth = Math.floor((SCREEN_WIDTH - 54) / 2);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={THEME.accentOrange}
            colors={[THEME.accentOrange, '#059669']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {/* ========================================================================= */}
        {/* LEAFLET MAP HERO AT TOP OF PAGE - STATUS BAR AND HEADER OVERLAP IT         */}
        {/* ========================================================================= */}
        <View style={styles.mapHeroContainer}>
          {/* Pure Leaflet Map */}
          <LeafletClinicsMap
            style={styles.heroMap}
            onBookDoctor={handleOpenBooking}
            onClinicsLoaded={(loadedClinics) => {
              if (Array.isArray(loadedClinics) && loadedClinics.length > 0) {
                setPartnerClinics(loadedClinics);
              }
            }}
          />

          {/* OVERLAPPING STATUS BAR & HEADER WITH SOFT TRANSLUCENT GRADIENT SCRIM */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.45)', 'rgba(0, 0, 0, 0.15)', 'transparent']}
            style={styles.overlappingHeader}
            pointerEvents="box-none"
          >
            <View style={styles.headerRow}>
              {/* User Profile Avatar (PFP only - opens Profile page) */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.userAvatarButton}
                onPress={() => {
                  if (onOpenProfile) {
                    onOpenProfile();
                  } else if (onOpenSettings) {
                    onOpenSettings();
                  }
                }}
              >
                <Image
                  source={{
                    uri: user?.avatar_url || (isDoctorAccount
                      ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
                      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
                  }}
                  style={styles.userAvatarImage}
                />
              </TouchableOpacity>

              {/* Action Buttons: Appointments Calendar & App Notification Button */}
              <View style={styles.actionButtonsRow}>
                {/* Calendar Icon Button */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.calendarBtnDark}
                  onPress={() => setShowAppointmentsModal(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#111827" />
                  {activeUpcomingCount > 0 && (
                    <View style={styles.calendarBadge}>
                      <Text style={styles.calendarBadgeText}>{activeUpcomingCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Standard Notification Button (Shared with other screens) */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.bellBtnDark}
                  onPress={() => {
                    if (onOpenNotifications) {
                      onOpenNotifications();
                    } else {
                      Alert.alert('Notifications', 'You have no new alerts at this time.');
                    }
                  }}
                >
                  <Ionicons name="notifications-outline" size={22} color="#111827" />
                  {unreadNotificationsCount > 0 && (
                    <View style={styles.bellBadgeGlow}>
                      <Text style={styles.bellBadgeGlowText}>{unreadNotificationsCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ========================================================================= */}
        {/* NATIVE iOS-STYLE BOTTOM CONTENT SHEET TUCKED UNDER MAP                    */}
        {/* ========================================================================= */}
        <View style={styles.sheetContentContainer}>
          <View style={styles.sheetHandleBar} />

          {/* DOCTOR STATUS BANNER IF LOGGED IN AS DOCTOR */}
          {isDoctorAccount && (
            <View style={styles.doctorStatusBanner}>
              <View style={styles.doctorStatusLeft}>
                <View style={styles.doctorLiveDot} />
                <Text style={styles.doctorStatusTitle}>Telemedicine Clinic Active</Text>
              </View>
              <TouchableOpacity
                style={styles.doctorManageSlotsBtn}
                onPress={() => setShowAppointmentsModal(true)}
              >
                <Text style={styles.doctorManageSlotsBtnText}>My Appointments ({activeUpcomingCount})</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================================================= */}
          {/* OUR BEST SPECIALISTS (HORIZONTAL CARD DIRECTORY)                          */}
          {/* ========================================================================= */}
          <View style={styles.specialistsHeaderRow}>
            <Text style={styles.sectionTitle}>Our best specialists</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowSeeAll(true)}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.specialistsHorizontalList}>
            {isLoading && (!specialists || specialists.length === 0) ? (
              <View style={styles.specialistsLoadingBox}>
                <ActivityIndicator size="small" color="#DC2626" />
                <Text style={styles.specialistsLoadingText}>Loading verified specialists...</Text>
              </View>
            ) : specialists?.map((doc) => (
              <TouchableOpacity
                key={doc.doctor_id}
                activeOpacity={0.85}
                style={styles.horizontalDoctorCard}
                onPress={() => handleOpenBooking(doc)}
              >
                {/* Doctor Portrait Image on Left */}
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

                {/* Doctor Details & Action on Right */}
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
                      ₦{Number(doc.fee_ngn || 15000).toLocaleString()}
                      <Text style={styles.horizontalFeeSubText}> / session</Text>
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.horizontalBookBtn}
                      onPress={() => handleOpenBooking(doc)}
                    >
                      <Text style={styles.horizontalBookBtnText}>Book now</Text>
                      <Ionicons name="arrow-forward" size={12} color="#FFFFFF" style={{ marginLeft: 3 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ========================================================================= */}
          {/* NEARBY PARTNER CLINICS & HOSPITALS (MATCHING LEAFLET MAP ABOVE)           */}
          {/* ========================================================================= */}
          <View style={styles.partnerClinicsSection}>
            <View style={styles.partnerClinicsHeaderRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.sectionTitle}>Nearby Partner Clinics</Text>
                  <View style={styles.partnerBadgeCount}>
                    <Text style={styles.partnerBadgeCountText}>{partnerClinics?.length || 0}</Text>
                  </View>
                </View>
                <Text style={styles.partnerClinicsSubtitle}>
                  Accredited physical facilities on the map for in-person exams & maternity
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowSeeAllClinics(true)}
                style={styles.seeAllBtnWrap}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={13} color="#DC2626" />
              </TouchableOpacity>
            </View>

            {/* QUICK CATEGORY FILTER PILLS */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.clinicFilterChipsRow}
            >
              {[
                { id: 'all', label: 'All Nearby' },
                { id: 'partner', label: 'Verified Partners' },
                { id: 'fertility', label: 'Fertility & IVF' },
                { id: 'birthing_center', label: 'Maternity & Birthing' },
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

            {/* HORIZONTAL CAROUSEL OF NEARBY CLINIC CARDS */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
              decelerationRate="fast"
              snapToInterval={220 + 12}
              snapToAlignment="start"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.partnerClinicsScrollList}
            >
              {filteredPartnerClinics.length === 0 ? (
                <View style={styles.emptyClinicsBox}>
                  <Text style={styles.emptyClinicsText}>No clinics in this category</Text>
                  <TouchableOpacity
                    onPress={() => setClinicCategoryFilter('all')}
                    style={styles.emptyClinicsResetBtn}
                  >
                    <Text style={styles.emptyClinicsResetText}>View all</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredPartnerClinics.map((clinic) => {
                  const clinicPhoto = getClinicPhoto(clinic);
                  const isPartnerClinic = clinic.isPartner !== false && clinic.is_partner !== false;
                  const distText = clinic.distanceKm ? `${clinic.distanceKm} km` : 'Nearby';

                  return (
                    <TouchableOpacity
                      key={clinic.id || clinic.clinic_id}
                      activeOpacity={0.88}
                      style={styles.partnerClinicCard}
                      onPress={() => {
                        setSelectedClinic(clinic);
                        setShowClinicModal(true);
                      }}
                    >
                      {/* PHOTO BANNER */}
                      <View style={styles.clinicCardImageWrap}>
                        <Image
                          source={{ uri: clinicPhoto }}
                          style={styles.clinicCardImage}
                          resizeMode="cover"
                        />
                        {/* Certified Partner Shield */}
                        {isPartnerClinic && (
                          <View style={styles.clinicVerifiedBadge}>
                            <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
                            <Text style={styles.clinicVerifiedText}>Partner</Text>
                          </View>
                        )}

                        {/* Rating Pill */}
                        <View style={styles.clinicRatingPill}>
                          <Ionicons name="star" size={10} color="#EAB308" />
                          <Text style={styles.clinicRatingText}>
                            {Number(clinic.rating || 4.8).toFixed(1)}
                          </Text>
                        </View>
                      </View>

                      {/* CARD BODY: CLEAN & UNCLUTTERED */}
                      <View style={styles.clinicCardBody}>
                        <Text style={styles.clinicCardName} numberOfLines={2}>
                          {clinic.name}
                        </Text>

                        <View style={styles.clinicLocationRowCompact}>
                          <Ionicons name="location-sharp" size={12} color="#DC2626" style={{ marginTop: 1 }} />
                          <Text style={styles.clinicCardAddress} numberOfLines={1}>
                            {clinic.city || clinic.address || 'Lagos'} • {distText}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </ScrollView>


      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN ALL SPECIALISTS                                        */}
      {/* ========================================================================= */}
      <Modal
        visible={showSeeAll}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowSeeAll(false)}
      >
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

          {/* TOP NAV BAR */}
          <View style={styles.seeAllNavRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.profileModalBackBtn}
              onPress={() => setShowSeeAll(false)}
            >
              <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.seeAllNavTitle}>All Specialists</Text>
              <Text style={styles.seeAllNavSub}>{specialists?.length || 0} Specialists Available</Text>
            </View>
          </View>

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
            {filteredAllDoctors.map((doc) => (
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
                      ₦{Number(doc.fee_ngn || 15000).toLocaleString()}
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
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN DOCTOR PROFILE WITH COMPLETE DETAILS                    */}
      {/* ========================================================================= */}
      <Modal
        visible={showProfile}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowProfile(false)}
      >
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

          {/* STICKY TOP NAV BAR */}
          <View style={styles.profileModalTopNav}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.profileModalBackBtn}
              onPress={() => setShowProfile(false)}
            >
              <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
            </TouchableOpacity>

            <View style={styles.profileModalTitleWrap}>
              <Text style={styles.profileModalNavTitle}>Doctor Profile</Text>
              <Text style={styles.profileModalNavSub} numberOfLines={1}>{selectedDoctor?.specialty}</Text>
            </View>

            <View style={styles.profileModalTopNavRight}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.profileModalIconBtn}
                onPress={() => Alert.alert('Share Profile', `Share ${selectedDoctor?.name}'s profile on Red Apple.`)}
              >
                <Ionicons name="share-outline" size={20} color={THEME.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* SCROLLABLE DETAILED DOCTOR PROFILE CONTENT */}
          <ScrollView
            style={styles.profileModalScrollView}
            contentContainerStyle={styles.profileModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
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
                <View style={styles.slotsLoadingWrap}>
                  <ActivityIndicator size="small" color="#DC2626" />
                  <Text style={styles.slotsLoadingText}>Checking doctor availability...</Text>
                </View>
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

            <View style={{ height: 110 }} />
          </ScrollView>

          {/* STICKY BOTTOM ACTION BAR */}
          <View style={styles.profileModalBottomBar}>
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
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN PARTNER CLINIC DETAILS                                 */}
      {/* ========================================================================= */}
      <Modal
        visible={showClinicModal}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowClinicModal(false)}
      >
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

          {/* STICKY TOP NAV BAR */}
          <View style={styles.profileModalTopNav}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.profileModalBackBtn}
              onPress={() => setShowClinicModal(false)}
            >
              <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
            </TouchableOpacity>

            <View style={styles.profileModalTitleWrap}>
              <Text style={styles.profileModalNavTitle}>Partner Clinic</Text>
              <Text style={styles.profileModalNavSub} numberOfLines={1}>
                {selectedClinic?.city || 'Accredited Facility'}
              </Text>
            </View>

            <View style={styles.profileModalTopNavRight}>
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
            </View>
          </View>

          {/* SCROLLABLE DETAILED CLINIC CONTENT */}
          <ScrollView
            style={styles.profileModalScrollView}
            contentContainerStyle={styles.profileModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
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

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN ALL NEARBY PARTNER CLINICS                              */}
      {/* ========================================================================= */}
      <Modal
        visible={showSeeAllClinics}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowSeeAllClinics(false)}
      >
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

          {/* TOP NAV BAR */}
          <View style={styles.seeAllNavRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.profileModalBackBtn}
              onPress={() => setShowSeeAllClinics(false)}
            >
              <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.seeAllNavTitle}>Nearby Partner Clinics</Text>
              <Text style={styles.seeAllNavSub}>
                {partnerClinics?.length || 0} Accredited Healthcare Facilities
              </Text>
            </View>
          </View>

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
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: BOOKING CONFIRMED SUCCESS                                          */}
      {/* ========================================================================= */}
      <Modal
        visible={showBookingSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBookingSuccessModal(false)}
      >
        <View style={styles.successModalBackdrop}>
          <View style={styles.successCard}>
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
        </View>
      </Modal>

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
    paddingTop: 0,
    paddingBottom: 40,
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
    width: (SCREEN_WIDTH - 40 - 36 - 32) / 5,
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
    width: (SCREEN_WIDTH - 40 - 36 - 32) / 5,
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

