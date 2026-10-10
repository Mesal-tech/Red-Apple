import https from 'https';
import crypto from 'crypto';
import { config } from '../config';

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string; // 'success' | 'failed' | 'abandoned'
    reference: string;
    amount: number; // in kobo
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
    };
  };
}

export class PaystackService {
  private secretKey: string;

  constructor() {
    this.secretKey = config.paystack.secretKey;
  }

  private isConfigured(): boolean {
    return Boolean(this.secretKey && this.secretKey.startsWith('sk_'));
  }

  /**
   * Initializes a Paystack transaction.
   * Generates authorization URL, access code, and reference.
   */
  public async initializeTransaction(params: {
    email: string;
    amountInNaira: number;
    reference: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
    channels?: string[];
  }): Promise<PaystackInitResponse['data']> {
    const amountInKobo = Math.round(params.amountInNaira * 100);
    const channels = params.channels || ['card', 'bank_transfer', 'ussd', 'apple_pay', 'mobile_money'];

    if (!this.isConfigured()) {
      // Local dev / sandbox fallback when no live Paystack secret key is provided
      return {
        authorization_url: `https://checkout.paystack.com/mock_${params.reference}`,
        access_code: `mock_code_${Date.now()}`,
        reference: params.reference,
      };
    }

    const postData = JSON.stringify({
      email: params.email,
      amount: amountInKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      channels,
      metadata: params.metadata,
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.paystack.co',
          port: 443,
          path: '/transaction/initialize',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let responseData = '';
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          res.on('end', () => {
            try {
              const parsed: PaystackInitResponse = JSON.parse(responseData);
              if (parsed.status && parsed.data) {
                resolve(parsed.data);
              } else {
                reject(new Error(parsed.message || 'Paystack initialization failed.'));
              }
            } catch (err: any) {
              reject(new Error('Failed to parse Paystack init response: ' + err.message));
            }
          });
        }
      );

      req.on('error', (err) => {
        reject(new Error('Network error calling Paystack initialize: ' + err.message));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Verifies a transaction by its reference.
   */
  public async verifyTransaction(reference: string): Promise<PaystackVerifyResponse['data']> {
    if (!this.isConfigured()) {
      if (reference.includes('fail')) {
        return {
          id: 9999998,
          domain: 'test',
          status: 'failed',
          reference,
          amount: 1500000,
          message: 'Simulated payment declined / insufficient funds',
          gateway_response: 'Declined',
          paid_at: '',
          created_at: new Date().toISOString(),
          channel: 'card',
          currency: 'NGN',
          ip_address: '127.0.0.1',
          metadata: {},
          customer: {
            id: 1,
            first_name: 'Patient',
            last_name: 'Red Apple',
            email: 'patient@redapple.health',
            customer_code: 'CUS_mock',
            phone: null,
          },
        };
      }
      // Return simulated success in development/mock mode
      return {
        id: 9999999,
        domain: 'test',
        status: 'success',
        reference,
        amount: 1500000,
        message: 'Simulated verification successful',
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        channel: 'card',
        currency: 'NGN',
        ip_address: '127.0.0.1',
        metadata: {},
        customer: {
          id: 1,
          first_name: 'Patient',
          last_name: 'Red Apple',
          email: 'patient@redapple.health',
          customer_code: 'CUS_mock',
          phone: null,
        },
      };
    }

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.paystack.co',
          port: 443,
          path: `/transaction/verify/${encodeURIComponent(reference)}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          let responseData = '';
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          res.on('end', () => {
            try {
              const parsed: PaystackVerifyResponse = JSON.parse(responseData);
              if (parsed.status && parsed.data) {
                resolve(parsed.data);
              } else {
                reject(new Error(parsed.message || 'Paystack transaction verification failed.'));
              }
            } catch (err: any) {
              reject(new Error('Failed to parse Paystack verify response: ' + err.message));
            }
          });
        }
      );

      req.on('error', (err) => {
        reject(new Error('Network error verifying Paystack transaction: ' + err.message));
      });

      req.end();
    });
  }

  /**
   * Validates Paystack webhook HMAC SHA512 signature.
   */
  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.secretKey) return true; // allow in test/mock environment
    const hash = crypto.createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    return hash === signature;
  }
}

export const paystackService = new PaystackService();
