import rateLimit from 'express-rate-limit';

// Strict limit for send endpoint (prevent abuse)
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — max 60 per minute per IP. Try again shortly.' },
});

// Relaxed limit for read-only dashboard endpoints (stats, jobs, emails, metrics)
export const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again shortly.' },
});
