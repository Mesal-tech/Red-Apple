import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[Express Error]', err);

  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;
  const message = isServerError
    ? 'We could not complete that request right now.'
    : err.publicMessage || err.message || 'Please check your details and try again.';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: isServerError ? (err.code || 'INTERNAL_ERROR') : (err.code || 'REQUEST_ERROR'),
    },
  });
}
