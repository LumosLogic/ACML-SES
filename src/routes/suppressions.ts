import { Router, Request, Response } from 'express';
import { pool } from '../services/db';

const router = Router();

// GET /api/suppressions?limit=100&offset=0
router.get('/suppressions', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '100'), 1000);
  const offset = parseInt((req.query.offset as string) || '0');

  const { rows } = await pool.query(
    `SELECT email, reason, suppressed_at FROM suppressed_emails
     ORDER BY suppressed_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM suppressed_emails');

  res.json({ total: parseInt(countRows[0].count), limit, offset, suppressions: rows });
});

// GET /api/suppressions/:email — check if a specific email is suppressed
router.get('/suppressions/:email', async (req: Request, res: Response) => {
  const email = req.params.email.toLowerCase();
  const { rows } = await pool.query(
    'SELECT email, reason, suppressed_at FROM suppressed_emails WHERE email = $1',
    [email]
  );

  if (rows.length === 0) {
    res.json({ email, suppressed: false });
    return;
  }

  res.json({ email, suppressed: true, reason: rows[0].reason, suppressed_at: rows[0].suppressed_at });
});

// POST /api/suppressions — manually add an email to suppression list
// Body: { email: string, reason?: "bounce" | "complaint" }
router.post('/suppressions', async (req: Request, res: Response) => {
  const email = (req.body.email as string | undefined)?.trim().toLowerCase();
  const reason = (req.body.reason as string | undefined) || 'complaint';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'A valid "email" is required' });
    return;
  }

  if (!['bounce', 'complaint'].includes(reason)) {
    res.status(400).json({ error: '"reason" must be "bounce" or "complaint"' });
    return;
  }

  await pool.query(
    `INSERT INTO suppressed_emails (email, reason) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET reason = $2, suppressed_at = NOW()`,
    [email, reason]
  );

  res.status(201).json({ message: 'Email added to suppression list', email, reason });
});

// DELETE /api/suppressions/:email — remove an email from suppression list
router.delete('/suppressions/:email', async (req: Request, res: Response) => {
  const email = req.params.email.toLowerCase();

  const { rowCount } = await pool.query(
    'DELETE FROM suppressed_emails WHERE email = $1',
    [email]
  );

  if (!rowCount) {
    res.status(404).json({ error: 'Email not found in suppression list' });
    return;
  }

  res.json({ message: 'Email removed from suppression list', email });
});

export default router;
