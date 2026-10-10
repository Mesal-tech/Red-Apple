export type UserRole = 'user' | 'admin' | 'clinic_staff' | 'doctor';

export interface UserHealthProfile {
  stage?: 'cycle' | 'pregnancy' | 'perimenopause' | 'postmenopause' | 'ttc';
  completedAt?: string;
  cycleLength?: number;
  periodDuration?: number;
  lastPeriodDate?: string;
  reproductiveGoal?: 'track_cycle' | 'get_pregnant' | 'track_pregnancy' | 'postmenopause';
  notes?: string;
  pregnancyDetails?: any;
  perimenopauseDetails?: any;
  postmenopauseDetails?: any;
  [key: string]: any;
}

export interface UserResetOtp {
  codeHash: string;
  expiresAt: number; // Unix timestamp ms
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  password_hash?: string;
  google_id?: string;
  apple_id?: string;
  avatar_url?: string;
  date_of_birth?: string;
  pregnancy_mode: boolean;
  role: UserRole;
  refresh_tokens: string[];
  push_tokens?: string[];
  read_notification_ids?: string[];
  notification_settings?: {
    periodAlerts?: boolean;
    fertileWindowAlerts?: boolean;
    appointmentAlerts?: boolean;
    discreetTitles?: boolean;
    dailyLogReminder?: boolean;
    medicationAlerts?: boolean;
    hydrationAlerts?: boolean;
    weeklyGrowthAlerts?: boolean;
  };
  reset_otp?: UserResetOtp | null;
  health_profile?: UserHealthProfile;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Omit<User, 'password_hash' | 'refresh_tokens' | 'reset_otp'>;

export function toSafeUser(user: User): SafeUser {
  const { password_hash, refresh_tokens, reset_otp, ...safe } = user;
  return safe;
}
