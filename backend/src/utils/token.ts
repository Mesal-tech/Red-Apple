import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { User } from '../models/user.model';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
}

export function generateTokenPair(user: User): AuthTokens {
  const payload: TokenPayload = {
    userId: user.user_id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(
    { userId: user.user_id, jti: uuidv4() },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1 hour
  };
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): { userId: string } {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as { userId: string };
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}
