import { Request, Response, NextFunction } from 'express';

export async function getArticles(req: Request, res: Response, next: NextFunction) {
  try {
    const category = req.query.category as string;
    return res.json({
      success: true,
      articles: [
        {
          id: 'art1',
          title: 'Understanding Your LH Surge & Peak Ovulation Window',
          category: 'Fertility',
          readTime: '4 min read',
          summary: 'Discover how luteinizing hormone triggers egg release.',
          medicalReviewedBy: 'Dr. Mesal Okubor, MBBS, FWACS',
        },
        {
          id: 'art2',
          title: 'Phase-Based Nutrition: Fueling the Follicular & Luteal Phases',
          category: 'Nutrition',
          readTime: '6 min read',
          summary: 'Adjusting iron and healthy fat intake across your cycle.',
          medicalReviewedBy: 'Dr. Mesal Okubor, MBBS, FWACS',
        },
      ],
    });
  } catch (error) {
    next(error);
  }
}

export async function getArticleById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    return res.json({
      success: true,
      article: {
        id,
        title: 'Understanding Your LH Surge & Peak Ovulation Window',
        category: 'Fertility',
        content: 'Full article body content...',
        medicalReviewedBy: 'Dr. Mesal Okubor, MBBS, FWACS',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, category, content } = req.body;
    return res.status(201).json({
      success: true,
      message: 'Article draft created for medical review',
      article: {
        id: 'art_' + Date.now(),
        title,
        category,
        status: 'in_review',
      },
    });
  } catch (error) {
    next(error);
  }
}
