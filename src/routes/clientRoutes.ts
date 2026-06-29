import { Router, Request, Response } from 'express';
import { pool } from '../services/db';
import { getStatsByClientId } from '../services/emailLog';

const router = Router();

// GET /client/info — returns the client's own company info
router.get('/info', async (req: Request, res: Response) => {
  const clientId = req.user?.clientId;
  if (!clientId) { res.status(403).json({ error: 'No client associated with this account' }); return; }

  const { rows } = await pool.query(
    'SELECT id, client_name, allowed_domain FROM api_keys WHERE id = $1',
    [clientId]
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Client not found' }); return; }
  res.json({ client: rows[0] });
});

// GET /client/stats?days=7
router.get('/stats', async (req: Request, res: Response) => {
  const clientId = req.user?.clientId;
  if (!clientId) { res.status(403).json({ error: 'No client associated with this account' }); return; }

  let from: Date;
  let to: Date = new Date();

  if (req.query.from && req.query.to) {
    from = new Date(req.query.from as string);
    to   = new Date(req.query.to as string);
    to.setHours(23, 59, 59, 999);
  } else {
    const days = Math.min(parseInt((req.query.days as string) || '7'), 365);
    from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
  }

  const { summary, timeseries } = await getStatsByClientId(clientId, from, to);
  res.json({ summary, timeseries, from: from.toISOString(), to: to.toISOString() });
});

// GET /client/emails?limit=100&offset=0&search=
router.get('/emails', async (req: Request, res: Response) => {
  const clientId = req.user?.clientId;
  if (!clientId) { res.status(403).json({ error: 'No client associated with this account' }); return; }

  const limit  = Math.min(parseInt((req.query.limit  as string) || '100'), 1000);
  const offset = parseInt((req.query.offset as string) || '0');
  const search = (req.query.search as string | undefined)?.trim();

  const params: (string | number)[] = [clientId];
  let extraWhere = '';
  if (search) {
    params.push(`%${search}%`);
    extraWhere = `AND (recipient ILIKE $${params.length} OR subject ILIKE $${params.length})`;
  }

  const { rows } = await pool.query(
    `SELECT id, message_id AS "messageId", recipient, subject,
            sent_at AS "sentAt", status, job_id AS "jobId",
            delivered, opened, bounced
     FROM email_logs
     WHERE client_id = $1 ${extraWhere}
     ORDER BY sent_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM email_logs WHERE client_id = $1 ${extraWhere}`,
    params.slice(0, search ? 2 : 1)
  );

  res.json({ total: parseInt(countRows[0].count), limit, offset, emails: rows });
});

export default router;
