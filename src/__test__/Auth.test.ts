import app from '../app.ts';
import request from 'supertest';
import * as cookie from 'cookie';
import redisClient from '../Utils/Get-Redis-Client.ts';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Authentication Routes Tests', () => {
  let testUser = {
    username: 'username',
    email: 'salahqaraeen733@gmail.com',
    password: 'password@1234H',
    firstName: 'user',
    lastName: 'test',
  };

  let cookies: string[] = [];
  let verifyToken: string | null = null;
  let csrfToken: string | null = null;

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await redisClient.flushDb();

    cookies = [];
    verifyToken = null;
    csrfToken = null;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redisClient.disconnect();
  });

  describe('Registration and Email Verification', () => {
    it('Test register routs should return a 201 create new user', async () => {
      const res = await request(app).post('/auth/register').send(testUser);

      cookies = Array.isArray(res.headers['set-cookie'])
        ? res.headers['set-cookie']
        : [res.headers['set-cookie'] || ''];

      expect(res.statusCode).toBe(201);
      expect(res.body.username).toBe('username');
      expect(cookies.length).toBeGreaterThan(0);
    });

    it('should verify email with valid token', async () => {
      const registerRes = await request(app)
        .post('/auth/register')
        .send(testUser);

      const cookies = Array.isArray(registerRes.headers['set-cookie'])
        ? registerRes.headers['set-cookie']
        : [registerRes.headers['set-cookie'] || ''];

      let verifyEmailJwt = '';
      for (const cookieStr of cookies) {
        const parsedCookie = cookie.parse(cookieStr);
        if ('verifyEmail' in parsedCookie) {
          verifyEmailJwt = parsedCookie.verifyEmail || '';
          break;
        }
      }

      expect(verifyEmailJwt).toBeTruthy();

      const res = await request(app)
        .get(`/auth/verify-email?token=${verifyEmailJwt}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Email verified successfully');

      const verifiedUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(verifiedUser?.isVerified).toBe(true);
      expect(verifiedUser?.verifyToken).toBeNull();
    });
  });

  describe('Login and Authentication', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          ...testUser,
          password: await require('bcrypt').hash(testUser.password, 13),
          isVerified: true,
        },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'salahqaraeen733@gmail.com',
        password: 'password@1234H',
      });

      cookies = Array.isArray(res.headers['set-cookie'])
        ? res.headers['set-cookie']
        : [res.headers['set-cookie'] || ''];

      csrfToken = res.body.csrfToken;

      expect(res.status).toBe(200);
      expect(res.body.username).toBe(testUser.username);
      expect(res.body.csrfToken).toBeDefined();
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('jwt='))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
      expect(cookies.some((c) => c.includes('XSRF-TOKEN='))).toBe(true);
    });

    it('should refresh access tokens', async () => {
      const loginRes = await request(app).post('/auth/login').send({
        email: 'salahqaraeen733@gmail.com',
        password: 'password@1234H',
      });

      cookies = Array.isArray(loginRes.headers['set-cookie'])
        ? loginRes.headers['set-cookie']
        : [loginRes.headers['set-cookie'] || ''];

      const jwtCookie = cookies.find((c) => c.includes('jwt='));
      const originalJwt = cookie.parse(jwtCookie || '').jwt;

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const refreshRes = await request(app)
        .post('/auth/refresh')
        .set('Cookie', cookies);

      const newCookies = Array.isArray(refreshRes.headers['set-cookie'])
        ? refreshRes.headers['set-cookie']
        : [refreshRes.headers['set-cookie'] || ''];

      const newJwtCookie = newCookies.find((c) => c.includes('jwt='));
      const newJwt = cookie.parse(newJwtCookie || '').jwt;

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.msg).toBe('Access token refreshed');
      expect(refreshRes.body.csrfToken).toBeDefined();
      expect(newJwt).toBeDefined();
      expect(newJwt).not.toBe(originalJwt);

      const newRefreshTokenCookie = newCookies.find((c) =>
        c.includes('refreshToken=')
      );
      expect(newRefreshTokenCookie).toBeDefined();
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          ...testUser,
          password: await require('bcrypt').hash(testUser.password, 13),
          isVerified: true,
        },
      });
    });

    it('should initiate password reset process', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: testUser.email });

      const newCookies = Array.isArray(res.headers['set-cookie'])
        ? res.headers['set-cookie']
        : [res.headers['set-cookie'] || ''];

      expect(res.status).toBe(200);

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user?.verifyToken).toBeTruthy();

      const restCookie = newCookies.find((c) => c.includes('passwordReset='));
      expect(restCookie).toBeDefined();
    });

    it('should reset password with valid token and code', async () => {
      const forgotRes = await request(app)
        .post('/auth/forgot-password')
        .send({ email: testUser.email });

      const forgotCookies = Array.isArray(forgotRes.headers['set-cookie'])
        ? forgotRes.headers['set-cookie']
        : [forgotRes.headers['set-cookie'] || ''];

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      const resetCode = user?.verifyToken;
      expect(resetCode).toBeTruthy();

      const newPassword = 'newPassword1234@';

      const resetRes = await request(app)
        .post('/auth/reset-password')
        .set('Cookie', forgotCookies)
        .send({
          email: testUser.email,
          newPassword: newPassword,
          resetCode: resetCode!,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.message).toBe('Password successfully reset');

      const loginRes = await request(app).post('/auth/login').send({
        email: testUser.email,
        password: newPassword,
      });

      expect(loginRes.status).toBe(200);
    });
  });

  describe('Logout', () => {
    it('should logout and invalidate tokens', async () => {
      const user = await prisma.user.create({
        data: {
          ...testUser,
          password: await require('bcrypt').hash(testUser.password, 13),
          isVerified: true,
        },
      });

      const loginRes = await request(app).post('/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);

      const loginCookies = Array.isArray(loginRes.headers['set-cookie'])
        ? loginRes.headers['set-cookie']
        : [loginRes.headers['set-cookie'] || ''];

      const csrfToken = loginRes.body.csrfToken;
      expect(csrfToken).toBeDefined();

      let xsrfCookieValue = '';
      for (const cookieStr of loginCookies) {
        const parsedCookie = cookie.parse(cookieStr);
        if ('XSRF-TOKEN' in parsedCookie) {
          xsrfCookieValue = parsedCookie['XSRF-TOKEN'] || '';
          break;
        }
      }

      console.log('All login cookies:', loginCookies);
      console.log('CSRF Token from body:', csrfToken);
      console.log('XSRF Cookie value:', xsrfCookieValue);

      const logoutRes = await request(app)
        .post('/auth/logout')
        .set('Cookie', loginCookies)
        .set('x-csrf-token', csrfToken);

      console.log('Logout response status:', logoutRes.status);
      console.log('Logout response body:', logoutRes.body);
      console.log('Logout response headers:', logoutRes.headers);

      expect(logoutRes.status).toBe(200);

      const logoutCookies = Array.isArray(logoutRes.headers['set-cookie'])
        ? logoutRes.headers['set-cookie']
        : [logoutRes.headers['set-cookie'] || ''];

      console.log('Logout cookies:', logoutCookies);

      expect(logoutCookies.some((c) => c.includes('jwt=logout'))).toBe(true);
      expect(logoutCookies.some((c) => c.includes('refreshToken=logout'))).toBe(
        true
      );
      expect(logoutCookies.some((c) => c.includes('XSRF-TOKEN=logout'))).toBe(
        true
      );

      const refreshToken = await prisma.refreshToken.findUnique({
        where: { userId: user.id },
      });

      expect(refreshToken).toBeNull();
    });
  });

  describe('CSRF Protection', () => {
    it('should reject requests without valid CSRF token', async () => {
      const user = await prisma.user.create({
        data: {
          ...testUser,
          password: await require('bcrypt').hash(testUser.password, 13),
          isVerified: true,
        },
      });

      const loginRes = await request(app).post('/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);

      const loginCookies = Array.isArray(loginRes.headers['set-cookie'])
        ? loginRes.headers['set-cookie']
        : [loginRes.headers['set-cookie'] || ''];

      const logoutRes = await request(app)
        .post('/auth/logout')
        .set('Cookie', loginCookies);

      expect(logoutRes.status).toBe(403);
    });
  });
});
