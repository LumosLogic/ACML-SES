import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config';

export function generateUnsubscribeToken(email: string): string {
  return createHmac('sha256', config.unsubscribeSecret)
    .update(email.toLowerCase())
    .digest('hex');
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  try {
    const expected = generateUnsubscribeToken(email);
    // timingSafeEqual prevents timing attacks
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function buildUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email);
  return `${config.unsubscribeBaseUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

// Replace {{unsubscribe_url}} if present, otherwise append a footer
export function injectUnsubscribeLink(body: string, email: string, isHtml: boolean): string {
  const url = buildUnsubscribeUrl(email);

  if (body.includes('{{unsubscribe_url}}')) {
    return body.replace(/\{\{unsubscribe_url\}\}/g, url);
  }

  if (isHtml) {
    return (
      body +
      `\n<div style="margin-top:32px;font-size:11px;color:#999;text-align:center;font-family:sans-serif;">` +
      `<a href="${url}" style="color:#999;">Unsubscribe</a> from these emails` +
      `</div>`
    );
  }

  return body + `\n\nTo unsubscribe: ${url}`;
}

// Replace {{key}} placeholders with values from vars map
export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}
