import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id           UUID PRIMARY KEY,
      message_id   TEXT,
      recipient    TEXT NOT NULL,
      subject      TEXT NOT NULL,
      sent_at      TIMESTAMPTZ NOT NULL,
      status       TEXT NOT NULL,
      job_id       TEXT,
      delivered    BOOLEAN NOT NULL DEFAULT FALSE,
      opened       BOOLEAN NOT NULL DEFAULT FALSE,
      bounced      BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON email_logs (message_id);
    CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs (sent_at DESC);

    CREATE TABLE IF NOT EXISTS suppressed_emails (
      email          TEXT PRIMARY KEY,
      reason         TEXT NOT NULL,
      suppressed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key          TEXT UNIQUE NOT NULL,
      client_name  TEXT NOT NULL,
      is_active    BOOLEAN NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys (key);
  `);

  // Auto-migrate: if table is empty and legacy API_KEY is set, seed it as "default" client
  if (config.apiKey) {
    const { rows } = await pool.query('SELECT 1 FROM api_keys LIMIT 1');
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO api_keys (key, client_name) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        [config.apiKey, 'default']
      );
      console.log('[db] Migrated legacy API_KEY as "default" client key');
    }
  }
}
