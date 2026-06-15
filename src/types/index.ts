export interface BulkJobData {
  recipients: string[];
  subject: string;
  body: string;
  from: string;
  replyTo?: string;
  isHtml: boolean;
}

export interface JobProgress {
  sent: number;
  failed: number;
  total: number;
  failedEmails: string[];
}
