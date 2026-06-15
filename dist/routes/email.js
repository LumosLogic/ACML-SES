"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sync_1 = require("csv-parse/sync");
const zod_1 = require("zod");
const mailer_1 = require("../services/mailer");
const queue_1 = require("../services/queue");
const config_1 = require("../config");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max CSV
});
const singleEmailSchema = zod_1.z.object({
    to: zod_1.z.union([zod_1.z.string().email(), zod_1.z.array(zod_1.z.string().email()).min(1)]),
    subject: zod_1.z.string().min(1).max(998),
    body: zod_1.z.string().min(1),
    from: zod_1.z.string().email().optional(),
    replyTo: zod_1.z.string().email().optional(),
    isHtml: zod_1.z.boolean().optional().default(true),
});
const bulkEmailSchema = zod_1.z.object({
    recipients: zod_1.z.array(zod_1.z.string().email()).min(1),
    subject: zod_1.z.string().min(1).max(998),
    body: zod_1.z.string().min(1),
    from: zod_1.z.string().email().optional(),
    replyTo: zod_1.z.string().email().optional(),
    isHtml: zod_1.z.boolean().optional().default(true),
});
// POST /api/send-email
// Sends immediately — best for single or small batches (< 50 emails)
router.post('/send-email', async (req, res, next) => {
    const parsed = singleEmailSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }
    const { to, subject, body, from, replyTo, isHtml } = parsed.data;
    const recipients = Array.isArray(to) ? to : [to];
    const sender = from || config_1.config.ses.defaultFrom;
    const results = await Promise.allSettled(recipients.map(email => (0, mailer_1.sendEmail)({ to: email, from: sender, subject, body, isHtml, replyTo })));
    const report = results.map((r, i) => ({
        email: recipients[i],
        status: r.status === 'fulfilled' ? 'sent' : 'failed',
        ...(r.status === 'rejected' && { error: r.reason.message }),
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
router.post('/send-bulk', async (req, res, next) => {
    const parsed = bulkEmailSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }
    const { recipients, subject, body, from, replyTo, isHtml } = parsed.data;
    try {
        const job = await queue_1.emailQueue.add('bulk-send', {
            recipients,
            subject,
            body,
            from: from || config_1.config.ses.defaultFrom,
            replyTo,
            isHtml,
        });
        res.status(202).json({
            job_id: job.id,
            total_recipients: recipients.length,
            status: 'queued',
            poll_url: `/api/job-status/${job.id}`,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/send-bulk/csv
// Upload a CSV file with an "email" column; queues a bulk job
router.post('/send-bulk/csv', upload.single('file'), async (req, res, next) => {
    if (!req.file) {
        res.status(400).json({ error: 'CSV file required — form field name: "file"' });
        return;
    }
    const { subject, body, from, replyTo } = req.body;
    if (!subject || !body) {
        res.status(400).json({ error: '"subject" and "body" are required form fields' });
        return;
    }
    let recipients;
    try {
        const rows = (0, sync_1.parse)(req.file.buffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });
        recipients = rows
            .map(row => row.email || row.Email || row.EMAIL || Object.values(row)[0])
            .filter(Boolean)
            .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    }
    catch {
        res.status(400).json({ error: 'Invalid CSV — make sure it has headers and an "email" column' });
        return;
    }
    if (recipients.length === 0) {
        res.status(400).json({ error: 'No valid email addresses found in the CSV' });
        return;
    }
    try {
        const isHtml = req.body.isHtml !== 'false';
        const job = await queue_1.emailQueue.add('bulk-send', {
            recipients,
            subject,
            body,
            from: from || config_1.config.ses.defaultFrom,
            replyTo,
            isHtml,
        });
        res.status(202).json({
            job_id: job.id,
            total_recipients: recipients.length,
            status: 'queued',
            poll_url: `/api/job-status/${job.id}`,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
