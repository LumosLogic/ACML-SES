import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { sendEmail } from '../services/mailer';
import { emailQueue } from '../services/queue';
import { config } from '../config';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max CSV
});

const singleEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1).max(998),
  body: z.string().min(1),
  from: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  isHtml: z.boolean().optional().default(true),
});

const bulkEmailSchema = z.object({
  recipients: z.array(z.string().email()).min(1),
  subject: z.string().min(1).max(998),
  body: z.string().min(1),
  from: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  isHtml: z.boolean().optional().default(true),
});

// POST /api/send-email
// Sends immediately — best for single or small batches (< 50 emails)
router.post('/send-email', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = singleEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { to, subject, body, from, replyTo, isHtml } = parsed.data;
  const recipients = Array.isArray(to) ? to : [to];
  const sender = from || config.ses.defaultFrom;

  const results = await Promise.allSettled(
    recipients.map(email => sendEmail({ to: email, from: sender, subject, body, isHtml, replyTo }))
  );

  const report = results.map((r, i) => ({
    email: recipients[i],
    status: r.status === 'fulfilled' ? 'sent' : 'failed',
    ...(r.status === 'rejected' && { error: (r.reason as Error).message }),
  }));

  const sentCount = report.filter(r => r.status === 'sent').length;
  res.status(sentCount === 0 ? 500 : 200).json({
    sent: sentCount,
    failed: report.length - sentCount,
    results: report,
  });
});

// POST /api/send-bulk
// Queues a bulk job and returns immediately with a job_id
router.post('/send-bulk', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = bulkEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { recipients, subject, body, from, replyTo, isHtml } = parsed.data;

  try {
    const job = await emailQueue.add('bulk-send', {
      recipients,
      subject,
      body,
      from: from || config.ses.defaultFrom,
      replyTo,
      isHtml,
    });

    res.status(202).json({
      job_id: job.id,
      total_recipients: recipients.length,
      status: 'queued',
      poll_url: `/api/job-status/${job.id}`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/send-bulk/csv
// Upload a CSV file with an "email" column; queues a bulk job
router.post('/send-bulk/csv', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    res.status(400).json({ error: 'CSV file required — form field name: "file"' });
    return;
  }

  const { subject, body, from, replyTo } = req.body;
  if (!subject || !body) {
    res.status(400).json({ error: '"subject" and "body" are required form fields' });
    return;
  }

  let recipients: string[];
  try {
    const rows = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    recipients = rows
      .map(row => row.email || row.Email || row.EMAIL || Object.values(row)[0])
      .filter(Boolean)
      .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  } catch {
    res.status(400).json({ error: 'Invalid CSV — make sure it has headers and an "email" column' });
    return;
  }

  if (recipients.length === 0) {
    res.status(400).json({ error: 'No valid email addresses found in the CSV' });
    return;
  }

  try {
    const isHtml = req.body.isHtml !== 'false';
    const job = await emailQueue.add('bulk-send', {
      recipients,
      subject,
      body,
      from: from || config.ses.defaultFrom,
      replyTo,
      isHtml,
    });

    res.status(202).json({
      job_id: job.id,
      total_recipients: recipients.length,
      status: 'queued',
      poll_url: `/api/job-status/${job.id}`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
