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

  const csrfToken = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];
  const cookieToken = req.cookies['XSRF-TOKEN'];

  if (
    !csrfToken ||
    !cookieToken ||
    typeof csrfToken !== 'string' ||
    typeof cookieToken !== 'string'
  ) {
    next(new ForbiddenError('CSRF token validation failed'));
    return;
  }

  try {
    const isEqual = timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(csrfToken)
    );
    if (!isEqual) {
      next(new ForbiddenError('CSRF token validation failed'));
    }
    next();
  } catch {
    next(new ForbiddenError('CSRF token validation failed'));
  }
};
