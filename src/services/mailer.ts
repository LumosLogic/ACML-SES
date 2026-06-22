import nodemailer from 'nodemailer';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
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
}): Promise<string> {
  const transport = getTransporter();
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
      'X-SES-CONFIGURATION-SET': config.ses.configSet,
    },
  });
  // SES SMTP response looks like: "250 Ok 0109019ecf4e7bd4-xxx-000000"
  // SNS events use this same ID, so extract it from the response
  const match = (info.response || '').match(/Ok\s+(\S+)/);
  return match ? match[1] : (info.messageId || '').replace(/[<>]/g, '').split('@')[0];
}

export async function verifyConnection(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch {
    return false;
  }
}
