import express from 'express';
import passport from 'passport';

const authRouter = express.Router();

import {
  register,
  verifyEmail,
  login,
  loginWithGoogle,
  resetPassword,
  forgotPassword,
  logout,
  refresh,
} from '../Controllers/authControllers/Auth-Controllers.ts';

authRouter.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

authRouter.get(
  '/google/redirect',
  passport.authenticate('google', { session: false }),
  loginWithGoogle
);

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/verify-email', verifyEmail);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/logout', logout);
authRouter.post('/refresh', refresh);

export { authRouter };
