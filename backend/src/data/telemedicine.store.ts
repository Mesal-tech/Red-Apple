import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { userStore } from './user.store';
import {
  Doctor,
  TimeSlot,
  ConsultationBooking,
  BookingStatus,
  DoctorReview,
  PartnerClinic,
} from '../models/telemedicine.model';

interface TelemedicineData {
  doctors: Doctor[];
  slots: TimeSlot[];
  bookings: ConsultationBooking[];
  reviews: DoctorReview[];
  clinics?: PartnerClinic[];
}

export const VERIFIED_DOCTORS_LIST: Doctor[] = [
  {
    doctor_id: 'doc_mesal_okubor',
    user_id: 'fb5e54b9-7b39-41af-9a77-6a34e0471b18',
    email: 'mesalokubor63@gmail.com',
    name: 'Dr. Chioma Nwachukwu',
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
    initials: 'CN',
    photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
    spoken_languages: ['English', 'Pidgin'],
    is_verified: true,
    is_available_today: true,
    next_available_slot: 'Today, 10:00 AM',
  },
  {
    doctor_id: 'doc_amina_bello',
    user_id: 'usr_doc_amina_bello',
    email: 'amina.bello@lagoonhospitals.com',
    name: 'Dr. Amina Bello',
    credentials: 'MBBS, FWACS (Reproductive Endo & IVF)',
    specialty: 'Reproductive Endocrinologist',
    sub_specialty: 'Fertility & Hormonal Health',
    hospital_affiliation: "Lagoon Women's Hospital",
    bio: 'Senior Fertility Consultant dedicated to hormonal health, PCOS management, IVF guidance, and compassionate reproductive care.',
    years_experience: 10,
    rating: 4.9,
    reviews_count: 48,
    fee_ngn: 18000,
    fee_usd: 25,
    avatar_bg: '#FEE2E2',
    avatar_color: '#DC2626',
    initials: 'AB',
    photo_url: 'https://images.unsplash.com/photo-1594824813583-7c152a210b4f?w=500&auto=format&fit=crop&q=80',
    spoken_languages: ['English', 'Hausa'],
    is_verified: true,
    is_available_today: true,
    next_available_slot: 'Today, 11:30 AM',
  },
  {
    doctor_id: 'doc_chinedu_okafor',
    user_id: 'usr_doc_chinedu_okafor',
    email: 'chinedu.okafor@premierspecialist.ng',
    name: 'Dr. Chinedu Okafor',
    credentials: 'MBBS, FMCOG, Dip Maternal-Fetal Med',
    specialty: 'Maternal-Fetal Medicine',
    sub_specialty: 'High-Risk Pregnancy & Prenatal Diagnostics',
    hospital_affiliation: 'Premier Specialist Hospital',
    bio: 'Perinatologist focusing on gestational health, prenatal diagnostics, high-risk pregnancy management, and maternal safety.',
    years_experience: 14,
    rating: 4.9,
    reviews_count: 52,
    fee_ngn: 16000,
    fee_usd: 22,
    avatar_bg: '#EFF6FF',
    avatar_color: '#2563EB',
    initials: 'CO',
    photo_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&auto=format&fit=crop&q=80',
    spoken_languages: ['English', 'Igbo'],
    is_verified: true,
    is_available_today: true,
    next_available_slot: 'Today, 2:00 PM',
  },
  {
    doctor_id: 'doc_folashade_adeleke',
    user_id: 'usr_doc_folashade_adeleke',
    email: 'folashade.adeleke@stnicholas.com',
    name: 'Dr. Folashade Adeleke',
    credentials: 'MBBS, FWACS (Gynecology)',
    specialty: 'Menopause & Hormonal Health',
    sub_specialty: 'Menopause & Preventative Screenings',
    hospital_affiliation: 'St. Nicholas Specialist Hospital',
    bio: 'Women’s health specialist focused on menstrual irregularities, postmenopause wellness, pelvic care, and preventative screenings.',
    years_experience: 11,
    rating: 4.8,
    reviews_count: 39,
    fee_ngn: 15000,
    fee_usd: 20,
    avatar_bg: '#F5F3FF',
    avatar_color: '#7C3AED',
    initials: 'FA',
    photo_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80',
    spoken_languages: ['English', 'Yoruba'],
    is_verified: true,
    is_available_today: true,
    next_available_slot: 'Tomorrow, 9:00 AM',
  },
  {
    doctor_id: 'doc_zainab_aliyu',
    user_id: 'usr_doc_zainab_aliyu',
    email: 'zainab.aliyu@cedarcrest.com',
    name: 'Dr. Zainab Aliyu',
    credentials: 'MBBS, MSc Sexual & Reproductive Health',
    specialty: 'Fertility & IVF Specialist',
    sub_specialty: 'Contraceptive Counseling & Family Planning',
    hospital_affiliation: 'Cedarcrest Hospital',
    bio: 'Certified reproductive healthcare doctor providing confidential virtual consultations on family planning, contraceptive advice, and cycle concerns.',
    years_experience: 8,
    rating: 4.9,
    reviews_count: 43,
    fee_ngn: 14000,
    fee_usd: 18,
    avatar_bg: '#ECFDF5',
    avatar_color: '#008080',
    initials: 'ZA',
    photo_url: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=500&auto=format&fit=crop&q=80',
    spoken_languages: ['English', 'Hausa'],
    is_verified: true,
    is_available_today: true,
    next_available_slot: 'Tomorrow, 11:00 AM',
  },
];

