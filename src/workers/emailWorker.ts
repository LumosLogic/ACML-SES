import { Worker, Job } from 'bullmq';
import { redisOptions } from '../services/queue';
import { sendEmail } from '../services/mailer';
import { config } from '../config';
import type { BulkJobData, JobProgress } from '../types';

// ms to wait between each email to stay within SES rate limit
const EMAIL_DELAY_MS = Math.ceil(1000 / config.ses.sendRate);

async function processEmailJob(job: Job<BulkJobData>): Promise<JobProgress> {
  const { recipients, subject, body, from, replyTo, isHtml } = job.data;

  const progress: JobProgress = {
    sent: 0,
    failed: 0,
    total: recipients.length,
    failedEmails: [],
  };

  await job.updateProgress({ ...progress });

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    try {
      await sendEmail({ to: recipient, from, subject, body, isHtml, replyTo });
      progress.sent++;
    } catch (err) {
      progress.failed++;
      progress.failedEmails.push(recipient);
      console.error(`[worker] failed → ${recipient}:`, (err as Error).message);
    }

    await job.updateProgress({ ...progress });

    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, EMAIL_DELAY_MS));
    }
  }

  return progress;
}

export function startEmailWorker(): Worker<BulkJobData, JobProgress> {
  const worker = new Worker<BulkJobData, JobProgress, string>(
    'email-bulk',
    processEmailJob,
    {
      connection: redisOptions,
      concurrency: 1,
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[worker] job ${job.id} done — sent: ${result.sent}, failed: ${result.failed}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
  });

  console.log(`[worker] started — rate limit: ${config.ses.sendRate} emails/sec`);
  return worker;
}
