import { useWindowDimensions, Platform } from 'react-native';

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280,
};

/**
 * Universal hook providing dynamic, reactive viewport information
 * across mobile, tablet, and desktop devices on both native & web.
 */
export function useResponsive() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isMobile = windowWidth < BREAKPOINTS.mobile;
  const isTablet = windowWidth >= BREAKPOINTS.mobile && windowWidth < BREAKPOINTS.tablet;
  const isDesktop = windowWidth >= BREAKPOINTS.tablet;

  // Maximum content boundary for readable, proportional UI
  const contentWidth = isMobile
    ? windowWidth
    : isTablet
    ? Math.min(windowWidth - 32, 768)
    : Math.min(windowWidth - 64, 880);

  // Compact width for auth, setup, & modal forms
  const formWidth = isMobile ? windowWidth : Math.min(windowWidth - 32, 480);

  return {
    windowWidth,
    windowHeight,
    contentWidth,
    formWidth,
    isMobile,
    isTablet,
    isDesktop,
    isWeb: Platform.OS === 'web',
  };
}
