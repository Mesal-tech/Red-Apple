import { Router } from 'express';
import {
  getDoctors,
  bookConsultation,
  getUserBookings,
} from '../controllers/telemedicine.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/doctors', getDoctors);
router.post('/book', authenticateToken, bookConsultation);
router.get('/bookings', authenticateToken, getUserBookings);

export default router;
