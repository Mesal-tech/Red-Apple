import React from 'react';
import { View, Text, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import ResponsiveScreenFrame from '../components/ResponsiveScreenFrame';
import { BREAKPOINTS } from '../utils/responsive';
import HomeScreen from '../screens/HomeScreen';
import LearnScreen from '../screens/LearnScreen';
import DoctorCareScreen from '../screens/DoctorCareScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import PartnerClinicsScreen from '../screens/PartnerClinicsScreen';

const Tab = createBottomTabNavigator();

const wideNavigation = [
  { name: 'Home', label: 'Home', icon: 'home-outline', section: 'Overview' },
  { name: 'AICompanion', label: 'AI Companion', icon: 'sparkles-outline', section: 'Care' },
  { name: 'Telemed', label: 'Doctor Care', icon: 'medkit-outline', section: 'Care' },
  { name: 'Clinics', label: 'Partner Clinics', icon: 'location-outline', section: 'Explore' },
  { name: 'Learn', label: 'Learn & Insights', icon: 'book-outline', section: 'Explore' },
];

export function WideAppSidebar({ navigation, currentRoute, user }) {
  const { theme, isDarkMode } = useTheme();
  const userName = user?.name?.trim() || user?.full_name?.trim() || 'Your profile';
  const avatarUrl = user?.avatar_url || user?.photo_url || user?.profile_image_url || user?.profile_picture_url || user?.profile_picture;
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RA';
  return (
    <View style={{ width: 248, flexShrink: 0, height: '100%', backgroundColor: theme.background, paddingHorizontal: 14, paddingTop: 28, paddingBottom: 16, borderRightWidth: 1, borderRightColor: theme.cardBorder }}>
      <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, marginBottom: 40 }}>
        {isDarkMode ? (
          <Image source={require('../../assets/logo_white.png')} resizeMode="contain" style={{ width: 34, height: 34 }} />
        ) : (
          <Image source={require('../../assets/logo_red.png')} resizeMode="contain" style={{ width: 34, height: 34 }} />
        )}
        <View>
          <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '700', letterSpacing: -0.3 }}>Red Apple</Text>
          <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 2 }}>HEALTH</Text>
        </View>
      </TouchableOpacity>
      {['Overview', 'Care', 'Explore'].map((section) => (
        <View key={section} style={{ marginBottom: 24 }}>
          <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 10, marginBottom: 8 }}>{section}</Text>
          {wideNavigation.filter((item) => item.section === section).map((item) => {
            const active = currentRoute === item.name;
            return (
              <TouchableOpacity key={item.name} onPress={() => navigation.navigate('MainTabs', { screen: item.name })} activeOpacity={0.78} accessibilityRole="button" accessibilityState={{ selected: active }}
                style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 11, borderRadius: 11, marginBottom: 3, backgroundColor: active ? theme.subtleSurface : 'transparent' }}>
                <Ionicons name={item.icon} size={18} color={active ? '#D84440' : theme.textMuted} />
                <Text style={{ color: active ? theme.textPrimary : theme.textSecondary, fontSize: 13, fontWeight: active ? '600' : '400' }}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8} accessibilityState={{ selected: currentRoute === 'Profile' }} style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 11, backgroundColor: currentRoute === 'Profile' ? theme.subtleSurface : 'transparent' }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: isDarkMode ? '#3F151B' : '#FCE9E7' }}>
          {avatarUrl ? <Image source={{ uri: avatarUrl }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: isDarkMode ? '#FDA4AF' : '#D84440', fontSize: 12, fontWeight: '800' }}>{initials}</Text>}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: theme.textPrimary, fontSize: 12, fontWeight: '600' }}>{userName}</Text>
          <Text numberOfLines={1} style={{ color: theme.textMuted, fontSize: 10, marginTop: 2 }}>Account & settings</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation, isWide }) {
  const { isDarkMode, theme } = useTheme();
  const currentRoute = state.routes[state.index];
  const descriptor = descriptors[currentRoute.key];

  // Overlay / hide the floating bottom bar on AI Companion and Partner Clinics screens
  if (isWide || (
    descriptor?.options?.tabBarStyle?.display === 'none' ||
    currentRoute?.name === 'AICompanion' ||
    currentRoute?.name === 'Clinics'
  )) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isDarkMode ? '#2B2B2B' : '#FFFFFF',
          borderRadius: 40,
          paddingHorizontal: 8,
          paddingVertical: 6,
          width: 310,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDarkMode ? 0.35 : 0.12,
          shadowRadius: 16,
          elevation: 10,
          borderWidth: 1,
          borderColor: isDarkMode ? '#363636' : 'rgba(0, 0, 0, 0.05)',
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          let iconName = 'home-outline';
          let accessibilityLabel = 'Home';

          if (route.name === 'Home') {
            iconName = isFocused ? 'home' : 'home-outline';
            accessibilityLabel = 'Home';
          } else if (route.name === 'AICompanion') {
            iconName = isFocused ? 'sparkles' : 'sparkles-outline';
            accessibilityLabel = 'AI Companion';
          } else if (route.name === 'Learn') {
            iconName = isFocused ? 'book' : 'book-outline';
            accessibilityLabel = 'Learn & Insights';
          } else if (route.name === 'Clinics') {
            iconName = isFocused ? 'location' : 'location-outline';
            accessibilityLabel = 'Clinic Locator';
          } else if (route.name === 'Telemed') {
            iconName = isFocused ? 'medkit' : 'medkit-outline';
            accessibilityLabel = 'Doctor Care';
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              onPress={onPress}
              accessibilityLabel={accessibilityLabel}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: isFocused
                  ? (isDarkMode ? '#FFFFFF' : '#111827')
                  : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {route.name === 'AICompanion' ? (
                <Image
                  source={require('../../assets/dr_red_ai_icon.png')}
                  accessibilityLabel="Dr. Red AI"
                  resizeMode="cover"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    borderWidth: 1.5,
                    borderColor: isDarkMode ? '#BFC5C4' : '#FFFFFF',
                    opacity: isFocused ? 1 : 0.95,
                  }}
                />
              ) : (
                <Ionicons
                  name={iconName}
                  size={21}
                  color={
                    isFocused
                      ? (isDarkMode ? '#161616' : '#FFFFFF')
                      : (isDarkMode ? '#ABABAB' : '#1E293B')
                  }
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabNavigator({
  navigation,
  user,
  onSignOut,
  initialMode = 'cycle',
  healthProfile = null,
  onRedoSetup,
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINTS.tablet;
  const mainTabRoute = navigation.getState()?.routes?.find((route) => route.name === 'MainTabs');
  const currentRoute = mainTabRoute?.state?.routes?.[mainTabRoute?.state?.index]?.name;

  return (
    <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column', backgroundColor: theme.background }}>
      {isWide && <WideAppSidebar navigation={navigation} currentRoute={currentRoute} user={user} />}
      <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} isWide={isWide} />}
        screenOptions={{
          headerShown: false,
          sceneContainerStyle: { backgroundColor: theme.background },
        }}
      >
        <Tab.Screen name="Home">
          {(props) => (
            <ResponsiveScreenFrame>
              <HomeScreen
                {...props}
                onSignOut={onSignOut}
                initialMode={initialMode}
                healthProfile={healthProfile}
                onRedoSetup={onRedoSetup}
                onOpenAIAssistant={() => props.navigation.navigate('AICompanion')}
              />
            </ResponsiveScreenFrame>
          )}
        </Tab.Screen>

        <Tab.Screen name="Learn">
          {(props) => <ResponsiveScreenFrame><LearnScreen {...props} /></ResponsiveScreenFrame>}
        </Tab.Screen>

        <Tab.Screen name="Clinics">
          {(props) => (
            <ResponsiveScreenFrame>
              <PartnerClinicsScreen
                {...props}
                onBookDoctor={(doc) => props.navigation.navigate('Telemed', { selectedDoctor: doc })}
              />
            </ResponsiveScreenFrame>
          )}
        </Tab.Screen>

        <Tab.Screen name="Telemed">
          {(props) => (
            <ResponsiveScreenFrame>
              <DoctorCareScreen
                {...props}
                onNavigateHome={() => props.navigation.navigate('Home')}
                onOpenAIAssistant={() => props.navigation.navigate('AICompanion')}
              />
            </ResponsiveScreenFrame>
          )}
        </Tab.Screen>

        <Tab.Screen
          name="AICompanion"
          children={(props) => <ResponsiveScreenFrame><AIAssistantScreen {...props} /></ResponsiveScreenFrame>}
          options={{
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tab.Navigator>
      </View>
    </View>
  );
}

