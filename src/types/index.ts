// Extend Express Request so clientId/clientName/allowedDomain are available in all routes
export interface JwtPayload {
  userId: string;
  username: string;
  role: 'admin' | 'client';
  clientId: string | null;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  configSet: string;
}

declare global {
  namespace Express {
    interface Request {
      clientId: string;
      clientName: string;
      allowedDomain: string;
      smtpConfig?: SmtpConfig;
      user?: JwtPayload;
    }
  }
}

export interface BulkJobData {
  recipients: string[];
  recipientVars?: Record<string, string>[];
  subject: string;
  body: string;
  from: string;
  replyTo?: string;
  cc?: string;
  bcc?: string;
  isHtml: boolean;
  attachments?: { filename: string; content: string; contentType: string }[];
  callbackUrl?: string;
  clientId?: string;
  smtpConfig?: SmtpConfig;
}

export interface JobProgress {
  sent: number;
  failed: number;
  total: number;
  failedEmails: string[];
}
