import bcrypt from 'bcryptjs';
import prisma from './prisma';

async function main() {
  console.log('🌱 Seeding NeonDB PostgreSQL database with Red Apple data...');

  // 1. Categories
  const categoryNames = [
    'FERTILITY',
    'PREGNANCY',
    'CONCEPTION',
    'HEALTH GUIDE',
    'NUTRITION',
    'MENOPAUSE',
  ];

  const categoryMap = new Map<string, string>();
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap.set(name, cat.category_id);
  }
  console.log('✅ Categories seeded');

  // 2. Passwords
  const saltRounds = 10;
  const amaraPasswordHash = await bcrypt.hash('Amara@2026', saltRounds);
  const adminPasswordHash = await bcrypt.hash('Admin@2026', saltRounds);
  const doctorPasswordHash = await bcrypt.hash('Doctor@2026', saltRounds);

  // 3. Users
  const amara = await prisma.user.upsert({
    where: { email: 'amara@redapple.health' },
    update: {
      password_hash: amaraPasswordHash,
      health_profile: {
        cycleLength: 28,
        periodDuration: 5,
        lastPeriodDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reproductiveGoal: 'track_cycle',
        stage: 'cycle',
      },
    },
    create: {
      user_id: 'usr_amara_default_01',
      name: 'Amara Okonkwo',
      email: 'amara@redapple.health',
      phone: '+2348012345678',
      password_hash: amaraPasswordHash,
      pregnancy_mode: false,
      role: 'user',
      health_profile: {
        cycleLength: 28,
        periodDuration: 5,
        lastPeriodDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reproductiveGoal: 'track_cycle',
        stage: 'cycle',
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@redapple.health' },
    update: { password_hash: adminPasswordHash },
    create: {
      user_id: 'usr_admin_default_01',
      name: 'System Admin',
      email: 'admin@redapple.health',
      phone: '+2348000000000',
      password_hash: adminPasswordHash,
      pregnancy_mode: false,
      role: 'admin',
    },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'mesalokubor63@gmail.com' },
    update: { password_hash: doctorPasswordHash, role: 'doctor' },
    create: {
      user_id: 'fb5e54b9-7b39-41af-9a77-6a34e0471b18',
      name: 'Dr. Chioma Nwachukwu',
      email: 'mesalokubor63@gmail.com',
      phone: '+2348033334444',
      password_hash: doctorPasswordHash,
      pregnancy_mode: false,
      role: 'doctor',
    },
  });
  console.log('✅ Users seeded (Amara, Admin, Doctor)');

  // 4. Clinics
  const arkClinic = await prisma.clinic.upsert({
    where: { clinic_id: 'clinic_ark_warri' },
    update: {},
    create: {
      clinic_id: 'clinic_ark_warri',
      name: 'The Ark Clinic & Reproductive Care',
      location: 'Warri, Delta State',
      address: 'Plot 14 Airport Road, Effurun-Warri',
      contact_email: 'notifications@arkclinicwarri.com',
      contact_phone: '+2348055556666',
      latitude: 5.5442,
      longitude: 5.7603,
    },
  });

  const redAppleClinic = await prisma.clinic.upsert({
    where: { clinic_id: 'clinic_redapple_telemed' },
    update: {},
    create: {
      clinic_id: 'clinic_redapple_telemed',
      name: 'Red Apple Virtual Care & Telemedicine',
      location: 'Lagos & Pan-Nigeria Virtual Network',
      address: 'Victoria Island, Lagos, Nigeria',
      contact_email: 'support@redapple.health',
      contact_phone: '+2348000001234',
      latitude: 6.4281,
      longitude: 3.4219,
    },
  });
  console.log('✅ Clinics seeded');

  // 5. Doctors
  const docChioma = await prisma.doctor.upsert({
    where: { doctor_id: 'doc_mesal_okubor' },
    update: { clinic_id: arkClinic.clinic_id },
    create: {
      doctor_id: 'doc_mesal_okubor',
      clinic_id: arkClinic.clinic_id,
      name: 'Dr. Chioma Nwachukwu',
      specialty: 'Obstetrician & Gynecologist',
      subspecialty: 'Telemedicine & Reproductive Healthcare',
      rating: 5.0,
      consultation_fee: 15000,
      avatar_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
    },
  });

  const docAmina = await prisma.doctor.upsert({
    where: { doctor_id: 'doc_amina_bello' },
    update: { clinic_id: redAppleClinic.clinic_id },
    create: {
      doctor_id: 'doc_amina_bello',
      clinic_id: redAppleClinic.clinic_id,
      name: 'Dr. Amina Bello',
      specialty: 'Reproductive Endocrinologist',
      subspecialty: 'Fertility & Hormonal Health',
      rating: 4.9,
      consultation_fee: 20000,
      avatar_url: 'https://images.unsplash.com/photo-1594824813593-3932a3928157?w=500&auto=format&fit=crop&q=80',
    },
  });
  console.log('✅ Doctors seeded');

  // 6. Availability Slots for Tomorrow & this week
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const slot1 = new Date(tomorrow);
  const slot1End = new Date(tomorrow);
  slot1End.setHours(11, 0, 0, 0);

  await prisma.availabilitySlot.createMany({
    data: [
      {
        slot_id: 'slot_chioma_tomorrow_10am',
        doctor_id: docChioma.doctor_id,
        start_time: slot1,
        end_time: slot1End,
        is_booked: false,
      },
      {
        slot_id: 'slot_amina_tomorrow_12pm',
        doctor_id: docAmina.doctor_id,
        start_time: new Date(tomorrow.getTime() + 2 * 3600000),
        end_time: new Date(tomorrow.getTime() + 3 * 3600000),
        is_booked: false,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Availability Slots seeded');

  // 7. Education Articles
  const articles = [
    {
      article_id: 'art_1',
      title: 'Sex for Pregnancy Guide',
      category: 'FERTILITY',
      category_id: categoryMap.get('FERTILITY'),
      read_time: '4 min read',
      author: 'Clinical Review Board • Fertility Care',
      excerpt: 'The best days for intimacy when you are trying to conceive.',
      content:
        'Timing intimacy correctly is one of the most effective ways to optimize conception chances. Ovulation typically occurs 14 days before your next expected period. Sperm can survive inside the reproductive tract for up to 5 days, whereas an egg remains viable for only 12–24 hours after release. Having intercourse during the 5 days leading up to ovulation and on ovulation day maximizes the likelihood of fertilization.',
      status: 'published',
    },
    {
      article_id: 'art_2',
      title: 'Early Signs of Pregnancy',
      category: 'PREGNANCY',
      category_id: categoryMap.get('PREGNANCY'),
      read_time: '5 min read',
      author: 'Obstetrics & Gynecology Editorial Team',
      excerpt: 'Recognizing early body changes in the first few weeks of pregnancy.',
      content:
        'Early signs include mild cramping and light implantation spotting, missed menses, breast tenderness, fatigue, and heightened olfactory sensitivity. Progesterone surges alter smooth muscle tension, often manifesting as nausea or morning sickness.',
      status: 'published',
    },
    {
      article_id: 'art_3',
      title: 'Understanding Basal Body Temperature (BBT)',
      category: 'CONCEPTION',
      category_id: categoryMap.get('CONCEPTION'),
      read_time: '6 min read',
      author: 'Reproductive Endocrinology Unit',
      excerpt: 'How waking temperature mirrors progesterone elevation post-ovulation.',
      content:
        'Basal body temperature (BBT) remains lower in the follicular phase and experiences a sustained 0.3°C to 0.6°C jump immediately following ovulation due to thermogenic progesterone secreted by the corpus luteum.',
      status: 'published',
    },
    {
      article_id: 'art_4',
      title: 'Nutritional Pillars for Luteal Support',
      category: 'NUTRITION',
      category_id: categoryMap.get('NUTRITION'),
      read_time: '4 min read',
      author: 'Maternal Nutrition Team',
      excerpt: 'Micronutrients to support natural progesterone synthesis.',
      content:
        'Adequate zinc, magnesium, and vitamin B6 intake stabilizes steroidogenesis, mitigating luteal phase defects and regulating cycle regularity.',
      status: 'published',
    },
  ];

  for (const art of articles) {
    await prisma.educationArticle.upsert({
      where: { article_id: art.article_id },
      update: art,
      create: art,
    });
  }
  console.log('✅ Educational Articles seeded');

  // 8. Cycle Logs for Amara
  const cycleStart = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000);
  await prisma.cycleLog.upsert({
    where: { log_id: 'log_amara_last_period' },
    update: {},
    create: {
      log_id: 'log_amara_last_period',
      user_id: amara.user_id,
      start_date: cycleStart,
      end_date: new Date(cycleStart.getTime() + 4 * 24 * 60 * 60 * 1000),
      flow_intensity: 'moderate',
      is_period_day: true,
      symptoms: ['Mild cramps', 'Fatigue'],
      notes: 'Standard regular cycle start',
    },
  });
  console.log('✅ Cycle Logs seeded');

  // 9. Pregnancy Tracker for Amara (ready if pregnancy mode toggled)
  await prisma.pregnancyTracker.upsert({
    where: { user_id: amara.user_id },
    update: {},
    create: {
      user_id: amara.user_id,
      lmp_date: new Date('2026-06-01'),
      current_week: 18,
      due_date: new Date('2027-03-08'),
      kick_sessions: [
        { session_id: 'kick_01', kick_count: 10, duration_minutes: 15, recorded_at: new Date().toISOString() },
      ],
      contraction_logs: [],
    },
  });
  console.log('✅ Pregnancy Tracker seeded');

  console.log('🎉 NeonDB seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
