import { Router, Request, Response } from 'express';
import { verifyUnsubscribeToken } from '../services/unsubscribe';
import { suppressEmail } from '../services/suppression';

const router = Router();

// GET /unsubscribe?email=x@x.com&token=xxx
// Public — no API key needed. Client clicks this link from their email.
router.get('/unsubscribe', async (req: Request, res: Response) => {
  const email = (req.query.email as string | undefined)?.trim();
  const token = (req.query.token as string | undefined)?.trim();

  if (!email || !token) {
    res.status(400).send(page('Invalid Link', 'This unsubscribe link is invalid or incomplete.'));
    return;
  }

  const valid = verifyUnsubscribeToken(email, token);
  if (!valid) {
    res.status(400).send(page('Invalid Link', 'This unsubscribe link is invalid or has expired.'));
    return;
  }

  try {
    await suppressEmail(email, 'complaint');
    res.send(page(
      'Unsubscribed',
      `<strong>${escHtml(email)}</strong> has been unsubscribed and will no longer receive emails.`
    ));
  } catch {
    res.status(500).send(page('Error', 'Something went wrong. Please try again later.'));
  }
});

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function page(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: #fff; padding: 40px 48px; border-radius: 8px; text-align: center;
            max-width: 440px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    h2 { margin: 0 0 12px; }
    p { color: #555; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${title}</h2>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

export default router;
