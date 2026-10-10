import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { User, UserRole } from '../models/user.model';

class UserStore {
  private users: Map<string, User> = new Map();
  private filePath: string;
  private initialized: boolean = false;

  constructor() {
    this.filePath = path.join(config.dataDir, 'users.json');
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const list: User[] = JSON.parse(content);
        let foundMesal = false;
        for (const u of list) {
          if (u.email?.toLowerCase() === 'mesalokubor63@gmail.com') {
            u.role = 'doctor';
            if (!u.name || u.name === 'mesalokubor63') {
              u.name = 'Dr. Chioma Nwachukwu';
            }
            foundMesal = true;
          }
          this.users.set(u.user_id, u);
        }
        if (!foundMesal) {
          const saltRounds = 10;
          const docHash = await bcrypt.hash('Doctor@2026', saltRounds);
          const mesalUser: User = {
            user_id: 'fb5e54b9-7b39-41af-9a77-6a34e0471b18',
            name: 'Dr. Chioma Nwachukwu',
            email: 'mesalokubor63@gmail.com',
            phone: '+2348033334444',
            password_hash: docHash,
            pregnancy_mode: false,
            role: 'doctor',
            refresh_tokens: [],
            created_at: new Date('2026-09-04T17:50:35.186Z').toISOString(),
            updated_at: new Date().toISOString(),
          };
          this.users.set(mesalUser.user_id, mesalUser);
        }
        this.persistSync();
      } catch (err) {
        console.error('Failed to parse users file, re-initializing...', err);
        await this.seedDefaults();
      }
    } else {
      await this.seedDefaults();
    }

    this.initialized = true;
  }

  private async seedDefaults(): Promise<void> {
    const saltRounds = 10;
    const amaraPasswordHash = await bcrypt.hash('Amara@2026', saltRounds);
    const adminPasswordHash = await bcrypt.hash('Admin@2026', saltRounds);

    const defaultUsers: User[] = [
      {
        user_id: 'usr_amara_default_01',
        name: 'Amara Okonkwo',
        email: 'amara@redapple.health',
        phone: '+2348012345678',
        password_hash: amaraPasswordHash,
        pregnancy_mode: false,
        role: 'user',
        refresh_tokens: [],
        health_profile: {
          cycleLength: 28,
          periodDuration: 5,
          lastPeriodDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          reproductiveGoal: 'track_cycle',
          stage: 'cycle',
          completedAt: new Date('2025-01-15T08:00:00.000Z').toISOString(),
        },
        created_at: new Date('2025-01-15T08:00:00.000Z').toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        user_id: 'usr_admin_default_01',
        name: 'System Admin',
        email: 'admin@redapple.health',
        phone: '+2348000000000',
        password_hash: adminPasswordHash,
        pregnancy_mode: false,
        role: 'admin',
        refresh_tokens: [],
        created_at: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        user_id: 'fb5e54b9-7b39-41af-9a77-6a34e0471b18',
        name: 'Dr. Chioma Nwachukwu',
        email: 'mesalokubor63@gmail.com',
        phone: '+2348033334444',
        password_hash: amaraPasswordHash,
        pregnancy_mode: false,
        role: 'doctor',
        refresh_tokens: [],
        created_at: new Date('2026-09-04T17:50:35.186Z').toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    this.users.clear();
    for (const u of defaultUsers) {
      this.users.set(u.user_id, u);
    }
    this.persistSync();
  }

  private persistSync(): void {
    try {
      const list = Array.from(this.users.values());
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to persist users store to disk:', err);
    }
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
    await this.init();

    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    let password_hash: string | undefined = undefined;
    if (data.password) {
      password_hash = await bcrypt.hash(data.password, 10);
    }

    const now = new Date().toISOString();
    const displayName = (data.name?.trim()) || normalizedEmail.split('@')[0];
    const newUser: User = {
      user_id: uuidv4(),
      name: displayName,
      email: normalizedEmail,
      phone: data.phone?.trim(),
      password_hash,
      google_id: data.google_id,
      apple_id: data.apple_id,
      avatar_url: data.avatar_url,
      pregnancy_mode: false,
      role: data.role || 'user',
      refresh_tokens: [],
      created_at: now,
      updated_at: now,
    };

    this.users.set(newUser.user_id, newUser);
    this.persistSync();
    return newUser;
  }

  public async findByEmail(email: string): Promise<User | null> {
    await this.init();
    const normalized = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  public async findById(id: string): Promise<User | null> {
    await this.init();
    return this.users.get(id) || null;
  }

  public async findByGoogleId(googleId: string): Promise<User | null> {
    await this.init();
    for (const user of this.users.values()) {
      if (user.google_id === googleId) {
        return user;
      }
    }
    return null;
  }

  public async findByAppleId(appleId: string): Promise<User | null> {
    await this.init();
    for (const user of this.users.values()) {
      if (user.apple_id === appleId) {
        return user;
      }
    }
    return null;
  }

  public async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    await this.init();
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const updatedUser: User = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.users.set(userId, updatedUser);
    this.persistSync();
    return updatedUser;
  }

  public async saveRefreshToken(userId: string, token: string): Promise<void> {
    await this.init();
    const user = this.users.get(userId);
    if (!user) return;

    // Keep up to 5 most recent refresh tokens per user
    const tokens = user.refresh_tokens.slice(-4);
    tokens.push(token);

    user.refresh_tokens = tokens;
    this.persistSync();
  }

  public async removeRefreshToken(userId: string, token: string): Promise<void> {
    await this.init();
    const user = this.users.get(userId);
    if (!user) return;

    user.refresh_tokens = user.refresh_tokens.filter((t) => t !== token);
    this.persistSync();
  }

  public async verifyRefreshToken(userId: string, token: string): Promise<boolean> {
    await this.init();
    const user = this.users.get(userId);
    if (!user) return false;
    return user.refresh_tokens.includes(token);
  }

  public async setResetOtp(email: string, otpCode: string): Promise<void> {
    await this.init();
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('No account found with this email address.');
    }

    const codeHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    user.reset_otp = { codeHash, expiresAt };
    this.persistSync();
  }

  public async verifyAndConsumeResetOtp(email: string, otpCode: string, newPassword: string): Promise<User> {
    await this.init();
    const user = await this.findByEmail(email);
    if (!user || !user.reset_otp) {
      throw new Error('Invalid or expired password reset code.');
    }

    if (Date.now() > user.reset_otp.expiresAt) {
      user.reset_otp = null;
      this.persistSync();
      throw new Error('Reset code has expired. Please request a new code.');
    }

    const inputHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    if (inputHash !== user.reset_otp.codeHash) {
      throw new Error('Incorrect reset code.');
    }

    // Valid code -> hash new password, clear OTP, invalidate existing refresh tokens for security
    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.reset_otp = null;
    user.refresh_tokens = [];
    user.updated_at = new Date().toISOString();

    this.persistSync();
    return user;
  }
}

export const userStore = new UserStore();
