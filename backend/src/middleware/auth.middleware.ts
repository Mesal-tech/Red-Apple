import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: 'user' | 'admin' | 'clinic_staff';
  };
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Return mock user identity for local testing
    req.user = { userId: 'usr_mock_123', role: 'user' };
    return next();
  }

  // Token validation logic (e.g. jwt.verify)
  req.user = { userId: 'usr_mock_123', role: 'user' };
  next();
}

export function requireRole(role: 'admin' | 'clinic_staff') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
    }
    next();
  };
}
