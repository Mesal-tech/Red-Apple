export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned';

export type PaymentChannel =
  | 'card'
  | 'bank_transfer'
  | 'ussd'
  | 'apple_pay'
  | 'google_pay'
  | 'mobile_money';

export type PaymentProvider = 'paystack' | 'stripe' | 'flutterwave';

export interface PaymentTransaction {
  id: string;
  reference: string;
  booking_id: string;
  user_id: string;
  doctor_id: string;
  amount: number; // in Naira (NGN)
  amount_kobo: number; // in Kobo for Paystack (amount * 100)
  currency: string;
  status: PaymentStatus;
  channel?: PaymentChannel;
  provider: PaymentProvider;
  customer_email: string;
  customer_name: string;
  authorization_url?: string;
  access_code?: string;
  paid_at?: string;
  gateway_response?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InitializePaymentParams {
  bookingId: string;
  userId: string;
  userEmail: string;
  userName: string;
  doctorId: string;
  amount: number; // in Naira
  currency?: string;
  channels?: string[];
  callbackUrl?: string;
}
