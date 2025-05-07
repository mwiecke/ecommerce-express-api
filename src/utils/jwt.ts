import { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { User, RefreshToken } from '../Schemas/index.ts';
import userService from '../Database/User-Service.ts';
import { AppError, UnauthorizedError } from '../Errors/Custom-errors.ts';
import { logger } from './logger.ts';

export const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const attachCookiesToResponse = async (res: Response, user: User) => {
  if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
    logger.error(
      'JWT verification failed: ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET is not configured'
    );
    throw new AppError(
      'Server configuration error',
      500,
      'SERVER_CONFIG_ERROR'
    );
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

  const csrfToken = generateCSRFToken();

  res.cookie('jwt', accessToken, {
    httpOnly: true,
    maxAge: 15 * 60 * 1000,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  res.cookie('XSRF-TOKEN', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 15 * 60 * 1000,
    sameSite: 'strict',
  });

  const token: RefreshToken = {
    token: refreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  await userService.refreshToken(token).catch((err) => {
    logger.error('Failed to store refresh token', err);
  });

  return csrfToken;
};

export const forgot = (code: string, email?: string) => {
  if (!process.env.FORGOT_TOKEN_SECRET) {
    logger.error('FORGOT_TOKEN_SECRET is not configured');
    throw new AppError(
      'Server configuration error',
      500,
      'SERVER_CONFIG_ERROR'
    );
  }

  return jwt.sign({ code, email }, process.env.FORGOT_TOKEN_SECRET, {
    expiresIn: '1h',
  });
};

type ForgotPayload = { code: string; email?: string };

export const verifyJWT = (token: string): ForgotPayload | null => {
  if (!token) {
    throw new UnauthorizedError('Authentication token is missing');
  }

  const secret = process.env.FORGOT_TOKEN_SECRET;
  if (!secret) {
    logger.error(
      'JWT verification failed: FORGOT_TOKEN_SECRET is not configured'
    );
    throw new AppError(
      'Server configuration error',
      500,
      'SERVER_CONFIG_ERROR'
    );
  }

  try {
    return jwt.verify(token, secret) as ForgotPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn(`JWT expired: ${error.message}`);
      throw new UnauthorizedError('Authentication token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn(`JWT invalid: ${error.message}`);
      throw new UnauthorizedError('Invalid authentication token');
    } else {
      logger.error(`JWT verification failed with unexpected error: ${error}`);
      throw new AppError('Authentication failed', 500, 'AUTH_ERROR');
    }
  }
};
