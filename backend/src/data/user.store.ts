import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../db/prisma';
import { User, UserRole, UserResetOtp } from '../models/user.model';

// In-memory token and reset OTP cache (valid for session life, no disk JSON)
const refreshTokensCache = new Map<string, string[]>();
const resetOtpCache = new Map<string, UserResetOtp>();

function mapPrismaUser(u: any): User {
  const hp = (u.health_profile as any) || {};
  const refreshTokens = refreshTokensCache.get(u.user_id) || [];
  const resetOtp = resetOtpCache.get(u.email?.toLowerCase()) || null;

  return {
    user_id: u.user_id,
    name: u.name,
    email: u.email || '',
    phone: u.phone || undefined,
    password_hash: u.password_hash,
    google_id: hp.googleId,
    apple_id: hp.appleId,
    avatar_url: hp.avatarUrl,
    date_of_birth: u.date_of_birth ? new Date(u.date_of_birth).toISOString().split('T')[0] : undefined,
    pregnancy_mode: u.pregnancy_mode,
    role: (u.role as UserRole) || 'user',
    refresh_tokens: refreshTokens,
    push_tokens: hp.pushTokens || [],
    read_notification_ids: hp.readNotificationIds || [],
    notification_settings: hp.notificationSettings,
    reset_otp: resetOtp,
    health_profile: hp,
    created_at: new Date(u.created_at).toISOString(),
    updated_at: new Date(u.updated_at).toISOString(),
  };
}

class UserStore {
  public async init(): Promise<void> {
    // Pure PostgreSQL / Prisma backed store. No mock files or seeds.
    return Promise.resolve();
  }

  public async createUser(data: {
    name?: string;
    email: string;
    phone?: string;
    password?: string;
    google_id?: string;
    apple_id?: string;
    avatar_url?: string;
    role?: UserRole;
  }): Promise<User> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    let password_hash = '';
    if (data.password) {
      password_hash = await bcrypt.hash(data.password, 10);
    } else {
      password_hash = await bcrypt.hash(uuidv4(), 10);
    }

    const displayName = data.name?.trim() || normalizedEmail.split('@')[0];
    const created = await prisma.user.create({
      data: {
        user_id: uuidv4(),
        name: displayName,
        email: normalizedEmail,
        phone: data.phone?.trim() || null,
        password_hash,
        pregnancy_mode: false,
        role: data.role || 'user',
        health_profile: {
          googleId: data.google_id,
          appleId: data.apple_id,
          avatarUrl: data.avatar_url,
        },
      },
    });

    return mapPrismaUser(created);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    const u = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalized,
          mode: 'insensitive',
        },
      },
    });

    return u ? mapPrismaUser(u) : null;
  }

  public async findById(id: string): Promise<User | null> {
    const u = await prisma.user.findUnique({
      where: { user_id: id },
    });

    return u ? mapPrismaUser(u) : null;
  }

  public async findByGoogleId(googleId: string): Promise<User | null> {
    const users = await prisma.user.findMany();
    const matched = users.find((u) => {
      const hp = (u.health_profile as any) || {};
      return hp.googleId === googleId;
    });

    return matched ? mapPrismaUser(matched) : null;
  }

  public async findByAppleId(appleId: string): Promise<User | null> {
    const users = await prisma.user.findMany();
    const matched = users.find((u) => {
      const hp = (u.health_profile as any) || {};
      return hp.appleId === appleId;
    });

    return matched ? mapPrismaUser(matched) : null;
  }

  public async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const current = await prisma.user.findUnique({
      where: { user_id: userId },
    });
    if (!current) {
      throw new Error('User not found.');
    }

    const currentHp = (current.health_profile as any) || {};
    const newHp = updates.health_profile
      ? { ...currentHp, ...updates.health_profile }
      : currentHp;

    if (updates.push_tokens) {
      newHp.pushTokens = updates.push_tokens;
    }
    if (updates.notification_settings) {
      newHp.notificationSettings = updates.notification_settings;
    }
    if (updates.avatar_url) {
      newHp.avatarUrl = updates.avatar_url;
    }

    const updated = await prisma.user.update({
      where: { user_id: userId },
      data: {
        name: updates.name !== undefined ? updates.name : current.name,
        email: updates.email !== undefined ? updates.email.toLowerCase().trim() : current.email,
        phone: updates.phone !== undefined ? updates.phone : current.phone,
        pregnancy_mode: updates.pregnancy_mode !== undefined ? updates.pregnancy_mode : current.pregnancy_mode,
        role: updates.role !== undefined ? updates.role : current.role,
        password_hash: updates.password_hash !== undefined ? updates.password_hash : current.password_hash,
        health_profile: newHp,
      },
    });

    return mapPrismaUser(updated);
  }

  public async saveRefreshToken(userId: string, token: string): Promise<void> {
    const existing = refreshTokensCache.get(userId) || [];
    const tokens = existing.slice(-4);
    tokens.push(token);
    refreshTokensCache.set(userId, tokens);
  }

  public async removeRefreshToken(userId: string, token: string): Promise<void> {
    const existing = refreshTokensCache.get(userId) || [];
    refreshTokensCache.set(
      userId,
      existing.filter((t) => t !== token)
    );
  }

  public async verifyRefreshToken(userId: string, token: string): Promise<boolean> {
    const existing = refreshTokensCache.get(userId) || [];
    return existing.includes(token);
  }

  public async setResetOtp(email: string, otpCode: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('No account found with this email address.');
    }

    const codeHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000;

    resetOtpCache.set(email.toLowerCase().trim(), { codeHash, expiresAt });
  }

  public async verifyAndConsumeResetOtp(
    email: string,
    otpCode: string,
    newPassword: string
  ): Promise<User> {
    const user = await this.findByEmail(email);
    const normalized = email.toLowerCase().trim();
    const otp = resetOtpCache.get(normalized);

    if (!user || !otp) {
      throw new Error('Invalid or expired password reset code.');
    }

    if (Date.now() > otp.expiresAt) {
      resetOtpCache.delete(normalized);
      throw new Error('Reset code has expired. Please request a new code.');
    }

    const inputHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    if (inputHash !== otp.codeHash) {
      throw new Error('Incorrect reset code.');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    resetOtpCache.delete(normalized);
    refreshTokensCache.delete(user.user_id);

    return this.updateUser(user.user_id, { password_hash });
  }

  public async getAllUsers(): Promise<User[]> {
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
    });
    return users.map(mapPrismaUser);
  }
}

export const userStore = new UserStore();
