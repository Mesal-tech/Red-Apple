import { useWindowDimensions, Platform } from 'react-native';

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 820,
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
  const isWide = windowWidth >= BREAKPOINTS.tablet;
  const isDesktop = windowWidth >= BREAKPOINTS.desktop;
  const sidebarWidth = isWide ? 248 : 0;
  const availableWidth = Math.max(0, windowWidth - sidebarWidth);

  // Maximum content boundary for readable, proportional UI
  const contentWidth = isMobile
    ? availableWidth
    : Math.min(availableWidth - (isWide ? 48 : 32), isDesktop ? 1440 : 960);

  // Compact width for auth, setup, & modal forms
  const formWidth = isMobile ? availableWidth : Math.min(availableWidth - 32, 480);

  return {
    windowWidth,
    windowHeight,
    availableWidth,
    contentWidth,
    formWidth,
    sidebarWidth,
    isMobile,
    isTablet,
    isWide,
    isDesktop,
    isWeb: Platform.OS === 'web',
  };
}
