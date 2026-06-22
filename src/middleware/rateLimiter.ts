import rateLimit from 'express-rate-limit';

// 60 requests per minute per IP
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — max 60 per minute per IP. Try again shortly.' },
});
