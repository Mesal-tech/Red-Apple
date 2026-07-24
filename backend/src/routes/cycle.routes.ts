import { Router } from 'express';
import {
  getFertilityPrediction,
  logCycleSymptoms,
  getCycleHistory,
} from '../controllers/cycle.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/prediction', getFertilityPrediction);
router.post('/log', logCycleSymptoms);
router.get('/history', getCycleHistory);

export default router;
