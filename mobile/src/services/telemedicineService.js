import { apiRequest } from './apiClient';

const DEFAULT_TIMEOUT_MS = 12000;

/**
 * Fetch doctors directly from backend database API with optional specialty and search query
 */
export async function getDoctors(specialty = '', search = '') {
  try {
    const params = new URLSearchParams();
    if (specialty && specialty !== 'all') params.append('specialty', specialty);
    if (search) params.append('search', search);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest(`/telemedicine/doctors${queryStr}`, { method: 'GET' }, DEFAULT_TIMEOUT_MS);
    if (res && Array.isArray(res.doctors)) {
      return res.doctors;
    }
  } catch (err) {
    console.log('[TelemedicineService] Failed to fetch doctors from backend:', err.message);
  }
  return [];
}

/**
 * Fetch doctor profile with full reviews and slots from backend API
 */
export async function getDoctorDetails(doctorId) {
  try {
    const res = await apiRequest(`/telemedicine/doctors/${doctorId}`, { method: 'GET' }, DEFAULT_TIMEOUT_MS);
    if (res && res.doctor) {
      return res.doctor;
    }
  } catch (err) {
    console.log('[TelemedicineService] Failed to fetch doctor details:', err.message);
  }
  return null;
}

/**
 * Book a virtual consultation appointment on backend
 */
export async function bookConsultation({
  doctorId,
  slotId,
  scheduledTime,
  reason,
  symptomsNotes,
  consultationType = 'video',
}) {
  const res = await apiRequest(
    '/telemedicine/book',
    {
      method: 'POST',
      body: JSON.stringify({
        doctorId,
        slotId,
        scheduledTime,
        reason,
        symptomsNotes,
        consultationType,
      }),
    },
    DEFAULT_TIMEOUT_MS
  );
  if (res && res.booking) {
    return res.booking;
  }
  throw new Error(res?.message || 'Failed to complete consultation booking on server.');
}

/**
 * Fetch current user's bookings from backend
 */
export async function getUserBookings() {
  try {
    const res = await apiRequest('/telemedicine/bookings', { method: 'GET' }, DEFAULT_TIMEOUT_MS);
    if (res && Array.isArray(res.bookings)) {
      return res.bookings;
    }
  } catch (err) {
    console.log('[TelemedicineService] Failed to fetch user bookings:', err.message);
  }
  return [];
}

/** Fetch appointments assigned to the authenticated doctor's profile. */
export async function getDoctorBookings() {
  try {
    const res = await apiRequest('/telemedicine/doctor/bookings', { method: 'GET' }, DEFAULT_TIMEOUT_MS);
    if (res && Array.isArray(res.bookings)) {
      return res.bookings;
    }
  } catch (err) {
    console.log('[TelemedicineService] Failed to fetch doctor bookings:', err.message);
    throw err;
  }
  throw new Error('The server did not return doctor bookings.');
}

/**
 * Cancel a user booking
 */
export async function cancelBooking(bookingId) {
  const res = await apiRequest(`/telemedicine/bookings/${bookingId}/cancel`, { method: 'PATCH' }, DEFAULT_TIMEOUT_MS);
  if (res && res.booking) {
    return res.booking;
  }
  throw new Error(res?.message || 'Failed to cancel appointment on server.');
}

/**
 * Doctor completes a consultation with clinical notes & Rx summary
 */
export async function completeConsultation(bookingId, doctorNotes, prescriptionSummary) {
  const res = await apiRequest(
    `/telemedicine/bookings/${bookingId}/complete`,
    {
      method: 'PATCH',
      body: JSON.stringify({ doctorNotes, prescriptionSummary }),
    },
    DEFAULT_TIMEOUT_MS
  );
  if (res && res.booking) {
    return res.booking;
  }
  throw new Error(res?.message || 'Failed to complete consultation on server.');
}

/**
 * Doctor adds a new availability slot
 */
export async function addDoctorSlot(slotData) {
  const res = await apiRequest(
    '/telemedicine/slots',
    {
      method: 'POST',
      body: JSON.stringify(slotData),
    },
    DEFAULT_TIMEOUT_MS
  );
  if (res && res.slot) {
    return res.slot;
  }
  throw new Error(res?.message || 'Failed to add doctor slot on server.');
}

/**
 * Doctor toggles slot open/blocked
 */
export async function toggleDoctorSlot(slotId) {
  const res = await apiRequest(
    `/telemedicine/slots/${slotId}/toggle`,
    {
      method: 'PATCH',
    },
    DEFAULT_TIMEOUT_MS
  );
  if (res && res.slot) {
    return res.slot;
  }
  throw new Error(res?.message || 'Failed to toggle slot on server.');
}

/**
 * Fetch doctor's availability slots directly from backend database API for a specific date
 */
export async function getDoctorSlots(doctorId, date = '') {
  if (!doctorId) return [];
  try {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await apiRequest(`/telemedicine/doctors/${doctorId}/slots${query}`, { method: 'GET' }, DEFAULT_TIMEOUT_MS);
    if (res && Array.isArray(res.slots)) {
      return res.slots;
    }
  } catch (err) {
    console.log('[TelemedicineService] Failed to load doctor slots from server:', err.message);
  }
  return [];
}

/**
 * Fetch Stream Video credentials and authentication token from backend
 */
export async function getStreamToken(userId = '', userName = '', role = 'user') {
  try {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (userName) params.append('userName', userName);
    if (role) params.append('role', role);
    const queryStr = params.toString() ? `?${params.toString()}` : '';

    const res = await apiRequest(`/telemedicine/stream-token${queryStr}`, { method: 'GET' }, DEFAULT_TIMEOUT_MS);
    if (res && res.apiKey) {
      return res;
    }
  } catch (err) {
    console.log('[TelemedicineService] Failed to fetch stream token from server:', err.message);
  }
  return null;
}

/**
 * Fetch accredited partner clinics and hospitals from backend API
 */
export async function fetchPartnerClinics(params = {}) {
  try {
    const urlParams = new URLSearchParams();
    if (params.category && params.category !== 'all') urlParams.append('category', params.category);
    if (params.city && params.city !== 'all') urlParams.append('city', params.city);
    if (params.search) urlParams.append('search', params.search);

    const queryStr = urlParams.toString() ? `?${urlParams.toString()}` : '';
    const res = await apiRequest(`/telemedicine/clinics${queryStr}`, { method: 'GET' }, DEFAULT_TIMEOUT_MS);
    if (res && Array.isArray(res.clinics)) {
      return res.clinics;
    }
  } catch (err) {
    console.log('[TelemedicineService] Failed to fetch partner clinics:', err.message);
  }
  return [];
}

/**
 * Fetch single partner clinic by ID
 */
export async function fetchPartnerClinicById(clinicId) {
  try {
    const res = await apiRequest(`/telemedicine/clinics/${clinicId}`, { method: 'GET' }, DEFAULT_TIMEOUT_MS);
    if (res && res.clinic) {
      return res.clinic;
    }
  } catch (err) {
    console.log('[TelemedicineService] Failed to fetch partner clinic details:', err.message);
  }
  return null;
}
