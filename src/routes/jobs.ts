import { Router, Request, Response } from 'express';
import { emailQueue } from '../services/queue';
import type { JobProgress } from '../types';

const router = Router();

// GET /api/job-status/:jobId
// Poll this to see progress of a bulk send
router.get('/job-status/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const job = await emailQueue.getJob(jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  const state = await job.getState();
  const progress = (job.progress || {}) as Partial<JobProgress>;
  const total = progress.total ?? job.data.recipients.length;
  const sent = progress.sent ?? 0;
  const failed = progress.failed ?? 0;

  const body: Record<string, unknown> = {
    job_id: jobId,
    status: state,
    total,
    sent,
    failed,
    progress_percent: total > 0 ? Math.round(((sent + failed) / total) * 100) : 0,
  };

  if (state === 'completed' && job.returnvalue) {
    body.failed_emails = (job.returnvalue as unknown as JobProgress).failedEmails;
  }

  if (state === 'failed') {
    body.error = job.failedReason;
  }

  res.json(body);
});

// GET /api/jobs
// Overview of the queue — active, waiting, and recent history
router.get('/jobs', async (_req: Request, res: Response) => {
  const [active, waiting, completed, failed] = await Promise.all([
    emailQueue.getActive(),
    emailQueue.getWaiting(),
    emailQueue.getCompleted(0, 9),
    emailQueue.getFailed(0, 9),
  ]);

  res.json({
    queue: {
      active: active.length,
      waiting: waiting.length,
    },
    recent_completed: completed.map(j => ({
      job_id: j.id,
      total: (j.returnvalue as unknown as JobProgress)?.total ?? 0,
      sent: (j.returnvalue as unknown as JobProgress)?.sent ?? 0,
      failed: (j.returnvalue as unknown as JobProgress)?.failed ?? 0,
    })),
    recent_failed: failed.map(j => ({
      job_id: j.id,
      error: j.failedReason,
    })),
  });
});

export default router;
