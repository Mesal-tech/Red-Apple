import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { paystackService } from '../services/paystack.service';
import { paymentStore } from '../data/payment.store';
import { telemedicineStore } from '../data/telemedicine.store';
import { userStore } from '../data/user.store';

export async function initializePayment(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { bookingId, channels, callbackUrl } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required.' });
    }

    const booking = await telemedicineStore.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const user = await userStore.findById(userId);
    const userEmail = user?.email || req.user?.email || 'patient@redapple.health';
    const userName = user?.name || booking.user_name || 'Patient';

    const doctor = await telemedicineStore.getDoctorById(booking.doctor_id);
    const amountInNaira = doctor?.fee_ngn || booking.fee_paid_ngn || 15000;

    const reference = `RAP_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Initialize with Paystack
    const paystackData = await paystackService.initializeTransaction({
      email: userEmail,
      amountInNaira,
      reference,
      callbackUrl,
      channels: channels || ['card', 'bank_transfer', 'ussd', 'apple_pay', 'mobile_money'],
      metadata: {
        bookingId: booking.booking_id,
        userId,
        doctorId: booking.doctor_id,
        doctorName: booking.doctor_name,
        scheduledTime: booking.scheduled_time,
      },
    });

    // Record pending transaction in store
    const tx = await paymentStore.createTransaction({
      reference,
      booking_id: booking.booking_id,
      user_id: userId,
      doctor_id: booking.doctor_id,
      amount: amountInNaira,
      amount_kobo: amountInNaira * 100,
      currency: 'NGN',
      status: 'pending',
      provider: 'paystack',
      customer_email: userEmail,
      customer_name: userName,
      authorization_url: paystackData.authorization_url,
      access_code: paystackData.access_code,
      metadata: {
        bookingId: booking.booking_id,
        doctorName: booking.doctor_name,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Payment initialized successfully.',
      payment: {
        reference: tx.reference,
        authorization_url: paystackData.authorization_url,
        access_code: paystackData.access_code,
        amount: amountInNaira,
        currency: 'NGN',
        bookingId: booking.booking_id,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyPayment(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference is required.' });
    }

    const tx = await paymentStore.getByReference(reference);
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction reference not found.' });
    }

    // Verify status with Paystack
    const paystackResult = await paystackService.verifyTransaction(reference);

    const isSuccess = paystackResult.status === 'success';
    const updatedTx = await paymentStore.updateStatus(
      reference,
      isSuccess ? 'success' : 'failed',
      {
        paid_at: paystackResult.paid_at || new Date().toISOString(),
        gateway_response: paystackResult.gateway_response,
        channel: paystackResult.channel as any,
      }
    );

    let updatedBooking = null;
    if (isSuccess && tx.booking_id) {
      const amountPaid = Math.round(paystackResult.amount / 100);
      try {
        updatedBooking = await telemedicineStore.updateBookingPayment(
          tx.booking_id,
          'confirmed',
          amountPaid
        );
      } catch (e) {
        console.warn('[PaymentController] Could not update booking status:', e);
      }
    }

    return res.json({
      success: isSuccess,
      verified: isSuccess,
      message: isSuccess
        ? 'Payment verified successfully. Consultation confirmed!'
        : `Payment status: ${paystackResult.status}`,
      payment: updatedTx,
      booking: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (signature && !paystackService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const event = req.body;
    if (event?.event === 'charge.success') {
      const { reference, channel, paid_at, gateway_response, amount } = event.data;

      const tx = await paymentStore.getByReference(reference);
      if (tx) {
        await paymentStore.updateStatus(reference, 'success', {
          paid_at,
          gateway_response,
          channel,
        });

        if (tx.booking_id) {
          const amountPaid = Math.round(amount / 100);
          await telemedicineStore.updateBookingPayment(tx.booking_id, 'confirmed', amountPaid);
        }
      }
    }

    return res.status(200).json({ status: true });
  } catch (error) {
    next(error);
  }
}

export async function getUserPaymentHistory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const transactions = await paymentStore.getByUserId(userId);
    return res.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    next(error);
  }
}
