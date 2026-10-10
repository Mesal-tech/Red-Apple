import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  StatusBar,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as telemedService from '../services/telemedicineService';
import PaystackCheckoutModal from '../components/PaystackCheckoutModal';
import { initializeConsultationPayment } from '../services/paymentService';

const STATUSBAR_HEIGHT =
  Platform.OS === 'android'
    ? (StatusBar.currentHeight || 38)
    : Platform.OS === 'ios'
      ? 44
      : 0;

export default function AppointmentsListModal({
  visible,
  bookings = [],
  onClose,
  onJoinVideoCall,
  onCancelBooking,
  onBookNewConsultation,
  onRefreshBookings,
}) {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [internalBookings, setInternalBookings] = useState(bookings || []);

  // Paystack Telemedicine Payment State
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [paystackPaymentData, setPaystackPaymentData] = useState(null);

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
    Alert.alert(
      'Cancel Consultation?',
      `Are you sure you want to cancel your consultation with ${booking.doctor_name || 'your specialist'}?`,
      [
        { text: 'Keep Appointment', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (onCancelBooking) {
              await onCancelBooking(booking.booking_id);
            } else {
              await telemedService.cancelBooking(booking.booking_id);
            }
            await fetchLiveBookings();
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <View style={styles.modalRoot}>
        {/* TOP SAFE AREA HEADER */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.headerIconBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          <View style={styles.headerCenterCol}>
            <Text style={styles.headerTitle}>My Consultations</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'upcoming'
                ? `${upcomingBookings.length} Scheduled Appointment${upcomingBookings.length === 1 ? '' : 's'}`
                : `${pastBookings.length} Past Consultation${pastBookings.length === 1 ? '' : 's'}`}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.headerIconBtn}
            onPress={handleRefresh}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isRefreshing ? 'hourglass-outline' : 'refresh-outline'}
              size={20}
              color="#111827"
            />
          </TouchableOpacity>
        </View>

        {/* MODERN SEGMENTED TABS */}
        <View style={styles.tabsWrapper}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Ionicons
              name="calendar"
              size={15}
              color={activeTab === 'upcoming' ? '#DC2626' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              Upcoming
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === 'upcoming' && styles.tabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'upcoming' && styles.tabBadgeTextActive,
                ]}
              >
                {upcomingBookings.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabBtn, activeTab === 'past' && styles.tabBtnActive]}
            onPress={() => setActiveTab('past')}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={activeTab === 'past' ? '#111827' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
              Past History
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === 'past' && styles.tabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'past' && styles.tabBadgeTextActive,
                ]}
              >
                {pastBookings.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* SCROLLABLE CONSULTATIONS FEED */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#DC2626"
              colors={['#DC2626', '#059669']}
              progressBackgroundColor="#FFFFFF"
            />
          }
        >
          {displayedList.length === 0 ? (
            /* EMPTY STATE */
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name={activeTab === 'upcoming' ? 'calendar-outline' : 'folder-open-outline'}
                  size={36}
                  color="#DC2626"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'upcoming'
                  ? 'No Upcoming Consultations'
                  : 'No Consultation History'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'upcoming'
                  ? 'You do not have any scheduled appointments right now. Book a 1-on-1 virtual HD video consultation.'
                  : 'Your completed consultations, doctor notes, and follow-up guidance will be archived here.'}
              </Text>

              {activeTab === 'upcoming' && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.emptyBookBtn}
                  onPress={() => {
                    onClose();
                    if (onBookNewConsultation) onBookNewConsultation();
                  }}
                >
                  <Ionicons name="calendar" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyBookBtnText}>Book a Specialist</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* LIST OF CONSULTATION CARDS */
            displayedList.map((booking) => {
              const isRequested = booking.status === 'requested';
              const isConfirmed = booking.status === 'confirmed';
              const isCancelled = booking.status === 'cancelled';
              const isCompleted = booking.status === 'completed';

              return (
                <View key={booking.booking_id} style={styles.consultationCard}>
                  {/* CARD HEADER: TIME & STATUS */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.timeChip}>
                      <Ionicons name="time-outline" size={14} color="#DC2626" />
                      <Text style={styles.timeChipText}>
                        {booking.scheduled_time || 'Scheduled Today'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isRequested
                          ? styles.statusBadgeRequested
                          : isConfirmed
                            ? styles.statusBadgeConfirmed
                            : isCancelled
                              ? styles.statusBadgeCancelled
                              : styles.statusBadgeCompleted,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          isRequested
                            ? { backgroundColor: '#F59E0B' }
                            : isConfirmed
                              ? { backgroundColor: '#C81E3A' }
                              : isCancelled
                                ? { backgroundColor: '#EF4444' }
                                : { backgroundColor: '#64748B' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isRequested
                            ? { color: '#B45309' }
                            : isConfirmed
                              ? { color: '#047857' }
                              : isCancelled
                                ? { color: '#B91C1C' }
                                : { color: '#475569' },
                        ]}
                      >
                        {isRequested
                          ? 'Payment Pending'
                          : isConfirmed
                            ? 'Confirmed'
                            : isCancelled
                              ? 'Cancelled'
                              : 'Completed'}
                      </Text>
                    </View>
                  </View>

                  {/* DOCTOR BIO ROW */}
                  <View style={styles.doctorInfoRow}>
                    <View style={styles.avatarWrapper}>
                      <Image
                        source={{
                          uri:
                            booking.doctor_photo_url ||
                            'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
                        }}
                        style={styles.doctorAvatarImg}
                      />
                      <View style={styles.avatarVerifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      </View>
                    </View>

                    <View style={styles.doctorTextCol}>
                      <Text style={styles.doctorName}>
                        {booking.doctor_name || 'Consulting Specialist'}
                      </Text>
                      <Text style={styles.doctorSpec}>
                        {booking.doctor_specialty || 'Obstetrician & Gynecologist'}
                      </Text>
                      <View style={styles.credentialsBadge}>
                        <Text style={styles.credentialsBadgeText}>
                          {booking.doctor_credentials || 'MBBS, FWACS, FMCOG'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* CONSULTATION DETAILS CHIPS */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="videocam" size={13} color="#059669" />
                      <Text style={styles.metaChipText}>HD Video (30 mins)</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="medical-outline" size={13} color="#008080" />
                      <Text style={styles.metaChipText}>Red Apple Clinic</Text>
                    </View>
                  </View>

                  {/* REASON FOR VISIT */}
                  <View style={styles.reasonContainer}>
                    <Text style={styles.reasonLabel}>REASON FOR VISIT</Text>
                    <Text style={styles.reasonValue} numberOfLines={2}>
                      {booking.reason || 'General Reproductive Health Consultation'}
                    </Text>
                  </View>

                  {/* DOCTOR CLINICAL NOTES IF COMPLETED */}
                  {isCompleted && (
                    <View style={styles.clinicalNotesBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <Ionicons name="document-text" size={14} color="#15803D" />
                        <Text style={styles.clinicalNotesTitle}>Doctor Clinical Summary</Text>
                      </View>
                      <Text style={styles.clinicalNotesBody}>
                        {booking.doctor_notes ||
                          'Session concluded. Advised continued biomarker tracking and prenatal vitamins. Follow-up consultation in 4 weeks.'}
                      </Text>
                    </View>
                  )}

                  {/* ACTION BUTTONS (FOR UPCOMING) */}
                  {activeTab === 'upcoming' && !isCancelled && (
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        style={styles.cancelBtn}
                        onPress={() => handleCancelPrompt(booking)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>

                      {booking.status === 'requested' ? (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={[styles.joinVideoBtn, { backgroundColor: '#059669' }]}
                          onPress={() => handlePayForBooking(booking)}
                        >
                          <Ionicons name="card" size={17} color="#FFFFFF" />
                          <Text style={styles.joinVideoBtnText}>Pay Fee (₦15,000)</Text>
                          <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={styles.joinVideoBtn}
                          onPress={() => {
                            if (onJoinVideoCall) {
                              onJoinVideoCall(booking);
                            }
                          }}
                        >
                          <Ionicons name="videocam" size={17} color="#FFFFFF" />
                          <Text style={styles.joinVideoBtnText}>Join Video Consultation</Text>
                          <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* HEADER */
  headerContainer: {
    paddingTop: STATUSBAR_HEIGHT + 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterCol: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },

  /* TABS */
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 14,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 7,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    fontWeight: '800',
    color: '#111827',
  },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  tabBadgeActive: {
    backgroundColor: '#DC2626',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },

  /* SCROLL CONTENT */
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  /* EMPTY STATE */
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 44,
    paddingHorizontal: 24,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFEBEE',
    borderWidth: 2,
    borderColor: '#FFCDD2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 22,
    height: 46,
    borderRadius: 23,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBookBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* CONSULTATION CARD */
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeRequested: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusBadgeConfirmed: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  statusBadgeCompleted: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* DOCTOR INFO ROW */
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  doctorAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E0F2F1',
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  doctorTextCol: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  doctorSpec: {
    fontSize: 12,
    fontWeight: '600',
    color: '#008080',
    marginTop: 2,
  },
  credentialsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  credentialsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },

  /* METADATA CHIPS */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  /* REASON FOR VISIT */
  reasonContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reasonValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },

  /* CLINICAL NOTES */
  clinicalNotesBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  clinicalNotesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  clinicalNotesBody: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },

  /* ACTIONS ROW */
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  cancelBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  joinVideoBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  joinVideoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
