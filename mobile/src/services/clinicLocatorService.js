/**
 * clinicLocatorService.js
 * Service for discovering nearby women's reproductive health, fertility,
 * and wellness clinics using OpenStreetMap's Overpass API.
 */

// Haversine formula to compute great-circle distance in kilometers
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// Category metadata definitions with theme colors and icons
export const CLINIC_CATEGORIES = {
  gynaecology: {
    id: 'gynaecology',
    label: 'Gynaecology & Obstetrics',
    shortLabel: 'Gynaecology',
    color: '#E11D48', // Vibrant Rose / Red
    badgeBg: '#FFE4E6',
    iconName: 'medkit',
    tagMatch: 'healthcare:speciality=gynaecology',
    description: 'Obstetrics, prenatal checks, Pap smears & reproductive examinations',
  },
  fertility: {
    id: 'fertility',
    label: 'Fertility & IVF Specialist',
    shortLabel: 'Fertility & IVF',
    color: '#7C3AED', // Royal Violet
    badgeBg: '#EDE9FE',
    iconName: 'sparkles',
    tagMatch: 'healthcare:speciality=fertility',
    description: 'IVF, fertility testing, egg freezing & reproductive endocrinology',
  },
  birthing_center: {
    id: 'birthing_center',
    label: 'Birthing Center & Maternity',
    shortLabel: 'Birthing Center',
    color: '#D97706', // Amber Gold
    badgeBg: '#FEF3C7',
    iconName: 'heart',
    tagMatch: 'healthcare=birthing_center',
    description: 'Specialized labor, delivery suites, midwifery & postpartum care',
  },
  sexual_health: {
    id: 'sexual_health',
    label: 'Sexual Health & Wellness',
    shortLabel: 'Sexual Health',
    color: '#0D9488', // Emerald Teal
    badgeBg: '#CCFBF1',
    iconName: 'shield-checkmark',
    tagMatch: 'healthcare:counselling=sexual_health',
    description: 'Contraception counseling, STI screening, hormone therapy & education',
  },
  clinic: {
    id: 'clinic',
    label: 'Clinic',
    shortLabel: 'Clinic',
    color: '#E11D48', // App Signature Rose Red
    badgeBg: '#FFE4E6',
    iconName: 'fitness',
    tagMatch: 'amenity=clinic',
    description: 'Comprehensive outpatient wellness, screenings & consultations',
  },
  hospital: {
    id: 'hospital',
    label: 'Hospital',
    shortLabel: 'Hospital',
    color: '#2563EB',
    badgeBg: '#DBEAFE',
    iconName: 'business',
    tagMatch: 'amenity=hospital',
    description: 'Hospital and medical services',
  },
};

/**
 * Determine clinic category based on OpenStreetMap tags and name keywords
 */
function categorizeOsmClinic(tags = {}) {
  const spec = (tags['healthcare:speciality'] || '').toLowerCase();
  const healthcare = (tags['healthcare'] || '').toLowerCase();
  const amenity = (tags['amenity'] || '').toLowerCase();
  const counselling = (tags['healthcare:counselling'] || '').toLowerCase();
  const name = (tags['name'] || tags['name:en'] || '').toLowerCase();

  if (spec.includes('fertility') || name.includes('fertility') || name.includes('ivf')) {
    return 'fertility';
  }
  if (
    spec.includes('gynaecology') ||
    spec.includes('gynecology') ||
    spec.includes('obstetrics') ||
    name.includes('gynaecolog') ||
    name.includes('gynecolog') ||
    name.includes('maternity') ||
    name.includes('women')
  ) {
    return 'gynaecology';
  }
  if (healthcare === 'birthing_center' || name.includes('birthing') || name.includes('birth center')) {
    return 'birthing_center';
  }
  if (healthcare === 'hospital' || amenity === 'hospital') {
    return 'hospital';
  }
  if (
    counselling.includes('sexual_health') ||
    name.includes('sexual health') ||
    name.includes('reproductive health') ||
    name.includes('wellness') ||
    name.includes('planned parenthood')
  ) {
    return 'sexual_health';
  }
  return 'clinic';
}

/**
 * Query Overpass API for mapped women's health facilities.
 */
