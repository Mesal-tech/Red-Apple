import { apiRequest } from './apiClient';

/**
 * Initializes a Paystack transaction for a consultation booking.
 * Returns authorization_url, access_code, reference, and amount.
 */
export async function initializeConsultationPayment(bookingId, channels) {
  return await apiRequest('/payments/initialize', {
    method: 'POST',
    body: JSON.stringify({
      bookingId,
      channels: channels || ['card', 'bank_transfer', 'ussd', 'apple_pay'],
    }),
  });
}

/**
 * Verifies transaction with backend after user completes payment in checkout modal.
 */
export async function verifyConsultationPayment(reference) {
  return await apiRequest(`/payments/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
  });
}

/**
 * Retrieves the user's consultation payment receipts and transaction history.
 */
export async function getPaymentHistory() {
  return await apiRequest('/payments/history', {
    method: 'GET',
  });
}
