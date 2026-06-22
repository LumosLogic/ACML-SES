import { Request, Response, NextFunction } from 'express';
import { pool } from '../services/db';
import { config } from '../config';

interface CacheEntry { clientName: string; ts: number }
const keyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — revoked keys stop working within this window

async function isValidKey(key: string): Promise<string | null> {
  // Check cache first
  const cached = keyCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.clientName;
  }

  const { rows } = await pool.query<{ client_name: string }>(
    'SELECT client_name FROM api_keys WHERE key = $1 AND is_active = TRUE LIMIT 1',
    [key]
  );

  if (rows.length === 0) {
    keyCache.delete(key); // ensure stale cache is cleared
    return null;
  }

  keyCache.set(key, { clientName: rows[0].client_name, ts: Date.now() });
  return rows[0].client_name;
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const key =
    (req.headers['x-api-key'] as string) ||
    req.headers['authorization']?.replace('Bearer ', '');

  if (!key) {
    res.status(401).json({ error: 'Unauthorized. Provide a valid API key via X-Api-Key header.' });
    return;
  }

  const clientName = await isValidKey(key);
  if (!clientName) {
    res.status(401).json({ error: 'Unauthorized. Invalid or revoked API key.' });
    return;
  }

  // Attach client name to request for logging/auditing
  (req as Request & { clientName: string }).clientName = clientName;
  next();
}

export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  if (!config.adminKey) {
    res.status(503).json({ error: 'Admin access not configured. Set ADMIN_KEY in .env.' });
    return;
  }

  const key =
    (req.headers['x-api-key'] as string) ||
    req.headers['authorization']?.replace('Bearer ', '');

  if (!key || key !== config.adminKey) {
    res.status(401).json({ error: 'Unauthorized. Invalid admin key.' });
    return;
  }

  next();
}

// Call this when a key is revoked so it takes effect immediately (no need to wait for TTL)
export function evictKeyCache(key: string): void {
  keyCache.delete(key);
}
