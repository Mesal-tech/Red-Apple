import { v4 as uuidv4 } from 'uuid';
import prisma from '../db/prisma';
import { PaymentTransaction, PaymentStatus } from '../models/payment.model';

function mapPrismaPayment(p: any): PaymentTransaction {
  return {
    id: p.payment_id,
    reference: p.reference,
    booking_id: p.booking_id,
    user_id: p.user_id,
    doctor_id: p.booking?.doctor_id || '',
    amount: p.amount,
    amount_kobo: p.amount * 100,
    currency: p.currency || 'NGN',
    status: (p.status as PaymentStatus) || 'pending',
    channel: p.channel as any,
    provider: 'paystack',
    customer_email: p.user?.email || '',
    customer_name: p.user?.name || '',
    paid_at: p.paid_at ? new Date(p.paid_at).toISOString() : undefined,
    created_at: new Date(p.created_at).toISOString(),
    updated_at: new Date(p.created_at).toISOString(),
  };
}

class PaymentStore {
  public async init(): Promise<void> {
    // Pure PostgreSQL / Prisma backed store. No mock files or seeds.
    return Promise.resolve();
  }

  public async createTransaction(
    data: Omit<PaymentTransaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PaymentTransaction> {
    const created = await prisma.payment.create({
      data: {
        payment_id: `pay_${uuidv4().substring(0, 10)}`,
        booking_id: data.booking_id,
        user_id: data.user_id,
        reference: data.reference,
        amount: data.amount,
        currency: data.currency || 'NGN',
        status: data.status || 'pending',
        channel: data.channel || 'card',
      },
      include: {
        user: true,
        booking: true,
      },
    });

    return mapPrismaPayment(created);
  }

  public async getByReference(reference: string): Promise<PaymentTransaction | null> {
    const p = await prisma.payment.findUnique({
      where: { reference },
      include: { user: true, booking: true },
    });
    return p ? mapPrismaPayment(p) : null;
  }

  public async getByBookingId(bookingId: string): Promise<PaymentTransaction[]> {
    const list = await prisma.payment.findMany({
      where: { booking_id: bookingId },
      include: { user: true, booking: true },
      orderBy: { created_at: 'desc' },
    });
    return list.map(mapPrismaPayment);
  }

  public async getByUserId(userId: string): Promise<PaymentTransaction[]> {
    const list = await prisma.payment.findMany({
      where: { user_id: userId },
      include: { user: true, booking: true },
      orderBy: { created_at: 'desc' },
    });
    return list.map(mapPrismaPayment);
  }

  public async updateStatus(
    reference: string,
    status: PaymentStatus,
    extraData?: string | { paid_at?: string; gateway_response?: string; channel?: any }
  ): Promise<PaymentTransaction> {
    let paidAtDate = new Date();
    let channel: string | undefined;

    if (typeof extraData === 'string') {
      paidAtDate = new Date(extraData);
    } else if (extraData && typeof extraData === 'object') {
      if (extraData.paid_at) {
        paidAtDate = new Date(extraData.paid_at);
      }
      if (extraData.channel) {
        channel = String(extraData.channel);
      }
    }

    const updated = await prisma.payment.update({
      where: { reference },
      data: {
        status,
        paid_at: paidAtDate,
        ...(channel ? { channel } : {}),
      },
      include: { user: true, booking: true },
    });

    return mapPrismaPayment(updated);
  }
}

export const paymentStore = new PaymentStore();
