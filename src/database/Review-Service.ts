import { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';

import { reviewsSchema, reviews } from '../Schemas/index.js';
import { logger } from '../Utils/logger.js';
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../Errors/Custom-errors.js';

const prisma = new PrismaClient();

class ReviewsService {
  constructor(private readonly prisma: PrismaClient) {}

  async calculateRating(productId: string) {
    try {
      await this.prisma.$transaction(async (prisma) => {
        const avgResult = await prisma.review.aggregate({
          _avg: {
            rating: true,
          },
          where: {
            productId: productId,
          },
        });

        await prisma.product.update({
          where: { id: productId },
          data: {
            rating: avgResult._avg.rating ?? 0,
          },
        });
      });
    } catch (error) {
      logger.error(
        `Failed to calculate rating for product ${productId}: ${error}`
      );
      throw new AppError(
        'Failed to update product rating',
        500,
        'RATING_CALCULATION_FAILED'
      );
    }
  }

  async addReview(data: reviews) {
    try {
      const validData = reviewsSchema.parse(data);

      const existingReview = await this.prisma.review.findUnique({
        where: {
          userId_productId: {
            userId: validData.userId!,
            productId: validData.productId!,
          },
        },
      });

      if (existingReview) {
        throw new ConflictError(
          'Review already exists for this user and product'
        );
      }

      const rev = await this.prisma.review.create({
        data: {
          ...validData,
          userId: validData.userId!,
          productId: validData.productId!,
        },
      });
      await this.calculateRating(validData.productId!);

      logger.info(
        `Review added for product ${validData.productId} by user ${validData.userId}`
      );
      return rev;
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }

      logger.error(`Error adding review: ${error}`);

      if (error instanceof ZodError) {
        throw new ValidationError('Invalid review data');
      }

      throw new AppError('Failed to add review', 500, 'REVIEW_ADD_FAILED');
    }
  }

  async updateReview(
    data: Partial<reviews> & { userId: string; productId: string }
  ) {
    try {
      const updateSchema = reviewsSchema.partial({
        rating: true,
        comment: true,
      });

      const validUpdateFields = updateSchema.parse(data);
      const { userId, productId, ...updateFields } = validUpdateFields;

      const rev = await this.prisma.review.update({
        where: {
          userId_productId: {
            userId: userId!,
            productId: productId!,
          },
        },
        data: updateFields,
      });

      await this.calculateRating(productId!);
      return rev;
    } catch (error) {
      throw new ValidationError('Invalid review data');
    }
  }

  async deleteReviews(data: Record<string, string> = {}) {
    try {
      return await this.prisma.review.delete({
        where: {
          userId_productId: {
            userId: data.userId!,
            productId: data.productId!,
          },
        },
      });
    } catch (error) {
      throw new ValidationError('Invalid review data');
    }
  }

  async getReviews(productId: string) {
    try {
      const flag = await this.prisma.product.findFirst({
        where: { id: productId },
      });

      if (!flag) {
        throw new NotFoundError('Product not found');
      }

      return await this.prisma.review.findMany({
        where: {
          productId: productId,
        },
        orderBy: {
          createdAt: 'desc',
        },

        take: 5,
      });
    } catch (error) {
      throw new ValidationError('Invalid review data');
    }
  }
}

const reviewsService = new ReviewsService(prisma);
export default reviewsService;
