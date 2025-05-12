import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import userService from '../../Database/User-Service.js';
import { sendMail } from '../../Utils/Send-Email.js';
import { User } from '../../Schemas/index.js';
import { blacklistToken, isBlacklisted } from '../../Utils/Black-List.js';
import {
  attachCookiesToResponse,
  forgot,
  verifyJWT,
  generateCSRFToken,
} from '../../Utils/jwt.js';
import redisClient from '../../Utils/Get-Redis-Client.js';

const register = async (req: Request, res: Response) => {
  try {
    const user = await userService.createUser(req.body);

    const jwtToken = forgot(user.verifyToken!, user.email);

    res.cookie('verifyEmail', jwtToken, {
      httpOnly: true,
      maxAge: 3600000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    const sanitizedUser = {
      ...user,
      secondEmail: user.secondEmail ?? undefined,
      role: user.role as import('../../Schemas/index.ts').Role,
    };
    attachCookiesToResponse(res, sanitizedUser);

    const verificationLink = `http://localhost:5000/auth/verify-email?token=${jwtToken}`;
    await sendMail(
      user.email,
      'Verify Your Email',
      `
        <h2>Verify Email</h2>
        <p>Please click this link to verify your email:</p>
        <a href="${verificationLink}">${verificationLink}</a>
      `
    );

    res.status(201).json({ username: user.username });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: errorMessage });
  }
};

const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ message: 'No token provided' });
      return;
    }

    try {
      const decoded = verifyJWT(token) as { code: string; email: string };
      if (decoded?.code) {
        await userService.verifyEmail(decoded.code);
        res.clearCookie('verifyEmail');
        res.status(200).json({ message: 'Email verified successfully' });
        return;
      }
    } catch (error) {
      try {
        await userService.verifyEmail(token);
        res.clearCookie('verifyEmail');
        res.status(200).json({ message: 'Email verified successfully' });
        return;
      } catch (verifyError) {
        const errorMessage =
          verifyError instanceof Error ? verifyError.message : 'Unknown error';
        res.status(400).json({
          message: 'Email verification failed',
          error: errorMessage,
        });
        return;
      }
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      message: 'Email verification failed',
      error: errorMessage,
    });
  }
};

const login = async (req: Request, res: Response) => {
  try {
    if (!req.body.email || !req.body.password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await userService.login(req.body);

    const sanitizedUser = {
      ...user,
      secondEmail: user.secondEmail ?? undefined,
      role: user.role as import('../../Schemas/index.js').Role,
    };
    const csrfToken = await attachCookiesToResponse(res, sanitizedUser);

    if (user.secondEmail) {
      res.status(200).json({
        username: user.username,
        csrfToken,
        requiresSecondFactor: true,
      });
      return;
    }

    res.status(200).json({ username: user.username, csrfToken });
  } catch (error) {
    res.status(404).json(error);
  }
};

const loginWithGoogle = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ msg: 'Authentication failed' });
      return;
    }

    const user = req.user as User;
    const csrfToken = attachCookiesToResponse(res, user);

    res.status(200).json({ username: user.username, csrfToken });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const logout = async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ msg: 'Authentication failed' });
    return;
  }

  const user = req.user as User;
  const refreshToken = req.cookies.refreshToken;

  await userService.deleteRefreshToken(user.id);

  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken) as { exp?: number };
      if (decoded?.exp) {
        const expiryMs = decoded.exp * 1000 - Date.now();
        if (expiryMs > 0) {
          await blacklistToken(refreshToken, expiryMs);
        }
      }
    } catch (err) {
      console.error('Failed to decode refresh token', err);
    }
  }

  res.cookie('jwt', 'logout', { httpOnly: true, maxAge: 1 });
  res.cookie('refreshToken', 'logout', { httpOnly: true, maxAge: 1 });
  res.cookie('XSRF-TOKEN', 'logout', { httpOnly: false, maxAge: 1 });

  res.status(200).json({ message: 'Logout successful' });
};

