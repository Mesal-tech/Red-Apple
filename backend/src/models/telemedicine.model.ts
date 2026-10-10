export type DoctorSpecialty =
  | 'Obstetrician & Gynecologist'
  | 'Reproductive Endocrinologist'
  | 'Maternal-Fetal Medicine'
  | 'Fertility & IVF Specialist'
  | 'Certified Midwife & Postpartum'
  | 'Menopause & Hormonal Health';

export interface TimeSlot {
  slot_id: string;
  doctor_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // e.g. "09:00"
  end_time: string; // e.g. "09:30"
  formatted_time: string; // e.g. "Today, 9:00 AM"
  is_booked: boolean;
}

export interface DoctorReview {
  review_id: string;
  doctor_id: string;
  user_id: string;
  user_name: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
}

export interface Doctor {
  doctor_id: string;
  user_id?: string;
  email?: string;
  name: string;
  credentials: string; // e.g. "MBBS, FWACS, FMCOG"
  specialty: DoctorSpecialty;
  sub_specialty: string;
  hospital_affiliation: string;
  photo_url?: string;
  bio: string;
  years_experience: number;
  rating: number;
  reviews_count: number;
  fee_ngn: number; // in Nigerian Naira (e.g. 15000)
  fee_usd: number; // in USD (e.g. 25)
  avatar_bg: string;
  avatar_color: string;
  initials: string;
  spoken_languages: string[];
  is_verified: boolean;
  is_available_today: boolean;
  next_available_slot: string;
  reviews?: DoctorReview[];
  slots?: TimeSlot[];
}

export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ConsultationBooking {
  booking_id: string;
  user_id: string;
  user_name?: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  doctor_credentials?: string;
  doctor_initials?: string;
  doctor_avatar_bg?: string;
  doctor_avatar_color?: string;
  slot_id?: string;
  scheduled_time: string; // e.g. "2026-09-05T10:00:00.000Z" or formatted string
  duration_minutes: number;
  consultation_type: 'video' | 'audio';
  reason: string;
  symptoms_notes?: string;
  status: BookingStatus;
  fee_paid_ngn: number;
  video_room_url: string;
  doctor_notes?: string;
  prescription_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerClinic {
  clinic_id: string;
  name: string;
  category: 'fertility' | 'gynaecology' | 'birthing_center' | 'hospital' | 'sexual_health';
  category_label: string;
  is_partner: boolean;
  rating: number;
  reviews_count: number;
  address: string;
  city: string;
  state: string;
  phone: string;
  email?: string;
  opening_hours: string;
  photo_url: string;
  services: string[];
  lead_doctor?: string;
  affiliated_doctor_ids?: string[];
  lat: number;
  lng: number;
  description: string;
}
