import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StreamClient } from '@stream-io/node-sdk';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { telemedicineStore } from '../data/telemedicine.store';
import { userStore } from '../data/user.store';
import { config } from '../config';

// Lazy-initialized Stream Video Client
let streamClientInstance: StreamClient | null = null;
function getStreamClient(): StreamClient | null {
  if (!streamClientInstance && config.stream.apiKey && config.stream.apiSecret) {
    streamClientInstance = new StreamClient(config.stream.apiKey, config.stream.apiSecret);
  }
  return streamClientInstance;
}

export async function getDoctors(req: Request, res: Response, next: NextFunction) {
  try {
    const specialty = req.query.specialty as string | undefined;
    const search = req.query.search as string | undefined;

    const doctors = await telemedicineStore.getDoctors({ specialty, search });
    return res.json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoctorById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const doctor = await telemedicineStore.getDoctorById(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Specialist doctor not found.',
      });
    }

    return res.json({
      success: true,
      doctor,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoctorSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const date = req.query.date as string | undefined;

    const slots = await telemedicineStore.getSlotsByDoctor(id, date);
    return res.json({
      success: true,
      doctorId: id,
      slots,
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
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { doctorId, slotId, scheduledTime, reason, symptomsNotes, consultationType } = req.body;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'Doctor ID is required.' });
    }

    const user = await userStore.findById(userId);
    const userName = user?.name || 'Red Apple Patient';

    const booking = await telemedicineStore.bookConsultation(userId, {
      doctorId,
      slotId,
      scheduledTime,
      reason: reason || 'Reproductive Health Consultation',
      symptomsNotes,
      consultationType: consultationType || 'video',
      userName,
    });

    return res.status(201).json({
      success: true,
      message: 'Consultation appointment confirmed successfully.',
      booking,
    });
  } catch (error: any) {
    if (error.message?.includes('already been booked') || error.message?.includes('not found')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function getUserBookings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const bookings = await telemedicineStore.getUserBookings(userId);
    return res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBookingById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const booking = await telemedicineStore.getBookingById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.user_id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access to booking.' });
    }

    return res.json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { id } = req.params;
    const booking = await telemedicineStore.cancelBooking(userId, id);

    return res.json({
      success: true,
      message: 'Appointment cancelled successfully.',
      booking,
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized') || error.message?.includes('not found')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function completeConsultation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { doctorNotes, prescriptionSummary } = req.body;

    const booking = await telemedicineStore.completeBooking(id, doctorNotes, prescriptionSummary);
    return res.json({
      success: true,
      message: 'Consultation marked as completed.',
      booking,
    });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function submitDoctorReview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { id: bookingId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || typeof rating !== 'number') {
      return res.status(400).json({ success: false, message: 'Valid rating (1-5) is required.' });
    }

    const booking = await telemedicineStore.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const user = await userStore.findById(userId);
    const userName = user?.name || 'Verified Patient';

    const review = await telemedicineStore.addReview(userId, userName, {
      doctorId: booking.doctor_id,
      rating,
      comment: comment || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      review,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function addDoctorSlot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { doctorId, date, startTime, endTime, formattedTime } = req.body;
    if (!doctorId || !date || !startTime) {
      return res.status(400).json({ success: false, message: 'doctorId, date, and startTime are required.' });
    }

    const slot = await telemedicineStore.addSlot(doctorId, { date, startTime, endTime, formattedTime });
    return res.status(201).json({
      success: true,
      message: 'Consultation slot added successfully.',
      slot,
    });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function toggleDoctorSlot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const slot = await telemedicineStore.toggleSlot(id);
    return res.json({
      success: true,
      message: `Slot ${slot.is_booked ? 'blocked' : 'opened'} successfully.`,
      slot,
    });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function getStreamToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthenticatedRequest;
    const requestedUserId = (req.query.userId as string) || (req.body?.userId as string);
    const requestedUserName = (req.query.userName as string) || (req.body?.userName as string);
    const requestedRole = (req.query.role as string) || (req.body?.role as string);

    const userId = requestedUserId || authReq.user?.userId || 'usr_' + Date.now().toString(36);

    let userName = requestedUserName;
    let userRole = requestedRole || authReq.user?.role || 'user';

    if (!userName && authReq.user?.userId) {
      const user = await userStore.findById(authReq.user.userId);
      userName = user?.name || (authReq.user.role === 'doctor' ? 'Dr. Mesal Okubor' : 'Red Apple Patient');
    }

    if (!userName) {
      userName = userRole === 'doctor' ? 'Dr. Mesal Okubor' : 'Amara Okonkwo';
    }

    const userImage = `https://getstream.io/random_png/?id=${userId}&name=${encodeURIComponent(userName)}`;

    const apiKey = config.stream.apiKey;
    const client = getStreamClient();

    let token: string;
    if (client && config.stream.apiSecret) {
      token = client.generateUserToken({ user_id: userId, validity_in_seconds: 30 * 24 * 3600 });
      try {
        await client.upsertUsers([
          {
            id: userId,
            name: userName,
            role: userRole === 'doctor' ? 'admin' : 'user',
            image: userImage,
          },
        ]);
      } catch (upsertErr) {
        console.warn('[TelemedicineController] Stream upsertUsers warning:', upsertErr);
      }
    } else {
      const now = Math.floor(Date.now() / 1000);
      const secret = config.stream.apiSecret || 'stream-default-dev-secret';
      token = jwt.sign(
        {
          user_id: userId,
          role: userRole === 'doctor' ? 'admin' : 'user',
          iat: now,
          exp: now + 30 * 24 * 3600,
        },
        secret
      );
    }

    return res.json({
      success: true,
      apiKey,
      token,
      user: {
        id: userId,
        name: userName,
        role: userRole,
        image: userImage,
      },
      isConfigured: Boolean(config.stream.apiSecret),
    });
  } catch (error) {
    next(error);
  }
}
