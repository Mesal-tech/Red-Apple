import { v4 as uuidv4 } from 'uuid';
import prisma from '../db/prisma';

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

function mapPrismaArticle(a: any): EducationArticle {
  return {
    id: a.article_id,
    title: a.title,
    category: (a.category as any) || 'FERTILITY',
    readTime: a.read_time || '4 min read',
    readers: '10k+',
    author: a.author || 'Clinical Review Board',
    summary: a.excerpt || '',
    bullets: [],
    content: a.content,
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    featured: true,
    status: (a.status as any) || 'published',
    medicalReviewedBy: a.reviewed_by || 'Obstetrics & Gynecology Editorial Team',
    created_at: new Date(a.last_updated).toISOString(),
    updated_at: new Date(a.last_updated).toISOString(),
  };
}

class EducationStore {
  public async init(): Promise<void> {
    // Pure PostgreSQL / Prisma backed store. No mock files or seeds.
    return Promise.resolve();
  }

  public async getArticles(filter?: { category?: string; search?: string }): Promise<EducationArticle[]> {
    try {
      const dbArticles = await prisma.educationArticle.findMany({
        where: {
          status: 'published',
        },
        orderBy: { last_updated: 'desc' },
      });

      let list = dbArticles.map(mapPrismaArticle);

      if (filter?.category && filter.category.toUpperCase() !== 'ALL') {
        const cat = filter.category.toUpperCase();
        list = list.filter((a) => a.category.toUpperCase() === cat);
      }

      if (filter?.search) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q) ||
            (a.content && a.content.toLowerCase().includes(q))
        );
      }

      return list;
    } catch (err) {
      console.error('[EducationStore.getArticles] Prisma error:', err);
      return [];
    }
  }

  public async getArticleById(id: string): Promise<EducationArticle | null> {
    try {
      const a = await prisma.educationArticle.findUnique({
        where: { article_id: id },
      });
      return a ? mapPrismaArticle(a) : null;
    } catch (err) {
      console.error('[EducationStore.getArticleById] Prisma error:', err);
      return null;
    }
  }

  public async createArticle(
    data: Omit<EducationArticle, 'id' | 'created_at' | 'updated_at'>
  ): Promise<EducationArticle> {
    const created = await prisma.educationArticle.create({
      data: {
        article_id: `art_${uuidv4().substring(0, 8)}`,
        title: data.title,
        category: data.category || 'FERTILITY',
        read_time: data.readTime,
        author: data.author,
        excerpt: data.summary,
        content: data.content || data.summary,
        status: data.status || 'published',
        reviewed_by: data.medicalReviewedBy,
      },
    });

    return mapPrismaArticle(created);
  }
}

export const educationStore = new EducationStore();
