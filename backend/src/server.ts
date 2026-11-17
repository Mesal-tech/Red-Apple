import express, { Application } from 'express';
import cors from 'cors';
// Telemedicine real verified doctors and partner clinics sync

import authRoutes from './routes/auth.routes';
import cycleRoutes from './routes/cycle.routes';
import educationRoutes from './routes/education.routes';
import pregnancyRoutes from './routes/pregnancy.routes';
import telemedicineRoutes from './routes/telemedicine.routes';
import notificationRoutes from './routes/notification.routes';
import campaignRoutes from './routes/campaign.routes';
import emailRoutes from './routes/email.routes';
import paymentRoutes from './routes/payment.routes';
import aiRoutes from './routes/ai.routes';
import partnerRoutes from './routes/partner.routes';
import { errorHandler } from './middleware/error.middleware';
import { authenticateToken, requireRole } from './middleware/auth.middleware';
import { notificationDispatcher } from './notifications/notification.service';
import prisma from './db/prisma';

export function createExpressApp(): Application {
  const app = express();

  // Global Middleware
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Red Apple Express Backend API',
    });
  });

  // Express API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/cycles', cycleRoutes);
  app.use('/api/education', educationRoutes);
  app.use('/api/pregnancy', pregnancyRoutes);
  app.use('/api/telemedicine', telemedicineRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.get('/api/admin/notifications/health', authenticateToken, requireRole('admin'), async (_req, res, next) => {
    try {
      const [pending, oldest] = await Promise.all([
        prisma.notification.count({ where: { status: 'pending' } }),
        prisma.notification.findFirst({ where: { status: 'pending' }, orderBy: { created_at: 'asc' }, select: { created_at: true } }),
      ]);
      const worker = notificationDispatcher.getStatus();
      res.json({ success: true, workerEnabled: worker.enabled, workerHeartbeatAt: worker.lastHeartbeatAt, queueDepth: pending, oldestPendingAgeMs: oldest ? Date.now() - oldest.created_at.getTime() : 0 });
    } catch (error) { next(error); }
  });
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/partner', partnerRoutes);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
