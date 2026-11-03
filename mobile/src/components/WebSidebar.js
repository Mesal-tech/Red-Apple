import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * WebSidebar
 * Clean, elite, Apple/Linear-grade desktop navigation for Red Apple.
 * Pinned to the left viewport edge with zero clutter and optimal hierarchy.
 */
export default function WebSidebar({
  variant = 'patient', // 'patient' | 'doctor'
  currentPage = 0, // 0: Home | 1: Learn | 2: Telemed OR for doctor: 'queue' | 'slots' | 'records'
  onNavigateTab,
  onOpenAiCompanion,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  activeMode = 'cycle',
  onSwitchMode,
  user = null,
  onSignOut,
  isDoctor = false,
  onPreviewPatientView,
  activeQueueCount = 0,
}) {
  const [hoveredTab, setHoveredTab] = useState(null);
  const isPatient = variant === 'patient';

  // Navigation Items
  const patientNavItems = [
    {
      id: 0,
      label: 'Dashboard',
      iconActive: 'home',
      iconInactive: 'home-outline',
    },
    {
      id: 1,
      label: 'Learn & Insights',
      iconActive: 'book',
      iconInactive: 'book-outline',
    },
    {
      id: 2,
      label: 'Doctor Telemedicine',
      iconActive: 'videocam',
      iconInactive: 'videocam-outline',
      badge: 'Live',
      badgeColor: '#059669',
      badgeBg: '#ECFDF5',
    },
  ];

  const doctorNavItems = [
    {
      id: 'queue',
      label: 'Patient Queue',
      iconActive: 'videocam',
      iconInactive: 'videocam-outline',
      badge: activeQueueCount > 0 ? String(activeQueueCount) : null,
      badgeColor: '#FFFFFF',
      badgeBg: '#DC2626',
    },
    {
      id: 'slots',
      label: 'Availability & Slots',
      iconActive: 'calendar',
      iconInactive: 'calendar-outline',
    },
    {
      id: 'records',
      label: 'Clinical Records',
      iconActive: 'document-text',
      iconInactive: 'document-text-outline',
    },
  ];

  const navItems = isPatient ? patientNavItems : doctorNavItems;

  const modeBadge = () => {
    switch (activeMode) {
      case 'pregnancy':
        return { label: 'Pregnancy Journey', emoji: '🤰', color: '#D97706', bg: '#FFFBEB' };
      case 'postmenopause':
      case 'perimenopause':
        return { label: 'Menopause Wellness', emoji: '🌿', color: '#7C3AED', bg: '#F5F3FF' };
      default:
        return { label: 'Cycle Tracking', emoji: '🌸', color: '#DC2626', bg: '#FFF1F2' };
    }
  };

  const currentMode = modeBadge();

  const userName = isDoctor
    ? (user?.name ? (user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`) : 'Dr. Specialist')
    : (user?.name || 'Amara Okonkwo');

  const userRole = isDoctor ? 'Doctor / OB-GYN' : 'Patient';

  return (
    <View
      className="w-[245px] h-full bg-white border-r border-slate-200 flex-col justify-between z-50"
      style={Platform.select({
        web: {
          position: 'sticky',
          top: 0,
          height: '100vh',
          userSelect: 'none',
        },
        default: {},
      })}
    >
      {/* 1. BRAND HEADER */}
      <View className="px-[18px] pt-5 pb-4 border-b border-slate-100">
        <View className="flex-row items-center">
          <Image
            source={require('../../assets/icon.png')}
            className="w-[34px] h-[34px] rounded-lg mr-2.5"
            resizeMode="contain"
          />
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-base font-extrabold text-slate-900 tracking-tight">Red Apple</Text>
              {isDoctor && (
                <View className="bg-primary px-1.5 py-0.5 rounded ml-1.5">
                  <Text className="text-[9px] font-extrabold text-white">MD</Text>
                </View>
              )}
            </View>
            <Text className="text-[11px] text-slate-400 font-medium mt-0.5">Intelligent Women's Health</Text>
          </View>
        </View>

        {/* Subtle Health Mode Pill */}
        {isPatient && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSwitchMode && onSwitchMode('cycle')}
            className="flex-row items-center px-2.5 py-1.5 rounded-lg mt-3"
            style={{ backgroundColor: currentMode.bg }}
          >
            <Text className="text-xs mr-1.5">{currentMode.emoji}</Text>
            <Text className="text-[11px] font-bold" style={{ color: currentMode.color }}>
              {currentMode.label}
            </Text>
            <Ionicons name="swap-horizontal" size={12} color={currentMode.color} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. NAVIGATION LIST */}
      <ScrollView className="flex-1 px-3 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-[10px] font-bold text-slate-400 tracking-wider mb-1.5 px-2">MENU</Text>

        <View className="gap-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            const isHovered = hoveredTab === item.id;

            return (
              <TouchableOpacity
                key={String(item.id)}
                activeOpacity={0.7}
                onPress={() => onNavigateTab && onNavigateTab(item.id)}
                onMouseEnter={() => setHoveredTab(item.id)}
                onMouseLeave={() => setHoveredTab(null)}
                className={`flex-row items-center py-2 px-2.5 rounded-lg gap-2.5 ${
                  isActive ? 'bg-red-50' : isHovered ? 'bg-slate-50' : 'bg-transparent'
                }`}
              >
                <Ionicons
                  name={isActive ? item.iconActive : item.iconInactive}
                  size={19}
                  color={isActive ? colors.primary : '#64748B'}
                />
                <Text className={`text-[13px] flex-1 ${isActive ? 'text-primary font-bold' : 'text-slate-600 font-semibold'}`}>
                  {item.label}
                </Text>

                {item.badge && (
                  <View className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: item.badgeBg }}>
                    <Text className="text-[9px] font-extrabold" style={{ color: item.badgeColor }}>
                      {item.badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* AI Health Companion Dedicated Link */}
          {isPatient && onOpenAiCompanion && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onOpenAiCompanion}
              onMouseEnter={() => setHoveredTab('ai')}
              onMouseLeave={() => setHoveredTab(null)}
              className={`flex-row items-center py-2 px-2.5 rounded-lg gap-2.5 mt-1 border ${
                hoveredTab === 'ai' ? 'bg-red-100 border-red-200' : 'bg-red-50 border-red-100'
              }`}
            >
              <Ionicons name="sparkles" size={19} color="#DC2626" />
              <Text className="text-[13px] font-bold text-primary flex-1">AI Health Companion</Text>
              <View className="w-1.5 h-1.5 rounded-full bg-primary" />
            </TouchableOpacity>
          )}

          {/* Doctor Patient Preview Button */}
          {!isPatient && onPreviewPatientView && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onPreviewPatientView}
              className="flex-row items-center py-2 px-2.5 rounded-lg gap-2.5 mt-1 bg-emerald-50"
            >
              <Ionicons name="eye-outline" size={18} color="#059669" />
              <Text className="text-xs font-bold text-emerald-600">Patient Experience</Text>
              <Ionicons name="arrow-forward" size={13} color="#059669" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Secondary Links */}
        <Text className="text-[10px] font-bold text-slate-400 tracking-wider mb-1.5 px-2 mt-6">PREFERENCES</Text>
        <View className="gap-1">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenNotifications}
            className="flex-row items-center py-2 px-2.5 rounded-lg gap-2.5 bg-transparent"
          >
            <View className="relative">
              <Ionicons name="notifications-outline" size={19} color="#64748B" />
              {unreadNotificationsCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-primary rounded-full min-w-[12px] h-3 items-center justify-center px-0.5">
                  <Text className="text-[8px] font-extrabold text-white">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-[13px] font-semibold text-slate-600 flex-1">Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenProfile}
            className="flex-row items-center py-2 px-2.5 rounded-lg gap-2.5 bg-transparent"
          >
            <Ionicons name="person-outline" size={19} color="#64748B" />
            <Text className="text-[13px] font-semibold text-slate-600 flex-1">Health Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenSettings}
            className="flex-row items-center py-2 px-2.5 rounded-lg gap-2.5 bg-transparent"
          >
            <Ionicons name="settings-outline" size={19} color="#64748B" />
            <Text className="text-[13px] font-semibold text-slate-600 flex-1">Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 3. USER FOOTER */}
      <View className="flex-row items-center px-3.5 py-3 border-t border-slate-100 gap-2 bg-neutral-50">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onOpenProfile}
          className="flex-row items-center flex-1 gap-2 min-w-0"
        >
          <Image
            source={{
              uri:
                user?.avatar_url ||
                (isDoctor
                  ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
            }}
            className="w-8 h-8 rounded-full bg-slate-200"
          />
          <View className="flex-1 min-w-0">
            <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
              {userName}
            </Text>
            <Text className="text-[10px] font-medium text-slate-400" numberOfLines={1}>
              {userRole}
            </Text>
          </View>
        </TouchableOpacity>

        {onSignOut && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onSignOut}
            className="w-[30px] h-[30px] rounded-md items-center justify-center"
            title="Sign out"
          >
            <Ionicons name="log-out-outline" size={17} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
