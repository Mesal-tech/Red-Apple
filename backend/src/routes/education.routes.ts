import { Router } from 'express';
import {
  getArticles,
  getArticleById,
  createArticle,
} from '../controllers/education.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/articles', getArticles);
router.get('/articles/:id', getArticleById);
router.post('/articles', authenticateToken, requireRole('admin'), createArticle);

export default router;
