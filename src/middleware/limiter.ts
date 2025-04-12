import { Request, Response, NextFunction, RequestHandler } from 'express';
import redisClient from '../utils/getRedisClient.ts';

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
    res.status(400).json({ msg: 'Unable to determine client IP.' });
    return;
  }

  try {
    const requests = await redisClient.incr(ip);

    if (requests === 1) {
      await redisClient.expire(ip, TIME_WINDOW);
    }

    const ttl = requests === 1 ? TIME_WINDOW : await redisClient.ttl(ip);

    if (requests > REQUEST_LIMIT) {
      res
        .status(429)
        .set('Retry-After', Math.ceil(ttl / 60).toString())
        .json({ msg: 'Too many requests. Please try again later.' });
      return;
    }

    next();
  } catch (error) {
    console.error('Redis error in rate limiter:', error);
    res.status(500).json({ msg: 'Internal server error.' });
  }
};

export default rateLimiting;
