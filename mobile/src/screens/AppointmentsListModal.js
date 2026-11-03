import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppBottomSheet from '../components/AppBottomSheet';
import * as telemedService from '../services/telemedicineService';
import PaystackCheckoutModal from '../components/PaystackCheckoutModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { initializeConsultationPayment } from '../services/paymentService';
import { useTheme } from '../context/ThemeContext';

/**
 * Universal parser & formatter for appointment dates & times.
 */
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
  } catch (_) {}

  return { date: str, time: 'Consultation', full: str };
};

export default function AppointmentsListModal({
  visible,
  bookings = [],
  onClose,
  onJoinVideoCall,
  onCancelBooking,
  onBookNewConsultation,
  onRefreshBookings,
}) {
  const { isDarkMode, theme } = useTheme();
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [internalBookings, setInternalBookings] = useState(bookings || []);

  // Paystack Telemedicine Payment State
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [paystackPaymentData, setPaystackPaymentData] = useState(null);

  // Cancellation Confirmation Modal State
  const [cancelConfirmBooking, setCancelConfirmBooking] = useState(null);

  const handlePayForBooking = async (booking) => {
    try {
      const payRes = await initializeConsultationPayment(booking.booking_id);
      if (payRes.success && payRes.payment) {
        setPaystackPaymentData({
          booking,
          authorizationUrl: payRes.payment.authorization_url,
          reference: payRes.payment.reference,
          amount: payRes.payment.amount,
        });
        setShowPaystackModal(true);
      }
    } catch (err) {
      Alert.alert('Payment Error', err.message || 'Could not initiate payment.');
    }
  };

  // Sync with parent bookings prop
  useEffect(() => {
    if (bookings && bookings.length > 0) {
      setInternalBookings(bookings);
    }
  }, [bookings]);

  // Fetch live bookings from backend whenever opened
  useEffect(() => {
    if (visible) {
      fetchLiveBookings();
    }
  }, [visible]);

  const fetchLiveBookings = async () => {
    try {
      const live = await telemedService.getUserBookings();
      if (live && Array.isArray(live)) {
        setInternalBookings(live);
      }
    } catch (e) {
      console.warn('[AppointmentsListModal] Error fetching live bookings:', e);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshBookings) {
        await onRefreshBookings();
      }
      await fetchLiveBookings();
    } catch (e) {
      console.warn('Refresh bookings error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeList = (internalBookings && internalBookings.length > 0) ? internalBookings : bookings;

  const upcomingBookings = activeList.filter(
    (b) => !b.status || b.status === 'confirmed' || b.status === 'requested' || b.status === 'in_progress'
  );
  const pastBookings = activeList.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled'
  );

  const displayedList = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const handleCancelPrompt = (booking) => {
    setCancelConfirmBooking(booking);
  };


  if (!visible) return null;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      showHandle={true}
      showCloseChevron={false}
      height="92%"
      maxHeight="94%"
      noPadding={true}
      scrollable={false}
      headerLeft={
        <TouchableOpacity
          activeOpacity={0.75}
          className="w-[42px] h-[42px] rounded-full bg-slate-50 border border-slate-200 items-center justify-center"
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
      }
      headerRight={
        <TouchableOpacity
          activeOpacity={0.75}
          className="w-[42px] h-[42px] rounded-full bg-slate-50 border border-slate-200 items-center justify-center"
          onPress={handleRefresh}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isRefreshing ? 'hourglass-outline' : 'refresh-outline'}
            size={20}
            color="#111827"
          />
        </TouchableOpacity>
      }
      title="My Consultations"
      subtitle={
        activeTab === 'upcoming'
          ? `${upcomingBookings.length} Scheduled Appointment${upcomingBookings.length === 1 ? '' : 's'}`
          : `${pastBookings.length} Past Consultation${pastBookings.length === 1 ? '' : 's'}`
      }
    >
      <View style={{ flex: 1, width: '100%', backgroundColor: theme.card }}>
        {/* CATEGORY / SEGMENT PILLS (CENTERED WITH RED ACTIVE ACCENT) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 10, backgroundColor: theme.card }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('upcoming')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 18,
              paddingVertical: 9.5,
              borderRadius: 9999,
              backgroundColor: activeTab === 'upcoming' ? '#DC2626' : (isDarkMode ? '#363636' : '#F1F5F9'),
              gap: 7,
            }}
          >
            <Ionicons
              name="calendar"
              size={15}
              color={activeTab === 'upcoming' ? '#FFFFFF' : (isDarkMode ? '#ABABAB' : '#475569')}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: activeTab === 'upcoming' ? '#FFFFFF' : (isDarkMode ? '#ABABAB' : '#475569'),
              }}
            >
              Upcoming
            </Text>
            <View
              style={{
                paddingHorizontal: 7.5,
                paddingVertical: 1.5,
                borderRadius: 9999,
                backgroundColor: activeTab === 'upcoming' ? 'rgba(255, 255, 255, 0.25)' : (isDarkMode ? '#474747' : '#E2E8F0'),
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: activeTab === 'upcoming' ? '#FFFFFF' : (isDarkMode ? '#ABABAB' : '#475569'),
                }}
              >
                {upcomingBookings.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('past')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 18,
              paddingVertical: 9.5,
              borderRadius: 9999,
              backgroundColor: activeTab === 'past' ? '#DC2626' : (isDarkMode ? '#363636' : '#F1F5F9'),
              gap: 7,
            }}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={activeTab === 'past' ? '#FFFFFF' : (isDarkMode ? '#ABABAB' : '#475569')}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: activeTab === 'past' ? '#FFFFFF' : (isDarkMode ? '#ABABAB' : '#475569'),
              }}
            >
              Past History
            </Text>
            <View
              style={{
                paddingHorizontal: 7.5,
                paddingVertical: 1.5,
                borderRadius: 9999,
                backgroundColor: activeTab === 'past' ? 'rgba(255, 255, 255, 0.25)' : (isDarkMode ? '#474747' : '#E2E8F0'),
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: activeTab === 'past' ? '#FFFFFF' : (isDarkMode ? '#ABABAB' : '#475569'),
                }}
              >
                {pastBookings.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* SCROLLABLE CONSULTATIONS FEED (BORDERLESS LIST) */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 50,
            flexGrow: 1,
            justifyContent: displayedList.length === 0 ? 'center' : 'flex-start',
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#DC2626"
              colors={['#DC2626', '#059669']}
              progressBackgroundColor={theme.card}
            />
          }
        >
          {displayedList.length === 0 ? (
            /* EMPTY STATE: VERTICALLY AND HORIZONTALLY CENTERED */
            <View className="py-8 items-center justify-center px-6">
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: isDarkMode ? '#3A1E22' : '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name={activeTab === 'upcoming' ? 'calendar-outline' : 'folder-open-outline'}
                  size={32}
                  color="#DC2626"
                />
              </View>
              <Text
                className="text-base font-extrabold mb-1.5 text-center"
                style={{ color: theme.textPrimary }}
              >
                {activeTab === 'upcoming'
                  ? 'No Upcoming Consultations'
                  : 'No Consultation History'}
              </Text>
              <Text
                className="text-xs text-center leading-relaxed mb-6 max-w-[280px]"
                style={{ color: theme.textSecondary }}
              >
                {activeTab === 'upcoming'
                  ? 'You do not have any scheduled appointments right now. Book a 1-on-1 virtual HD video consultation.'
                  : 'Your completed consultations, doctor notes, and follow-up guidance will be archived here.'}
              </Text>

              {activeTab === 'upcoming' && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  className="flex-row items-center bg-[#DC2626] px-6 h-11 rounded-full gap-2 shadow-xs"
                  onPress={() => {
                    onClose();
                    if (onBookNewConsultation) onBookNewConsultation();
                  }}
                >
                  <Ionicons name="calendar" size={15} color="#FFFFFF" />
                  <Text className="text-white text-xs font-bold">Book a Specialist</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* BORDERLESS CLEAN LIST MATCHING PARTNER CLINICS DESIGN */
            displayedList.map((booking, idx) => {
              const isRequested = booking.status === 'requested';
              const isConfirmed = booking.status === 'confirmed';
              const isCancelled = booking.status === 'cancelled';
              const isCompleted = booking.status === 'completed';
              const formattedTime = formatBookingDateTime(booking.scheduled_time);

              return (
                <View key={booking.booking_id || idx}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      gap: 13,
                    }}
                  >
                    {/* Left: 58x58 Circular Doctor Avatar */}
                    <View
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 29,
                        backgroundColor: isDarkMode ? '#363636' : '#F1F5F9',
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        source={{
                          uri:
                            booking.doctor_photo_url ||
                            booking.doctor_photo ||
                            'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                        }}
                        style={{ width: 58, height: 58 }}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Right: Info & Inline Action */}
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      {/* Name + Status Row */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                          <Text
                            style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary }}
                            numberOfLines={1}
                          >
                            {booking.doctor_name || 'Consulting Specialist'}
                          </Text>
                          <Ionicons name="checkmark-circle" size={15} color="#059669" />
                        </View>

                        {/* Status Pill Badge */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 2.5,
                            borderRadius: 9999,
                            backgroundColor: isRequested
                              ? (isDarkMode ? '#3A2E1A' : '#FEF3C7')
                              : isConfirmed
                              ? (isDarkMode ? '#132E22' : '#ECFDF5')
                              : isCancelled
                              ? (isDarkMode ? '#3A1E22' : '#FEF2F2')
                              : (isDarkMode ? '#363636' : '#F1F5F9'),
                          }}
                        >
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: isRequested
                                ? '#D97706'
                                : isConfirmed
                                ? '#059669'
                                : isCancelled
                                ? '#DC2626'
                                : '#64748B',
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '800',
                              color: isRequested
                                ? '#B45309'
                                : isConfirmed
                                ? '#059669'
                                : isCancelled
                                ? '#DC2626'
                                : (isDarkMode ? '#ABABAB' : '#475569'),
                            }}
                          >
                            {isRequested
                              ? 'Payment Due'
                              : isConfirmed
                              ? 'Confirmed'
                              : isCancelled
                              ? 'Cancelled'
                              : 'Completed'}
                          </Text>
                        </View>
                      </View>

                      {/* Specialty */}
                      <Text
                        style={{ fontSize: 12, fontWeight: '700', color: '#DC2626', marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {booking.doctor_specialty || 'Obstetrician & Gynecologist'}
                      </Text>

                      {/* Date & Time */}
                      <Text
                        style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary, marginTop: 2 }}
                        numberOfLines={1}
                      >
                        🗓 {formattedTime.date} • {formattedTime.time}
                      </Text>

                      {/* Bottom Row: Cancel text on Left, Action Pill on Right */}
                      {activeTab === 'upcoming' && !isCancelled && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 8,
                          }}
                        >
                          <TouchableOpacity
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            onPress={() => handleCancelPrompt(booking)}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted }}>
                              Cancel
                            </Text>
                          </TouchableOpacity>

                          {booking.status === 'requested' ? (
                            <TouchableOpacity
                              activeOpacity={0.88}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#DC2626',
                                paddingHorizontal: 13,
                                paddingVertical: 6.5,
                                borderRadius: 9999,
                                gap: 4,
                              }}
                              onPress={() => handlePayForBooking(booking)}
                            >
                              <Ionicons name="card" size={12} color="#FFFFFF" />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                                Pay ₦{Number(booking.fee_ngn || 15000).toLocaleString()}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              activeOpacity={0.88}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#DC2626',
                                paddingHorizontal: 13,
                                paddingVertical: 6.5,
                                borderRadius: 9999,
                                gap: 4,
                              }}
                              onPress={() => {
                                if (onJoinVideoCall) {
                                  onJoinVideoCall(booking);
                                }
                              }}
                            >
                              <Ionicons name="videocam" size={12} color="#FFFFFF" />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                                Join Video
                              </Text>
                              <Ionicons name="arrow-forward" size={11} color="#FFFFFF" />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Past Consultation row */}
                      {activeTab === 'past' && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 8,
                          }}
                        >
                          <Text
                            style={{ fontSize: 12, color: theme.textSecondary, flex: 1, marginRight: 8 }}
                            numberOfLines={1}
                          >
                            {booking.doctor_notes || (isCancelled ? 'Visit was cancelled' : 'Consultation finished')}
                          </Text>

                          <TouchableOpacity
                            activeOpacity={0.85}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#DC2626',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 9999,
                              gap: 4,
                            }}
                            onPress={() => {
                              onClose();
                              if (onBookNewConsultation) onBookNewConsultation();
                            }}
                          >
                            <Ionicons name="calendar" size={11} color="#FFFFFF" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                              {isCompleted ? 'Follow-up' : 'Rebook'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Clean hairline bottom divider between items (No all-round border) */}
                  {idx < displayedList.length - 1 && (
                    <View style={{ height: 1, backgroundColor: theme.cardBorder, marginVertical: 2 }} />
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* PAYSTACK CHECKOUT MODAL */}
        <PaystackCheckoutModal
          visible={showPaystackModal}
          authorizationUrl={paystackPaymentData?.authorizationUrl}
          reference={paystackPaymentData?.reference}
          amount={paystackPaymentData?.amount}
          doctorName={paystackPaymentData?.booking?.doctor_name || 'Consulting Specialist'}
          onSuccess={() => {
            setShowPaystackModal(false);
            fetchLiveBookings();
            if (onRefreshBookings) onRefreshBookings();
          }}
          onClose={() => {
            setShowPaystackModal(false);
            fetchLiveBookings();
          }}
        />

        {/* REUSABLE CONFIRMATION MODAL FOR CANCELLATION */}
        <ConfirmationModal
          visible={Boolean(cancelConfirmBooking)}
          onClose={() => setCancelConfirmBooking(null)}
          title="Cancel Consultation?"
          message={`Are you sure you want to cancel your consultation with ${
            cancelConfirmBooking?.doctor_name || 'your specialist'
          }? This action cannot be undone.`}
          confirmText="Yes, Cancel"
          cancelText="Keep Appointment"
          isDestructive={true}
          icon="alert-circle-outline"
          onConfirm={async () => {
            if (!cancelConfirmBooking) return;
            try {
              if (onCancelBooking) {
                await onCancelBooking(cancelConfirmBooking.booking_id);
              } else {
                await telemedService.cancelBooking(cancelConfirmBooking.booking_id);
              }
              await fetchLiveBookings();
            } catch (err) {
              console.warn('[AppointmentsListModal] Error cancelling booking:', err);
            } finally {
              setCancelConfirmBooking(null);
            }
          }}
        />
      </View>
    </AppBottomSheet>
  );
}
