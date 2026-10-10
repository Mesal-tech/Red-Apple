import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export interface EducationArticle {
  id: string;
  title: string;
  category: 'ALL' | 'FERTILITY' | 'PREGNANCY' | 'CONCEPTION' | 'HEALTH GUIDE' | 'NUTRITION' | 'MENOPAUSE';
  readTime: string;
  readers: string;
  author: string;
  summary: string;
  bullets: string[];
  content?: string;
  thumbnail?: string;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  featured?: boolean;
  status: 'published' | 'draft' | 'in_review';
  medicalReviewedBy: string;
  created_at: string;
  updated_at: string;
}

const SEED_ARTICLES: EducationArticle[] = [
  {
    id: 'art_1',
    title: 'Sex for Pregnancy Guide',
    category: 'FERTILITY',
    readTime: '4 min read',
    readers: '14.8k',
    author: 'Clinical Review Board • Fertility Care',
    summary: 'The best days for intimacy when you are trying to conceive.',
    bullets: [
      'Track ovulation with morning basal body temp and LH test strips.',
      'Your highest chance of getting pregnant is 1–2 days before ovulation.',
      'Stay hydrated and keep stress levels manageable during the luteal window.',
    ],
    content:
      'Timing intimacy correctly is one of the most effective ways to optimize conception chances. Ovulation typically occurs 14 days before your next expected period. Sperm can survive inside the reproductive tract for up to 5 days, whereas an egg remains viable for only 12–24 hours after release. Therefore, having intercourse during the 5 days leading up to ovulation and the day of ovulation maximizes the likelihood of fertilization.',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    featured: true,
    status: 'published',
    medicalReviewedBy: 'Obstetrics & Gynecology Editorial Team',
    created_at: new Date('2026-08-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'art_2',
    title: 'Early Signs of Pregnancy',
    category: 'PREGNANCY',
    readTime: '5 min read',
    readers: '11.2k',
    author: 'Obstetrics & Gynecology Editorial Team',
    summary: 'Recognizing early body changes in the first few weeks of pregnancy.',
    bullets: [
      'Implantation spotting vs regular period: how to identify the subtle differences.',
      'Progesterone surge causing elevated fatigue, tender breasts, and morning sickness.',
      'The optimal window to take a home pregnancy test for maximal diagnostic accuracy.',
    ],
    content:
      'Early pregnancy symptoms can emerge as early as 10–14 days post-conception. Implantation bleeding is typically lighter and pinker/brownish compared to menstrual flow. Elevated hCG levels trigger heightened olfactory sensitivity and morning nausea.',
    thumbnail: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80',
    status: 'published',
    medicalReviewedBy: 'Maternal-Fetal Clinical Board',
    created_at: new Date('2026-08-05').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'art_3',
    title: 'How to Get Pregnant Faster',
    category: 'CONCEPTION',
    readTime: '6 min read',
    readers: '16.5k',
    author: 'Reproductive Endocrinology Advisory',
    summary: 'Practical tips on cycle tracking, healthy lifestyle habits, and timing intimacy.',
    bullets: [
      'Understanding cervical mucus changes to pinpoint your peak fertile window.',
      'Taking essential prenatal vitamins like Folic Acid (400mcg) prior to conception.',
      'Optimizing sleep hygiene and minimizing endocrine-disrupting chemicals.',
    ],
    content:
      'Optimizing reproductive health involves lifestyle modifications and accurate cycle tracking. A healthy balanced diet rich in leafy greens, zinc, and antioxidants supports egg and sperm quality.',
    thumbnail: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
    status: 'published',
    medicalReviewedBy: 'Clinical Endocrinology Review Board',
    created_at: new Date('2026-08-10').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'art_4',
    title: 'Vaginal Discharge Color & Texture Guide',
    category: 'HEALTH GUIDE',
    readTime: '3 min read',
    readers: '9.3k',
    author: 'Maternal-Fetal Clinical Team',
    summary: 'Your daily discharge is a healthy biomarker that shifts naturally across your menstrual cycle.',
    bullets: [
      'Clear & stretchy (raw egg-white texture): Your most fertile ovulatory days.',
      'Creamy & thick white: Normal luteal phase discharge preparing for menstruation.',
      'Clumpy white with pruritus/itching: Indicates possible candidiasis, consult a doctor.',
    ],
    content:
      'Cervical fluid changes in response to estrogen and progesterone throughout your cycle. Tracking cervical fluid texture and volume gives real-time biofeedback on your hormonal state.',
    thumbnail: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
    status: 'published',
    medicalReviewedBy: 'Reproductive Healthcare Advisory',
    created_at: new Date('2026-08-15').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'art_5',
    title: 'Phase-Based Nutrition for Hormonal Balance',
    category: 'NUTRITION',
    readTime: '5 min read',
    readers: '8.1k',
    author: 'Women\'s Nutrition Clinical Board',
    summary: 'Fueling your follicular, ovulatory, and luteal phases with targeted micronutrients.',
    bullets: [
      'Menstrual phase: Replenish iron with dark leafy greens and lean proteins.',
      'Follicular phase: Incorporate fermented foods and sprouted seeds to metabolize estrogen.',
      'Luteal phase: Boost magnesium and vitamin B6 to reduce PMS symptoms and cramping.',
    ],
    content:
      'Cycle syncing your nutrition allows you to nourish your body with the exact nutrients required for each metabolic phase of your cycle, stabilizing mood and sustaining steady energy.',
    thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    status: 'published',
    medicalReviewedBy: 'Clinical Nutrition & Endocrinology Board',
    created_at: new Date('2026-08-20').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'art_6',
    title: 'Period Pain Relief Yoga',
    category: 'HEALTH GUIDE',
    readTime: '8 min video',
    readers: '16.7k',
    author: 'Aria Ross • Prenatal & Pelvic Yoga Instructor',
    summary: 'Gentle stretches and relaxing poses to ease period cramps and calm lower belly muscles.',
    bullets: [
      'Child Pose: Eases lower back tightness and belly pressure.',
      'Cat-Cow Stretch: Gently loosens your spine and relieves cramp aches.',
      'Reclining Stretch: Deeply relaxes tight pelvic and lower belly muscles.',
    ],
    content:
      'Pelvic floor relaxation and slow diaphragmatic breathing encourage blood circulation to the uterine wall, reducing the intensity of prostaglandin contractions during menstruation.',
    thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    status: 'published',
    medicalReviewedBy: 'Pelvic Physical Therapy & OB-GYN Board',
    created_at: new Date('2026-08-25').toISOString(),
    updated_at: new Date().toISOString(),
  },
];

class EducationStore {
  private articles: Map<string, EducationArticle> = new Map();
  private filePath: string;
  private initialized: boolean = false;

  constructor() {
    this.filePath = path.join(config.dataDir, 'education.json');
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const list: EducationArticle[] = JSON.parse(content);
        for (const a of list) this.articles.set(a.id, a);
      } catch (err) {
        console.error('[EducationStore] Failed to read articles file:', err);
      }
    }

    if (this.articles.size === 0) {
      for (const a of SEED_ARTICLES) this.articles.set(a.id, a);
      this.persistSync();
    }

    this.initialized = true;
  }

  private persistSync(): void {
    try {
      const list = Array.from(this.articles.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[EducationStore] Failed to persist articles:', err);
    }
  }

  public async getArticles(filter?: { category?: string; search?: string }): Promise<EducationArticle[]> {
    await this.init();
    let result = Array.from(this.articles.values()).filter((a) => a.status === 'published');

    if (filter?.category && filter.category.toUpperCase() !== 'ALL') {
      const cat = filter.category.toUpperCase();
      result = result.filter((a) => a.category.toUpperCase() === cat);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q) ||
          a.bullets.some((b) => b.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public async getArticleById(id: string): Promise<EducationArticle | null> {
    await this.init();
    return this.articles.get(id) || null;
  }

  public async createArticle(data: Omit<EducationArticle, 'id' | 'created_at' | 'updated_at'>): Promise<EducationArticle> {
    await this.init();
    const now = new Date().toISOString();
    const article: EducationArticle = {
      ...data,
      id: `art_${uuidv4().substring(0, 8)}`,
      created_at: now,
      updated_at: now,
    };
    this.articles.set(article.id, article);
    this.persistSync();
    return article;
  }
}

export const educationStore = new EducationStore();
