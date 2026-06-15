"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const queue_1 = require("../services/queue");
const router = (0, express_1.Router)();
// GET /api/job-status/:jobId
// Poll this to see progress of a bulk send
router.get('/job-status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const job = await queue_1.emailQueue.getJob(jobId);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    const state = await job.getState();
    const progress = (job.progress || {});
    const total = progress.total ?? job.data.recipients.length;
    const sent = progress.sent ?? 0;
    const failed = progress.failed ?? 0;
    const body = {
        job_id: jobId,
        status: state,
        total,
        sent,
        failed,
        progress_percent: total > 0 ? Math.round(((sent + failed) / total) * 100) : 0,
    };
    if (state === 'completed' && job.returnvalue) {
        body.failed_emails = job.returnvalue.failedEmails;
    }
    if (state === 'failed') {
        body.error = job.failedReason;
    }
    res.json(body);
});
// GET /api/jobs
// Overview of the queue — active, waiting, and recent history
router.get('/jobs', async (_req, res) => {
    const [active, waiting, completed, failed] = await Promise.all([
        queue_1.emailQueue.getActive(),
        queue_1.emailQueue.getWaiting(),
        queue_1.emailQueue.getCompleted(0, 9),
        queue_1.emailQueue.getFailed(0, 9),
    ]);
    res.json({
        queue: {
            active: active.length,
            waiting: waiting.length,
        },
        recent_completed: completed.map(j => ({
            job_id: j.id,
            total: j.returnvalue?.total ?? 0,
            sent: j.returnvalue?.sent ?? 0,
            failed: j.returnvalue?.failed ?? 0,
        })),
        recent_failed: failed.map(j => ({
            job_id: j.id,
            error: j.failedReason,
        })),
    });
});
exports.default = router;
