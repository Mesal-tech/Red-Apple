import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { userStore } from './user.store';
import {
  Doctor,
  TimeSlot,
  ConsultationBooking,
  DoctorReview,
} from '../models/telemedicine.model';

interface TelemedicineData {
  doctors: Doctor[];
  slots: TimeSlot[];
  bookings: ConsultationBooking[];
  reviews: DoctorReview[];
}

export const MOCK_DOCTOR_IDS = new Set([
  'doc_amina_bello',
  'doc_chinedu_okafor',
  'doc_folashade_adeleke',
  'doc_zainab_aliyu',
  'doc_emeka_nwosu',
]);

class TelemedicineStore {
  private filePath: string;
  private initialized: boolean = false;
  private doctors: Map<string, Doctor> = new Map();
  private slots: Map<string, TimeSlot> = new Map();
  private bookings: Map<string, ConsultationBooking> = new Map();
  private reviews: Map<string, DoctorReview> = new Map();

  constructor() {
    this.filePath = path.join(config.dataDir, 'telemedicine.json');
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data: TelemedicineData = JSON.parse(raw);
        this.loadData(data);
      } catch (err) {
        console.error('Failed to parse telemedicine data, re-seeding...', err);
        await this.seedDefaults();
      }
    } else {
      await this.seedDefaults();
    }

    this.initialized = true;
  }

  private loadData(data: TelemedicineData) {
    this.doctors.clear();
    this.slots.clear();
    this.bookings.clear();
    this.reviews.clear();

    for (const d of data.doctors || []) {
      if (!MOCK_DOCTOR_IDS.has(d.doctor_id)) {
        this.doctors.set(d.doctor_id, d);
      }
    }
    for (const s of data.slots || []) {
      if (!MOCK_DOCTOR_IDS.has(s.doctor_id)) {
        this.slots.set(s.slot_id, s);
      }
    }
    for (const b of data.bookings || []) {
      if (!MOCK_DOCTOR_IDS.has(b.doctor_id)) {
        this.bookings.set(b.booking_id, b);
      }
    }
    for (const r of data.reviews || []) {
      if (!MOCK_DOCTOR_IDS.has(r.doctor_id)) {
        this.reviews.set(r.review_id, r);
      }
    }

    this.ensureMesalDoctor();
  }

  private ensureMesalDoctor(): void {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Purge mock doctors and invalid references
    let modified = false;
    for (const id of MOCK_DOCTOR_IDS) {
      if (this.doctors.has(id)) {
        this.doctors.delete(id);
        modified = true;
      }
    }
    for (const [slotId, slot] of Array.from(this.slots.entries())) {
      if (MOCK_DOCTOR_IDS.has(slot.doctor_id)) {
        this.slots.delete(slotId);
        modified = true;
      }
    }
    for (const [bookingId, booking] of Array.from(this.bookings.entries())) {
      if (MOCK_DOCTOR_IDS.has(booking.doctor_id)) {
        this.bookings.delete(bookingId);
        modified = true;
      }
    }
    for (const [revId, rev] of Array.from(this.reviews.entries())) {
      if (MOCK_DOCTOR_IDS.has(rev.doctor_id)) {
        this.reviews.delete(revId);
        modified = true;
      }
    }

    if (!this.doctors.has('doc_mesal_okubor')) {
      const mesalDoc: Doctor = {
        doctor_id: 'doc_mesal_okubor',
        user_id: 'fb5e54b9-7b39-41af-9a77-6a34e0471b18',
        email: 'mesalokubor63@gmail.com',
        name: 'Dr. Mesal Okubor',
        credentials: 'MBBS, FWACS, FMCOG',
        specialty: 'Obstetrician & Gynecologist',
        sub_specialty: 'Telemedicine & Reproductive Healthcare',
        hospital_affiliation: 'Red Apple Telemedicine Clinic',
        bio: 'Lead Telemedicine Consultant specializing in reproductive healthcare, virtual maternal care, fertility counseling, and patient-first telemedicine.',
        years_experience: 12,
        rating: 5.0,
        reviews_count: 64,
        fee_ngn: 15000,
        fee_usd: 20,
        avatar_bg: '#E0F2F1',
        avatar_color: '#008080',
        initials: 'MO',
        photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
        spoken_languages: ['English', 'Pidgin'],
        is_verified: true,
        is_available_today: true,
        next_available_slot: 'Today, 10:00 AM',
      };

      this.doctors.set(mesalDoc.doctor_id, mesalDoc);
      modified = true;
    }

    const slotHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00'];
    for (const hr of slotHours) {
      const slotId = `slot_doc_mesal_okubor_${todayStr}_${hr.replace(':', '')}`;
      if (!this.slots.has(slotId)) {
        this.slots.set(slotId, {
          slot_id: slotId,
          doctor_id: 'doc_mesal_okubor',
          date: todayStr,
          start_time: hr,
          end_time: `${parseInt(hr.split(':')[0], 10) + 1}:00`,
          formatted_time: `Today, ${hr}`,
          is_booked: false,
        });
        modified = true;
      }
    }

    if (modified) {
      this.persistSync();
    }
  }

  private async seedDefaults(): Promise<void> {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const todayStr = formatDate(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);

    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = formatDate(dayAfter);

    const seededDoctors: Doctor[] = [
      {
        doctor_id: 'doc_mesal_okubor',
        user_id: 'fb5e54b9-7b39-41af-9a77-6a34e0471b18',
        email: 'mesalokubor63@gmail.com',
        name: 'Dr. Mesal Okubor',
        credentials: 'MBBS, FWACS, FMCOG',
        specialty: 'Obstetrician & Gynecologist',
        sub_specialty: 'Telemedicine & Reproductive Healthcare',
        hospital_affiliation: 'Red Apple Telemedicine Clinic',
        bio: 'Lead Telemedicine Consultant specializing in reproductive healthcare, virtual maternal care, fertility counseling, and patient-first telemedicine.',
        years_experience: 12,
        rating: 5.0,
        reviews_count: 64,
        fee_ngn: 15000,
        fee_usd: 20,
        avatar_bg: '#E0F2F1',
        avatar_color: '#008080',
        initials: 'MO',
        photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
        spoken_languages: ['English', 'Pidgin'],
        is_verified: true,
        is_available_today: true,
        next_available_slot: 'Today, 10:00 AM',
      },
    ];

    const seededSlots: TimeSlot[] = [];
    for (const doc of seededDoctors) {
      // 3 slots today
      seededSlots.push(
        {
          slot_id: `slot_${doc.doctor_id}_t1`,
          doctor_id: doc.doctor_id,
          date: todayStr,
          start_time: '10:00',
          end_time: '10:30',
          formatted_time: 'Today, 10:00 AM',
          is_booked: false,
        },
        {
          slot_id: `slot_${doc.doctor_id}_t2`,
          doctor_id: doc.doctor_id,
          date: todayStr,
          start_time: '14:30',
          end_time: '15:00',
          formatted_time: 'Today, 2:30 PM',
          is_booked: false,
        },
        {
          slot_id: `slot_${doc.doctor_id}_t3`,
          doctor_id: doc.doctor_id,
          date: todayStr,
          start_time: '16:00',
          end_time: '16:30',
          formatted_time: 'Today, 4:00 PM',
          is_booked: false,
        },
        // 3 slots tomorrow
        {
          slot_id: `slot_${doc.doctor_id}_m1`,
          doctor_id: doc.doctor_id,
          date: tomorrowStr,
          start_time: '09:30',
          end_time: '10:00',
          formatted_time: 'Tomorrow, 9:30 AM',
          is_booked: false,
        },
        {
          slot_id: `slot_${doc.doctor_id}_m2`,
          doctor_id: doc.doctor_id,
          date: tomorrowStr,
          start_time: '11:00',
          end_time: '11:30',
          formatted_time: 'Tomorrow, 11:00 AM',
          is_booked: false,
        },
        {
          slot_id: `slot_${doc.doctor_id}_m3`,
          doctor_id: doc.doctor_id,
          date: tomorrowStr,
          start_time: '15:30',
          end_time: '16:00',
          formatted_time: 'Tomorrow, 3:30 PM',
          is_booked: false,
        },
        // 2 slots day after
        {
          slot_id: `slot_${doc.doctor_id}_d1`,
          doctor_id: doc.doctor_id,
          date: dayAfterStr,
          start_time: '10:00',
          end_time: '10:30',
          formatted_time: `${dayAfterStr}, 10:00 AM`,
          is_booked: false,
        },
        {
          slot_id: `slot_${doc.doctor_id}_d2`,
          doctor_id: doc.doctor_id,
          date: dayAfterStr,
          start_time: '14:00',
          end_time: '14:30',
          formatted_time: `${dayAfterStr}, 2:00 PM`,
          is_booked: false,
        }
      );
    }

    const seededReviews: DoctorReview[] = [
      {
        review_id: 'rev_1',
        doctor_id: 'doc_mesal_okubor',
        user_id: 'usr_amara_default_01',
        user_name: 'Amara O.',
        rating: 5,
        comment: 'Dr. Mesal Okubor was deeply reassuring during my consultation. Highly recommended!',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        review_id: 'rev_2',
        doctor_id: 'doc_mesal_okubor',
        user_id: 'usr_patient_2',
        user_name: 'Blessing K.',
        rating: 5,
        comment: 'Explains hormonal lab panels clearly without medical jargon. Very empathetic doctor.',
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
    ];

    // Seed 1 active upcoming consultation booking for Amara
    const seededBookings: ConsultationBooking[] = [
      {
        booking_id: 'book_seed_amara_01',
        user_id: 'usr_amara_default_01',
        user_name: 'Amara Okonkwo',
        doctor_id: 'doc_mesal_okubor',
        doctor_name: 'Dr. Mesal Okubor',
        doctor_specialty: 'Obstetrician & Gynecologist',
        doctor_credentials: 'MBBS, FWACS, FMCOG',
        doctor_initials: 'MO',
        doctor_avatar_bg: '#E0F2F1',
        doctor_avatar_color: '#008080',
        slot_id: 'slot_doc_mesal_okubor_t2',
        scheduled_time: 'Today, 2:30 PM',
        duration_minutes: 30,
        consultation_type: 'video',
        reason: 'Prenatal Ultrasound & Reproductive Health Review',
        symptoms_notes: 'Mild evening ankle swelling and occasional morning dizziness at 24 weeks.',
        status: 'confirmed',
        fee_paid_ngn: 15000,
        video_room_url: 'https://telehealth.redapple.health/room_amara_24w',
        doctor_notes: '',
        prescription_summary: '',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    this.loadData({
      doctors: seededDoctors,
      slots: seededSlots,
      bookings: seededBookings,
      reviews: seededReviews,
    });

    this.persistSync();
  }

  private persistSync(): void {
    try {
      const data: TelemedicineData = {
        doctors: Array.from(this.doctors.values()),
        slots: Array.from(this.slots.values()),
        bookings: Array.from(this.bookings.values()),
        reviews: Array.from(this.reviews.values()),
      };
      const temp = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(temp, this.filePath);
    } catch (err) {
      console.error('Failed to persist telemedicine store to disk:', err);
    }
  }

  public async getDoctors(filter?: { specialty?: string; search?: string }): Promise<Doctor[]> {
    await this.init();
    let result = Array.from(this.doctors.values());

    if (filter?.specialty && filter.specialty.toLowerCase() !== 'all') {
      const querySpec = filter.specialty.toLowerCase();
      result = result.filter(
        (d) =>
          d.specialty.toLowerCase().includes(querySpec) ||
          d.sub_specialty.toLowerCase().includes(querySpec)
      );
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.sub_specialty.toLowerCase().includes(q) ||
          d.hospital_affiliation.toLowerCase().includes(q) ||
          d.spoken_languages.some((lang) => lang.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public async getDoctorById(doctorId: string): Promise<Doctor | null> {
    await this.init();
    const doc = this.doctors.get(doctorId);
    if (!doc) return null;

    const docSlots = Array.from(this.slots.values()).filter(
      (s) => s.doctor_id === doctorId && !s.is_booked
    );
    const docReviews = Array.from(this.reviews.values()).filter(
      (r) => r.doctor_id === doctorId
    );

    return {
      ...doc,
      slots: docSlots,
      reviews: docReviews,
    };
  }

  public async getSlotsByDoctor(doctorId: string, date?: string): Promise<TimeSlot[]> {
    await this.init();
    let slots = Array.from(this.slots.values()).filter((s) => s.doctor_id === doctorId);
    if (date) {
      slots = slots.filter((s) => s.date === date);
    }
    return slots;
  }

  public async addSlot(
    doctorId: string,
    data: { date: string; startTime: string; endTime?: string; formattedTime?: string }
  ): Promise<TimeSlot> {
    await this.init();
    const doctor = this.doctors.get(doctorId);
    if (!doctor) throw new Error('Doctor not found.');

    const slotId = `slot_${doctorId}_${data.date}_${data.startTime.replace(':', '')}_${Date.now()}`;
    const newSlot: TimeSlot = {
      slot_id: slotId,
      doctor_id: doctorId,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime || `${parseInt(data.startTime.split(':')[0], 10) + 1}:00`,
      formatted_time: data.formattedTime || `${data.date}, ${data.startTime}`,
      is_booked: false,
    };

    this.slots.set(slotId, newSlot);
    this.persistSync();
    return newSlot;
  }

  public async toggleSlot(slotId: string): Promise<TimeSlot> {
    await this.init();
    const slot = this.slots.get(slotId);
    if (!slot) throw new Error('Slot not found.');
    slot.is_booked = !slot.is_booked;
    this.slots.set(slotId, slot);
    this.persistSync();
    return slot;
  }

  public async bookConsultation(
    userId: string,
    data: {
      doctorId: string;
      slotId?: string;
      scheduledTime?: string;
      reason: string;
      symptomsNotes?: string;
      consultationType?: 'video' | 'audio';
      userName?: string;
    }
  ): Promise<ConsultationBooking> {
    await this.init();

    const doctor = this.doctors.get(data.doctorId);
    if (!doctor) {
      throw new Error('Doctor not found.');
    }

    let scheduledTime = data.scheduledTime || 'Scheduled Slot';
    if (data.slotId) {
      const slot = this.slots.get(data.slotId);
      if (!slot) {
        throw new Error('Selected slot not found.');
      }
      if (slot.is_booked) {
        throw new Error('This slot has already been booked. Please choose another slot.');
      }
      slot.is_booked = true;
      scheduledTime = slot.formatted_time;
      this.slots.set(data.slotId, slot);
    }

    const roomId = `room_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const newBooking: ConsultationBooking = {
      booking_id: `book_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      user_id: userId,
      user_name: data.userName || 'Red Apple Patient',
      doctor_id: doctor.doctor_id,
      doctor_name: doctor.name,
      doctor_specialty: doctor.specialty,
      doctor_credentials: doctor.credentials,
      doctor_initials: doctor.initials,
      doctor_avatar_bg: doctor.avatar_bg,
      doctor_avatar_color: doctor.avatar_color,
      slot_id: data.slotId,
      scheduled_time: scheduledTime,
      duration_minutes: 30,
      consultation_type: data.consultationType || 'video',
      reason: data.reason || 'General Consultation',
      symptoms_notes: data.symptomsNotes || '',
      status: 'confirmed',
      fee_paid_ngn: doctor.fee_ngn,
      video_room_url: `https://telehealth.redapple.health/${roomId}`,
      created_at: now,
      updated_at: now,
    };

    this.bookings.set(newBooking.booking_id, newBooking);
    this.persistSync();
    return newBooking;
  }

  public async getUserBookings(userId: string): Promise<ConsultationBooking[]> {
    await this.init();
    const doctor = Array.from(this.doctors.values()).find(
      (d) => d.user_id === userId
    );
    const user = await userStore.findById(userId);
    const isDoctor = Boolean(doctor) || user?.role === 'doctor' || user?.email === 'mesalokubor63@gmail.com';

    return Array.from(this.bookings.values())
      .filter((b) => b.user_id === userId || (isDoctor && b.doctor_id === 'doc_mesal_okubor'))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getBookingById(bookingId: string): Promise<ConsultationBooking | null> {
    await this.init();
    return this.bookings.get(bookingId) || null;
  }

  public async cancelBooking(userId: string, bookingId: string): Promise<ConsultationBooking> {
    await this.init();
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new Error('Booking not found.');
    }
    if (booking.user_id !== userId) {
      throw new Error('Unauthorized to cancel this booking.');
    }

    booking.status = 'cancelled';
    booking.updated_at = new Date().toISOString();

    // Release slot if was booked
    if (booking.slot_id) {
      const slot = this.slots.get(booking.slot_id);
      if (slot) {
        slot.is_booked = false;
        this.slots.set(booking.slot_id, slot);
      }
    }

    this.bookings.set(bookingId, booking);
    this.persistSync();
    return booking;
  }

  public async completeBooking(
    bookingId: string,
    doctorNotes?: string,
    prescriptionSummary?: string
  ): Promise<ConsultationBooking> {
    await this.init();
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new Error('Booking not found.');
    }

    booking.status = 'completed';
    if (doctorNotes) booking.doctor_notes = doctorNotes;
    if (prescriptionSummary) booking.prescription_summary = prescriptionSummary;
    booking.updated_at = new Date().toISOString();

    this.bookings.set(bookingId, booking);
    this.persistSync();
    return booking;
  }

  public async addReview(
    userId: string,
    userName: string,
    data: { doctorId: string; rating: number; comment: string }
  ): Promise<DoctorReview> {
    await this.init();
    const doctor = this.doctors.get(data.doctorId);
    if (!doctor) {
      throw new Error('Doctor not found.');
    }

    const review: DoctorReview = {
      review_id: `rev_${uuidv4()}`,
      doctor_id: data.doctorId,
      user_id: userId,
      user_name: userName || 'Verified Patient',
      rating: Math.max(1, Math.min(5, data.rating)),
      comment: data.comment,
      created_at: new Date().toISOString(),
    };

    this.reviews.set(review.review_id, review);

    // Recompute doctor rating
    const docReviews = Array.from(this.reviews.values()).filter(
      (r) => r.doctor_id === data.doctorId
    );
    const avg =
      docReviews.reduce((sum, r) => sum + r.rating, 0) / docReviews.length;
    doctor.rating = parseFloat(avg.toFixed(2));
    doctor.reviews_count = docReviews.length;
    this.doctors.set(data.doctorId, doctor);

    this.persistSync();
    return review;
  }
}

export const telemedicineStore = new TelemedicineStore();
