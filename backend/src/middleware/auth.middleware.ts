import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token';
import { UserRole } from '../models/user.model';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Strict authentication middleware.
 * Rejects any request that does not provide a cryptographically valid JWT access token.
 * No mock bypasses or fallbacks allowed.
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Authorization header missing.',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Authentication format invalid. Expected "Bearer <token>".',
    });
  }

  const token = parts[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
    };
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: err.message || 'Invalid or expired access token.',
    });
  }
}

/**
 * Optional authentication middleware.
 * Attaches user if valid token is provided, but allows guest access.
 */
export function optionalAuthenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const payload = verifyAccessToken(parts[1]);
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role as UserRole,
      };
    } catch {
      // Ignored for optional auth
    }
  }
  next();
}

/**
 * Role-based access control middleware.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access forbidden. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }

    next();
  };
}
