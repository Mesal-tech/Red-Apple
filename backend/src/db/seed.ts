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

  console.log('✅ Users seeded (Amara, Admin)');

  // 4. Education Articles
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
