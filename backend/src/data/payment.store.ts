import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { PaymentTransaction, PaymentStatus } from '../models/payment.model';

class PaymentStore {
  private transactions: Map<string, PaymentTransaction> = new Map();
  private filePath: string;
  private initialized: boolean = false;

  constructor() {
    this.filePath = path.join(config.dataDir, 'payments.json');
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const list: PaymentTransaction[] = JSON.parse(content);
        for (const t of list) {
          this.transactions.set(t.reference, t);
        }
      } catch (err) {
        console.error('[PaymentStore] Failed to read payments file:', err);
      }
    }

    this.initialized = true;
  }

  private persistSync(): void {
    try {
      const list = Array.from(this.transactions.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[PaymentStore] Failed to persist payments:', err);
    }
  }

  public async createTransaction(data: Omit<PaymentTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<PaymentTransaction> {
    await this.init();
    const now = new Date().toISOString();
    const tx: PaymentTransaction = {
      ...data,
      id: uuidv4(),
      created_at: now,
      updated_at: now,
    };
    this.transactions.set(tx.reference, tx);
    this.persistSync();
    return tx;
  }

  public async getByReference(reference: string): Promise<PaymentTransaction | null> {
    await this.init();
    return this.transactions.get(reference) || null;
  }

  public async getByBookingId(bookingId: string): Promise<PaymentTransaction[]> {
    await this.init();
    return Array.from(this.transactions.values()).filter((t) => t.booking_id === bookingId);
  }

  public async getByUserId(userId: string): Promise<PaymentTransaction[]> {
    await this.init();
    return Array.from(this.transactions.values())
      .filter((t) => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async updateStatus(
    reference: string,
    status: PaymentStatus,
    extra?: {
      paid_at?: string;
      gateway_response?: string;
      channel?: any;
    }
  ): Promise<PaymentTransaction | null> {
    await this.init();
    const tx = this.transactions.get(reference);
    if (!tx) return null;

    tx.status = status;
    tx.updated_at = new Date().toISOString();
    if (extra?.paid_at) tx.paid_at = extra.paid_at;
    if (extra?.gateway_response) tx.gateway_response = extra.gateway_response;
    if (extra?.channel) tx.channel = extra.channel;

    this.transactions.set(reference, tx);
    this.persistSync();
    return tx;
  }
}

export const paymentStore = new PaymentStore();
