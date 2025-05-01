import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import userService from '../Database/User-Service.ts';
import { User } from '../Schemas/index.ts';
import redisClient from '../Utils/Get-Redis-Client.ts';
import { UnauthorizedError } from '../Errors/Custom-errors.ts';

const USER_CACHE_TTL = 1800; // 30 minutes

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies?.jwt;

  if (!token) {
    throw new UnauthorizedError('Authentication token is missing');
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!, {
      algorithms: ['HS256'],
    }) as { id: string };

    const cacheKey = `user:${decoded.id}`;
    let user: User | null = null;

    const cachedUser = await redisClient.get(cacheKey);

    if (cachedUser) {
      user = JSON.parse(cachedUser);
    } else {
      user = await userService.findUserById(decoded.id);
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      await redisClient.setEx(cacheKey, USER_CACHE_TTL, JSON.stringify(user));
    }

    if (user) {
      req.user = user;
    } else {
      throw new UnauthorizedError('Authentication required');
    }

    await redisClient.expire(cacheKey, USER_CACHE_TTL);
    next();
  } catch (error) {
    next(error);
  }
};

export { authMiddleware };
