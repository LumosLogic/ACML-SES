import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { randomUUID } from 'crypto';
import { sendEmail } from '../services/mailer';
import { logEmail } from '../services/emailLog';
import { emailQueue } from '../services/queue';
import { filterSuppressed } from '../services/suppression';
import { applyTemplate, injectUnsubscribeLink } from '../services/unsubscribe';
import { sanitizeEmailBody } from '../services/sanitize';
import { config } from '../config';
import type { BulkJobData } from '../types';

const router = Router();

// Allowed MIME types for attachments
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
]);

// Magic byte signatures for real file type detection
function detectMimeFromBytes(buf: Buffer): string | null {
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04) return 'application/zip'; // zip, docx, xlsx
  if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) return 'application/msword'; // doc, xls
  return null;
}

// Sanitize filename — strip path traversal and dangerous characters
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\.\./g, '')
    .trim()
    .slice(0, 200) || 'attachment';
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB per file
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'attachments' && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

const uploadFields = upload.fields([
  { name: 'csv', maxCount: 1 },
  { name: 'attachments', maxCount: 3 },
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RecipientEntry {
  email: string;
  vars: Record<string, string>;
}

// "a@x.com, b@x.com" → [{ email, vars: {} }]
function parseToField(value: string): RecipientEntry[] {
  return value
    .split(/[,\n]/)
    .map(e => e.trim())
    .filter(e => EMAIL_RE.test(e))
    .map(email => ({ email, vars: {} }));
}

// "[{\"email\":\"a@x.com\",\"vars\":{\"name\":\"John\"}}]" → RecipientEntry[]
function parseRecipientsJson(value: string): RecipientEntry[] {
  const parsed = JSON.parse(value) as { email: string; vars?: Record<string, string> }[];
  return parsed
    .filter(r => r.email && EMAIL_RE.test(r.email))
    .map(r => ({ email: r.email, vars: r.vars ?? {} }));
}

// CSV: email column required, extra columns → per-recipient vars
function parseCSVBuffer(buffer: Buffer): RecipientEntry[] {
  const rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  const EMAIL_KEYS = ['email', 'Email', 'EMAIL'];

  return rows
    .map(row => {
      const emailKey = EMAIL_KEYS.find(k => row[k]);
      const email = emailKey ? row[emailKey] : Object.values(row)[0];
      if (!email || !EMAIL_RE.test(email)) return null;

      const vars: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        if (!EMAIL_KEYS.includes(k)) vars[k] = v;
      }
      return { email, vars };
    })
    .filter(Boolean) as RecipientEntry[];
}

function senderAllowed(email: string, clientAllowedDomain: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  // Per-client domain lock (set when key was created)
  if (clientAllowedDomain) return domain === clientAllowedDomain;
  // Fallback to env var for legacy keys with no domain set
  const { allowedFromDomains } = config.ses;
  if (allowedFromDomains.length === 0) return true;
  return allowedFromDomains.includes(domain);
}

// Merge globalVars into each entry (per-recipient vars take precedence)
function mergeGlobalVars(entries: RecipientEntry[], globalVars: Record<string, string>): RecipientEntry[] {
  return entries.map(e => ({ ...e, vars: { ...globalVars, ...e.vars } }));
}

// POST /api/send
//
// Unified endpoint — handles all email types:
//   recipients ≤ 50               → send immediately (unless send_at is set)
//   recipients > 50               → queued bulk job, returns job_id
//   send_at provided              → always queued (scheduled), returns job_id
//   csv file                      → parse emails + per-recipient vars from extra columns
//   attachments file(s)           → attached to every email (up to 10 files)
//
// Fields (multipart/form-data):
//   to            string   Comma-separated emails  (required if no csv / recipients)
//   recipients    string   JSON array [{email, vars}] for per-recipient vars (optional)
//   subject       string   Supports {{vars}}  (required)
//   body          string   Supports {{vars}} and {{unsubscribe_url}}  (required)
//   isHtml        string   "true" | "false"  (default: "true")
//   replyTo       string   Reply-To address (optional)
//   cc            string   Comma-separated CC addresses (optional)
//   bcc           string   Comma-separated BCC addresses (optional)
//   globalVars    string   JSON object — applied to all recipients e.g. {"company":"ACML"}
//   send_at       string   ISO date — schedule delivery e.g. "2026-06-23T09:00:00Z"
//
// Files:
//   csv           file     CSV with "email" column; extra columns become per-recipient vars
//   attachments   file(s)  Any files (PDF, image, etc.) — up to 10
router.post('/send', uploadFields, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, body, replyTo, cc, bcc, callback_url } = req.body;
    const isHtml = req.body.isHtml !== 'false';
    const from = (req.body.from as string | undefined)?.trim() || config.ses.defaultFrom;

    if (!subject) {
      res.status(400).json({ error: '"subject" is required' });
      return;
    }
    if (!body) {
      res.status(400).json({ error: '"body" is required' });
      return;
    }

    if (!senderAllowed(from, req.allowedDomain)) {
      res.status(400).json({ error: `Sender domain is not allowed. Your key is restricted to: ${req.allowedDomain}` });
      return;
    }

    // Parse globalVars
    let globalVars: Record<string, string> = {};
    if (req.body.globalVars) {
      try {
        globalVars = JSON.parse(req.body.globalVars);
      } catch {
        res.status(400).json({ error: '"globalVars" must be a valid JSON object string' });
        return;
      }
    }

    // Parse send_at
    let scheduleDelay: number | undefined;
    if (req.body.send_at) {
      const sendAt = new Date(req.body.send_at);
      if (isNaN(sendAt.getTime())) {
        res.status(400).json({ error: '"send_at" must be a valid ISO date string' });
        return;
      }
      const delay = sendAt.getTime() - Date.now();
      scheduleDelay = delay > 0 ? delay : 0;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const csvFile = files?.['csv']?.[0];
    const attachmentFiles = files?.['attachments'] ?? [];

    // --- Resolve recipients ---
    let entries: RecipientEntry[];

    if (csvFile) {
      try {
        entries = parseCSVBuffer(csvFile.buffer);
      } catch {
        res.status(400).json({ error: 'Invalid CSV. Must have headers with an "email" column.' });
        return;
      }
      if (entries.length === 0) {
        res.status(400).json({ error: 'No valid email addresses found in the CSV.' });
        return;
      }
    } else if (req.body.recipients) {
      try {
        entries = parseRecipientsJson(req.body.recipients);
      } catch {
        res.status(400).json({ error: '"recipients" must be a valid JSON array: [{email, vars}]' });
        return;
      }
      if (entries.length === 0) {
        res.status(400).json({ error: 'No valid email addresses found in "recipients".' });
        return;
      }
    } else {
      const toField = (req.body.to as string | undefined)?.trim();
      if (!toField) {
        res.status(400).json({ error: '"to", "recipients" JSON, or a "csv" file is required.' });
        return;
      }
      entries = parseToField(toField);
      if (entries.length === 0) {
        res.status(400).json({ error: 'No valid email addresses in "to" field.' });
        return;
      }
    }

    // Deduplicate recipients — keep first occurrence of each email
    const seenEmails = new Set<string>();
    entries = entries.filter(e => {
      const lower = e.email.toLowerCase();
      if (seenEmails.has(lower)) return false;
      seenEmails.add(lower);
      return true;
    });

    // Merge globalVars (per-recipient vars override global)
    entries = mergeGlobalVars(entries, globalVars);

    // --- Cap recipients ---
    if (entries.length > config.maxRecipientsPerRequest) {
      res.status(400).json({
        error: `Too many recipients. Max allowed per request: ${config.maxRecipientsPerRequest}`,
      });
      return;
    }

    // --- Filter suppressed ---
    const emails = entries.map(e => e.email);
    const { allowed: allowedEmails, skipped } = await filterSuppressed(emails);
    const allowedSet = new Set(allowedEmails);
    const allowedEntries = entries.filter(e => allowedSet.has(e.email));

    if (allowedEntries.length === 0) {
      res.status(200).json({
        status: 'skipped',
        message: 'All recipients are suppressed (bounced or complained previously).',
        total: entries.length,
        skipped: skipped.length,
      });
      return;
    }

    // Validate real file type via magic bytes and sanitize filenames
    for (const f of attachmentFiles) {
      const realMime = detectMimeFromBytes(f.buffer);
      if (realMime && !ALLOWED_MIME_TYPES.has(realMime)) {
        res.status(400).json({ error: `File "${f.originalname}" has a disallowed type based on its content.` });
        return;
      }
      f.originalname = sanitizeFilename(f.originalname);
    }

    const attachments = attachmentFiles.map(f => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));

    // --- Send immediately or queue ---
    const forceQueue = scheduleDelay !== undefined;

    if (!forceQueue && allowedEntries.length <= config.bulkThreshold) {
      // Send immediately with per-recipient vars + unsubscribe injection
      const results = await Promise.allSettled(
        allowedEntries.map(({ email, vars }) => {
          const finalVars = { ...vars, email };
          const renderedSubject = applyTemplate(subject, finalVars);
          const renderedBody = injectUnsubscribeLink(sanitizeEmailBody(applyTemplate(body, finalVars), isHtml), email, isHtml);

          return sendEmail({
            to: email,
            from,
            subject: renderedSubject,
            body: renderedBody,
            isHtml,
            replyTo,
            cc,
            bcc,
            attachments: attachments.length > 0 ? attachments : undefined,
            smtpConfig: req.smtpConfig,
          }).then(async messageId => {
            await logEmail({
              id: randomUUID(),
              messageId,
              recipient: email,
              subject: renderedSubject,
              sentAt: new Date().toISOString(),
              status: 'sent',
              jobId: 'direct',
              clientId: req.clientId,
            });
            return { email, status: 'sent' as const, messageId };
          });
        })
      );

      const report = results.map((r, i) => ({
        email: allowedEntries[i].email,
        ...(r.status === 'fulfilled'
          ? { status: 'sent', messageId: r.value.messageId }
          : { status: 'failed', error: (r.reason as Error).message }),
      }));

      const sentCount = report.filter(r => r.status === 'sent').length;

      res.status(sentCount === 0 ? 500 : 200).json({
        status: sentCount === report.length ? 'sent' : sentCount === 0 ? 'failed' : 'partial',
        sent: sentCount,
        failed: report.length - sentCount,
        skipped: skipped.length,
        results: report,
      });
    } else {
      // Queue bulk job (also used for scheduled sends)
      const jobData: BulkJobData = {
        recipients: allowedEntries.map(e => e.email),
        recipientVars: allowedEntries.map(e => e.vars),
        subject,
        body,
        from,
        replyTo,
        cc,
        bcc,
        isHtml,
        callbackUrl: callback_url,
        clientId: req.clientId,
        smtpConfig: req.smtpConfig,
      };

      if (attachments.length > 0) {
        jobData.attachments = attachments.map(a => ({
          filename: a.filename,
          content: a.content.toString('base64'),
          contentType: a.contentType,
        }));
      }

      const jobOptions = scheduleDelay !== undefined ? { delay: scheduleDelay } : undefined;
      const job = await emailQueue.add('bulk-send', jobData, jobOptions);

      const response: Record<string, unknown> = {
        status: scheduleDelay !== undefined ? 'scheduled' : 'queued',
        job_id: job.id,
        total_recipients: allowedEntries.length,
        skipped: skipped.length,
        poll_url: `/api/job-status/${job.id}`,
      };

      if (req.body.send_at) response.send_at = req.body.send_at;

      res.status(202).json(response);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
