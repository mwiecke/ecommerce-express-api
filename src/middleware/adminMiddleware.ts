import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import userService from '../database/UserService.ts';

export const isAdmin: RequestHandler = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    res.status(401).json({ msg: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
      id: string;
    };
    const user = await userService.findUserById(decoded.id);

    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }

    if (user.role !== 'ADMIN') {
      res.status(403).json({ msg: 'Access denied' });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};