const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await userService.findUserByEmail(email);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const resetToken = await userService.makeToken(email);
    const jwtToken = forgot(resetToken, user.email);
    res.cookie('passwordReset', jwtToken, {
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    await sendMail(
      email,
      'Password Reset Request',
      `
        <h2>Password Reset</h2>
        <p>You requested to reset your password.</p>
        <p>Please return to the app and enter this code:</p>
        <h3>${resetToken}</h3>
        <p>This code will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    );

    res.status(200).json({
      message:
        'If your email is registered, you will receive a password reset link',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Password reset failed';
    res.status(500).json({
      message: 'Server error',
      error: errorMessage,
    });
  }
};

const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resetCode, newPassword, email } = req.body;
    const jwtToken = req.cookies.passwordReset;

    if (!resetCode || !newPassword || !email || !jwtToken) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const passwordPattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordPattern.test(newPassword)) {
      res.status(400).json({
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      });
      return;
    }

    const decoded = verifyJWT(jwtToken);
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !decoded.code ||
      !decoded.email
    ) {
      res.status(401).json({ message: 'Invalid session' });
      return;
    }

    if (decoded.email !== email) {
      res.status(401).json({ message: 'Email mismatch' });
      return;
    }

    if (decoded.code !== resetCode) {
      res.status(401).json({ message: 'Invalid reset code' });
      return;
    }
    const user = await userService.findUserByEmail(email);
    if (!user?.verifyToken || user.verifyToken !== decoded.code) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    await userService.updateUserInfo({ password: newPassword }, email);
    await userService.clearResetToken(email);

    res.cookie('passwordReset', 'logout', { httpOnly: true, maxAge: 1 });

    res.status(200).json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      message: 'Failed to reset password',
    });
  }
};

const refresh = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    res.sendStatus(401);
    return;
  }

  const blacklisted = await isBlacklisted(refreshToken);
  if (blacklisted) {
    res.status(403).json({ msg: 'Token is blacklisted' });
    return;
  }

  const storedToken = await userService.findRefreshToken(refreshToken);
  if (!storedToken) {
    res.sendStatus(403);
    return;
  }

  try {
    const payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as jwt.JwtPayload;

    const user = await userService.findUserById(payload.id);
    if (!user) {
      res.sendStatus(404);
      return;
    }

    const oldToken = refreshToken;
    const decoded = jwt.decode(oldToken) as { exp?: number };
    if (decoded?.exp) {
      const expiryMs = decoded.exp * 1000 - Date.now();
      if (expiryMs > 0) {
        await blacklistToken(oldToken, expiryMs);
      }
    }

    const newAccessToken = jwt.sign(
      { id: user.id },
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: '15m',
      }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: '7d',
      }
    );

    const token = {
      token: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    await userService.refreshToken(token);

    const newCsrfToken = generateCSRFToken();

    res.cookie('jwt', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
      sameSite: 'strict',
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
    });

    res.cookie('XSRF-TOKEN', newCsrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
      sameSite: 'strict',
    });

    res
      .status(200)
      .json({ msg: 'Access token refreshed', csrfToken: newCsrfToken });
  } catch (err) {
    res.sendStatus(403);
  }
};

const addsecondEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    await userService.addEmail(user.id, req.body.secondEmail);
    res.status(200).json({ msg: 'Email added successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ msg: error instanceof Error ? error.message : 'Server Error' });
  }
};

const Reqest2fa = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;

    if (!user?.secondEmail) {
      res.status(400).json({ msg: 'Second email is not set' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    const code = crypto.randomUUID();
    const sixDigitCode = code.slice(0, 6);

    await redisClient.set(userId, sixDigitCode, { EX: 600 });

    await sendMail(
      user.secondEmail,
      'Two-Factor Authentication Code',
      `
        <h2>Two-Factor Authentication</h2>
        <p>You requested to verify your identity.</p>
        <p>Please return to the app and enter this code:</p>
        <h3>${sixDigitCode}</h3>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    );

    res.status(200).json({ message: 'Verification code sent to email.' });
  } catch (error) {
    res
      .status(500)
      .json({ msg: error instanceof Error ? error.message : 'Server Error' });
  }
};

const verify2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const reqCode = req.body.code;

    if (!user?.secondEmail) {
      res.status(400).json({ msg: 'Second email is not set' });
      return;
    }

    const storedCode = await redisClient.get(user.id);

    if (!storedCode) {
      res
        .status(400)
        .json({ msg: 'No verification code found or code expired' });
      return;
    }

    if (storedCode === reqCode) {
      await redisClient.del(user.id);
      res.status(200).json({ msg: '2FA verification successful' });
    } else {
      res.status(401).json({ msg: 'Invalid or expired 2FA code' });
    }
  } catch (error) {
    res.status(500).json({
      msg: error instanceof Error ? error.message : 'Server Error',
    });
  }
};

export {
  register,
  verifyEmail,
  login,
  logout,
  loginWithGoogle,
  resetPassword,
  forgotPassword,
  refresh,
  addsecondEmail,
  Reqest2fa,
  verify2FA,
};
