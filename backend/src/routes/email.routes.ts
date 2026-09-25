import { Router } from 'express';
import {
  sendEmail,
  getReceivedEmails,
  getReceivedEmailDetail,
  getReceivedEmailAttachments,
  getReceivedEmailAttachment,
  getSentEmails,
  getSentEmailDetail,
} from '../controllers/email.controller';

const router = Router();

router.post('/send', sendEmail);
router.get('/receiving', getReceivedEmails);
router.get('/receiving/:id', getReceivedEmailDetail);
router.get('/receiving/:id/attachments', getReceivedEmailAttachments);
router.get('/receiving/:id/attachments/:attachmentId', getReceivedEmailAttachment);
router.get('/sent', getSentEmails);
router.get('/sent/:id', getSentEmailDetail);

export default router;
