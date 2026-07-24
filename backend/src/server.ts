import express, { Application } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import cycleRoutes from './routes/cycle.routes';
import educationRoutes from './routes/education.routes';
import pregnancyRoutes from './routes/pregnancy.routes';
import telemedicineRoutes from './routes/telemedicine.routes';
import notificationRoutes from './routes/notification.routes';
import campaignRoutes from './routes/campaign.routes';
import { errorHandler } from './middleware/error.middleware';

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
  app.use('/api/campaigns', campaignRoutes);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
