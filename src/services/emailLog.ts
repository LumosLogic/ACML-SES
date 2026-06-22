import { pool } from './db';

export interface EmailLogEntry {
  id: string;
  messageId: string;
  recipient: string;
  subject: string;
  sentAt: string;
  status: 'sent' | 'failed';
  jobId: string;
  delivered?: boolean;
  opened?: boolean;
  bounced?: boolean;
}

export async function logEmail(entry: EmailLogEntry): Promise<void> {
  await pool.query(
    `INSERT INTO email_logs (id, message_id, recipient, subject, sent_at, status, job_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [entry.id, entry.messageId, entry.recipient, entry.subject, entry.sentAt, entry.status, entry.jobId]
  );
}

export async function updateEmailEvent(messageId: string, event: 'delivered' | 'opened' | 'bounced'): Promise<void> {
  const result = await pool.query(
    `UPDATE email_logs SET ${event} = TRUE WHERE message_id = $1`,
    [messageId]
  );
  if (result.rowCount && result.rowCount > 0) {
    console.log(`[emailLog] updated ${event} for messageId: ${messageId}`);
  } else {
    console.warn(`[emailLog] no match for messageId: ${messageId}`);
  }
}

export async function getRecentEmails(
  limit: number = 100,
  from?: Date,
  to?: Date
): Promise<EmailLogEntry[]> {
  const params: (number | Date)[] = [];
  let where = '';

  if (from && to) {
    params.push(from, to);
    where = 'WHERE sent_at >= $1 AND sent_at <= $2';
  }

  params.push(Math.min(limit, 1000));
  const limitParam = `$${params.length}`;

  const { rows } = await pool.query(
    `SELECT id, message_id AS "messageId", recipient, subject,
            sent_at AS "sentAt", status, job_id AS "jobId",
            delivered, opened, bounced
     FROM email_logs
     ${where}
     ORDER BY sent_at DESC
     LIMIT ${limitParam}`,
    params
  );
  return rows;
}
