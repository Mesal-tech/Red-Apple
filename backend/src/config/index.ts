import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
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
  dataDir: process.env.DATA_DIR || path.join(__dirname, '../../data'),
};
