import React, { useState } from 'react';
import { Text, View, Dimensions } from 'react-native';
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
    <View className="bg-white rounded-3xl p-5 border border-gray-100 mx-4 mb-4 shadow-2xs">
      <Text className="text-base font-bold text-textPrimary mb-4">Cycle Length History</Text>

      <View className="flex-row h-24">
        <View className="w-8 justify-between py-0.5">
          <Text className="text-xs font-semibold text-gray-400">{maxY}</Text>
          <Text className="text-xs font-semibold text-gray-400">{midY}</Text>
          <Text className="text-xs font-semibold text-gray-400">{minY}</Text>
        </View>

        <View
          className="flex-1 relative h-[90px]"
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
                  className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[2px] items-center justify-center z-10"
                  style={{ left: `${currentXPercent}%`, top: currentY }}
                >
                  <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <View className="flex-row mt-2.5">
        <View className="w-8" />
        <View className="flex-1 flex-row justify-between">
          {months.map((item, idx) => (
            <Text key={idx} className="text-xs font-medium text-gray-400 w-8 text-center">
              {item.month}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}
