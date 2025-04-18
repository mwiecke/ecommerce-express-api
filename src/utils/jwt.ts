import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import { User } from '../schemas/index.ts';

type JwtUser = Pick<User, 'id'>;

const generateTokens = (user: JwtUser) => {
  if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('Missing JWT secret keys in environment variables');
  }

  const accessToken = jwt.sign(
    { id: user.id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const attachCookiesToResponse = (res: Response, user: User) => {
  const tokens = generateTokens(user);
  res.cookie('jwt', tokens.accessToken, {
    httpOnly: true,
    maxAge: 15 * 60 * 1000,
    sameSite: 'strict',
  }); // 15 minutes
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'strict',
  }); // 7 days
};

export const forgot = (code: string, email?: string) => {
  const secret = process.env.FORGOT_TOKEN_SECRET || 'your-secret'; // Use environment variable for security
  return jwt.sign({ code, email }, secret, { expiresIn: '1h' });
};

type ForgotPayload = { code: string; email?: string };

export const verifyJWT = (token: string): ForgotPayload | null => {
  if (!token) {
    console.warn('No token provided');
    return null;
  }

  const secret = process.env.FORGOT_TOKEN_SECRET;
  if (!secret) {
    throw new Error('FORGOT_TOKEN_SECRET is not configured');
  }

  try {
    return jwt.verify(token, secret) as ForgotPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
};
