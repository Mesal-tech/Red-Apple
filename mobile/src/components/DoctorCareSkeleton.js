import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * High-performance smooth pulsing skeleton block.
 * Uses native driver for 60fps animations.
 */
export const SkeletonPulse = ({ style, children }) => {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View style={[{ opacity: opacityAnim, backgroundColor: '#E5E7EB' }, style]}>
      {children}
    </Animated.View>
  );
};

/**
 * Skeleton for the Upcoming Appointments Card
 */
export const UpcomingCardSkeleton = () => {
  return (
    <View style={styles.upcomingSkeletonCard}>
      <View style={styles.upcomingTopRow}>
        <SkeletonPulse style={styles.avatarSkeleton} />
        <View style={styles.upcomingInfoCol}>
          <SkeletonPulse style={styles.titleLine} />
          <SkeletonPulse style={styles.subLine} />
        </View>
      </View>

      <View style={styles.dateTimeSkeletonRow}>
        <SkeletonPulse style={styles.dateLine} />
        <SkeletonPulse style={styles.timeLine} />
      </View>

      <SkeletonPulse style={styles.pillButtonSkeleton} />
    </View>
  );
};

/**
 * Skeleton for the Recent / Verified Specialists Card
 */
export const SpecialistsListSkeleton = ({ count = 3 }) => {
  return (
    <View style={styles.specialistsSkeletonCard}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx}>
          <View style={styles.doctorItemRow}>
            <SkeletonPulse style={styles.docAvatarSquare} />
            <View style={styles.docInfoCol}>
              <SkeletonPulse style={styles.docNameLine} />
              <SkeletonPulse style={styles.docSpecLine} />
            </View>
            <View style={styles.docRightCol}>
              <SkeletonPulse style={styles.feeLine} />
              <SkeletonPulse style={styles.ratingLine} />
            </View>
          </View>
          {idx < count - 1 && <View style={styles.divider} />}
        </View>
      ))}
    </View>
  );
};

/**
 * Skeleton for the Time Slot selection grid in Doctor Booking Modal
 */
export const SlotsGridSkeleton = ({ count = 6 }) => {
  return (
    <View style={styles.slotsGridContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonPulse key={idx} style={styles.slotPillSkeleton} />
      ))}
    </View>
  );
};

/**
 * Skeleton for See All Specialists Horizontal Cards
 */
export const DoctorSeeAllSkeleton = ({ count = 4 }) => {
  return (
    <View style={styles.seeAllContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.seeAllCard}>
          <SkeletonPulse style={styles.seeAllPhoto} />
          <View style={styles.seeAllContent}>
            <SkeletonPulse style={{ width: '65%', height: 16, borderRadius: 4, marginBottom: 8 }} />
            <SkeletonPulse style={{ width: '45%', height: 12, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonPulse style={{ width: '80%', height: 11, borderRadius: 4, marginBottom: 14 }} />
            <View style={styles.seeAllFooter}>
              <SkeletonPulse style={{ width: 80, height: 16, borderRadius: 4 }} />
              <SkeletonPulse style={{ width: 95, height: 32, borderRadius: 16 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

/**
 * Skeleton for Doctor Dashboard screen loading state
 */
export const DoctorDashboardSkeleton = () => {
  return (
    <View style={styles.dashboardSkeletonWrap}>
      {/* Stat Cards Row */}
      <View style={styles.statsRowSkeleton}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.statBoxSkeleton}>
            <SkeletonPulse style={{ width: 28, height: 28, borderRadius: 14, marginBottom: 8 }} />
            <SkeletonPulse style={{ width: 36, height: 18, borderRadius: 4, marginBottom: 6 }} />
            <SkeletonPulse style={{ width: '75%', height: 10, borderRadius: 4 }} />
          </View>
        ))}
      </View>

      {/* Appointment Cards */}
      <View style={{ gap: 14, marginTop: 18 }}>
        {[1, 2].map((idx) => (
          <View key={idx} style={styles.dashCardSkeleton}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <SkeletonPulse style={{ width: 44, height: 44, borderRadius: 22 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonPulse style={{ width: '60%', height: 16, borderRadius: 4, marginBottom: 6 }} />
                <SkeletonPulse style={{ width: '40%', height: 12, borderRadius: 4 }} />
              </View>
              <SkeletonPulse style={{ width: 75, height: 24, borderRadius: 12 }} />
            </View>
            <SkeletonPulse style={{ width: '100%', height: 38, borderRadius: 10, marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SkeletonPulse style={{ width: 100, height: 14, borderRadius: 4 }} />
              <SkeletonPulse style={{ width: 110, height: 36, borderRadius: 18 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  /* UPCOMING SKELETON */
  upcomingSkeletonCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  upcomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DDD6FE',
  },
  upcomingInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  titleLine: {
    width: '60%',
    height: 16,
    borderRadius: 6,
    backgroundColor: '#DDD6FE',
    marginBottom: 6,
  },
  subLine: {
    width: '85%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E9D5FF',
  },
  dateTimeSkeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 16,
  },
  dateLine: {
    width: 110,
    height: 16,
    borderRadius: 6,
    backgroundColor: '#DDD6FE',
  },
  timeLine: {
    width: 70,
    height: 16,
    borderRadius: 6,
    backgroundColor: '#DDD6FE',
  },
  pillButtonSkeleton: {
    height: 48,
    borderRadius: 999,
    backgroundColor: '#C4B5FD',
  },

  /* SPECIALISTS LIST SKELETON */
  specialistsSkeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  doctorItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  docAvatarSquare: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  docInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  docNameLine: {
    width: '65%',
    height: 15,
    borderRadius: 5,
    marginBottom: 6,
  },
  docSpecLine: {
    width: '45%',
    height: 12,
    borderRadius: 4,
  },
  docRightCol: {
    alignItems: 'flex-end',
    width: 60,
  },
  feeLine: {
    width: 55,
    height: 14,
    borderRadius: 4,
    marginBottom: 6,
  },
  ratingLine: {
    width: 35,
    height: 12,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },

  /* SLOTS GRID SKELETON */
  slotsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  slotPillSkeleton: {
    width: '31%',
    height: 44,
    borderRadius: 12,
  },

  /* SEE ALL SKELETON */
  seeAllContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 14,
  },
  seeAllCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  seeAllPhoto: {
    width: 88,
    height: 104,
    borderRadius: 16,
  },
  seeAllContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  seeAllFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },

  /* DASHBOARD SKELETON */
  dashboardSkeletonWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statsRowSkeleton: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  statBoxSkeleton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  dashCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
});
