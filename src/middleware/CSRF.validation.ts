import { Response, Request, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { ForbiddenError } from '../Errors/Custom-errors.ts';

export const validateCSRF = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip for safe methods that don't modify state
  if (['GET'].includes(req.method)) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const cookieToken = req.cookies['XSRF-TOKEN'];

  if (!csrfToken || !cookieToken) {
    next(new ForbiddenError('CSRF token validation failed'));
    return;
  }

  try {
    const isEqual = timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(String(csrfToken))
    );
    if (!isEqual) {
      throw new Error('Token mismatch');
    }
    next();
  } catch {
    next(new ForbiddenError('CSRF token validation failed'));
  }
};
