import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { pool } from '../services/db';
import { evictKeyCache } from '../middleware/auth';

const router = Router();

function generateApiKey(): string {
  return randomBytes(32).toString('hex'); // 64-char hex
}

function maskKey(key: string): string {
  return key.slice(0, 8) + '••••••••••••••••••••••••••••••••' + key.slice(-4);
}

// POST /admin/keys  — create a new client key
// Body: { client_name: string }
router.post('/keys', async (req: Request, res: Response) => {
  const clientName = (req.body.client_name as string | undefined)?.trim();
  if (!clientName) {
    res.status(400).json({ error: '"client_name" is required' });
    return;
  }

  const key = generateApiKey();

  await pool.query(
    'INSERT INTO api_keys (key, client_name) VALUES ($1, $2)',
    [key, clientName]
  );

  res.status(201).json({
    client_name: clientName,
    api_key: key,  // shown only once — client must save this
    note: 'Save this key now. It will not be shown again.',
  });
});

// GET /admin/keys  — list all keys (masked)
router.get('/keys', async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT id, client_name, key, is_active, created_at
     FROM api_keys ORDER BY created_at DESC`
  );

  res.json({
    keys: rows.map(r => ({
      id: r.id,
      client_name: r.client_name,
      key_preview: maskKey(r.key),
      is_active: r.is_active,
      created_at: r.created_at,
    })),
  });
});

// PATCH /admin/keys/:id/revoke  — deactivate (revoke) a key
router.patch('/keys/:id/revoke', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { rows } = await pool.query<{ key: string }>(
    `UPDATE api_keys SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING key`,
    [id]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Key not found or already revoked' });
    return;
  }

  evictKeyCache(rows[0].key); // immediate effect — no TTL wait
  res.json({ message: 'Key revoked successfully' });
});

// PATCH /admin/keys/:id/activate  — re-activate a revoked key
router.patch('/keys/:id/activate', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { rowCount } = await pool.query(
    `UPDATE api_keys SET is_active = TRUE WHERE id = $1 AND is_active = FALSE`,
    [id]
  );

  if (!rowCount) {
    res.status(404).json({ error: 'Key not found or already active' });
    return;
  }

  res.json({ message: 'Key activated successfully' });
});

// DELETE /admin/keys/:id  — permanently delete a key
router.delete('/keys/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { rows } = await pool.query<{ key: string }>(
    'DELETE FROM api_keys WHERE id = $1 RETURNING key',
    [id]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Key not found' });
    return;
  }

  evictKeyCache(rows[0].key);
  res.json({ message: 'Key deleted permanently' });
});

export default router;
