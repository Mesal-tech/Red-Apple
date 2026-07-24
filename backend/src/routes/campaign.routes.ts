import { Router } from 'express';
import { getActiveCampaigns } from '../controllers/campaign.controller';

const router = Router();

router.get('/active', getActiveCampaigns);

export default router;
