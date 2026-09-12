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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import AppointmentsListModal from './AppointmentsListModal';
import StreamVideoCallModal from './StreamVideoCallModal';
import * as telemedService from '../services/telemedicineService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUSBAR_HEIGHT = StatusBar.currentHeight || 40;

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

// REAL VERIFIED SPECIALIST: DR. MESAL OKUBOR (NO MOCK DOCTORS)
const VERIFIED_SPECIALISTS_DEFAULT = [
  {
    doctor_id: 'doc_mesal_okubor',
    user_id: 'fb5e54b9-7b39-41af-9a77-6a34e0471b18',
    email: 'mesalokubor63@gmail.com',
    name: 'Dr. Mesal Okubor',
    credentials: 'MBBS, FWACS, FMCOG',
    specialty: 'Obstetrician & Gynecologist',
    sub_specialty: 'Telemedicine & Reproductive Healthcare',
    hospital_affiliation: 'Red Apple Telemedicine Clinic',
    bio: 'Lead Telemedicine Consultant specializing in reproductive healthcare, virtual maternal care, fertility guidance, and patient-first consultations.',
    rating: 5.0,
    reviews_count: 64,
    fee_ngn: 15000,
    fee_usd: 20,
    avatar_bg: '#E0F2F1',
    avatar_color: '#008080',
    initials: 'MO',
    photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
    is_verified: true,
    is_available_today: true,
  },
];

const AVAILABLE_HOURS = ['8:00', '9:00', '10:00', '11:00', '12:00'];

