import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { sendEmail } from '../services/mailer';
import { logEmail } from '../services/emailLog';
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

// POST /api/send-with-attachment
// Send a single email with one file attachment (multipart/form-data)
router.post('/send-with-attachment', upload.single('attachment'), async (req: Request, res: Response, next: NextFunction) => {
  const { to, subject, body, from, replyTo, isHtml } = req.body;

  if (!to || !subject || !body) {
    res.status(400).json({ error: '"to", "subject", and "body" are required' });
    return;
  }

  try {
    const attachments = req.file ? [{
      filename: req.file.originalname,
      content: req.file.buffer,
      contentType: req.file.mimetype,
    }] : undefined;

    const messageId = await sendEmail({
      to,
      from: from || config.ses.defaultFrom,
      subject,
      body,
      isHtml: isHtml !== 'false',
      replyTo,
      attachments,
    });

    await logEmail({
      id: randomUUID(),
      messageId,
      recipient: to,
      subject,
      sentAt: new Date().toISOString(),
      status: 'sent',
      jobId: 'direct',
    });

    res.json({ status: 'sent', messageId, attachment: req.file?.originalname ?? null });
  } catch (err) {
    next(err);
  }
});

// GET /api/recent-emails?limit=100&days=7
// GET /api/recent-emails?from=2026-06-01&to=2026-06-18
router.get('/recent-emails', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '100'), 1000);
    const { getRecentEmails } = await import('../services/emailLog');

    let from: Date | undefined;
    let to: Date | undefined;

    if (req.query.from && req.query.to) {
      from = new Date(req.query.from as string);
      to = new Date(req.query.to as string);
      to.setHours(23, 59, 59, 999);
    } else if (req.query.days) {
      const days = parseInt(req.query.days as string);
      from = new Date();
      from.setDate(from.getDate() - days);
      from.setHours(0, 0, 0, 0);
      to = new Date();
    }

    const emails = await getRecentEmails(limit, from, to);
    res.json({ emails });
  } catch (err) {
    next(err);
  }
});

export default router;
