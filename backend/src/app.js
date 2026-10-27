import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/env.js';
import { createSessionMiddleware } from './config/session.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

export function createApp() {
  const app = express();

  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.use(helmet());

  // Only needed if the frontend is served from a different origin than the API.
  // Credentials are allowed for the configured frontend origin only.
  app.use('/api', cors({ origin: config.frontendOrigin, credentials: true }));

  app.use(express.json({ limit: '10kb' }));
  app.use(createSessionMiddleware());

  // API responses contain personal data and must not be cached.
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', csrfProtection);

  app.get('/api/health', (req, res) => res.json({ data: { status: 'ok' } }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api', notFoundHandler);

  // In production, serve the built React app from the same origin.
  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  if (config.isProduction && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
