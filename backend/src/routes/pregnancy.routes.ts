import { Router } from 'express';
import { getPregnancyStatus, updatePregnancyLMP } from '../controllers/pregnancy.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/status', getPregnancyStatus);
router.post('/lmp', updatePregnancyLMP);

export default router;
