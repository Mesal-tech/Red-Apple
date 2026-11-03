import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import LearnScreen from '../screens/LearnScreen';
import DoctorCareScreen from '../screens/DoctorCareScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import PartnerClinicsScreen from '../screens/PartnerClinicsScreen';

const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation }) {
  const { isDarkMode, theme } = useTheme();
  const currentRoute = state.routes[state.index];
  const descriptor = descriptors[currentRoute.key];

  // Overlay / hide the floating bottom bar on AI Companion and Partner Clinics screens
  if (
    descriptor?.options?.tabBarStyle?.display === 'none' ||
    currentRoute?.name === 'AICompanion' ||
    currentRoute?.name === 'Clinics'
  ) {
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
              <Ionicons
                name={iconName}
                size={21}
                color={
                  isFocused
                    ? (isDarkMode ? '#161616' : '#FFFFFF')
                    : (isDarkMode ? '#ABABAB' : '#1E293B')
                }
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabNavigator({
  onSignOut,
  initialMode = 'cycle',
  healthProfile = null,
  onRedoSetup,
}) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneContainerStyle: { backgroundColor: theme.background },
        }}
      >
        <Tab.Screen name="Home">
          {(props) => (
            <HomeScreen
              {...props}
              onSignOut={onSignOut}
              initialMode={initialMode}
              healthProfile={healthProfile}
              onRedoSetup={onRedoSetup}
              onOpenAIAssistant={() => props.navigation.navigate('AICompanion')}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="AICompanion"
          component={AIAssistantScreen}
          options={{
            tabBarStyle: { display: 'none' },
          }}
        />

        <Tab.Screen name="Learn" component={LearnScreen} />

        <Tab.Screen name="Clinics">
          {(props) => (
            <PartnerClinicsScreen
              {...props}
              onBookDoctor={(doc) => props.navigation.navigate('Telemed', { selectedDoctor: doc })}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Telemed">
          {(props) => (
            <DoctorCareScreen
              {...props}
              onNavigateHome={() => props.navigation.navigate('Home')}
              onOpenAIAssistant={() => props.navigation.navigate('AICompanion')}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

