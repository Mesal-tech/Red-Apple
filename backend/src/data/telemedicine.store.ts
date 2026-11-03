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
  private cachedDoctors: Doctor[] | null = null;
  private cachedDoctorsTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

  public async init(): Promise<void> {
    // Pure PostgreSQL / Prisma backed store. No mock files or seeds.
    return Promise.resolve();
  }

  public invalidateDoctorsCache(): void {
    this.cachedDoctors = null;
    this.cachedDoctorsTimestamp = 0;
  }

  public async getDoctors(filter?: { specialty?: string; search?: string }): Promise<Doctor[]> {
    try {
      // Check fast in-memory cache first
      if (this.cachedDoctors && (Date.now() - this.cachedDoctorsTimestamp) < this.CACHE_TTL_MS) {
        let filtered = [...this.cachedDoctors];
        if (filter?.specialty && filter.specialty.toLowerCase() !== 'all') {
          filtered = filtered.filter((d) => d.specialty?.toLowerCase() === filter.specialty!.toLowerCase());
        }
        if (filter?.search) {
          const q = filter.search.toLowerCase();
          filtered = filtered.filter((d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q));
        }
        return filtered;
      }

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
          credentials: 'MBBS, FWACS',
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

      this.cachedDoctors = doctors;
      this.cachedDoctorsTimestamp = Date.now();

      if (filter?.specialty && filter.specialty.toLowerCase() !== 'all') {
        const querySpec = filter.specialty.toLowerCase().trim();
        doctors = doctors.filter((d) => {
          const docSpec = (d.specialty || '').toLowerCase();
          const docSub = (d.sub_specialty || '').toLowerCase();

          if (docSpec.includes(querySpec) || docSub.includes(querySpec)) {
            return true;
          }

          // Normalized medical aliases: OB-GYN, Gynecology, Obstetrics, Maternal, Reproductive
          const isObGynQuery = /ob-?gyn|gynecolog|obstetric|reproduct|maternal|women|fertility/i.test(querySpec);
          const isObGynDoc = /ob-?gyn|gynecolog|obstetric|reproduct|maternal|women|fertility/i.test(`${docSpec} ${docSub}`);
          if (isObGynQuery && isObGynDoc) {
            return true;
          }

          return false;
        });
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

    let finalSlotId = slotId;
    let finalScheduledTime = scheduledTime;

    if (!finalSlotId) {
      const openSlot = await prisma.availabilitySlot.findFirst({
        where: { doctor_id: doctorId, is_booked: false },
        orderBy: { start_time: 'asc' },
      });
      if (openSlot) {
        finalSlotId = openSlot.slot_id;
        if (!finalScheduledTime) {
          finalScheduledTime = openSlot.start_time.toISOString();
        }
      }
    }

    if (finalScheduledTime && !finalSlotId) {
      const parsedDate = new Date(finalScheduledTime);
      if (!isNaN(parsedDate.getTime()) && parsedDate < new Date()) {
        throw new Error('Cannot schedule an appointment in the past.');
      }
    }

    const bookingId = `book_${uuidv4().substring(0, 10)}`;
    let validUserId = userId;
    let user = await prisma.user.findUnique({
      where: { user_id: userId },
    });
    if (!user) {
      user = await prisma.user.findFirst();
      if (user) {
        validUserId = user.user_id;
      } else {
        throw new Error('User not found. Please log in first.');
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      if (finalSlotId) {
        const reservation = await tx.availabilitySlot.updateMany({
          where: {
            slot_id: finalSlotId,
            doctor_id: doctorId,
            is_booked: false,
            start_time: { gt: new Date() },
          },
          data: { is_booked: true },
        });

        if (reservation.count === 0) {
          const slot = await tx.availabilitySlot.findUnique({ where: { slot_id: finalSlotId } });
          if (!slot || slot.doctor_id !== doctorId) {
            throw new Error('Selected time slot was not found. Please refresh availability and choose another time.');
          }
          if (slot.start_time <= new Date()) {
            throw new Error('This time slot has already passed. Please select an upcoming time slot.');
          }
          if (slot.is_booked) {
            throw new Error('This time slot has already been booked. Please choose another time.');
          }
          throw new Error('This time slot is no longer available. Please choose another time.');
        }
      }

      return tx.booking.create({
        data: {
          booking_id: bookingId,
          user_id: validUserId,
          clinic_id: doctor.clinic_id,
          doctor_id: doctor.doctor_id,
          slot_id: finalSlotId || null,
          scheduled_time: finalScheduledTime || new Date().toISOString(),
          status: 'confirmed',
          reason,
        },
      });
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

  public async getDoctorProfileIdForAccount(displayName: string, configuredProfileId = ''): Promise<string | null> {
    const profiles = await prisma.doctor.findMany({
      select: { doctor_id: true, name: true },
    });

    if (configuredProfileId) {
      return profiles.some((profile) => profile.doctor_id === configuredProfileId)
        ? configuredProfileId
        : null;
    }

    const normalize = (name: string) => name
      .normalize('NFKD')
      .replace(/^\s*dr\.?\s*/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const accountName = normalize(displayName || '');
    if (!accountName) return null;

    const matches = profiles.filter((profile) => normalize(profile.name) === accountName);
    return matches.length === 1 ? matches[0].doctor_id : null;
  }

  public async getDoctorBookings(doctorId: string): Promise<ConsultationBooking[]> {
    try {
      const dbBookings = await prisma.booking.findMany({
        where: { doctor_id: doctorId },
        include: {
          doctor: true,
          clinic: true,
          user: true,
        },
        orderBy: { created_at: 'desc' },
      });

      return dbBookings.map((booking) => ({
        booking_id: booking.booking_id,
        user_id: booking.user_id,
        user_name: booking.user?.name || 'Patient',
        doctor_id: booking.doctor_id,
        doctor_name: booking.doctor.name,
        doctor_specialty: booking.doctor.specialty,
        doctor_credentials: booking.doctor.subspecialty || 'MBBS',
        doctor_photo_url: booking.doctor.avatar_url || undefined,
        slot_id: booking.slot_id || undefined,
        scheduled_time: booking.scheduled_time,
        duration_minutes: 30,
        consultation_type: 'video',
        reason: booking.reason || 'Consultation',
        status: booking.status as BookingStatus,
        fee_ngn: booking.doctor.consultation_fee,
        fee_paid_ngn: booking.status === 'confirmed' ? booking.doctor.consultation_fee : 0,
        video_room_url: `https://meet.redapple.health/consultation-${booking.booking_id}`,
        created_at: booking.created_at.toISOString(),
        updated_at: booking.created_at.toISOString(),
      }));
    } catch (err) {
      console.error('[TelemedicineStore.getDoctorBookings] Prisma error:', err);
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
      const dbClinics = await prisma.clinic.findMany({ orderBy: { name: 'asc' } });
      let clinics: PartnerClinic[] = dbClinics.map((clinic) => ({
        clinic_id: clinic.clinic_id,
        name: clinic.name,
        address: clinic.address || undefined,
        city: clinic.location || undefined,
        phone: clinic.contact_phone || undefined,
        email: clinic.contact_email || undefined,
        lat: clinic.latitude ?? undefined,
        lng: clinic.longitude ?? undefined,
      }));

      if (filter?.city && filter.city !== 'all') {
        const cityQuery = filter.city.toLowerCase().trim();
        clinics = clinics.filter((clinic) => (clinic.city || '').toLowerCase().includes(cityQuery));
      }

      if (filter?.search) {
        const query = filter.search.toLowerCase().trim();
        clinics = clinics.filter((clinic) =>
          [clinic.name, clinic.address, clinic.city, clinic.phone]
            .some((value) => value?.toLowerCase().includes(query))
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
      const clinic = await prisma.clinic.findUnique({ where: { clinic_id: clinicId } });
      if (!clinic) return null;
      return {
        clinic_id: clinic.clinic_id,
        name: clinic.name,
        address: clinic.address || undefined,
        city: clinic.location || undefined,
        phone: clinic.contact_phone || undefined,
        email: clinic.contact_email || undefined,
        lat: clinic.latitude ?? undefined,
        lng: clinic.longitude ?? undefined,
      };
    } catch (err) {
      console.error('[TelemedicineStore.getPartnerClinicById] Prisma error:', err);
      return null;
    }
  }
}

export const telemedicineStore = new TelemedicineStore();