export const PARTNER_CLINICS_LIST: PartnerClinic[] = [
  {
    clinic_id: 'clinic_redapple_telemed',
    name: 'Red Apple Telemedicine Specialist Clinic',
    category: 'gynaecology',
    category_label: "Telemedicine & Women's Health",
    is_partner: true,
    rating: 4.9,
    reviews_count: 148,
    address: 'Adeola Odeku St, Victoria Island, Lagos',
    city: 'Lagos',
    state: 'Lagos State',
    phone: '+234 800 733 2775',
    email: 'clinic@redapple.health',
    opening_hours: 'Mon - Sun: 24/7 Virtual & Walk-in',
    photo_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
    services: ['Virtual Video Consultation', 'Gynaecological Exam', 'Prenatal Care', 'Fertility Profiling', 'Postpartum Wellness'],
    lead_doctor: 'Dr. Chioma Nwachukwu',
    affiliated_doctor_ids: ['doc_mesal_okubor'],
    lat: 6.4281,
    lng: 3.4219,
    description: 'Flagship clinical center providing virtual and hybrid obstetrics, gynaecology, and maternal telemedicine across Nigeria.',
  },
  {
    clinic_id: 'clinic_bridge_ikeja',
    name: 'The Bridge Clinic - Fertility & IVF Care',
    category: 'fertility',
    category_label: 'Fertility & IVF Center',
    is_partner: true,
    rating: 4.8,
    reviews_count: 210,
    address: '66 Oduduwa Crescent, GRA Ikeja, Lagos',
    city: 'Lagos',
    state: 'Lagos State',
    phone: '+234 1 631 0092',
    email: 'enquiries@thebridgeclinic.com',
    opening_hours: 'Mon - Fri: 8:00 AM - 5:00 PM, Sat: 9:00 AM - 2:00 PM',
    photo_url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop&q=80',
    services: ['IVF & ICSI Embryology', 'Egg & Sperm Freezing', 'Pre-implantation Genetic Testing', 'Ovulation Induction', 'Reproductive Surgery'],
    lead_doctor: 'Dr. Folake Adeleke',
    affiliated_doctor_ids: ['doc_folake_adeleke'],
    lat: 6.5912,
    lng: 3.357,
    description: 'Internationally accredited fertility clinic offering cutting-edge IVF, ICSI, and reproductive medicine in West Africa.',
  },
  {
    clinic_id: 'clinic_nordica_ikoyi',
    name: 'Nordica Fertility Center',
    category: 'fertility',
    category_label: 'Assisted Conception & IVF',
    is_partner: true,
    rating: 4.8,
    reviews_count: 195,
    address: '106 Norman Williams Street, Ikoyi, Lagos',
    city: 'Lagos',
    state: 'Lagos State',
    phone: '+234 1 461 7023',
    email: 'info@nordicavf.com',
    opening_hours: 'Mon - Fri: 8:00 AM - 5:00 PM',
    photo_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80',
    services: ['Assisted Reproduction', 'Endometriosis Management', 'Fertility Screening', 'Embryo Cryopreservation', 'Laparoscopic Surgery'],
    lead_doctor: 'Dr. Babatunde Alabi',
    affiliated_doctor_ids: ['doc_babatunde_alabi'],
    lat: 6.452,
    lng: 3.441,
    description: 'Pioneering fertility and endoscopic center specializing in complex infertility, PCOS, and advanced assisted reproductive techniques.',
  },
  {
    clinic_id: 'clinic_south_shore',
    name: "South Shore Women's and Children's Hospital",
    category: 'birthing_center',
    category_label: 'Maternity & Maternal-Fetal Center',
    is_partner: true,
    rating: 4.7,
    reviews_count: 164,
    address: 'Plot 10, Block 113, Off Bishop Aboyade Cole St, Victoria Island, Lagos',
    city: 'Lagos',
    state: 'Lagos State',
    phone: '+234 809 045 4000',
    email: 'care@southshorehospital.com',
    opening_hours: 'Open 24 Hours (Maternity & Emergency)',
    photo_url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&auto=format&fit=crop&q=80',
    services: ['Water Birth & Natural Delivery', 'High-Risk Maternal-Fetal Care', 'Neonatal ICU (NICU)', 'Laparoscopic Surgery', 'Antenatal Classes'],
    lead_doctor: 'Dr. Chidinma Eze',
    affiliated_doctor_ids: ['doc_chidinma_eze'],
    lat: 6.435,
    lng: 3.438,
    description: "Premier dedicated women and children's facility with luxury private birthing suites and level-3 neonatal intensive care.",
  },
  {
    clinic_id: 'clinic_lagoon_ikoyi',
    name: "Lagoon Women's Specialist Hospital",
    category: 'hospital',
    category_label: "Women's Specialist Hospital",
    is_partner: true,
    rating: 4.9,
    reviews_count: 176,
    address: '17B Bourdillon Road, Ikoyi, Lagos',
    city: 'Lagos',
    state: 'Lagos State',
    phone: '+234 1 888 8890',
    email: 'info@lagoonhospitals.com',
    opening_hours: 'Open 24 Hours',
    photo_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
    services: ['Reproductive Endocrinology', 'Minimally Invasive Surgery', 'Comprehensive Well-Woman Screening', 'Infertility Evaluation'],
    lead_doctor: 'Dr. Amina Bello',
    affiliated_doctor_ids: ['doc_amina_bello'],
    lat: 6.453,
    lng: 3.435,
    description: 'JCI-accredited tertiary hospital offering exceptional reproductive endocrinology, advanced gynaecological surgery, and round-the-clock emergency care.',
  },
  {
    clinic_id: 'clinic_georges_lekki',
    name: "Georges Memorial Medical Centre",
    category: 'birthing_center',
    category_label: 'Birthing & Gynaecology Center',
    is_partner: true,
    rating: 4.7,
    reviews_count: 132,
    address: '6 Rasheed Alaba Williams Street, Lekki Phase 1, Lagos',
    city: 'Lagos',
    state: 'Lagos State',
    phone: '+234 1 271 9080',
    email: 'care@georgesmedical.com',
    opening_hours: 'Mon - Sun: 24 Hours',
    photo_url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
    services: ['Advanced Birthing Suites', 'Obstetrics & Gynaecology', 'Fetal Assessment', 'Postnatal Support', 'Well-Woman Checkups'],
    lat: 6.4475,
    lng: 3.472,
    description: 'Renowned boutique healthcare center specializing in personalized, dignified birthing experiences and specialized obstetrics in Lekki.',
  },
  {
    clinic_id: 'clinic_nisa_abuja',
    name: 'Nisa Premier Hospital (Maternal & IVF Centre)',
    category: 'fertility',
    category_label: 'Pioneer IVF & Maternity Hospital',
    is_partner: true,
    rating: 4.8,
    reviews_count: 220,
    address: '15/21 Alex Ekwueme Way, Jabi, Abuja',
    city: 'Abuja',
    state: 'FCT Abuja',
    phone: '+234 817 421 0001',
    email: 'contact@nisapremierhospital.com',
    opening_hours: 'Open 24 Hours',
    photo_url: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80',
    services: ['Pioneer IVF Center', 'Maternity Delivery', 'Cervical Cancer Screening', 'Fertility Counseling', 'High-Risk Pregnancy'],
    lat: 9.062,
    lng: 7.428,
    description: 'Pioneering private hospital in northern Nigeria with historic achievements in assisted reproductive technology, neonatal intensive care, and obstetrics.',
  },
];

