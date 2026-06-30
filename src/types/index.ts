// Extend Express Request so clientId/clientName/allowedDomain are available in all routes
export interface JwtPayload {
  userId: string;
  username: string;
  role: 'admin' | 'client';
  clientId: string | null;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  configSet: string;
}

declare global {
  namespace Express {
    interface Request {
      clientId: string;
      clientName: string;
      allowedDomain: string;
      dailyLimit: number;
      smtpConfig?: SmtpConfig;
      user?: JwtPayload;
    }
  }
}

