import { Request, Response, NextFunction, RequestHandler } from 'express';
import redisClient from '../Utils/Get-Redis-Client.js';
import { AppError, RateLimitError } from '../Errors/Custom-errors.js';
import { logger } from '../Utils/logger.js';

const REQUEST_LIMIT = 20;
const TIME_WINDOW = 25200; // 7 hours in seconds

const rateLimiting: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip =
    req.ip ||
    req.headers['x-forwarded-for']?.toString() ||
    req.connection.remoteAddress;

  if (!ip) {
    next(new AppError('Unable to determine client IP', 400, 'INVALID_REQUEST'));
    return;
  }

  try {
    const requests = await redisClient.incr(ip);

    if (requests === 1) {
      await redisClient.expire(ip, TIME_WINDOW);
    }

    const ttl = requests === 1 ? TIME_WINDOW : await redisClient.ttl(ip);

    if (requests > REQUEST_LIMIT) {
      const retryAfter = Math.ceil(ttl / 60);
      res.set('Retry-After', retryAfter.toString());

      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${retryAfter} minutes.`
      );
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    logger.error('Rate limiting error:', error);
    next(new AppError('Rate limiting failed', 500, 'RATE_LIMIT_ERROR'));
  }
};

export default rateLimiting;
