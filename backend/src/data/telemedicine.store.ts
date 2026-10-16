import { v4 as uuidv4 } from 'uuid';
import prisma from '../db/prisma';
import {
  Doctor,
  TimeSlot,
  ConsultationBooking,
  BookingStatus,
  DoctorReview,
  PartnerClinic,
} from '../models/telemedicine.model';

export const VERIFIED_DOCTORS_LIST: Doctor[] = [];

class TelemedicineStore {
  public async init(): Promise<void> {
    // Pure PostgreSQL / Prisma backed store. No mock files or seeds.
    return Promise.resolve();
  }

  public async getDoctors(filter?: { specialty?: string; search?: string }): Promise<Doctor[]> {
    try {
      const dbDoctors = await prisma.doctor.findMany({
        include: {
          clinic: true,
          availability_slots: true,
        },
        orderBy: { created_at: 'desc' },
      });

      let doctors: Doctor[] = dbDoctors.map((doc) => {
        const initials = doc.name
          .replace(/^Dr\.\s*/i, '')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase() || 'DR';

        return {
          doctor_id: doc.doctor_id,
          name: doc.name,
          credentials: doc.subspecialty || 'MBBS, Specialist',
          specialty: doc.specialty as any,
          sub_specialty: doc.subspecialty || doc.specialty,
          hospital_affiliation: doc.clinic?.name || 'Red Apple Telemedicine Clinic',
          photo_url: doc.avatar_url || undefined,
          bio: `Specialist in ${doc.specialty} providing verified telemedicine consultations on Red Apple.`,
          years_experience: 8,
          rating: doc.rating || 5.0,
          reviews_count: 0,
          fee_ngn: doc.consultation_fee || 15000,
          fee_usd: Math.round((doc.consultation_fee || 15000) / 1500),
          avatar_bg: '#E0F2F1',
          avatar_color: '#008080',
          initials,
          spoken_languages: ['English'],
          is_verified: true,
          is_available_today: (doc.availability_slots || []).some((s) => !s.is_booked),
          next_available_slot: (doc.availability_slots || []).find((s) => !s.is_booked)
            ? 'Available'
            : 'Check Calendar',
        };
      });

      if (filter?.specialty && filter.specialty.toLowerCase() !== 'all') {
        const querySpec = filter.specialty.toLowerCase();
        doctors = doctors.filter(
          (d) =>
            d.specialty.toLowerCase().includes(querySpec) ||
            d.sub_specialty.toLowerCase().includes(querySpec)
        );
      }

      if (filter?.search) {
        const q = filter.search.toLowerCase().trim();
        doctors = doctors.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.specialty.toLowerCase().includes(q) ||
            d.sub_specialty.toLowerCase().includes(q) ||
            d.hospital_affiliation.toLowerCase().includes(q)
        );
      }

      return doctors;
    } catch (err) {
      console.error('[TelemedicineStore.getDoctors] Prisma error:', err);
      return [];
    }
  }

  public async getDoctorById(doctorId: string): Promise<Doctor | null> {
    try {
      const doc = await prisma.doctor.findUnique({
        where: { doctor_id: doctorId },
        include: {
          clinic: true,
          availability_slots: true,
        },
      });

      if (!doc) return null;

      const initials = doc.name
        .replace(/^Dr\.\s*/i, '')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'DR';

      const slots: TimeSlot[] = (doc.availability_slots || []).map((s) => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        const startTimeStr = start.toISOString().substring(11, 16);
        const endTimeStr = end.toISOString().substring(11, 16);
        const dateStr = start.toISOString().split('T')[0];

        return {
          slot_id: s.slot_id,
          doctor_id: s.doctor_id,
          date: dateStr,
          start_time: startTimeStr,
          end_time: endTimeStr,
          formatted_time: `${dateStr}, ${startTimeStr}`,
          is_booked: s.is_booked,
        };
      });

      return {
        doctor_id: doc.doctor_id,
        name: doc.name,
        credentials: doc.subspecialty || 'MBBS, Specialist',
        specialty: doc.specialty as any,
        sub_specialty: doc.subspecialty || doc.specialty,
        hospital_affiliation: doc.clinic?.name || 'Red Apple Telemedicine Clinic',
        photo_url: doc.avatar_url || undefined,
        bio: `Specialist in ${doc.specialty} providing verified telemedicine consultations on Red Apple.`,
        years_experience: 8,
        rating: doc.rating || 5.0,
        reviews_count: 0,
        fee_ngn: doc.consultation_fee || 15000,
        fee_usd: Math.round((doc.consultation_fee || 15000) / 1500),
        avatar_bg: '#E0F2F1',
        avatar_color: '#008080',
        initials,
        spoken_languages: ['English'],
        is_verified: true,
        is_available_today: slots.some((s) => !s.is_booked),
        next_available_slot: slots.find((s) => !s.is_booked)?.formatted_time || 'No slots currently',
        slots,
        reviews: [],
      };
    } catch (err) {
      console.error('[TelemedicineStore.getDoctorById] Prisma error:', err);
      return null;
    }
  }

  public async getSlotsByDoctor(doctorId: string, date?: string): Promise<TimeSlot[]> {
    try {
      const dbSlots = await prisma.availabilitySlot.findMany({
        where: {
          doctor_id: doctorId,
        },
        orderBy: { start_time: 'asc' },
      });

      const slots: TimeSlot[] = dbSlots.map((s) => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        const startTimeStr = start.toISOString().substring(11, 16);
        const endTimeStr = end.toISOString().substring(11, 16);
        const dateStr = start.toISOString().split('T')[0];

        return {
          slot_id: s.slot_id,
          doctor_id: s.doctor_id,
          date: dateStr,
          start_time: startTimeStr,
          end_time: endTimeStr,
          formatted_time: `${dateStr}, ${startTimeStr}`,
          is_booked: s.is_booked,
        };
      });

      if (date) {
        return slots.filter((s) => s.date === date);
      }
      return slots;
    } catch (err) {
      console.error('[TelemedicineStore.getSlotsByDoctor] Prisma error:', err);
      return [];
    }
  }

  public async addSlot(
    doctorId: string,
    slotData: {
      date: string;
      start_time?: string;
      startTime?: string;
      end_time?: string;
      endTime?: string;
      formatted_time?: string;
      formattedTime?: string;
    }
  ): Promise<TimeSlot> {
    const rawStartTime = slotData.start_time || slotData.startTime || '10:00';
    const rawEndTime = slotData.end_time || slotData.endTime;
    const startIso = new Date(`${slotData.date}T${rawStartTime}:00Z`);
    const endIso = rawEndTime
      ? new Date(`${slotData.date}T${rawEndTime}:00Z`)
      : new Date(startIso.getTime() + 30 * 60 * 1000);

    const created = await prisma.availabilitySlot.create({
      data: {
        slot_id: `slot_${uuidv4().substring(0, 8)}`,
        doctor_id: doctorId,
        start_time: startIso,
        end_time: endIso,
        is_booked: false,
      },
    });

    return {
      slot_id: created.slot_id,
      doctor_id: created.doctor_id,
      date: slotData.date,
      start_time: rawStartTime,
      end_time: rawEndTime || `${startIso.getHours() + 1}:00`,
      formatted_time: slotData.formatted_time || slotData.formattedTime || `${slotData.date}, ${rawStartTime}`,
      is_booked: false,
    };
  }

  public async toggleSlot(slotId: string): Promise<TimeSlot> {
    const slot = await prisma.availabilitySlot.findUnique({
      where: { slot_id: slotId },
    });
    if (!slot) {
      throw new Error('Slot not found.');
    }

    const updated = await prisma.availabilitySlot.update({
      where: { slot_id: slotId },
      data: { is_booked: !slot.is_booked },
    });

    const start = new Date(updated.start_time);
    const end = new Date(updated.end_time);

    return {
      slot_id: updated.slot_id,
      doctor_id: updated.doctor_id,
      date: start.toISOString().split('T')[0],
      start_time: start.toISOString().substring(11, 16),
      end_time: end.toISOString().substring(11, 16),
      formatted_time: `${start.toISOString().split('T')[0]}, ${start.toISOString().substring(11, 16)}`,
      is_booked: updated.is_booked,
    };
  }

  public async bookConsultation(
    userIdOrData: string | any,
    maybeData?: any
  ): Promise<ConsultationBooking> {
    const userId = typeof userIdOrData === 'string' ? userIdOrData : userIdOrData.user_id;
    const data = typeof userIdOrData === 'string' ? maybeData : userIdOrData;

    const doctorId = data.doctor_id || data.doctorId;
    const slotId = data.slot_id || data.slotId;
    const scheduledTime = data.scheduled_time || data.scheduledTime;
    const reason = data.reason || 'Consultation';
    const consultationType = data.consultation_type || data.consultationType || 'video';

    const doctor = await prisma.doctor.findUnique({
      where: { doctor_id: doctorId },
      include: { clinic: true },
    });

    if (!doctor) {
      throw new Error('Doctor not found.');
    }

    if (slotId) {
      try {
        await prisma.availabilitySlot.update({
          where: { slot_id: slotId },
          data: { is_booked: true },
        });
      } catch (_) {}
    }

    const bookingId = `book_${uuidv4().substring(0, 10)}`;
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

    const created = await prisma.booking.create({
      data: {
        booking_id: bookingId,
        user_id: userId,
        clinic_id: doctor.clinic_id,
        doctor_id: doctor.doctor_id,
        slot_id: slotId || null,
        scheduled_time: scheduledTime,
        status: 'confirmed',
        reason,
      },
    });

    return {
      booking_id: created.booking_id,
      user_id: created.user_id,
      user_name: user?.name || data.userName || 'Patient',
      doctor_id: doctor.doctor_id,
      doctor_name: doctor.name,
      doctor_specialty: doctor.specialty,
      doctor_credentials: doctor.subspecialty || 'MBBS',
      doctor_photo_url: doctor.avatar_url || undefined,
      slot_id: created.slot_id || undefined,
      scheduled_time: created.scheduled_time,
      duration_minutes: 30,
      consultation_type: consultationType,
      reason: created.reason || '',
      symptoms_notes: data.symptomsNotes || data.symptoms_notes,
      status: 'confirmed',
      fee_ngn: doctor.consultation_fee,
      fee_paid_ngn: doctor.consultation_fee,
      video_room_url: `https://meet.redapple.health/consultation-${created.booking_id}`,
      created_at: created.created_at.toISOString(),
      updated_at: created.created_at.toISOString(),
    };
  }

  public async getUserBookings(userId: string): Promise<ConsultationBooking[]> {
    try {
      const dbBookings = await prisma.booking.findMany({
        where: { user_id: userId },
        include: {
          doctor: true,
          clinic: true,
        },
        orderBy: { created_at: 'desc' },
      });

      return dbBookings.map((b) => ({
        booking_id: b.booking_id,
        user_id: b.user_id,
        doctor_id: b.doctor_id,
        doctor_name: b.doctor.name,
        doctor_specialty: b.doctor.specialty,
        doctor_credentials: b.doctor.subspecialty || 'MBBS',
        doctor_photo_url: b.doctor.avatar_url || undefined,
        slot_id: b.slot_id || undefined,
        scheduled_time: b.scheduled_time,
        duration_minutes: 30,
        consultation_type: 'video',
        reason: b.reason || 'Consultation',
        status: b.status as BookingStatus,
        fee_ngn: b.doctor.consultation_fee,
        fee_paid_ngn: b.status === 'confirmed' ? b.doctor.consultation_fee : 0,
        video_room_url: `https://meet.redapple.health/consultation-${b.booking_id}`,
        created_at: b.created_at.toISOString(),
        updated_at: b.created_at.toISOString(),
      }));
    } catch (err) {
      console.error('[TelemedicineStore.getUserBookings] Prisma error:', err);
      return [];
    }
  }

  public async getBookingById(bookingId: string): Promise<ConsultationBooking | null> {
    try {
      const b = await prisma.booking.findUnique({
        where: { booking_id: bookingId },
        include: { doctor: true, clinic: true },
      });
      if (!b) return null;

      return {
        booking_id: b.booking_id,
        user_id: b.user_id,
        doctor_id: b.doctor_id,
        doctor_name: b.doctor.name,
        doctor_specialty: b.doctor.specialty,
        doctor_credentials: b.doctor.subspecialty || 'MBBS',
        doctor_photo_url: b.doctor.avatar_url || undefined,
        slot_id: b.slot_id || undefined,
        scheduled_time: b.scheduled_time,
        duration_minutes: 30,
        consultation_type: 'video',
        reason: b.reason || 'Consultation',
        status: b.status as BookingStatus,
        fee_ngn: b.doctor.consultation_fee,
        fee_paid_ngn: b.status === 'confirmed' ? b.doctor.consultation_fee : 0,
        video_room_url: `https://meet.redapple.health/consultation-${b.booking_id}`,
        created_at: b.created_at.toISOString(),
        updated_at: b.created_at.toISOString(),
      };
    } catch (err) {
      console.error('[TelemedicineStore.getBookingById] Prisma error:', err);
      return null;
    }
  }

  public async cancelBooking(userId: string, bookingId: string): Promise<ConsultationBooking> {
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: { doctor: true },
    });
    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.slot_id) {
      try {
        await prisma.availabilitySlot.update({
          where: { slot_id: booking.slot_id },
          data: { is_booked: false },
        });
      } catch (_) {}
    }

    const updated = await prisma.booking.update({
      where: { booking_id: bookingId },
      data: { status: 'cancelled' },
      include: { doctor: true },
    });

    return {
      booking_id: updated.booking_id,
      user_id: updated.user_id,
      doctor_id: updated.doctor_id,
      doctor_name: updated.doctor.name,
      doctor_specialty: updated.doctor.specialty,
      slot_id: updated.slot_id || undefined,
      scheduled_time: updated.scheduled_time,
      duration_minutes: 30,
      consultation_type: 'video',
      reason: updated.reason || '',
      status: 'cancelled',
      fee_paid_ngn: 0,
      video_room_url: `https://meet.redapple.health/consultation-${updated.booking_id}`,
      created_at: updated.created_at.toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  public async completeBooking(
    bookingId: string,
    doctorNotes?: string,
    prescriptionSummary?: string
  ): Promise<ConsultationBooking> {
    const updated = await prisma.booking.update({
      where: { booking_id: bookingId },
      data: { status: 'completed' },
      include: { doctor: true },
    });

    return {
      booking_id: updated.booking_id,
      user_id: updated.user_id,
      doctor_id: updated.doctor_id,
      doctor_name: updated.doctor.name,
      doctor_specialty: updated.doctor.specialty,
      slot_id: updated.slot_id || undefined,
      scheduled_time: updated.scheduled_time,
      duration_minutes: 30,
      consultation_type: 'video',
      reason: updated.reason || '',
      status: 'completed',
      fee_paid_ngn: updated.doctor.consultation_fee,
      video_room_url: '',
      doctor_notes: doctorNotes,
      prescription_summary: prescriptionSummary,
      created_at: updated.created_at.toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  public async addReview(
    userIdOrData: any,
    maybeUserName?: any,
    maybeData?: any
  ): Promise<DoctorReview> {
    const isThreeArgs = typeof userIdOrData === 'string' && typeof maybeUserName === 'string';
    const userId = isThreeArgs ? userIdOrData : userIdOrData.user_id;
    const userName = isThreeArgs ? maybeUserName : userIdOrData.user_name || 'Patient';
    const reviewPayload = isThreeArgs ? maybeData : userIdOrData;

    return {
      review_id: `rev_${uuidv4().substring(0, 8)}`,
      doctor_id: reviewPayload.doctorId || reviewPayload.doctor_id,
      user_id: userId,
      user_name: userName,
      rating: reviewPayload.rating,
      comment: reviewPayload.comment || '',
      created_at: new Date().toISOString(),
    };
  }

  public async updateBookingPayment(
    bookingId: string,
    status: BookingStatus,
    feePaidNgn: number
  ): Promise<ConsultationBooking> {
    const updated = await prisma.booking.update({
      where: { booking_id: bookingId },
      data: { status },
      include: { doctor: true },
    });

    return {
      booking_id: updated.booking_id,
      user_id: updated.user_id,
      doctor_id: updated.doctor_id,
      doctor_name: updated.doctor.name,
      doctor_specialty: updated.doctor.specialty,
      scheduled_time: updated.scheduled_time,
      duration_minutes: 30,
      consultation_type: 'video',
      reason: updated.reason || '',
      status: updated.status as BookingStatus,
      fee_paid_ngn: feePaidNgn,
      video_room_url: `https://meet.redapple.health/consultation-${updated.booking_id}`,
      created_at: updated.created_at.toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  public async getPartnerClinics(filter?: {
    category?: string;
    city?: string;
    search?: string;
  }): Promise<PartnerClinic[]> {
    try {
      const dbClinics = await prisma.clinic.findMany({
        include: { doctors: true },
        orderBy: { name: 'asc' },
      });

      let clinics: PartnerClinic[] = dbClinics.map((c) => ({
        clinic_id: c.clinic_id,
        name: c.name,
        category: 'gynaecology',
        category_label: 'Specialist Clinic',
        is_partner: true,
        rating: 4.9,
        reviews_count: 0,
        address: c.address || c.location || 'Accredited Facility',
        city: c.location || 'Lagos',
        state: 'Lagos',
        phone: c.contact_phone || '+2348000000000',
        email: c.contact_email || 'clinic@redapple.health',
        opening_hours: 'Mon - Fri: 8:00 AM - 6:00 PM',
        photo_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
        services: ['Gynecology Consultation', 'Fertility Support', 'Ultrasound Imaging'],
        lead_doctor: c.doctors[0]?.name || 'Specialist In Charge',
        affiliated_doctor_ids: c.doctors.map((d) => d.doctor_id),
        lat: c.latitude || 6.5244,
        lng: c.longitude || 3.3792,
        description: `${c.name} accredited reproductive healthcare facility.`,
      }));

      if (filter?.search) {
        const q = filter.search.toLowerCase().trim();
        clinics = clinics.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.address.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q)
        );
      }

      return clinics;
    } catch (err) {
      console.error('[TelemedicineStore.getPartnerClinics] Prisma error:', err);
      return [];
    }
  }

  public async getPartnerClinicById(clinicId: string): Promise<PartnerClinic | null> {
    try {
      const c = await prisma.clinic.findUnique({
        where: { clinic_id: clinicId },
        include: { doctors: true },
      });
      if (!c) return null;

      return {
        clinic_id: c.clinic_id,
        name: c.name,
        category: 'gynaecology',
        category_label: 'Specialist Clinic',
        is_partner: true,
        rating: 4.9,
        reviews_count: 0,
        address: c.address || c.location || 'Accredited Facility',
        city: c.location || 'Lagos',
        state: 'Lagos',
        phone: c.contact_phone || '+2348000000000',
        email: c.contact_email || 'clinic@redapple.health',
        opening_hours: 'Mon - Fri: 8:00 AM - 6:00 PM',
        photo_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
        services: ['Gynecology Consultation', 'Fertility Support', 'Ultrasound Imaging'],
        lead_doctor: c.doctors[0]?.name || 'Specialist In Charge',
        affiliated_doctor_ids: c.doctors.map((d) => d.doctor_id),
        lat: c.latitude || 6.5244,
        lng: c.longitude || 3.3792,
        description: `${c.name} accredited reproductive healthcare facility.`,
      };
    } catch (err) {
      console.error('[TelemedicineStore.getPartnerClinicById] Prisma error:', err);
      return null;
    }
  }
}

export const telemedicineStore = new TelemedicineStore();
