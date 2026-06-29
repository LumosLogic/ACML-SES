import { Router, Request, Response } from 'express';
import { pool } from '../services/db';
import { verifyPassword, signToken } from '../services/authService';
import { requireAuth } from '../middleware/jwt';

const router = Router();

// POST /auth/login — accepts { email, password } or { username, password }
router.post('/login', async (req: Request, res: Response) => {
  const { email, username, password } = req.body;
  const identifier = (email || username)?.trim().toLowerCase();

  if (!identifier || !password) {
    res.status(400).json({ error: 'email/username and password are required' });
    return;
  }

  const { rows } = await pool.query(
    `SELECT id, username, email, password_hash, role, client_id
     FROM users
     WHERE email = $1 OR username = $1
     LIMIT 1`,
    [identifier]
  );

  if (rows.length === 0 || !(await verifyPassword(password, rows[0].password_hash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const user = rows[0];

  // For client role, fetch their company info
  let clientName: string | null = null;
  let allowedDomain: string | null = null;
  if (user.client_id) {
    const { rows: c } = await pool.query(
      'SELECT client_name, allowed_domain FROM api_keys WHERE id = $1',
      [user.client_id]
    );
    if (c.length > 0) { clientName = c[0].client_name; allowedDomain = c[0].allowed_domain; }
  }

  const token = signToken({ userId: user.id, username: user.username, role: user.role, clientId: user.client_id });

  res.json({ token, role: user.role, username: user.username, clientId: user.client_id, clientName, allowedDomain });
});

// GET /auth/me — verify token and return current user
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
