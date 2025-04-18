import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import userService from '../database/UserService.ts';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies?.jwt;

  if (!token) {
    res.status(401).json({ msg: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
      id: string;
    };
    const user = await userService.findUserById(decoded.id);

    if (!user || !user.id) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    res.status(401).json({ msg: 'Invalid token' });
  }
};
