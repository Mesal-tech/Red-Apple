import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  Linking,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import {
  fetchNearbyReproductiveClinics,
  CLINIC_CATEGORIES,
} from '../services/clinicLocatorService';

const DEFAULT_COORDS = { lat: 6.5244, lng: 3.3792 }; // Lagos default coordinates

/**
 * Generate clean, watermark-free Leaflet HTML
 * Uses Esri World Street Map with automatic OpenStreetMap failover
 * Features compact teardrop pins (18x24px) with crisp clinic/hospital name labels beside them
 */
function generateLeafletHtml(initialLat, initialLng, clinics = []) {
  const clinicsJson = JSON.stringify(clinics);
  const categoriesJson = JSON.stringify(CLINIC_CATEGORIES);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>Reproductive Health Clinics</title>
  
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    html, body, #map {
      width: 100%;
      height: 100%;
      background-color: #F8F9FA;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Reset default Leaflet divIcon square boxes and borders */
    .leaflet-div-icon,
    .apple-style-pin,
    .user-pin-div {
      background: transparent !important;
      border: none !important;
    }

    /* Minimalist Pulsing User Location Marker */
    .user-loc-container {
      position: relative;
      width: 20px;
      height: 20px;
    }
    .user-loc-halo {
      position: absolute;
      top: -8px;
      left: -8px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(220, 38, 38, 0.22);
      animation: pulse-ring 2.2s infinite cubic-bezier(0.2, 0.6, 0.35, 1);
    }
    .user-loc-dot {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #DC2626;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(220, 38, 38, 0.45);
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 0.9; }
      80% { transform: scale(1.4); opacity: 0; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    /* Compact Teardrop Pin with Clinic/Hospital Name beside it */
    .clinic-pin-wrap {
      cursor: pointer;
      user-select: none;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-origin: 9px 24px;
      white-space: nowrap;
    }
    .clinic-pin-row {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .clinic-pin-svg {
      width: 18px;
      height: 24px;
      flex-shrink: 0;
      display: block;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
    }
    .clinic-name-label {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      color: #FFFFFF;
      font-size: 11.5px;
      font-weight: 700;
      line-height: 14px;
      letter-spacing: 0.2px;
      padding: 0;
      margin-left: 2px;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      pointer-events: none;
      -webkit-text-stroke: 1px #000000;
      paint-order: stroke fill;
      text-shadow:
        -1px -1px 0 #000000,
         1px -1px 0 #000000,
        -1px  1px 0 #000000,
         1px  1px 0 #000000,
         0   -1px 0 #000000,
         0    1px 0 #000000,
        -1px  0   0 #000000,
         1px  0   0 #000000,
         0    1px 3px rgba(0, 0, 0, 0.95);
      transition: transform 0.18s ease;
    }
    .clinic-pin-wrap:hover,
    .clinic-pin-wrap:active,
    .clinic-pin-wrap.pin-selected {
      transform: scale(1.15);
      z-index: 99999 !important;
    }
    .clinic-pin-wrap.pin-selected .clinic-name-label {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      color: #FFFFFF;
      font-weight: 800;
      -webkit-text-stroke: 1.2px #000000;
      paint-order: stroke fill;
      text-shadow:
        -1px -1px 0 #000000,
         1px -1px 0 #000000,
        -1px  1px 0 #000000,
         1px  1px 0 #000000,
         0    0   6px rgba(220, 38, 38, 0.9);
    }
    .clinic-pin-wrap.pin-selected .clinic-pin-svg {
      filter: drop-shadow(0 4px 8px rgba(220, 38, 38, 0.6));
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    const clinics = ${clinicsJson};
    const categories = ${categoriesJson};
    let map = null;
    let selectedPinEl = null;

    function sendMessage(payload) {
      const msg = JSON.stringify(payload);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent) {
        window.parent.postMessage(msg, '*');
      }
    }

    function initMap() {
      // Offset initial view slightly north so user position and pins are centered in open area below top header
      map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true,
      }).setView([${initialLat} - 0.006, ${initialLng}], 13);

      // 1. High-Resolution Satellite Aerial Photography (Snap Map aesthetic)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '&copy; Esri, Maxar',
      }).addTo(map);

      // 2. Hybrid Roads & Highways Overlay
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        opacity: 0.9,
      }).addTo(map);

      // 3. Boundaries & City/Place Names Reference Overlay
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        opacity: 0.95,
      }).addTo(map);

      // User location marker (Pulsing Apple Red dot)
      const userIcon = L.divIcon({
        className: 'user-pin-div',
        html: '<div class="user-loc-container"><div class="user-loc-halo"></div><div class="user-loc-dot"></div></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([${initialLat}, ${initialLng}], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

      // Render clinic pins
      clinics.forEach((clinic) => {
        const cat = categories[clinic.category] || categories.clinic;
        const color = clinic.isPartner ? '#DC2626' : (cat.color || '#E11D48');
        const cleanName = (clinic.name || 'Clinic')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

        const pinHtml = \`
          <div class="clinic-pin-wrap" id="pin-\${clinic.id}">
            <div class="clinic-pin-row">
              <svg class="clinic-pin-svg" width="18" height="24" viewBox="0 0 18 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 0C4.029 0 0 4.029 0 9C0 15.2 7.9 22.8 8.6 23.5C8.8 23.7 9.2 23.7 9.4 23.5C10.1 22.8 18 15.2 18 9C18 4.029 13.971 0 9 0Z" fill="\${color}"/>
                <circle cx="9" cy="8.5" r="4.5" fill="#FFFFFF"/>
                <path d="M8.2 5.8h1.6v5.4h-1.6z" fill="\${color}"/>
                <path d="M6.3 7.7h5.4v1.6H6.3z" fill="\${color}"/>
              </svg>
              <span class="clinic-name-label">\${cleanName}</span>
            </div>
          </div>
        \`;

        const pinIcon = L.divIcon({
          className: 'apple-style-pin',
          html: pinHtml,
          iconSize: null,
          iconAnchor: [9, 24],
        });

        const marker = L.marker([clinic.lat, clinic.lng], { icon: pinIcon }).addTo(map);

        marker.on('click', (e) => {
          if (e && e.originalEvent) {
            e.originalEvent._pinClicked = true;
          }
          if (selectedPinEl) {
            selectedPinEl.classList.remove('pin-selected');
          }
          const pinEl = document.getElementById('pin-' + clinic.id);
          if (pinEl) {
            pinEl.classList.add('pin-selected');
            selectedPinEl = pinEl;
          }
          map.panTo([clinic.lat - 0.005, clinic.lng], { animate: true, duration: 0.5 });
          sendMessage({ type: 'SELECT_CLINIC', clinic });
        });
      });

      // Tap on map background to dismiss selected card
      map.on('click', (e) => {
        if (!e.originalEvent || !e.originalEvent._pinClicked) {
          if (selectedPinEl) {
            selectedPinEl.classList.remove('pin-selected');
            selectedPinEl = null;
          }
          sendMessage({ type: 'DESELECT_CLINIC' });
        }
      });
    }

    // Exposed map controls
    window.recenterOnUser = function() {
      if (map) {
        map.flyTo([${initialLat} - 0.006, ${initialLng}], 13.5, { duration: 0.8 });
      }
    };
    window.zoomIn = function() {
      if (map) map.zoomIn();
    };
    window.zoomOut = function() {
      if (map) map.zoomOut();
    };

    window.onload = initMap;
  </script>
</body>
</html>`;
}

export default function LeafletClinicsMap({ style, onBookDoctor, onClinicsLoaded }) {
  const [userLocation, setUserLocation] = useState(DEFAULT_COORDS);
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const inlineWebViewRef = useRef(null);
  const expandedWebViewRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      let coords = DEFAULT_COORDS;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          };
          if (isMounted) setUserLocation(coords);
        }
      } catch (_) {}

      try {
        const data = await fetchNearbyReproductiveClinics(coords.lat, coords.lng, 10000);
        if (isMounted) {
          setClinics(data);
          if (onClinicsLoaded) onClinicsLoaded(data);
        }
      } catch (_) {}
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

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

  const triggerMapAction = (funcName) => {
    const script = `window.${funcName} && window.${funcName}(); true;`;
    if (Platform.OS === 'web') {
      try {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((ifr) => {
          if (ifr.contentWindow && ifr.contentWindow[funcName]) {
            ifr.contentWindow[funcName]();
          }
        });
      } catch (_) {}
    } else {
      inlineWebViewRef.current?.injectJavaScript(script);
      expandedWebViewRef.current?.injectJavaScript(script);
    }
  };

  const handleRecenter = () => triggerMapAction('recenterOnUser');
  const handleZoomIn = () => triggerMapAction('zoomIn');
  const handleZoomOut = () => triggerMapAction('zoomOut');

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_CLINIC') {
        setSelectedClinic(data.clinic);
      } else if (data.type === 'DESELECT_CLINIC') {
        setSelectedClinic(null);
      }
    } catch (_) {}
  };

  // Support Web iframe messaging
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWebMsg = (e) => {
        try {
          const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (data && data.type) {
            handleWebViewMessage({ nativeEvent: { data: JSON.stringify(data) } });
          }
        } catch (_) {}
      };
      window.addEventListener('message', handleWebMsg);
      return () => window.removeEventListener('message', handleWebMsg);
    }
  }, []);

  const htmlContent = useMemo(() => {
    return generateLeafletHtml(userLocation.lat, userLocation.lng, clinics);
  }, [userLocation, clinics]);

  return (
    <View style={[styles.container, style]}>
      {/* PURE LEAFLET MAP CANVAS */}
      {Platform.OS === 'web' ? (
        <iframe
          srcDoc={htmlContent}
          style={styles.webIframe}
          title="Leaflet Map"
        />
      ) : (
        <WebView
          key="clean-map-hero-v5"
          ref={inlineWebViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={false}
          geolocationEnabled={true}
          onMessage={handleWebViewMessage}
          style={styles.webView}
          scrollEnabled={false}
          scalesPageToFit={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          androidLayerType="hardware"
        />
      )}

      {/* CLEAN FLOATING ACTION BUTTONS (Bottom Right of Map) */}
      <View style={styles.floatingActionsGroup}>
        {/* RECENTER GPS BUTTON */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.floatingActionBtn}
          onPress={handleRecenter}
        >
          <Ionicons name="locate" size={18} color="#DC2626" />
        </TouchableOpacity>

        {/* EXPAND TO FULLSCREEN */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.floatingActionBtn}
          onPress={() => setIsExpanded(true)}
        >
          <Ionicons name="expand" size={16} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* SLEEK FLOATING CLINIC CARD (Opens when any pin is tapped) */}
      {selectedClinic && (
        <View style={styles.selectedClinicCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleCol}>
              <Text style={styles.cardClinicName} numberOfLines={1}>
                {selectedClinic.name}
              </Text>
              <Text style={styles.cardClinicSub} numberOfLines={1}>
                {selectedClinic.categoryLabel} • {selectedClinic.distanceKm} km away
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.cardCloseBtn}
              onPress={() => setSelectedClinic(null)}
            >
              <Ionicons name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.cardClinicAddress} numberOfLines={1}>
            {selectedClinic.address}
          </Text>

          <View style={styles.cardButtonsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.cardDirectionsBtn}
              onPress={() => openDirections(selectedClinic.lat, selectedClinic.lng, selectedClinic.name)}
            >
              <Ionicons name="navigate" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.cardDirectionsBtnText}>Directions</Text>
            </TouchableOpacity>

            {onBookDoctor && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.cardBookBtn}
                onPress={() => {
                  setSelectedClinic(null);
                  onBookDoctor({
                    name: selectedClinic.leadDoctor || 'Lead Clinic Specialist',
                    specialty: selectedClinic.categoryLabel || 'Reproductive Specialist',
                    hospital: selectedClinic.name,
                  });
                }}
              >
                <Text style={styles.cardBookBtnText}>Consult</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* FULLY EXPANDED MAP MODAL                                                  */}
      {/* ========================================================================= */}
      <Modal
        visible={isExpanded}
        animationType="fade"
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.expandedContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              srcDoc={htmlContent}
              style={styles.webIframe}
              title="Expanded Leaflet Map"
            />
          ) : (
            <WebView
              key="clean-map-modal-v4"
              ref={expandedWebViewRef}
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              cacheEnabled={false}
              geolocationEnabled={true}
              onMessage={handleWebViewMessage}
              style={styles.webView}
              scrollEnabled={false}
              scalesPageToFit={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
              androidLayerType="hardware"
            />
          )}

          {/* FLOATING TOP BAR IN FULLSCREEN */}
          <View style={styles.expandedTopBar}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.expandedCircleBtn}
              onPress={() => setIsExpanded(false)}
            >
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>

            <View style={styles.expandedTitlePill}>
              <Text style={styles.expandedTitlePillText}>Nearby Clinics ({clinics.length})</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.expandedCircleBtn}
              onPress={handleRecenter}
            >
              <Ionicons name="locate" size={19} color="#DC2626" />
            </TouchableOpacity>
          </View>

          {/* FLOATING ZOOM CONTROLS IN FULLSCREEN */}
          <View style={styles.expandedActionsGroup}>
            <View style={styles.zoomPillGroup}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.zoomHalfBtn}
                onPress={handleZoomIn}
              >
                <Ionicons name="add" size={19} color="#1F2937" />
              </TouchableOpacity>
              <View style={styles.zoomDivider} />
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.zoomHalfBtn}
                onPress={handleZoomOut}
              >
                <Ionicons name="remove" size={19} color="#1F2937" />
              </TouchableOpacity>
            </View>
          </View>

          {/* SELECTED CLINIC CARD IN FULLSCREEN */}
          {selectedClinic && (
            <View style={[styles.selectedClinicCard, styles.selectedClinicCardFullscreen]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleCol}>
                  <Text style={styles.cardClinicName} numberOfLines={1}>
                    {selectedClinic.name}
                  </Text>
                  <Text style={styles.cardClinicSub} numberOfLines={1}>
                    {selectedClinic.categoryLabel} • {selectedClinic.distanceKm} km away
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.cardCloseBtn}
                  onPress={() => setSelectedClinic(null)}
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.cardClinicAddress} numberOfLines={2}>
                {selectedClinic.address}
              </Text>

              <View style={styles.cardButtonsRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.cardDirectionsBtn}
                  onPress={() => openDirections(selectedClinic.lat, selectedClinic.lng, selectedClinic.name)}
                >
                  <Ionicons name="navigate" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.cardDirectionsBtnText}>Get Directions</Text>
                </TouchableOpacity>

                {onBookDoctor && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.cardBookBtn}
                    onPress={() => {
                      setIsExpanded(false);
                      setSelectedClinic(null);
                      onBookDoctor({
                        name: selectedClinic.leadDoctor || 'Lead Clinic Specialist',
                        specialty: selectedClinic.categoryLabel || 'Reproductive Specialist',
                        hospital: selectedClinic.name,
                      });
                    }}
                  >
                    <Text style={styles.cardBookBtnText}>Book Telemed</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#F8F9FA',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },

  /* Floating Action Buttons */
  floatingActionsGroup: {
    position: 'absolute',
    bottom: 26,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  floatingActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 4,
  },

  /* Sleek Floating Clinic Card */
  selectedClinicCard: {
    position: 'absolute',
    bottom: 26,
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    zIndex: 35,
  },
  selectedClinicCardFullscreen: {
    bottom: Platform.OS === 'ios' ? 36 : 24,
    left: 16,
    right: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  cardClinicName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cardClinicSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 2,
  },
  cardCloseBtn: {
    padding: 4,
    marginTop: -2,
    marginRight: -4,
  },
  cardClinicAddress: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 10,
  },
  cardButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDirectionsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    paddingVertical: 8,
    borderRadius: 12,
  },
  cardDirectionsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardBookBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Expanded Fullscreen View */
  expandedContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  expandedTopBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  expandedActionsGroup: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 68 : 108,
    right: 16,
    zIndex: 50,
  },
  zoomPillGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
    alignItems: 'center',
  },
  zoomHalfBtn: {
    width: 38,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  expandedCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 5,
  },
  expandedTitlePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  expandedTitlePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
});
