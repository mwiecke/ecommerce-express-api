import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import userService from '../database/UserService';
import { User } from '../schemas/index'; // Import User type

export const authMiddleware: RequestHandler = async (req, res, next) => {
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
    if (!user || !user.id) {
      // Ensure user has an id
      res.status(404).json({ msg: 'User not found' });
      return;
    }

    req.user = user as User; // Explicitly cast to User
    next();
  } catch (error) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};
