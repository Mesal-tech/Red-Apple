import { Router } from 'express';
import {
  getDoctors,
  getDoctorById,
  getDoctorSlots,
  bookConsultation,
  getUserBookings,
  getBookingById,
  cancelBooking,
  completeConsultation,
  submitDoctorReview,
  addDoctorSlot,
  toggleDoctorSlot,
  getStreamToken,
} from '../controllers/telemedicine.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { verifyAccessToken } from '../utils/token';

const router = Router();

// Stream Video credentials & token generation (with optional auth fallback)
router.get(
  '/stream-token',
  (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = verifyAccessToken(token);
        (req as any).user = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
        };
      } catch (e) {
        // Allow stream-token to proceed even if session access token expired
      }
    }
    next();
  },
  getStreamToken
);

// Public doctor specialist directory & availability slots
router.get('/doctors', getDoctors);
router.get('/doctors/:id', getDoctorById);
router.get('/doctors/:id/slots', getDoctorSlots);

// Protected consultation booking & appointments lifecycle
router.post('/book', authenticateToken, bookConsultation);
router.get('/bookings', authenticateToken, getUserBookings);
router.get('/bookings/:id', authenticateToken, getBookingById);
router.patch('/bookings/:id/cancel', authenticateToken, cancelBooking);
router.patch('/bookings/:id/complete', authenticateToken, completeConsultation);
router.post('/bookings/:id/review', authenticateToken, submitDoctorReview);

// Doctor availability slot management
router.post('/slots', authenticateToken, addDoctorSlot);
router.patch('/slots/:id/toggle', authenticateToken, toggleDoctorSlot);

export default router;