export const MOCK_DOCTOR_IDS = new Set<string>([]);

class TelemedicineStore {
  private filePath: string;
  private initialized: boolean = false;
  private doctors: Map<string, Doctor> = new Map();
  private slots: Map<string, TimeSlot> = new Map();
  private bookings: Map<string, ConsultationBooking> = new Map();
  private reviews: Map<string, DoctorReview> = new Map();
  private clinics: Map<string, PartnerClinic> = new Map();

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
      this.doctors.set(d.doctor_id, d);
    }
    for (const s of data.slots || []) {
      this.slots.set(s.slot_id, s);
    }
    for (const b of data.bookings || []) {
      this.bookings.set(b.booking_id, b);
    }
    for (const r of data.reviews || []) {
      this.reviews.set(r.review_id, r);
    }
    this.clinics.clear();
    for (const c of data.clinics || []) {
      this.clinics.set(c.clinic_id, c);
    }

    this.ensureVerifiedDoctors();
  }

  private ensureVerifiedDoctors(): void {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let modified = false;

    for (const doc of VERIFIED_DOCTORS_LIST) {
      if (!this.doctors.has(doc.doctor_id)) {
        this.doctors.set(doc.doctor_id, doc);
        modified = true;
      }

      const slotHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00'];
      for (const hr of slotHours) {
        const slotId = `slot_${doc.doctor_id}_${todayStr}_${hr.replace(':', '')}`;
        if (!this.slots.has(slotId)) {
          this.slots.set(slotId, {
            slot_id: slotId,
            doctor_id: doc.doctor_id,
            date: todayStr,
            start_time: hr,
            end_time: `${parseInt(hr.split(':')[0], 10) + 1}:00`,
            formatted_time: `Today, ${hr}`,
            is_booked: false,
          });
          modified = true;
        }
      }
    }

    for (const clinic of PARTNER_CLINICS_LIST) {
      if (!this.clinics.has(clinic.clinic_id)) {
        this.clinics.set(clinic.clinic_id, clinic);
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
        name: 'Dr. Chioma Nwachukwu',
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
        comment: 'Dr. Chioma Nwachukwu was deeply reassuring during my consultation. Highly recommended!',
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
        doctor_name: 'Dr. Chioma Nwachukwu',
        doctor_specialty: 'Obstetrician & Gynecologist',
        doctor_credentials: 'MBBS, FWACS, FMCOG',
        doctor_initials: 'CN',
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
        clinics: Array.from(this.clinics.values()),
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
      status: 'requested',
      fee_paid_ngn: 0,
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

  public async updateBookingPayment(
    bookingId: string,
    status: BookingStatus,
    feePaidNgn: number
  ): Promise<ConsultationBooking> {
    await this.init();
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new Error('Booking not found.');
    }

    booking.status = status;
    booking.fee_paid_ngn = feePaidNgn;
    booking.updated_at = new Date().toISOString();

    this.bookings.set(bookingId, booking);
    this.persistSync();
    return booking;
  }

  public async getPartnerClinics(filter?: {
    category?: string;
    city?: string;
    search?: string;
  }): Promise<PartnerClinic[]> {
    await this.init();
    let result = Array.from(this.clinics.values());
    if (result.length === 0) {
      result = PARTNER_CLINICS_LIST;
    }

    if (filter?.category && filter.category.toLowerCase() !== 'all') {
      const cat = filter.category.toLowerCase().trim();
      result = result.filter((c) => c.category.toLowerCase() === cat);
    }

    if (filter?.city && filter.city.toLowerCase() !== 'all') {
      const city = filter.city.toLowerCase().trim();
      result = result.filter((c) => c.city.toLowerCase().includes(city));
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.category_label.toLowerCase().includes(q) ||
          c.services.some((s) => s.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public async getPartnerClinicById(clinicId: string): Promise<PartnerClinic | null> {
    await this.init();
    const clinic = this.clinics.get(clinicId);
    if (!clinic) return null;
    return clinic;
  }
}

export const telemedicineStore = new TelemedicineStore();
