import dotenv from 'dotenv';
import path from 'path';

// Load root project variables before the backend-local .env so process variables still win.
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'red-apple-production-jwt-secret-key-32chars-min!!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'red-apple-production-jwt-refresh-secret-key-32chars!!',
    accessExpiresIn: '30d',
    refreshExpiresIn: '30d',
  },
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    appleClientId: process.env.APPLE_CLIENT_ID || '',
  },
  stream: {
    apiKey: process.env.STREAM_API_KEY || 'mmhfdzb5evj2',
    apiSecret: process.env.STREAM_API_SECRET || '',
  },
  doctor: {
    profileId: process.env.DOCTOR_PROFILE_ID || '',
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  },
  azureSpeech: {
    key: process.env.AZURE_SPEECH_KEY || '',
    region: process.env.AZURE_SPEECH_REGION || '',
    voice: process.env.AZURE_SPEECH_VOICE || 'en-NG-EzinneNeural',
  },
};
