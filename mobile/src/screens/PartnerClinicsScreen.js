import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  StatusBar,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AppBottomSheet from '../components/AppBottomSheet';
import LeafletClinicsMap from '../components/LeafletClinicsMap';
import { SkeletonPulse } from '../components/DoctorCareSkeleton';
import {
  fetchNearbyWomenHealthFacilities,
  CLINIC_CATEGORIES,
} from '../services/clinicLocatorService';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_COORDS = { lat: 6.5244, lng: 3.3792 }; // Lagos default coordinates

// Bottom Sheet Dimensions: Peek mode sized generously for standard typography
const PEEK_HEIGHT = 205;
const EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.85);

const CATEGORIES = [
  { id: 'all', label: 'All facilities', icon: 'apps-outline', color: '#111827' },
  { id: 'gynaecology', label: 'Gynaecology & OB', icon: 'medkit-outline', color: '#DC2626' },
  { id: 'fertility', label: 'Fertility & IVF', icon: 'sparkles-outline', color: '#7C3AED' },
  { id: 'birthing_center', label: 'Birthing Center', icon: 'heart-outline', color: '#D97706' },
  { id: 'sexual_health', label: 'Sexual health', icon: 'shield-checkmark-outline', color: '#0D9488' },
  { id: 'clinic', label: 'Clinics', icon: 'medkit-outline', color: '#E11D48' },
  { id: 'hospital', label: 'Hospitals', icon: 'business-outline', color: '#2563EB' },
];

/**
 * Skeleton Card for Expanded List
 */
const ClinicCardSkeleton = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 }}>
    <SkeletonPulse style={{ width: 80, height: 80, borderRadius: 16 }} />
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <SkeletonPulse style={{ width: '75%', height: 16, borderRadius: 6, marginBottom: 8 }} />
      <SkeletonPulse style={{ width: '45%', height: 13, borderRadius: 4, marginBottom: 8 }} />
      <SkeletonPulse style={{ width: '60%', height: 13, borderRadius: 4, marginBottom: 10 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SkeletonPulse style={{ width: 80, height: 14, borderRadius: 4 }} />
        <SkeletonPulse style={{ width: 95, height: 28, borderRadius: 14 }} />
      </View>
    </View>
  </View>
);

/**
 * Skeleton Card for Peek Mode
 */
const ClinicPeekSkeleton = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(248, 250, 252, 0.95)', borderRadius: 20, padding: 12, gap: 14 }}>
    <SkeletonPulse style={{ width: 76, height: 76, borderRadius: 16 }} />
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <SkeletonPulse style={{ width: '70%', height: 16, borderRadius: 6, marginBottom: 8 }} />
      <SkeletonPulse style={{ width: '45%', height: 13, borderRadius: 4, marginBottom: 8 }} />
      <SkeletonPulse style={{ width: '60%', height: 13, borderRadius: 4 }} />
    </View>
    <SkeletonPulse style={{ width: 42, height: 42, borderRadius: 21 }} />
  </View>
);

