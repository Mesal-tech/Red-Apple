import { Router } from 'express';
import {
  getPregnancyStatus,
  updatePregnancyLMP,
  logKickSession,
  getKickHistory,
  logContraction,
  getContractionHistory,
} from '../controllers/pregnancy.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/status', getPregnancyStatus);
router.post('/lmp', updatePregnancyLMP);
router.post('/kicks', logKickSession);
router.get('/kicks', getKickHistory);
router.post('/contractions', logContraction);
router.get('/contractions', getContractionHistory);

export default router;
