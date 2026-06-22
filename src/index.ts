import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { initDb } from './services/db';
import { requireApiKey, requireAdminKey } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import sendRoutes from './routes/send';
import adminRoutes from './routes/admin';
import unsubscribeRoutes from './routes/unsubscribe';
import suppressionRoutes from './routes/suppressions';
import emailRoutes from './routes/email';
import jobRoutes from './routes/jobs';
import metricsRoutes from './routes/metrics';
import statsRoutes from './routes/stats';
import webhookRoutes from './routes/webhook';
import docsRoutes from './routes/docs';
import { startEmailWorker } from './workers/emailWorker';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes — no auth needed
app.use('/api/webhooks', webhookRoutes);  // SNS signature verified inside
app.use('/', unsubscribeRoutes);          // /unsubscribe?email=&token=
app.use('/docs', docsRoutes);             // Swagger UI

// Admin routes — protected by separate ADMIN_KEY
app.use('/admin', requireAdminKey, adminRoutes);

// All other API routes — rate limited + per-client API key required
app.use('/api', rateLimiter, requireApiKey, sendRoutes);
app.use('/api', rateLimiter, requireApiKey, suppressionRoutes);
app.use('/api', rateLimiter, requireApiKey, emailRoutes);
app.use('/api', rateLimiter, requireApiKey, jobRoutes);
app.use('/api', rateLimiter, requireApiKey, metricsRoutes);
app.use('/api', rateLimiter, requireApiKey, statsRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const worker = startEmailWorker();

initDb()
  .then(() => console.log('[db] PostgreSQL ready'))
  .catch(err => console.error('[db] init failed:', err.message));

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await worker.close();
  server.close();
});

export default app;
