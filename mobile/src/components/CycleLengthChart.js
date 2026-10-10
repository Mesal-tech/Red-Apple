import React, { useState } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CycleLengthChart({ historyData = null, averageLength = 28 }) {
  const months = React.useMemo(() => {
    if (historyData && historyData.length > 0) {
      return historyData.map((item) => ({
        month: item.month,
        value: Number(item.cycleLength || item.value || averageLength),
      }));
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        month: monthNames[d.getMonth()],
        value: Number(averageLength),
      });
    }
    return result;
  }, [historyData, averageLength]);

  const [plotWidth, setPlotWidth] = useState(SCREEN_WIDTH - 104);
  const values = months.map((m) => m.value);
  const rawMin = Math.min(...values, 24);
  const rawMax = Math.max(...values, 32);
  const minY = Math.floor((rawMin - 1) / 2) * 2;
  const maxY = Math.ceil((rawMax + 1) / 2) * 2;
  const midY = Math.round((minY + maxY) / 2);
  const chartHeight = 90;

  const getYPos = (val) => {
    const range = maxY - minY || 1;
    const pct = (val - minY) / range;
    return chartHeight * (1 - pct);
  };

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Cycle Length History</Text>

      <View style={styles.chartMainContainer}>
        <View style={styles.yAxisCol}>
          <Text style={styles.yAxisText}>{maxY}</Text>
          <Text style={styles.yAxisText}>{midY}</Text>
          <Text style={styles.yAxisText}>{minY}</Text>
        </View>

        <View
          style={styles.graphPlotArea}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setPlotWidth(w);
          }}
        >
          {months.map((item, idx) => {
            const currentY = getYPos(item.value);
            const xStep = months.length > 1 ? 100 / (months.length - 1) : 50;
            const currentXPercent = idx * xStep;

            let lineSegment = null;
            if (idx < months.length - 1) {
              const nextItem = months[idx + 1];
              const nextY = getYPos(nextItem.value);
              const nextXPercent = (idx + 1) * xStep;

              const x1 = (currentXPercent / 100) * plotWidth;
              const y1 = currentY;
              const x2 = (nextXPercent / 100) * plotWidth;
              const y2 = nextY;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);

              lineSegment = (
                <View
                  key={`line-${idx}`}
                  style={{
                    position: 'absolute',
                    left: `${currentXPercent}%`,
                    top: currentY + 4,
                    width: length,
                    height: 2.5,
                    backgroundColor: colors.primary,
                    borderRadius: 1.5,
                    transformOrigin: 'left center',
                    transform: [{ rotate: `${angle}deg` }],
                    zIndex: 1,
                  }}
                />
              );
            }

            return (
              <React.Fragment key={idx}>
                {lineSegment}
                <View
                  style={[
                    styles.dataPointDotContainer,
                    { left: `${currentXPercent}%`, top: currentY },
                  ]}
                >
                  <View style={styles.dataPointDot} />
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <View style={styles.xAxisRow}>
        <View style={{ width: 32 }} />
        <View style={styles.xAxisLabelsContainer}>
          {months.map((item, idx) => (
            <Text key={idx} style={styles.xAxisText}>
              {item.month}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 18,
  },
  chartMainContainer: {
    flexDirection: 'row',
    height: 100,
  },
  yAxisCol: {
    width: 32,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  yAxisText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  graphPlotArea: {
    flex: 1,
    position: 'relative',
    height: 90,
  },
  dataPointDotContainer: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dataPointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  xAxisRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  xAxisLabelsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xAxisText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    width: 30,
    textAlign: 'center',
  },
});
