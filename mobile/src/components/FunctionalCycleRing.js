import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function FunctionalCycleRing({ currentDay, totalDays }) {
  const percentage = Math.min(Math.max(currentDay / totalDays, 0), 1);
  const totalDegrees = percentage * 360;

  const rightDeg = Math.min(totalDegrees, 180);
  const leftDeg = Math.max(totalDegrees - 180, 0);

  return (
    <View style={ringStyles.ringContainer}>
      <View style={ringStyles.trackCircle} />

      <View style={ringStyles.halfCircleContainerRight}>
        <View
          style={[
            ringStyles.halfCircleRight,
            { transform: [{ rotate: `${rightDeg}deg` }] },
          ]}
        />
      </View>

      {totalDegrees > 180 && (
        <View style={ringStyles.halfCircleContainerLeft}>
          <View
            style={[
              ringStyles.halfCircleLeft,
              { transform: [{ rotate: `${leftDeg}deg` }] },
            ]}
          />
        </View>
      )}

      <View style={ringStyles.innerMaskCircle}>
        <Text style={ringStyles.ringDayNumber}>{currentDay}</Text>
        <Text style={ringStyles.ringDayTotal}>of {totalDays}</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  ringContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  trackCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 7,
    borderColor: '#FFEBEE',
    position: 'absolute',
  },
  halfCircleContainerRight: {
    width: 52,
    height: 104,
    position: 'absolute',
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
  halfCircleRight: {
    width: 52,
    height: 104,
    borderTopRightRadius: 52,
    borderBottomRightRadius: 52,
    borderWidth: 7,
    borderColor: colors.primary,
    borderLeftWidth: 0,
    transformOrigin: 'left center',
  },
  halfCircleContainerLeft: {
    width: 52,
    height: 104,
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  halfCircleLeft: {
    width: 52,
    height: 104,
    borderTopLeftRadius: 52,
    borderBottomLeftRadius: 52,
    borderWidth: 7,
    borderColor: colors.primary,
    borderRightWidth: 0,
    transformOrigin: 'right center',
  },
  innerMaskCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  ringDayNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
  },
  ringDayTotal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
