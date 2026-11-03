import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getPartnerStatus,
  sendPartnerInvite,
  acceptPartnerInvite,
  unlinkPartner,
  updatePartnerPreferences,
  toggleDismissPartnerCard,
  getPartnerCycleData,
} from '../controllers/partner.controller';

const router = Router();

router.get('/status', authenticateToken, getPartnerStatus);
router.post('/invite', authenticateToken, sendPartnerInvite);
router.post('/accept', authenticateToken, acceptPartnerInvite);
router.delete('/unlink', authenticateToken, unlinkPartner);
router.put('/preferences', authenticateToken, updatePartnerPreferences);
router.post('/dismiss-card', authenticateToken, toggleDismissPartnerCard);
router.get('/partner-cycle', authenticateToken, getPartnerCycleData);

export default router;
