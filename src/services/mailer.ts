import nodemailer from 'nodemailer';
import { config } from '../config';
import type { SmtpConfig } from '../types';

// Cache one transporter per client SMTP config
const transporterCache = new Map<string, nodemailer.Transporter>();

function getTransporter(smtpConfig?: SmtpConfig): nodemailer.Transporter {
  const host = smtpConfig?.host ?? config.smtp.host;
  const port = smtpConfig?.port ?? config.smtp.port;
  const user = smtpConfig?.user ?? config.smtp.user;
  const pass = smtpConfig?.pass ?? config.smtp.pass;

  const cacheKey = `${host}:${port}:${user}`;

  if (!transporterCache.has(cacheKey)) {
    transporterCache.set(cacheKey, nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }));
  }

  return transporterCache.get(cacheKey)!;
}

export async function sendEmail(params: {
  to: string;
  from: string;
  subject: string;
  body: string;
  isHtml: boolean;
  replyTo?: string;
  cc?: string;
  bcc?: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
  smtpConfig?: SmtpConfig;
}): Promise<string> {
  const transport = getTransporter(params.smtpConfig);
  const configSet = params.smtpConfig?.configSet ?? config.ses.configSet;

  const info = await transport.sendMail({
    from: params.from,
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    [params.isHtml ? 'html' : 'text']: params.body,
    replyTo: params.replyTo,
    attachments: params.attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
    headers: {
      'X-SES-CONFIGURATION-SET': configSet,
    },
  });

  const match = (info.response || '').match(/Ok\s+(\S+)/);
  return match ? match[1] : (info.messageId || '').replace(/[<>]/g, '').split('@')[0];
}

export async function verifyConnection(smtpConfig?: SmtpConfig): Promise<boolean> {
  try {
    await getTransporter(smtpConfig).verify();
    return true;
  } catch {
    return false;
  }
}
