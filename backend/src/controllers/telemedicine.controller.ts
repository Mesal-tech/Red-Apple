import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getDoctors(req: Request, res: Response, next: NextFunction) {
  try {
    return res.json({
      success: true,
      doctors: [
        {
          id: 'doc1',
          name: 'Dr. Claire Vance, MD',
          specialty: 'Fertility & Reproductive Endocrinologist',
          rating: 4.9,
          availableNext: 'Today at 3:30 PM',
          consultationFee: '$65 / 20 min',
        },
        {
          id: 'doc2',
          name: 'Dr. Marcus Thorne, FACOG',
          specialty: 'OB-GYN & High Risk Pregnancy',
          rating: 4.8,
          availableNext: 'Tomorrow at 10:00 AM',
          consultationFee: '$80 / 30 min',
        },
      ],
    });
  } catch (error) {
    next(error);
  }
}

export async function bookConsultation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { doctorId, slotId, scheduledTime } = req.body;
    return res.status(201).json({
      success: true,
      message: 'Consultation request submitted',
      booking: {
        id: 'book_' + Date.now(),
        doctorId,
        scheduledTime,
        status: 'requested',
        encryptedVideoRoom: 'https://telehealth.redapple.health/room_abc123',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserBookings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    return res.json({
      success: true,
      bookings: [
        {
          id: 'book_1',
          doctorName: 'Dr. Claire Vance, MD',
          scheduledTime: '2026-07-28 15:30:00',
          status: 'confirmed',
        },
      ],
    });
  } catch (error) {
    next(error);
  }
}
