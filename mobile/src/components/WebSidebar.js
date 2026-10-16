import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
    <View style={styles.sidebar}>
      {/* 1. BRAND HEADER */}
      <View style={styles.brandSection}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.brandTitle}>Red Apple</Text>
              {isDoctor && (
                <View style={styles.clinicTag}>
                  <Text style={styles.clinicTagText}>MD</Text>
                </View>
              )}
            </View>
            <Text style={styles.brandSubtitle}>Intelligent Women's Health</Text>
          </View>
        </View>

        {/* Subtle Health Mode Pill */}
        {isPatient && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSwitchMode && onSwitchMode('cycle')}
            style={[styles.modePill, { backgroundColor: currentMode.bg }]}
          >
            <Text style={styles.modeEmoji}>{currentMode.emoji}</Text>
            <Text style={[styles.modeLabel, { color: currentMode.color }]}>
              {currentMode.label}
            </Text>
            <Ionicons name="swap-horizontal" size={12} color={currentMode.color} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. NAVIGATION LIST */}
      <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.groupHeading}>MENU</Text>

        <View style={styles.navGroup}>
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
                style={[
                  styles.navItem,
                  isActive && styles.navItemActive,
                  !isActive && isHovered && styles.navItemHover,
                ]}
              >
                <Ionicons
                  name={isActive ? item.iconActive : item.iconInactive}
                  size={19}
                  color={isActive ? colors.primary : '#64748B'}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>

                {item.badge && (
                  <View style={[styles.badgePill, { backgroundColor: item.badgeBg }]}>
                    <Text style={[styles.badgeText, { color: item.badgeColor }]}>
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
              style={[
                styles.navItem,
                styles.aiNavItem,
                hoveredTab === 'ai' && styles.aiNavItemHover,
              ]}
            >
              <Ionicons name="sparkles" size={19} color="#DC2626" />
              <Text style={styles.aiNavLabel}>AI Health Companion</Text>
              <View style={styles.aiDot} />
            </TouchableOpacity>
          )}

          {/* Doctor Patient Preview Button */}
          {!isPatient && onPreviewPatientView && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onPreviewPatientView}
              style={[styles.navItem, styles.previewNavItem]}
            >
              <Ionicons name="eye-outline" size={18} color="#059669" />
              <Text style={styles.previewNavLabel}>Patient Experience</Text>
              <Ionicons name="arrow-forward" size={13} color="#059669" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Secondary Links */}
        <Text style={[styles.groupHeading, { marginTop: 24 }]}>PREFERENCES</Text>
        <View style={styles.navGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenNotifications}
            style={styles.navItem}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons name="notifications-outline" size={19} color="#64748B" />
              {unreadNotificationsCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.navLabel}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenProfile}
            style={styles.navItem}
          >
            <Ionicons name="person-outline" size={19} color="#64748B" />
            <Text style={styles.navLabel}>Health Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenSettings}
            style={styles.navItem}
          >
            <Ionicons name="settings-outline" size={19} color="#64748B" />
            <Text style={styles.navLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 3. USER FOOTER */}
      <View style={styles.userFooter}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onOpenProfile}
          style={styles.userRow}
        >
          <Image
            source={{
              uri:
                user?.avatar_url ||
                (isDoctor
                  ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
            }}
            style={styles.userAvatar}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.userRole} numberOfLines={1}>
              {userRole}
            </Text>
          </View>
        </TouchableOpacity>

        {onSignOut && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onSignOut}
            style={styles.signOutBtn}
            title="Sign out"
          >
            <Ionicons name="log-out-outline" size={17} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 245,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 50,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        height: '100vh',
        userSelect: 'none',
      },
      default: {},
    }),
  },

  /* BRAND SECTION */
  brandSection: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  clinicTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  clinicTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  modeEmoji: {
    fontSize: 12,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* NAVIGATION */
  navScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  groupHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  navGroup: {
    gap: 3,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
    gap: 10,
  },
  navItemActive: {
    backgroundColor: '#FFF1F2',
  },
  navItemHover: {
    backgroundColor: '#F8FAFC',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  aiNavItem: {
    marginTop: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  aiNavItemHover: {
    backgroundColor: '#FEE2E2',
  },
  aiNavLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    flex: 1,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  previewNavItem: {
    marginTop: 4,
    backgroundColor: '#F0FDF4',
  },
  previewNavLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: colors.primary,
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* USER FOOTER */
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  userRole: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
  },
  signOutBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