export default function PartnerClinicsScreen({ navigation, onBookDoctor }) {
  const { isDarkMode, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topSafe = Math.max(insets?.top || 0, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44) + 8;
  const bottomSafe = Math.max(insets?.bottom || 0, Platform.OS === 'ios' ? 24 : 16);

  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [detailsClinic, setDetailsClinic] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState(5);
  const [sourceUnavailable, setSourceUnavailable] = useState(false);

  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const sheetHeight = useRef(new Animated.Value(PEEK_HEIGHT)).current;
  const currentHeightRef = useRef(PEEK_HEIGHT);

  useEffect(() => {
    const id = sheetHeight.addListener(({ value }) => {
      currentHeightRef.current = value;
    });
    return () => sheetHeight.removeListener(id);
  }, [sheetHeight]);

  const expandSheet = useCallback(() => {
    setIsExpanded(true);
    Animated.spring(sheetHeight, {
      toValue: EXPANDED_HEIGHT,
      bounciness: 4,
      useNativeDriver: false,
    }).start();
  }, [sheetHeight]);

  const collapseSheet = useCallback(() => {
    setIsExpanded(false);
    Animated.spring(sheetHeight, {
      toValue: PEEK_HEIGHT,
      bounciness: 4,
      useNativeDriver: false,
    }).start();
  }, [sheetHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        let newH = currentHeightRef.current - gestureState.dy;
        if (newH < PEEK_HEIGHT - 30) newH = PEEK_HEIGHT - 30;
        if (newH > EXPANDED_HEIGHT + 20) newH = EXPANDED_HEIGHT + 20;
        sheetHeight.setValue(newH);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50 || gestureState.vy < -0.5) {
          expandSheet();
        } else if (gestureState.dy > 50 || gestureState.vy > 0.5) {
          collapseSheet();
        } else {
          if (currentHeightRef.current > (EXPANDED_HEIGHT + PEEK_HEIGHT) / 2) {
            expandSheet();
          } else {
            collapseSheet();
          }
        }
      },
    })
  ).current;

  // Load Clinics Data
  const loadData = useCallback(async (requestedCoords) => {
    setLoading(true);

    try {
      let coords = requestedCoords;
      if (!coords) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationDenied(true);
          setSourceUnavailable(false);
          setClinics([]);
          setSelectedClinic(null);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
      setLocationDenied(false);
      setUserLocation(coords);
      const searchResult = await fetchNearbyWomenHealthFacilities(coords.lat, coords.lng, {
        onRadiusChange: setSearchRadiusKm,
      }).catch(() => ({ facilities: [], searchedRadiusKm: 50, sourceUnavailable: true }));
      setSearchRadiusKm(searchResult.searchedRadiusKm);
      setSourceUnavailable(searchResult.sourceUnavailable);
      const mergedList = searchResult.facilities.map((facility) => ({
        ...facility,
        categoryLabel: facility.categoryLabel || CLINIC_CATEGORIES[facility.category]?.label || 'Health facility',
      }));
      mergedList.sort((a, b) => a.distanceKm - b.distanceKm);
      setClinics(mergedList);

      setSelectedClinic(mergedList[0] || null);
    } catch (err) {
      console.warn('[PartnerClinicsScreen] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        await loadData(coords);
        mapRef.current?.recenterOnUser();
      } else {
        setLocationDenied(true);
        Linking.openSettings().catch(() => {});
      }
    } catch (_) {
    } finally {
      setIsLocating(false);
    }
  };

  const filteredClinics = useMemo(() => {
    let result = [...clinics];

    if (selectedCategory !== 'all') {
      result = result.filter((c) => c.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q) ||
          c.categoryLabel.toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [clinics, selectedCategory, searchQuery]);

  const handleSelectClinic = (clinic) => {
    setSelectedClinic(clinic);
    mapRef.current?.panToClinic(clinic);
  };

  const openDirections = (lat, lng, name) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(name)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(name)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  const callClinic = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
  };

  const activeClinic = selectedClinic || filteredClinics[0];

  return (
    <View className="flex-1 bg-white relative">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {/* ========================================================================= */}
      {/* 1. FULL-SCREEN VECTOR MAP CANVAS                                          */}
      {/* ========================================================================= */}
      <View className="absolute inset-0">
        <LeafletClinicsMap
          ref={mapRef}
          clinics={filteredClinics}
          userLocation={userLocation}
          onSelectClinic={(c) => {
            setSelectedClinic(c);
          }}
          onMapTap={() => {
            if (isExpanded) collapseSheet();
          }}
        />
      </View>

      {/* ========================================================================= */}
      {/* 2. TOP FLOATING ACTION BAR                                                */}
      {/* ========================================================================= */}
      <View
        className="absolute left-4 right-4 z-30 flex-row items-center justify-between"
        style={{ top: topSafe }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (navigation && navigation.canGoBack()) {
              navigation.goBack();
            } else if (navigation) {
              navigation.navigate('Home');
            }
          }}
          className="w-11 h-11 rounded-full shadow-md border items-center justify-center"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
        >
          <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              expandSheet();
              setTimeout(() => {
                searchInputRef.current?.focus();
              }, 300);
            }}
            className="w-11 h-11 rounded-full shadow-md border items-center justify-center"
            style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          >
            <Ionicons name="search" size={19} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (!isExpanded) expandSheet();
              else collapseSheet();
            }}
            className="w-11 h-11 rounded-full shadow-md border items-center justify-center ml-2"
            style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          >
            <Ionicons name="options-outline" size={19} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 3. FLOATING LOCATE GPS BUTTON (Above Bottom Sheet on the Right)            */}
      {/* ========================================================================= */}
      <Animated.View
        className="absolute right-4 z-30"
        style={{
          bottom: Animated.add(sheetHeight, new Animated.Value(14)),
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleLocateMe}
          className="w-12 h-12 rounded-full shadow-xl items-center justify-center"
          style={{ backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={isDarkMode ? '#000000' : '#FFFFFF'} />
          ) : (
            <Ionicons name="locate" size={22} color={isDarkMode ? '#000000' : '#FFFFFF'} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ========================================================================= */}
      {/* 4. DOCKED BOTTOM SHEET WITH CLEAN, ELEGANT CLINIC CARDS                   */}
      {/* ========================================================================= */}
      <Animated.View
        className="absolute left-0 right-0 bottom-0 shadow-2xl z-40 overflow-hidden"
        style={{
          height: sheetHeight,
          paddingBottom: bottomSafe,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.cardBorder,
        }}
      >
        {/* DRAG HANDLE & HEADER BAR */}
        <View {...panResponder.panHandlers} className="w-full pt-2.5 pb-2 px-5" style={{ backgroundColor: theme.card }}>
          <View className="w-full items-center justify-center py-1">
            <View className="w-11 h-1.5 rounded-full" style={{ backgroundColor: isDarkMode ? '#525252' : '#D1D5DB' }} />
          </View>

          <View className="flex-row items-center justify-between mt-1">
            <View className="flex-row items-center gap-2.5">
              <Text style={{ fontSize: 19, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.3 }}>
                {isExpanded ? 'Nearby health facilities' : 'Nearby facilities'}
              </Text>
              {loading ? (
                <SkeletonPulse style={{ width: 32, height: 20, borderRadius: 10 }} />
              ) : (
                <View style={{ backgroundColor: isDarkMode ? '#363636' : '#F1F5F9', paddingHorizontal: 9, paddingVertical: 2.5, borderRadius: 9999 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textSecondary }}>
                    {filteredClinics.length}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (isExpanded) collapseSheet();
                else expandSheet();
              }}
              className="p-2"
            >
              <Ionicons
                name={isExpanded ? 'chevron-down' : 'chevron-up'}
                size={24}
                color={theme.textPrimary}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})}
            className="mt-1 px-0.5"
          >
            <Text style={{ fontSize: 10, color: theme.textSecondary }}>
              {loading
                ? `Searching up to ${searchRadiusKm} km · `
                : searchRadiusKm
                ? `Searched within ${searchRadiusKm} km · `
                : ''}Map listings © OpenStreetMap contributors
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR (Expanded Mode) */}
        {isExpanded && (
          <View className="px-5 pb-2.5" style={{ backgroundColor: theme.card }}>
            <View
              className="flex-row items-center rounded-2xl px-4 py-3 border"
              style={{
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
              }}
            >
              <Ionicons name="search" size={20} color={theme.textSecondary} />
              <TextInput
                ref={searchInputRef}
                className="flex-1 ml-2.5 text-base font-medium py-0"
                style={{ color: theme.textPrimary }}
                placeholder="Search clinics by name or specialty..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* CATEGORY CHIPS (Expanded Mode) */}
        {isExpanded && (
          <View className="pb-3" style={{ backgroundColor: theme.card }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCategory(cat.id)}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: isSelected
                        ? (isDarkMode ? '#FFFFFF' : '#000000')
                        : (isDarkMode ? '#363636' : '#F1F5F9'),
                    }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{
                        color: isSelected
                          ? (isDarkMode ? '#000000' : '#FFFFFF')
                          : (isDarkMode ? '#ABABAB' : '#475569'),
                      }}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* BODY: MINIMAL, BEAUTIFUL CARDS & SKELETONS                             */}
        {/* --------------------------------------------------------------------- */}
        {!isExpanded ? (
          /* =================================================================== */
          /* PEEK MODE: CLEAN BENTO CARD (With skeleton & empty states)          */
          /* =================================================================== */
          <View className="flex-1 px-5 pt-0.5 justify-center">
            {loading ? (
              <ClinicPeekSkeleton />
            ) : activeClinic ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setDetailsClinic(activeClinic)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDarkMode ? '#212121' : 'rgba(248, 250, 252, 0.95)',
                  borderRadius: 20,
                  padding: 12,
                  gap: 12,
                }}
              >
                <View style={{ width: 76, height: 76, borderRadius: 20, backgroundColor: isDarkMode ? '#263532' : '#EAF1EF', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={activeClinic.category === 'hospital' ? 'business-outline' : 'medkit-outline'} size={30} color="#173D36" />
                </View>

                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary, flex: 1 }}
                      numberOfLines={1}
                    >
                      {activeClinic.name}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626', marginTop: 2 }} numberOfLines={1}>
                    {activeClinic.categoryLabel}
                  </Text>

                  <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                    {activeClinic.address} • {activeClinic.distanceKm} km
                  </Text>
                </View>

                <View style={{ paddingLeft: 4 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? '#FFFFFF' : '#000000', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-forward" size={16} color={isDarkMode ? '#000000' : '#FFFFFF'} />
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#212121' : '#F8FAFC', borderRadius: 18, padding: 12, gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? '#3A1E22' : '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>No clinics found</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>Tap to expand and adjust filters</Text>
                </View>
                <TouchableOpacity
                  onPress={expandSheet}
                  style={{ backgroundColor: isDarkMode ? '#FFFFFF' : '#000000', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#000000' : '#FFFFFF' }}>Filters</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* =================================================================== */
          /* EXPANDED MODE: FLUSH CARDS, SKELETON LOADERS, AND EMPTY STATES      */
          /* =================================================================== */
          <ScrollView
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {loading ? (
              /* SKELETON LOADER (Replaces spinner) */
              <View>
                {[1, 2, 3, 4].map((item, idx) => (
                  <View key={item}>
                    <ClinicCardSkeleton />
                    {idx < 3 && <View style={{ height: 1, backgroundColor: theme.cardBorder, marginVertical: 2 }} />}
                  </View>
                ))}
              </View>
            ) : filteredClinics.length === 0 ? (
              /* ============================================================= */
              /* EMPTY STATE: CLEAR & ACTIONABLE WHEN NO CLINIC IS FOUND       */
              /* ============================================================= */
              <View className="py-12 items-center justify-center px-6">
                <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: isDarkMode ? '#3A1E22' : '#FEF2F2' }}>
                  <Ionicons
                    name={
                      searchQuery
                        ? 'search-outline'
                        : selectedCategory !== 'all'
                        ? 'filter-outline'
                        : 'business-outline'
                    }
                    size={36}
                    color="#DC2626"
                  />
                </View>

                <Text className="text-lg font-extrabold text-center" style={{ color: theme.textPrimary }}>
                  {locationDenied && !searchQuery && selectedCategory === 'all'
                    ? 'Share your location to find care nearby'
                    : sourceUnavailable && !searchQuery && selectedCategory === 'all'
                    ? 'Nearby directory is unavailable'
                    : searchQuery
                    ? `No clinics matching "${searchQuery}"`
                    : selectedCategory !== 'all'
                    ? 'No clinics in this category'
                    : 'No nearby facilities found'}
                </Text>

                <Text style={{ maxWidth: 280, color: theme.textSecondary }} className="text-xs text-center mt-2 leading-relaxed">
                  {locationDenied && !searchQuery && selectedCategory === 'all'
                    ? 'Allow location access to find clinics and hospitals near you.'
                    : sourceUnavailable && !searchQuery && selectedCategory === 'all'
                    ? 'We could not reach the public clinic directory. Check your connection and retry.'
                    : searchQuery
                    ? 'Try checking for spelling errors, searching for a broader specialty or district.'
                    : selectedCategory !== 'all'
                    ? 'No mapped facilities in this category appear nearby. Try another category or consult virtually.'
                    : "No named clinics or hospitals appeared in the nearby map data. Try searching another area or consult virtually."}
                </Text>

                <View className="flex-row items-center gap-3 mt-6">
                  {locationDenied ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleLocateMe}
                      className="flex-row items-center px-5 py-3 rounded-full gap-2"
                      style={{ backgroundColor: '#101B1A' }}
                    >
                      <Ionicons name="location" size={15} color="#FFFFFF" />
                      <Text className="text-xs font-bold text-white">Enable location</Text>
                    </TouchableOpacity>
                  ) : searchQuery || selectedCategory !== 'all' ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="flex-row items-center px-5 py-3 rounded-full shadow-xs gap-2"
                      style={{ backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }}
                    >
                      <Ionicons name="refresh" size={15} color={isDarkMode ? '#000000' : '#FFFFFF'} />
                      <Text className="text-xs font-bold" style={{ color: isDarkMode ? '#000000' : '#FFFFFF' }}>Reset filters</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => loadData()}
                      className="flex-row items-center px-5 py-3 rounded-full shadow-xs gap-2"
                      style={{ backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }}
                    >
                      <Ionicons name="reload" size={15} color={isDarkMode ? '#000000' : '#FFFFFF'} />
                      <Text className="text-xs font-bold" style={{ color: isDarkMode ? '#000000' : '#FFFFFF' }}>Retry search</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (onBookDoctor) {
                        onBookDoctor();
                      } else if (navigation) {
                        navigation.navigate('Telemed');
                      }
                    }}
                    className="flex-row items-center px-5 py-3 rounded-full border gap-2"
                    style={{
                      backgroundColor: isDarkMode ? '#363636' : '#F1F5F9',
                      borderColor: theme.cardBorder,
                    }}
                  >
                    <Ionicons name="videocam" size={15} color={theme.textPrimary} />
                    <Text className="text-xs font-bold" style={{ color: theme.textPrimary }}>Virtual consult</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              filteredClinics.map((clinic, idx) => {
                const isSelected = selectedClinic?.id === clinic.id;

                return (
                  <View key={clinic.id || idx}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        handleSelectClinic(clinic);
                        setDetailsClinic(clinic);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        gap: 12,
                        backgroundColor: isSelected ? (isDarkMode ? 'rgba(220, 38, 38, 0.2)' : 'rgba(254, 242, 242, 0.5)') : 'transparent',
                        borderRadius: 16,
                        marginHorizontal: isSelected ? -8 : 0,
                        paddingHorizontal: isSelected ? 8 : 0,
                      }}
                    >
                      {/* Left: Compact Thumbnail with Rating */}
                      <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: isDarkMode ? '#263532' : '#EAF1EF', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={clinic.category === 'hospital' ? 'business-outline' : 'medkit-outline'} size={26} color="#173D36" />
                      </View>

                      {/* Right: Clean, Well-Proportioned Details */}
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text
                            style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary, flex: 1 }}
                            numberOfLines={1}
                          >
                            {clinic.name}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626', marginTop: 2 }} numberOfLines={1}>
                          {clinic.categoryLabel}
                        </Text>

                        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                          {clinic.address}
                        </Text>

                        {/* Bottom Row: Distance & Action Button */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, flex: 1, marginRight: 6 }} numberOfLines={1}>
                            📍 {clinic.distanceKm} km away
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#FFFFFF' : '#101B1A', paddingHorizontal: 13, paddingVertical: 6.5, borderRadius: 9999, gap: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Details</Text>
                            <Ionicons name="arrow-forward" size={11} color={isDarkMode ? '#000000' : '#FFFFFF'} />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Clean hairline bottom divider between items (No all-round border) */}
                    {idx < filteredClinics.length - 1 && (
                      <View style={{ height: 1, backgroundColor: theme.cardBorder, marginVertical: 2 }} />
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* ========================================================================= */}
      {/* 5. CLINIC DETAILS BOTTOM SHEET (Opens when any card is tapped)            */}
      {/* ========================================================================= */}
      <AppBottomSheet
        visible={Boolean(detailsClinic)}
        onClose={() => setDetailsClinic(null)}
        title={detailsClinic?.name}
        subtitle={
          detailsClinic
            ? `${detailsClinic.categoryLabel} • ${detailsClinic.distanceKm} km away`
            : null
        }
        maxHeight="88%"
      >
        {detailsClinic && (
          <View className="pb-6">
            <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: isDarkMode ? '#263532' : '#EAF1EF' }}>
              <View className="w-14 h-14 rounded-2xl bg-white/80 items-center justify-center mb-4">
                <Ionicons name={detailsClinic.category === 'hospital' ? 'business-outline' : 'medkit-outline'} size={27} color="#173D36" />
              </View>
              <Text className="text-base font-bold" style={{ color: theme.textPrimary }}>{detailsClinic.categoryLabel}</Text>
              <Text className="text-sm mt-1" style={{ color: theme.textSecondary }}>{detailsClinic.distanceKm} km from your location</Text>
              <Text className="text-xs mt-3" style={{ color: theme.textSecondary }}>Community map listing · OpenStreetMap</Text>
            </View>

            <View className="flex-row items-center gap-3 mb-4">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => openDirections(detailsClinic.lat, detailsClinic.lng, detailsClinic.name)}
                className="flex-1 flex-row items-center justify-center py-4 rounded-full"
                style={{ backgroundColor: '#101B1A' }}
              >
                <Ionicons name="navigate" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text className="text-sm font-bold text-white">Directions</Text>
              </TouchableOpacity>
              {detailsClinic.phone ? (
                <TouchableOpacity activeOpacity={0.8} onPress={() => callClinic(detailsClinic.phone)} className="flex-1 flex-row items-center justify-center py-4 rounded-full" style={{ backgroundColor: isDarkMode ? '#363636' : '#F1F3F5' }}>
                  <Ionicons name="call" size={17} color={theme.textPrimary} style={{ marginRight: 8 }} />
                  <Text className="text-sm font-bold" style={{ color: theme.textPrimary }}>Call</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View className="rounded-2xl p-4 gap-3" style={{ backgroundColor: isDarkMode ? '#212121' : '#F7F8F7' }}>
              {detailsClinic.address ? (
                <View className="flex-row items-start">
                  <Ionicons name="location-outline" size={18} color="#173D36" style={{ marginRight: 10, marginTop: 1 }} />
                  <Text className="text-sm font-medium flex-1" style={{ color: theme.textPrimary }}>{detailsClinic.address}</Text>
                </View>
              ) : null}
              {detailsClinic.openingHours ? (
                <View className="flex-row items-start">
                  <Ionicons name="time-outline" size={18} color="#173D36" style={{ marginRight: 10, marginTop: 1 }} />
                  <Text className="text-sm font-medium flex-1" style={{ color: theme.textPrimary }}>{detailsClinic.openingHours}</Text>
                </View>
              ) : null}
            </View>

            <Text className="text-xs leading-5 mt-4 px-1" style={{ color: theme.textSecondary }}>
              Details come from OpenStreetMap and may be incomplete or out of date. Please confirm with the facility before visiting.
            </Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => Linking.openURL(detailsClinic.sourceUrl).catch(() => {})}
              className="flex-row items-center mt-3 px-1"
            >
              <Text className="text-sm font-bold" style={{ color: '#173D36' }}>View map listing</Text>
              <Ionicons name="open-outline" size={15} color="#173D36" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            {detailsClinic.website ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => Linking.openURL(detailsClinic.website).catch(() => {})}
                className="flex-row items-center mt-3 px-1"
              >
                <Text className="text-sm font-bold" style={{ color: '#173D36' }}>Facility website</Text>
                <Ionicons name="open-outline" size={15} color="#173D36" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </AppBottomSheet>
    </View>
  );
}
