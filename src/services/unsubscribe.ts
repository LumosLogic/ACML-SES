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

// Replace {{unsubscribe_url}} only if explicitly present in the body
export function injectUnsubscribeLink(body: string, email: string, _isHtml: boolean): string {
  if (body.includes('{{unsubscribe_url}}')) {
    const url = buildUnsubscribeUrl(email);
    return body.replace(/\{\{unsubscribe_url\}\}/g, url);
  }
  return body;
}

// Replace {{key}} placeholders with values from vars map
export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}
