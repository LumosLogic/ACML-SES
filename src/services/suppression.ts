import { pool } from './db';

export async function isEmailSuppressed(email: string): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT 1 FROM suppressed_emails WHERE email = $1 LIMIT 1',
    [email.toLowerCase()]
  );
  return rows.length > 0;
}

export async function suppressEmail(email: string, reason: 'bounce' | 'complaint'): Promise<void> {
  await pool.query(
    `INSERT INTO suppressed_emails (email, reason, suppressed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (email) DO NOTHING`,
    [email.toLowerCase(), reason]
  );
  console.log(`[suppression] blocked: ${email} (${reason})`);
}

export async function filterSuppressed(
  emails: string[]
): Promise<{ allowed: string[]; skipped: string[] }> {
  if (emails.length === 0) return { allowed: [], skipped: [] };

  const { rows } = await pool.query<{ email: string }>(
    'SELECT email FROM suppressed_emails WHERE email = ANY($1)',
    [emails.map(e => e.toLowerCase())]
  );

  const suppressedSet = new Set(rows.map(r => r.email));
  const allowed = emails.filter(e => !suppressedSet.has(e.toLowerCase()));
  const skipped = emails.filter(e => suppressedSet.has(e.toLowerCase()));
  return { allowed, skipped };
}