export default function DoctorCareScreen({
  onBookDoctor,
  initialDoctor,
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
    ? (user?.name && user?.name !== 'mesalokubor63' ? user.name : 'Dr. Mesal Okubor')
    : (user?.name || 'Denise Smith');

  const userSubtitle = isDoctorAccount
    ? 'Doctor / Telemedicine Specialist'
    : 'Patient';

  // Specialists state (Real doctors from backend, headed by Dr. Mesal Okubor)
  const [specialists, setSpecialists] = useState(VERIFIED_SPECIALISTS_DEFAULT);
  const [userBookings, setUserBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Booking Modal State (Inspiration: Left Mockup Screen)
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(VERIFIED_SPECIALISTS_DEFAULT[0]); // Dr. Mesal Okubor by default
  const [selectedDayIndex, setSelectedDayIndex] = useState(2); // 'Wed 12' selected by default
  const [selectedHour, setSelectedHour] = useState('12:00'); // '12:00' selected by default
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [showBookingSuccessModal, setShowBookingSuccessModal] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);

  // Consultations Manager & Video Call State
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [activeVideoCallBooking, setActiveVideoCallBooking] = useState(null);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);

  // Generate 5 calendar day pills (Mon 10, Tue 11, Wed 12, Thu 13, Fri 14) matching the left phone mockup
  const calendarDays = useMemo(() => [
    { dayName: 'Mon', dayNum: 10 },
    { dayName: 'Tue', dayNum: 11 },
    { dayName: 'Wed', dayNum: 12 },
    { dayName: 'Thu', dayNum: 13 },
    { dayName: 'Fri', dayNum: 14 },
  ], []);

  // Fetch verified doctors & bookings from backend store
  const loadData = async () => {
    try {
      const docs = await telemedService.getDoctors();
      if (docs && docs.length > 0) {
        // Strictly filter to Dr. Mesal Okubor - eliminate all mock/placeholder doctors
        const realDocs = docs.filter(
          (d) =>
            d.doctor_id === 'doc_mesal_okubor' ||
            d.email === 'mesalokubor63@gmail.com' ||
            d.name?.toLowerCase().includes('mesal okubor')
        );
        setSpecialists(realDocs.length > 0 ? realDocs : VERIFIED_SPECIALISTS_DEFAULT);
      } else {
        setSpecialists(VERIFIED_SPECIALISTS_DEFAULT);
      }
    } catch (e) {
      console.warn('Using fallback verified specialists', e);
      setSpecialists(VERIFIED_SPECIALISTS_DEFAULT);
    }
    try {
      const bookings = await telemedService.getUserBookings();
      setUserBookings(bookings || []);
    } catch (e) {
      console.warn('Error fetching bookings', e);
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

  const handleOpenBooking = (doctor) => {
    setSelectedDoctor(doctor || specialists[0] || VERIFIED_SPECIALISTS_DEFAULT[0]);
    setSelectedDayIndex(2); // Wed 12
    setSelectedHour('12:00'); // 12:00
    setShowBookingModal(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor) return;
    setIsSubmittingBooking(true);
    try {
      const chosenDay = calendarDays[selectedDayIndex] || calendarDays[2];
      const scheduledTime = `${chosenDay.dayName} ${chosenDay.dayNum}, ${selectedHour}`;

      const booking = await telemedService.bookConsultation({
        doctorId: selectedDoctor.doctor_id,
        scheduledTime,
        reason: 'General Consultation',
        consultationType: 'video',
      });

      setConfirmedBookingData(booking);
      setShowBookingModal(false);
      setShowBookingSuccessModal(true);

      const updatedBookings = await telemedService.getUserBookings();
      setUserBookings(updatedBookings || []);
    } catch (e) {
      Alert.alert('Booking Error', e.message || 'Could not confirm appointment.');
    } finally {
      setIsSubmittingBooking(false);
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
        {/* TOP BAR: USER PROFILE & ACTION BUTTONS                                    */}
        {/* ========================================================================= */}
        <View style={styles.headerRow}>
          {/* User Profile Avatar & Name */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.userInfoRow}
            onPress={onOpenSettings}
          >
            <Image
              source={{
                uri: user?.avatar_url || (isDoctorAccount
                  ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
              }}
              style={styles.userAvatarImage}
            />
            <View style={styles.userTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.userNameText}>{userName}</Text>
                {isDoctorAccount && (
                  <View style={styles.verifiedDoctorBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  </View>
                )}
              </View>
              <Text style={styles.userSubtitleText}>{userSubtitle}</Text>
            </View>
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

        {/* UPCOMING VIDEO CONSULTATION QUICK-ACCESS CARD */}
        {userBookings && userBookings.length > 0 && (() => {
          const upcoming = userBookings.find(
            (b) => b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'requested'
          );
          if (!upcoming) return null;
          return (
            <View style={styles.upcomingConsultCard}>
              <View style={styles.upcomingConsultLeft}>
                <Image
                  source={{
                    uri:
                      upcoming.doctor_photo_url ||
                      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
                  }}
                  style={styles.upcomingConsultAvatar}
                />
                <View style={styles.upcomingConsultInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.upcomingConsultDoctor}>{upcoming.doctor_name || 'Dr. Mesal Okubor'}</Text>
                    <View style={styles.upcomingLiveBadge}>
                      <View style={styles.upcomingLiveDot} />
                      <Text style={styles.upcomingLiveText}>Ready</Text>
                    </View>
                  </View>
                  <Text style={styles.upcomingConsultTime}>
                    {upcoming.scheduled_time || 'Today'} • HD Video Call
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.upcomingJoinBtn}
                onPress={() => {
                  setActiveVideoCallBooking(upcoming);
                  setShowVideoCallModal(true);
                }}
              >
                <Ionicons name="videocam" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.upcomingJoinBtnText}>Join Call</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* ========================================================================= */}
        {/* OUR BEST SPECIALISTS (FOCUSED DIRECTORY - REAL DOCTORS)                   */}
        {/* ========================================================================= */}
        <View style={styles.specialistsHeaderRow}>
          <Text style={styles.sectionTitle}>Our best specialists</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenBooking(specialists[0] || VERIFIED_SPECIALISTS_DEFAULT[0])}
          >
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialistsCardsContainer}
        >
          {specialists.map((doc) => (
            <View key={doc.doctor_id} style={[styles.specialistCardWrapper, { width: cardWidth }]}>
              {/* UPPER DOCTOR PHOTO CARD */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.specialistPhotoCard}
                onPress={() => handleOpenBooking(doc)}
              >
                {/* Rating Badge Top Left */}
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={13} color={THEME.accentOrange} />
                  <Text style={styles.ratingScore}>{Number(doc.rating || 5.0).toFixed(1)}</Text>
                </View>

                {/* Doctor Portrait Image */}
                <Image
                  source={{ uri: doc.photo_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80' }}
                  style={styles.specialistPhoto}
                  resizeMode="cover"
                />

                {/* Doctor Name & Specialty Overlay (Bottom of Photo) */}
                <View style={styles.doctorOverlay}>
                  <Text style={styles.doctorNameText} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text style={styles.doctorSpecialtyText} numberOfLines={1}>
                    {doc.specialty}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* LOWER CORAL-ORANGE "BOOK NOW" PILL BUTTON */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.cardBookNowButton}
                onPress={() => handleOpenBooking(doc)}
              >
                <Text style={styles.cardBookNowButtonText}>Book now</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL: "SELECT A SPECIALIST & APPOINTMENT SLOT" (MOCKUP LEFT SCREEN)     */}
      {/* ========================================================================= */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowBookingModal(false)}
          />

          <View style={styles.selectSpecialistModalContainer}>
            {/* TOP HEADER: "Select a specialist:" + Controls */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.selectTitleText}>Select a</Text>
                <Text style={styles.selectTitleText}>specialist:</Text>
              </View>

              <View style={styles.modalHeaderActions}>
                {/* Sliders / Filter button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.filterCircleButton}
                  onPress={() => {}}
                >
                  <Ionicons name="options-outline" size={18} color={THEME.textPrimary} />
                </TouchableOpacity>

                {/* Counter badge button ("82") */}
                <View style={styles.counterCircleButton}>
                  <Text style={styles.counterText}>{specialists.length}</Text>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.filterCircleButton, { marginLeft: 6 }]}
                  onPress={() => setShowBookingModal(false)}
                >
                  <Ionicons name="close" size={18} color={THEME.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* CONSULTATION CARD: DR. MESAL OKUBOR */}
            <View style={styles.stackedCardsWrapper}>
              {/* FRONT ACTIVE CARD: Selected Doctor (Dr. Mesal Okubor) */}
              <View style={styles.frontActiveCard}>
                {/* Doctor Summary Row */}
                <View style={styles.frontDoctorHeaderRow}>
                  <Image
                    source={{
                      uri: selectedDoctor?.photo_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                    }}
                    style={styles.frontDoctorAvatar}
                  />
                  <View style={styles.frontDoctorInfo}>
                    <Text style={styles.frontDoctorName}>{selectedDoctor?.name || 'Dr. Mesal Okubor'}</Text>
                    <Text style={styles.frontDoctorSpecialty}>
                      {selectedDoctor?.specialty || 'Obstetrician & Gynecologist'}
                    </Text>
                  </View>
                  <View style={styles.frontRatingBadge}>
                    <Ionicons name="star" size={13} color={THEME.accentOrange} />
                    <Text style={styles.frontRatingScore}>
                      {Number(selectedDoctor?.rating || 5.0).toFixed(1)}
                    </Text>
                  </View>
                </View>

                {/* Subtitle: "Appointment slot" */}
                <Text style={styles.slotSubtitleText}>Appointment slot</Text>

                {/* DAYS ROW: Mon 10, Tue 11, Wed 12, Thu 13, Fri 14 */}
                <View style={styles.daysPillsRow}>
                  {calendarDays.map((day, idx) => {
                    const isSelected = selectedDayIndex === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.85}
                        style={[
                          styles.dayPill,
                          isSelected ? styles.dayPillSelected : styles.dayPillUnselected,
                        ]}
                        onPress={() => setSelectedDayIndex(idx)}
                      >
                        <Text
                          style={[
                            styles.dayPillName,
                            isSelected ? styles.dayPillTextSelected : styles.dayPillTextUnselected,
                          ]}
                        >
                          {day.dayName}
                        </Text>
                        <Text
                          style={[
                            styles.dayPillNum,
                            isSelected ? styles.dayPillTextSelected : styles.dayPillTextUnselected,
                          ]}
                        >
                          {day.dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* HOURS ROW: 8:00, 9:00, 10:00, 11:00, 12:00 */}
                <View style={styles.hoursPillsRow}>
                  {AVAILABLE_HOURS.map((hr) => {
                    const isSelected = selectedHour === hr;
                    return (
                      <TouchableOpacity
                        key={hr}
                        activeOpacity={0.85}
                        style={[
                          styles.hourPill,
                          isSelected ? styles.hourPillSelected : styles.hourPillUnselected,
                        ]}
                        onPress={() => setSelectedHour(hr)}
                      >
                        <Text
                          style={[
                            styles.hourPillText,
                            isSelected ? styles.hourPillTextSelected : styles.hourPillTextUnselected,
                          ]}
                        >
                          {hr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* BIG SOLID ORANGE "BOOK NOW" BUTTON */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.modalBookNowBtn}
                  onPress={handleConfirmBooking}
                  disabled={isSubmittingBooking}
                >
                  {isSubmittingBooking ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalBookNowBtnText}>Book now</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
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
    paddingTop: STATUSBAR_HEIGHT + 6,
    paddingBottom: 40,
  },

  /* -------------------------------------------------------------------------- */
  /* TOP BAR: USER PROFILE & ACTION BUTTONS                                     */
  /* -------------------------------------------------------------------------- */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  userTextCol: {
    marginLeft: 12,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
    letterSpacing: -0.2,
  },
  verifiedDoctorBadge: {
    marginLeft: 2,
  },
  userSubtitleText: {
    fontSize: 13,
    fontWeight: '400',
    color: THEME.textSecondary,
    marginTop: 2,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
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
  specialistsCardsContainer: {
    paddingHorizontal: 20,
    paddingRight: 8,
    gap: 14,
  },
  specialistCardWrapper: {
    alignItems: 'center',
  },
  specialistPhotoCard: {
    width: '100%',
    height: 205,
    borderRadius: 28,
    backgroundColor: THEME.photoCardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    left: 14,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ratingScore: {
    color: THEME.accentOrange,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 3,
  },
  specialistPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  doctorOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  doctorNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  doctorSpecialtyText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 1,
  },
  cardBookNowButton: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.accentOrange,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.accentOrange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  cardBookNowButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* -------------------------------------------------------------------------- */
  /* MODAL: "SELECT A SPECIALIST" (MOCKUP LEFT SCREEN)                          */
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
  frontActiveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginTop: 10,
  },
  frontDoctorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    backgroundColor: '#10B981',
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
    backgroundColor: '#10B981',
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
});

