import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../services/db';

const router = Router();

// GET /api/stats?days=7
// GET /api/stats?from=2026-06-01&to=2026-06-18
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let from: Date;
    let to: Date = new Date();

    if (req.query.from && req.query.to) {
      from = new Date(req.query.from as string);
      to = new Date(req.query.to as string);
      // Include full end day
      to.setHours(23, 59, 59, 999);
    } else {
      const days = Math.min(parseInt((req.query.days as string) || '7'), 365);
      from = new Date();
      from.setDate(from.getDate() - days);
      from.setHours(0, 0, 0, 0);
    }

    // Summary counts
    const summaryResult = await pool.query(
      `SELECT
        COUNT(*)                                      AS sent,
        COUNT(*) FILTER (WHERE delivered = TRUE)      AS delivered,
        COUNT(*) FILTER (WHERE bounced = TRUE)        AS bounced,
        COUNT(*) FILTER (WHERE status = 'failed')     AS failed
       FROM email_logs
       WHERE sent_at >= $1 AND sent_at <= $2`,
      [from, to]
    );

    const s = summaryResult.rows[0];
    const sent      = parseInt(s.sent)      || 0;
    const delivered = parseInt(s.delivered) || 0;
    const bounced   = parseInt(s.bounced)   || 0;
    const failed    = parseInt(s.failed)    || 0;

    const summary = {
      sent,
      delivered,
      bounced,
      failed,
      delivery_rate: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
      bounce_rate:   sent > 0 ? Math.round((bounced   / sent) * 1000) / 10 : 0,
    };

    // Day-by-day timeseries
    const timeseriesResult = await pool.query(
      `SELECT
        DATE_TRUNC('day', sent_at AT TIME ZONE 'UTC')  AS day,
        COUNT(*)                                        AS sent,
        COUNT(*) FILTER (WHERE delivered = TRUE)        AS delivered,
        COUNT(*) FILTER (WHERE bounced = TRUE)          AS bounced,
        COUNT(*) FILTER (WHERE status = 'failed')       AS failed
       FROM email_logs
       WHERE sent_at >= $1 AND sent_at <= $2
       GROUP BY day
       ORDER BY day`,
      [from, to]
    );

    const timeseries = timeseriesResult.rows.map((row) => ({
      date: new Date(row.day).toISOString().split('T')[0],
      sent:      parseInt(row.sent)      || 0,
      delivered: parseInt(row.delivered) || 0,
      bounced:   parseInt(row.bounced)   || 0,
      failed:    parseInt(row.failed)    || 0,
    }));

    res.json({ summary, timeseries, from: from.toISOString(), to: to.toISOString() });
  } catch (err) {
    next(err);
  }
});

export default router;
