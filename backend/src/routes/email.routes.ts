import { Router } from 'express';
import {
  sendEmail,
  getReceivedEmails,
  getReceivedEmailDetail,
  getSentEmails,
  getSentEmailDetail,
} from '../controllers/email.controller';

const router = Router();

router.post('/send', sendEmail);
router.get('/receiving', getReceivedEmails);
router.get('/receiving/:id', getReceivedEmailDetail);
router.get('/sent', getSentEmails);
router.get('/sent/:id', getSentEmailDetail);

export default router;
