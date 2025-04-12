import { Request, Response } from 'express';
import { attachCookiesToResponse, forgot, verifyJWT } from '../../utils/jwt.ts';
import userService from '../../database/UserService.ts';
import { User } from '../../schemas/index.ts';
import { sendMail } from '../../utils/sendEmail.ts';

const register = async (req: Request, res: Response) => {
  try {
    const user = await userService.createUser(req.body);

    const jwtToken = forgot(user.verifyToken!, user.email);

    res.cookie('verifyEmail', jwtToken, { httpOnly: true, maxAge: 3600000 });
    attachCookiesToResponse(res, user);

    const verificationLink = `http://localhost:5000/auth/verify-email?token={{verification_token}} `;
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

    const decoded = verifyJWT(token) as { code: string; email: string };
    if (!decoded?.code) {
      res.status(400).json({ message: 'Invalid JWT token' });
      return;
    }

    await userService.verifyEmail(decoded.code);

    res.clearCookie('verifyEmail');
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    res
      .status(400)
      .json({ message: 'Email verification failed', error: errorMessage });
  }
};

const login = async (req: Request, res: Response) => {
  try {
    const user = await userService.login(req.body);

    attachCookiesToResponse(res, user);

    res.status(200).json({ username: user.username });
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

    attachCookiesToResponse(res, user);

    res.status(200).json({ username: user.username });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const logout = async (req: Request, res: Response) => {
  res.cookie('jwt', 'logout', { httpOnly: true, maxAge: 1 });
  res.cookie('refreshToken', 'logout', { httpOnly: true, maxAge: 1 });
  res.status(200).json({ msg: 'logout' });
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

    await sendMail(
      email,
      'Password Reset Request',
      `
        <h2>Password Reset</h2>
        <p>You requested to reset your password.</p>
        <p>Please return to the app and enter this code:</p>
        <h3>${jwtToken}</h3>
        <p>This code will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    );

    res.status(200).json({
      message: 'Password reset email sent',
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
    const { token, newPassword, email } = req.body;

    if (!token || !newPassword || !email) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const decoded = verifyJWT(token);
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !decoded.code ||
      !decoded.email
    ) {
      res.status(401).json({ message: 'Invalid token format' });
      return;
    }

    if (decoded.email !== email) {
      res.status(401).json({ message: 'Token email mismatch' });
      return;
    }

    const user = await userService.findUserByEmail(email);
    if (!user?.verifyToken || user.verifyToken !== decoded.code) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    if (newPassword.length < 8) {
      res
        .status(400)
        .json({ message: 'Password must be at least 8 characters' });
      return;
    }

    await userService.updateUserInfo(newPassword, email);
    await userService.clearResetToken(email);

    res.status(200).json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      message: 'Failed to reset password',
      // error: error.message
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
};
