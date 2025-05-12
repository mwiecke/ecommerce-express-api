import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import userService from '../Database/User-Service.js';
import { User } from '../Schemas/index.js';
import redisClient from '../Utils/Get-Redis-Client.js';
import { UnauthorizedError } from '../Errors/Custom-errors.js';

const USER_CACHE_TTL = 1800;

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
      const foundUser = await userService.findUserById(decoded.id);
      if (!foundUser) {
        throw new UnauthorizedError('Authentication required');
      }

      user = {
        ...foundUser,
        role: foundUser.role as import('../Schemas/index.js').Role,
        secondEmail:
          foundUser.secondEmail === null ? undefined : foundUser.secondEmail,
      };

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