export async function queryOverpassApi(lat, lng, radiusMeters = 10000) {
  const overpassQuery = `[out:json][timeout:20];
(
  nwr["healthcare:speciality"~"gynaecology|gynecology|obstetrics|fertility",i](around:${radiusMeters},${lat},${lng});
  nwr["healthcare"="birthing_center"](around:${radiusMeters},${lat},${lng});
  nwr["healthcare:counselling"="sexual_health"](around:${radiusMeters},${lat},${lng});
  nwr["amenity"~"clinic|hospital"]["name"~"women|matern|fertility|ivf|gynaec|gyneco|obstet|reproductive|sexual health|birthing",i](around:${radiusMeters},${lat},${lng});
  nwr["healthcare"~"clinic|hospital"]["name"~"women|matern|fertility|ivf|gynaec|gyneco|obstet|reproductive|sexual health|birthing",i](around:${radiusMeters},${lat},${lng});
);
out center;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(`${endpoint}?data=${encodeURIComponent(overpassQuery)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RedAppleHealthApp/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.elements && Array.isArray(json.elements)) {
          return json.elements;
        }
      }
    } catch (e) {
      // Continue to next endpoint if failed
    }
  }

  return null;
}

/**
 * Load named nearby health facilities from OpenStreetMap.
 */
export async function fetchNearbyWomenHealthFacilities(
  userLat,
  userLng,
  { targetCount = 10, initialRadiusMeters = 5000, maxRadiusMeters = 50000, onRadiusChange } = {}
) {
  const facilitiesByKey = new Map();
  const radii = [];
  for (let radius = initialRadiusMeters; radius < maxRadiusMeters; radius *= 2) {
    radii.push(radius);
  }
  if (radii[radii.length - 1] !== maxRadiusMeters) radii.push(maxRadiusMeters);

  let searchedRadiusMeters = initialRadiusMeters;
  let sourceUnavailable = false;
  for (const radiusMeters of radii) {
    searchedRadiusMeters = radiusMeters;
    onRadiusChange?.(radiusMeters / 1000);
    try {
      const osmElements = await queryOverpassApi(userLat, userLng, radiusMeters);
      if (!osmElements) {
        sourceUnavailable = true;
        break;
      }

      for (const el of osmElements) {
      const lat = el.lat || el.center?.lat;
      const lng = el.lon || el.center?.lon;
      if (lat == null || lng == null) continue;

      const tags = el.tags || {};
      const rawName = tags.name || tags['name:en'] || '';
      if (!rawName) continue;

      const category = categorizeOsmClinic(tags);
      const name = rawName;

      const key = `${name.toLowerCase()}-${lat.toFixed(3)}-${lng.toFixed(3)}`;
      if (facilitiesByKey.has(key)) continue;

      const distanceKm = calculateDistanceKm(userLat, userLng, lat, lng);

      // Extract address details
      const street = tags['addr:street'] ? `${tags['addr:housenumber'] ? tags['addr:housenumber'] + ' ' : ''}${tags['addr:street']}` : '';
      const city = tags['addr:city'] || tags['addr:town'] || '';
      const suburb = tags['addr:suburb'] || tags['addr:district'] || '';
      const address = [street, suburb, city].filter(Boolean).join(', ');

      facilitiesByKey.set(key, {
        id: `osm-${el.id}`,
        name,
        lat,
        lng,
        category,
        categoryLabel: CLINIC_CATEGORIES[category].label,
        address,
        phone: tags.phone || tags['contact:phone'] || null,
        openingHours: tags.opening_hours || null,
        city,
        website: tags.website || tags['contact:website'] || null,
        distanceKm,
        source: 'openstreetmap',
        sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      });
      }

      if (facilitiesByKey.size >= targetCount || radiusMeters === maxRadiusMeters) break;
    } catch (err) {
      console.warn('[ClinicLocatorService] OSM query error:', err.message);
    }
  }

  // Sort clinics ascending by proximity (closest first)
  const facilities = Array.from(facilitiesByKey.values()).sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    facilities,
    searchedRadiusKm: searchedRadiusMeters / 1000,
    targetCount,
    maxRadiusReached: searchedRadiusMeters >= maxRadiusMeters,
    sourceUnavailable,
  };
}
