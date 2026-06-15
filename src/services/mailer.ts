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
}): Promise<void> {
  const transport = getTransporter();
  await transport.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    [params.isHtml ? 'html' : 'text']: params.body,
    replyTo: params.replyTo,
    headers: {
      'X-SES-CONFIGURATION-SET': config.ses.configSet,
    },
  });
}

export async function verifyConnection(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch {
    return false;
  }
}
