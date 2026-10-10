import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function AdditionalAnalyticsMetrics({
  stats = null,
  prediction = null,
  cycleLength = 28,
  periodDuration = 5,
}) {
  const avgPeriod = stats?.averagePeriodDuration || periodDuration || 5;

  const formatWindow = (startStr, endStr) => {
    if (!startStr || !endStr) return '';
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sMonth = months[s.getMonth()];
      const eMonth = months[e.getMonth()];
      if (sMonth === eMonth) {
        return `${sMonth} ${s.getDate()} – ${e.getDate()}`;
      }
      return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`;
    } catch {
      return '';
    }
  };

  const fertileWindowDisplay = React.useMemo(() => {
    if (prediction?.fertileWindowStart && prediction?.fertileWindowEnd) {
      const formatted = formatWindow(prediction.fertileWindowStart, prediction.fertileWindowEnd);
      if (formatted) return formatted;
    }
    const nextPeriod = prediction?.nextPeriodStartDate ? new Date(prediction.nextPeriodStartDate) : null;
    if (nextPeriod && !isNaN(nextPeriod.getTime())) {
      const ovDayDate = new Date(nextPeriod.getTime() - 14 * 24 * 60 * 60 * 1000);
      const fStart = new Date(ovDayDate.getTime() - 5 * 24 * 60 * 60 * 1000);
      const fEnd = new Date(ovDayDate.getTime() + 1 * 24 * 60 * 60 * 1000);
      return formatWindow(fStart, fEnd);
    }
    return 'Calculating...';
  }, [prediction]);

  const lutealPhaseDays = Math.max(cycleLength - 14, 12);

  // Dynamically generate flow pills matching user's period duration
  const flowDays = [];
  for (let i = 1; i <= Math.min(avgPeriod, 7); i++) {
    let pillStyle = styles.flowDayPillActive;
    if (i === 3) pillStyle = styles.flowDayPillMedium;
    if (i > 3) pillStyle = styles.flowDayPillLight;
    flowDays.push(
      <View key={i} style={pillStyle}>
        <Text style={styles.flowDayText}>D{i}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 16, marginHorizontal: 16, marginBottom: 20 }}>
      {/* 1. Period Duration & Flow */}
      <View style={styles.metricCard}>
        <View style={styles.metricHeaderRow}>
          <View style={styles.metricTitleIconRow}>
            <Ionicons name="water" size={20} color={colors.primary} />
            <Text style={styles.metricCardTitle}>Period Duration & Flow</Text>
          </View>
        </View>

        <Text style={styles.metricDescriptionText}>
          Your period typically lasts <Text style={styles.boldText}>{avgPeriod} days</Text>. Flow starts heavy on Days 1–2 and naturally lightens through Day {avgPeriod}.
        </Text>

        <View style={styles.metricStatGrid}>
          <View style={styles.metricStatBox}>
            <Text style={styles.metricStatVal}>{avgPeriod} Days</Text>
            <Text style={styles.metricStatLbl}>Avg. Duration</Text>
          </View>
          <View style={styles.metricStatBox}>
            <Text style={styles.metricStatVal}>Days 1-2</Text>
            <Text style={styles.metricStatLbl}>Heavy Flow</Text>
          </View>
          <View style={styles.metricStatBox}>
            <Text style={styles.metricStatVal}>{avgPeriod > 2 ? `Days 3-${avgPeriod}` : 'Day 2'}</Text>
            <Text style={styles.metricStatLbl}>Light Flow</Text>
          </View>
        </View>

        <View style={styles.flowTimelineContainer}>{flowDays}</View>
      </View>

      {/* 2. Fertility & Ovulation */}
      <View style={styles.metricCard}>
        <View style={styles.metricHeaderRow}>
          <View style={styles.metricTitleIconRow}>
            <Ionicons name="leaf" size={20} color="#00A88F" />
            <Text style={styles.metricCardTitle}>Fertility & Ovulation</Text>
          </View>
        </View>

        <View style={styles.fertilityRow}>
          <View style={styles.fertilityItem}>
            <Text style={styles.fertilitySubLabel}>LUTEAL PHASE</Text>
            <Text style={styles.fertilityBigText}>{lutealPhaseDays} Days</Text>
          </View>
          <View style={styles.fertilityItem}>
            <Text style={styles.fertilitySubLabel}>NEXT FERTILE WINDOW</Text>
            <Text style={styles.fertilityBigText}>{fertileWindowDisplay}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FAF0F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metricTitleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  metricDescriptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  boldText: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metricStatGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metricStatBox: {
    alignItems: 'flex-start',
  },
  metricStatVal: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  metricStatLbl: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  flowTimelineContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  flowDayPillActive: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  flowDayPillMedium: {
    flex: 1,
    backgroundColor: '#EF5350',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  flowDayPillLight: {
    flex: 1,
    backgroundColor: '#FFCDD2',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  flowDayText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fertilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  fertilityItem: {
    flex: 1,
  },
  fertilitySubLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fertilityBigText: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
});
