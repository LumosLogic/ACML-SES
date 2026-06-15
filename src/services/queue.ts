import { Queue } from 'bullmq';
import { config } from '../config';
import type { BulkJobData, JobProgress } from '../types';

// Parse Redis URL into host/port options for BullMQ's bundled ioredis
function parseRedisUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname || 'localhost',
    port: parseInt(u.port || '6379'),
    ...(u.password && { password: decodeURIComponent(u.password) }),
    maxRetriesPerRequest: null as null,
  };
}

export const redisOptions = parseRedisUrl(config.redis.url);

export const emailQueue = new Queue<BulkJobData, JobProgress, string>('email-bulk', {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 24 * 3600 },   // keep completed jobs for 24h
    removeOnFail: { age: 7 * 24 * 3600 },   // keep failed jobs for 7d
  },
});
