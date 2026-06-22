export interface BulkJobData {
  recipients: string[];
  recipientVars?: Record<string, string>[];  // indexed parallel to recipients
  subject: string;
  body: string;
  from: string;
  replyTo?: string;
  cc?: string;
  bcc?: string;
  isHtml: boolean;
  attachments?: { filename: string; content: string; contentType: string }[]; // base64 encoded
  callbackUrl?: string;
}

export interface JobProgress {
  sent: number;
  failed: number;
  total: number;
  failedEmails: string[];
}
