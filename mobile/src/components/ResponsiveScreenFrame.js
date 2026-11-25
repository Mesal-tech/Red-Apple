import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '../utils/responsive';

const MAX_WIDE_CONTENT_WIDTH = 1440;

/** Keeps screen content full-width on phones and tablets, and readable on large displays. */
export default function ResponsiveScreenFrame({ children, style }) {
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINTS.tablet;

  return (
    <View
      style={[
        { flex: 1, width: '100%', alignSelf: 'center' },
        isWide ? { maxWidth: MAX_WIDE_CONTENT_WIDTH } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
