import { Router } from 'express';
import {
  getArticles,
  getArticleById,
  createArticle,
} from '../controllers/education.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getArticles);
router.get('/articles', getArticles);
router.get('/:id', getArticleById);
router.get('/articles/:id', getArticleById);
router.post('/', authenticateToken, requireRole('admin'), createArticle);
router.post('/articles', authenticateToken, requireRole('admin'), createArticle);

export default router;
