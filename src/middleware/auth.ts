import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { pool } from '../services/db';
import { config } from '../config';

interface CacheEntry {
  clientId: string;
  clientName: string;
  allowedDomain: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  sesConfigSet?: string;
  ts: number;
}

const keyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveKey(key: string): Promise<CacheEntry | null> {
  const cached = keyCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached;

  const { rows } = await pool.query<{
    id: string;
    client_name: string;
    allowed_domain: string;
    smtp_host?: string;
    smtp_port?: number;
    smtp_user?: string;
    smtp_pass?: string;
    ses_config_set?: string;
  }>(
    'SELECT id, client_name, allowed_domain, smtp_host, smtp_port, smtp_user, smtp_pass, ses_config_set FROM api_keys WHERE key = $1 AND is_active = TRUE LIMIT 1',
    [key]
  );

  if (rows.length === 0) {
    keyCache.delete(key);
    return null;
  }

  const entry: CacheEntry = {
    clientId: rows[0].id,
    clientName: rows[0].client_name,
    allowedDomain: rows[0].allowed_domain,
    smtpHost: rows[0].smtp_host ?? undefined,
    smtpPort: rows[0].smtp_port ?? undefined,
    smtpUser: rows[0].smtp_user ?? undefined,
    smtpPass: rows[0].smtp_pass ?? undefined,
    sesConfigSet: rows[0].ses_config_set ?? undefined,
    ts: Date.now(),
  };
  keyCache.set(key, entry);
  return entry;
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const key =
    (req.headers['x-api-key'] as string) ||
    req.headers['authorization']?.replace('Bearer ', '');

  if (!key) {
    res.status(401).json({ error: 'Unauthorized. Provide a valid API key via X-Api-Key header.' });
    return;
  }

  const entry = await resolveKey(key);
  if (!entry) {
    res.status(401).json({ error: 'Unauthorized. Invalid or revoked API key.' });
    return;
  }

  req.clientId      = entry.clientId;
  req.clientName    = entry.clientName;
  req.allowedDomain = entry.allowedDomain;
  req.smtpConfig    = entry.smtpHost ? {
    host: entry.smtpHost,
    port: entry.smtpPort!,
    user: entry.smtpUser!,
    pass: entry.smtpPass!,
    configSet: entry.sesConfigSet!,
  } : undefined;
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

  const keysMatch = key && config.adminKey &&
    key.length === config.adminKey.length &&
    timingSafeEqual(Buffer.from(key), Buffer.from(config.adminKey));

  if (!keysMatch) {
    res.status(401).json({ error: 'Unauthorized. Invalid admin key.' });
    return;
  }

  next();
}

export function evictKeyCache(key: string): void {
  keyCache.delete(key);
}
