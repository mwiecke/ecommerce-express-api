import { PrismaClient, User } from '@prisma/client';
import { userSchema, Login, loginSchema } from '../schemas/index.ts';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

class UserService {
  constructor(private readonly prisma: PrismaClient) {}

  async createUser(data: unknown) {
    const validData = userSchema.parse(data);

    if (!validData.password) {
      validData.password = undefined;
    } else {
      validData.password = await bcrypt.hash(validData.password, 13);
    }

    if (!validData.googleId) {
      validData.googleId = undefined;
    }

    validData.verifyToken = crypto.randomBytes(32).toString('hex');
    validData.isVerified = false;

    // Assign admin role if no admins exist
    const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    if (adminUsers.length === 0) {
      validData.role = 'ADMIN';
    }

    const user = await prisma.user.create({
      data: validData,
    });

    return user;
  }

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { verifyToken: token },
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verifyToken: null },
    });

    return { message: 'Email verified successfully' };
  }

  async login(data: Login) {
    const validData = loginSchema.parse(data);
    const user = await prisma.user.findUnique({
      where: {
        email: validData.email,
      },
    });

    if (!user) {
      throw new Error('Email not found');
    }

    if (!user.isVerified) {
      throw new Error('Please verify your email before logging in');
    }

    if (user.password === null && user.googleId) {
      throw new Error('Please login using Google or sign up with a password');
    }

    const passwordMatch = await bcrypt.compare(
      validData.password,
      user.password as string
    );
    if (!passwordMatch) {
      throw new Error('Invalid password');
    }

    return user;
  }

  async findUserByGoogleId(googleId: string) {
    return await prisma.user.findUnique({ where: { googleId } });
  }

  async findUserById(id: string) {
    return await prisma.user.findUnique({ where: { id } });
  }

  async findUserByEmail(email: string) {
    return await prisma.user.findUnique({ where: { email } });
  }

  async updateUserInfo(data: User, email: string) {
    const updateData: Record<string, any> = {};

    if (data.email) updateData.email = data.email;
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.username) updateData.username = data.username;
    if (data.password)
      updateData.password = await bcrypt.hash(data.password, 13);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    return await prisma.user.update({
      where: { email },
      data: updateData,
    });
  }

  async makeToken(email: string): Promise<string> {
    const verifyToken = crypto.randomBytes(32).toString('hex');

    try {
      await prisma.user.update({
        where: { email },
        data: {
          verifyToken,
        },
      });

      return verifyToken;
    } catch (error) {
      console.error('Failed to generate and store token:', error);
      throw new Error('Could not create verification token');
    }
  }

  async clearResetToken(email: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { email },
        data: {
          verifyToken: null,
        },
      });
    } catch (error) {
      console.error(`Failed to clear reset token for ${email}:`, error);
      throw new Error('Failed to clear reset token');
    }
  }
}

const userService = new UserService(prisma);
export default userService;
