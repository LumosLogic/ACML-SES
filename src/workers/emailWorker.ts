import { Worker, Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { redisOptions } from '../services/queue';
import { sendEmail } from '../services/mailer';
import { logEmail } from '../services/emailLog';
import { isEmailSuppressed } from '../services/suppression';
import { applyTemplate, injectUnsubscribeLink } from '../services/unsubscribe';
import { sanitizeEmailBody } from '../services/sanitize';
import { config } from '../config';
import type { BulkJobData, JobProgress } from '../types';

const EMAIL_DELAY_MS = Math.ceil(1000 / config.ses.sendRate);

async function processEmailJob(job: Job<BulkJobData>): Promise<JobProgress> {
  const { recipients, recipientVars, subject, body, from, replyTo, cc, bcc, isHtml, attachments: rawAttachments, callbackUrl, clientId, smtpConfig } = job.data;

  const progress: JobProgress = { sent: 0, failed: 0, total: recipients.length, failedEmails: [] };
  await job.updateProgress({ ...progress });

  const attachments = rawAttachments?.length
    ? rawAttachments.map(a => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64'),
        contentType: a.contentType,
      }))
    : undefined;

  for (let i = 0; i < recipients.length; i++) {
    const email = recipients[i];

    // Skip if suppressed since the job was queued
    if (await isEmailSuppressed(email)) {
      progress.failed++;
      progress.failedEmails.push(email);
      await job.updateProgress({ ...progress });
      continue;
    }

    // Apply per-recipient vars + unsubscribe link
    const vars = { ...(recipientVars?.[i] ?? {}), email };
    const renderedSubject = applyTemplate(subject, vars);
    const renderedBody = injectUnsubscribeLink(sanitizeEmailBody(applyTemplate(body, vars), isHtml), email, isHtml);

    try {
      const messageId = await sendEmail({
        to: email,
        from,
        subject: renderedSubject,
        body: renderedBody,
        isHtml,
        replyTo,
        cc,
        bcc,
        attachments,
        smtpConfig,
      });

      progress.sent++;
      await logEmail({
        id: randomUUID(),
        messageId,
        recipient: email,
        subject: renderedSubject,
        sentAt: new Date().toISOString(),
        status: 'sent',
        jobId: job.id ?? '',
        clientId,
      });
    } catch (err) {
      progress.failed++;
      progress.failedEmails.push(email);
      console.error(`[worker] failed → ${email}:`, (err as Error).message);
      await logEmail({
        id: randomUUID(),
        messageId: '',
        recipient: email,
        subject: renderedSubject,
        sentAt: new Date().toISOString(),
        status: 'failed',
        jobId: job.id ?? '',
        clientId,
      });
    }

    await job.updateProgress({ ...progress });

    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, EMAIL_DELAY_MS));
    }
  }

  // Fire callback if provided
  if (callbackUrl) {
    try {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          status: 'completed',
          sent: progress.sent,
          failed: progress.failed,
          total: progress.total,
          failed_emails: progress.failedEmails,
        }),
      });
    } catch (err) {
      console.error(`[worker] callback failed for job ${job.id}:`, (err as Error).message);
    }
  }

  return progress;
}

export function startEmailWorker(): Worker<BulkJobData, JobProgress> {
  const worker = new Worker<BulkJobData, JobProgress, string>(
    'email-bulk',
    processEmailJob,
    { connection: redisOptions, concurrency: 1 }
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
