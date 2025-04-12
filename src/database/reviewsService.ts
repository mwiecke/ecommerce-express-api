import { PrismaClient, User } from '@prisma/client';
import { reviewsSchema, reviews } from '../schemas/index.ts';

const prisma = new PrismaClient();

class ReviewsService {
  constructor(private readonly prisma: PrismaClient) {}

  async addReview(data: reviews) {
    try {
      const validData = reviewsSchema.parse(data);

      return await this.prisma.review.create({
        data: validData,
      });
    } catch (error) {
      throw new Error('Invalid review data');
    }
  }

  async updateReview(data: reviews) {
    try {
      const validData = reviewsSchema.parse(data);
      const { userId, productId, ...updateFields } = validData;

      return await this.prisma.review.update({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        data: updateFields,
      });
    } catch (error) {
      console.error('Error updating review:', error);
      throw new Error('Invalid review data');
    }
  }

  async deleteReviews(data: Record<string, string> = {}) {
    try {
      const validData = reviewsSchema.parse(data);

      return await this.prisma.review.delete({
        where: {
          userId_productId: {
            userId: validData.userId,
            productId: validData.productId,
          },
        },
      });
    } catch (error) {
      throw new Error('Invalid review data');
    }
  }

  async getReviews(productId: string) {
    try {
      const flag = await this.prisma.product.findFirst({
        where: { id: productId },
      });

      if (!flag) {
        throw new Error('Invalid product id');
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
      throw new Error('Invalid review data');
    }
  }
}

const reviewsService = new ReviewsService(prisma);
export default reviewsService;
