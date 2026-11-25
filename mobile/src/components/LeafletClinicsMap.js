import React, { useRef, useMemo, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  View,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';

const DEFAULT_COORDS = { lat: 6.5244, lng: 3.3792 }; // Lagos coordinates

/**
 * Generate a custom clinic-map aesthetic:
 * - Slate Carto tiles with legible labels and roads
 * - Blue pulsing current-location beacon
 * - Dark, red-accented healthcare pins
 * - Smooth camera movements and offset for bottom sheet visibility
 */
function generateLeafletHtml(initialLat, initialLng, clinics = [], minZoom = 3, maxZoom = 18, showUserLocation = true, darkMode = true) {
  const clinicsJson = JSON.stringify(clinics);
  const tileLayerUrl = darkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const tileAttribution = '&copy; OpenStreetMap contributors &copy; CARTO';
  const userMarker = showUserLocation
    ? `L.marker([${initialLat}, ${initialLng}], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>Nearby Health Facilities Map</title>
  
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
      background-color: ${darkMode ? '#111820' : '#E9EEF0'};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .leaflet-div-icon,
    .custom-map-pin,
    .user-pin-div {
      background: transparent !important;
      border: none !important;
    }

    /* Blue, high-contrast current-location beacon */
    .user-loc-container {
      position: relative;
      width: 24px;
      height: 24px;
    }
    .user-loc-halo {
      position: absolute;
      top: -12px;
      left: -12px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(50, 143, 255, 0.25);
      animation: pulse-ring 2.4s infinite cubic-bezier(0.2, 0.6, 0.35, 1);
    }
    .user-loc-dot {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #328FFF;
      border: 3.5px solid #FFFFFF;
      box-shadow: 0 2px 12px rgba(50, 143, 255, 0.75);
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 0.95; }
      75% { transform: scale(1.45); opacity: 0; }
      100% { transform: scale(1.45); opacity: 0; }
    }

    /* White Teardrop Custom Pin with Avatar / Healthcare Icon */
    .clinic-pin-marker {
      position: relative;
      width: 42px;
      height: 52px;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      user-select: none;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      filter: drop-shadow(0 5px 12px rgba(0, 0, 0, 0.42));
    }
    .clinic-pin-bubble {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #171D24;
      border: 2px solid #F05252;
      box-shadow: 0 0 0 4px rgba(240, 82, 82, 0.13), 0 3px 10px rgba(0, 0, 0, 0.38);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      z-index: 2;
    }
    .clinic-pin-avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      display: block;
    }
    .clinic-pin-icon-wrap {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #252D35;
      color: #FF7771;
    }
    .clinic-pin-pointer {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid #F05252;
      margin-top: -3px;
      z-index: 1;
    }
    .clinic-pin-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #F05252;
      margin-top: 1px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .clinic-pin-marker.pin-selected {
      transform: scale(1.22);
      z-index: 99999 !important;
      filter: drop-shadow(0 6px 14px rgba(220, 38, 38, 0.35));
    }
    .clinic-pin-marker.pin-selected .clinic-pin-bubble {
      border-color: #FF7771;
      background: #E34442;
      box-shadow: 0 0 0 5px rgba(240, 82, 82, 0.28), 0 0 22px rgba(240, 82, 82, 0.28);
    }
    .clinic-pin-marker.pin-selected .clinic-pin-icon-wrap svg { stroke: #FFFFFF !important; }
    .clinic-pin-marker.pin-selected .clinic-pin-pointer {
      border-top-color: #E34442;
    }
    .clinic-pin-marker.pin-selected .clinic-pin-dot {
      background: #FFFFFF;
    }
    .leaflet-control-attribution {
      background: rgba(15, 20, 26, 0.76) !important;
      color: #AAB4BF !important;
      border-radius: 8px 0 0 0;
      padding: 3px 7px !important;
      font-size: 9px !important;
      backdrop-filter: blur(8px);
    }
    .leaflet-control-attribution a { color: #F47A73 !important; }
    .dark-tile-fallback { filter: invert(1) hue-rotate(180deg) brightness(.72) saturate(.65) !important; }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    const clinics = ${clinicsJson};
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
      // Offset slightly north so pins and user location stay clearly visible above bottom sheet
      map = L.map('map', {
        zoomControl: false,
        attributionControl: true,
        fadeAnimation: true,
        zoomAnimation: true,
        minZoom: ${minZoom},
        maxZoom: ${maxZoom},
        bounceAtZoomLimits: false,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
      }).setView([${initialLat} - 0.005, ${initialLng}], 13);

      // Carto's dark map gives the clinic pins a clearer, custom-feeling contrast.
      const primaryTileLayer = L.tileLayer('${tileLayerUrl}', {
        minZoom: ${minZoom},
        maxZoom: ${maxZoom},
        attribution: '${tileAttribution}',
      }).addTo(map);

      primaryTileLayer.on('tileerror', function() {
        if (!window._hasFallenBack) {
          window._hasFallenBack = true;
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: ${minZoom},
            maxZoom: ${maxZoom},
            attribution: '&copy; OpenStreetMap contributors',
            className: '${darkMode ? 'dark-tile-fallback' : ''}',
          }).addTo(map);
        }
      });

      // Blue location halo with a crisp white center ring.
      const userIcon = L.divIcon({
        className: 'user-pin-div',
        html: '<div class="user-loc-container"><div class="user-loc-halo"></div><div class="user-loc-dot"></div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      ${userMarker}

      // Red Apple red healthcare icons for clinics without a portrait.
      const ICONS = {
        hospital: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF7771" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 10h6"/><path d="M12 7v6"/></svg>',
        fertility: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 12a10 10 0 0 0 19.8 0z"/><path d="M12 12v9.9"/></svg>',
        maternity: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
        doctor: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>',
      };

      // Render clinic pins
      clinics.forEach((clinic, idx) => {
        const id = clinic.id || clinic.clinic_id || 'clinic-' + idx;
        let innerContent = '';
        if (clinic.category === 'fertility') {
          innerContent = \`<div class="clinic-pin-icon-wrap" style="background:#F5F3FF;color:#7C3AED;">\${ICONS.fertility}</div>\`;
        } else if (clinic.category === 'birthing_center') {
          innerContent = \`<div class="clinic-pin-icon-wrap" style="background:#FFF1F2;color:#DC2626;">\${ICONS.maternity}</div>\`;
        } else {
          innerContent = \`<div class="clinic-pin-icon-wrap">\${ICONS.hospital}</div>\`;
        }

        const dotColor = '#F05252';

        const pinHtml = \`
          <div class="clinic-pin-marker" id="pin-\${id}">
            <div class="clinic-pin-bubble">
              \${innerContent}
            </div>
            <div class="clinic-pin-pointer"></div>
            <div class="clinic-pin-dot" style="background:\${dotColor};"></div>
          </div>
        \`;

        const pinIcon = L.divIcon({
          className: 'custom-map-pin',
          html: pinHtml,
          iconSize: [42, 52],
          iconAnchor: [21, 52],
        });

        const marker = L.marker([clinic.lat, clinic.lng], { icon: pinIcon }).addTo(map);

        marker.on('click', (e) => {
          if (e && e.originalEvent) {
            e.originalEvent._pinClicked = true;
          }
          if (selectedPinEl) {
            selectedPinEl.classList.remove('pin-selected');
          }
          const pinEl = document.getElementById('pin-' + id);
          if (pinEl) {
            pinEl.classList.add('pin-selected');
            selectedPinEl = pinEl;
          }
          map.panTo([clinic.lat - 0.004, clinic.lng], { animate: true, duration: 0.5 });
          sendMessage({ type: 'SELECT_CLINIC', clinic });
        });
      });

      // Tap on map background
      map.on('click', (e) => {
        if (!e.originalEvent || !e.originalEvent._pinClicked) {
          if (selectedPinEl) {
            selectedPinEl.classList.remove('pin-selected');
            selectedPinEl = null;
          }
          sendMessage({ type: 'MAP_TAP' });
        }
      });
    }

    // Exposed map controls
    window.recenterOnUser = function() {
      if (map) {
        map.flyTo([${initialLat} - 0.005, ${initialLng}], 13.5, { duration: 0.8 });
      }
    };

    window.panToClinic = function(lat, lng, id) {
      if (selectedPinEl) {
        selectedPinEl.classList.remove('pin-selected');
      }
      const pinEl = document.getElementById('pin-' + id);
      if (pinEl) {
        pinEl.classList.add('pin-selected');
        selectedPinEl = pinEl;
      }
      if (map) {
        map.flyTo([lat - 0.004, lng], 14, { duration: 0.8 });
      }
    };

    window.zoomIn = function() {
      if (map) map.zoomIn();
    };

    window.zoomOut = function() {
      if (map) map.zoomOut();
    };

    window.addEventListener('message', function(event) {
      const command = event.data;
      if (!command || command.type !== 'MAP_CONTROL') return;
      if (command.action === 'recenter') window.recenterOnUser();
      if (command.action === 'zoomIn') window.zoomIn();
      if (command.action === 'zoomOut') window.zoomOut();
      if (command.action === 'select' && command.clinic) {
        window.panToClinic(command.clinic.lat, command.clinic.lng, command.clinic.id || command.clinic.clinic_id);
      }
    });

    window.onload = initMap;
  </script>
</body>
</html>`;
}

const LeafletClinicsMap = forwardRef(function LeafletClinicsMap(
  {
    clinics = [],
    userLocation = null,
    onSelectClinic,
    onMapTap,
    minZoom = 3,
    maxZoom = 18,
    darkMode = true,
    style,
  },
  ref
) {
  const webViewRef = useRef(null);
  const isWeb = Platform.OS === 'web';

  const sendMapCommand = (script, webCommand) => {
    if (isWeb) {
      webViewRef.current?.contentWindow?.postMessage({ type: 'MAP_CONTROL', ...webCommand }, '*');
    } else {
      webViewRef.current?.injectJavaScript(script);
    }
  };

  // Expose methods to parent screen via ref
  useImperativeHandle(ref, () => ({
    recenterOnUser: () => {
      const script = 'window.recenterOnUser && window.recenterOnUser(); true;';
      sendMapCommand(script, { action: 'recenter' });
    },
    panToClinic: (clinic) => {
      if (!clinic || !clinic.lat || !clinic.lng) return;
      const id = clinic.id || clinic.clinic_id;
      const script = `window.panToClinic && window.panToClinic(${clinic.lat}, ${clinic.lng}, '${id}'); true;`;
      sendMapCommand(script, { action: 'select', clinic });
    },
    zoomIn: () => {
      sendMapCommand('window.zoomIn && window.zoomIn(); true;', { action: 'zoomIn' });
    },
    zoomOut: () => {
      sendMapCommand('window.zoomOut && window.zoomOut(); true;', { action: 'zoomOut' });
    },
  }));

  const handleWebViewMessage = (event) => {
    try {
      const rawData = event.nativeEvent?.data ?? event.data;
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (data.type === 'SELECT_CLINIC') {
        if (onSelectClinic) onSelectClinic(data.clinic);
      } else if (data.type === 'MAP_TAP') {
        if (onMapTap) onMapTap();
      }
    } catch (_) {}
  };

  const mapLocation = userLocation || DEFAULT_COORDS;
  const htmlContent = useMemo(() => {
    return generateLeafletHtml(mapLocation.lat, mapLocation.lng, clinics, minZoom, maxZoom, Boolean(userLocation), darkMode);
  }, [mapLocation.lat, mapLocation.lng, clinics, minZoom, maxZoom, userLocation, darkMode]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return undefined;
    const onFrameMessage = (event) => {
      if (event.source !== webViewRef.current?.contentWindow) return;
      handleWebViewMessage(event);
    };
    window.addEventListener('message', onFrameMessage);
    return () => window.removeEventListener('message', onFrameMessage);
  }, [isWeb, onSelectClinic, onMapTap]);

  return (
    <View className="w-full h-full relative bg-gray-100" style={style}>
      {isWeb ? (
        React.createElement('iframe', {
          ref: webViewRef,
          title: 'Nearby health facilities map',
          srcDoc: htmlContent,
          onMessage: handleWebViewMessage,
          frameBorder: '0',
          scrolling: 'no',
          style: {
            display: 'block',
            width: '100%',
            height: '100%',
            border: 0,
            backgroundColor: '#F8F9FA',
          },
        })
      ) : (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={false}
          geolocationEnabled={true}
          onMessage={handleWebViewMessage}
          className="flex-1 bg-transparent"
          scrollEnabled={false}
          scalesPageToFit={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          androidLayerType="hardware"
        />
      )}
    </View>
  );
});

export default LeafletClinicsMap;
