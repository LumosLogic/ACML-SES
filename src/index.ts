import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import emailRoutes from './routes/email';
import jobRoutes from './routes/jobs';
import metricsRoutes from './routes/metrics';
import { startEmailWorker } from './workers/emailWorker';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', emailRoutes);
app.use('/api', jobRoutes);
app.use('/api', metricsRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const worker = startEmailWorker();

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await worker.close();
  server.close();
});

export default app;
