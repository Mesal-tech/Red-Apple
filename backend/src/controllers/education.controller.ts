import { Request, Response, NextFunction } from 'express';
import { educationStore } from '../data/education.store';

export async function getArticles(req: Request, res: Response, next: NextFunction) {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const articles = await educationStore.getArticles({ category, search });

    return res.json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (error) {
    next(error);
  }
}

export async function getArticleById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const article = await educationStore.getArticleById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Educational article not found.',
      });
    }

    return res.json({
      success: true,
      article,
    });
  } catch (error) {
    next(error);
  }
}

export async function createArticle(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      title,
      category,
      readTime,
      author,
      summary,
      bullets,
      content,
      icon,
      iconBg,
      iconColor,
      medicalReviewedBy,
    } = req.body;

    if (!title || !category || !summary) {
      return res.status(400).json({
        success: false,
        message: 'title, category, and summary are required fields.',
      });
    }

    const article = await educationStore.createArticle({
      title,
      category,
      readTime: readTime || '4 min read',
      readers: '1.2k',
      author: author || 'Red Apple Medical Board',
      summary,
      bullets: bullets || [],
      content: content || summary,
      icon: icon || 'book',
      iconBg: iconBg || '#EFF6FF',
      iconColor: iconColor || '#2563EB',
      status: 'published',
      medicalReviewedBy: medicalReviewedBy || 'Clinical Review Board, FWACS',
    });

    return res.status(201).json({
      success: true,
      message: 'Article created and published successfully.',
      article,
    });
  } catch (error) {
    next(error);
  }
}
