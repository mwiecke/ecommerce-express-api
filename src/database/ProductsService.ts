import { PrismaClient } from '@prisma/client';
import { productsSchema, Product } from '../schemas/index.ts';
import redis from './redisService.ts';

const prisma = new PrismaClient();

export class ProductsService {
  constructor(private readonly prisma: PrismaClient) {}

  async createproduct(data: unknown, imageUrl: string) {
    const validData = productsSchema.parse({
      ...(data as object),
      imageUrl,
    });

    const existingProduct = await this.prisma.product.findFirst({
      where: {
        name: { equals: validData.name, mode: 'insensitive' },
      },
    });

    if (existingProduct) {
      throw new Error(`Product "${validData.name}" already exists`);
    }

    return this.prisma.product.create({
      data: validData,
    });
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  async UpdateProduct(id: string, data: Product) {
    const updateData: Record<string, any> = {};

    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.price) updateData.price = data.price;
    if (data.stock) updateData.stock = data.stock;

    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  async getProductBYPage(page: number = 1) {
    return redis.addPage(page, async () => {
      return this.prisma.product.findMany({
        where: {
          isDeleted: false,
        },

        skip: (page - 1) * 20,
        take: 20,
        orderBy: { name: 'asc' },
      });
    });
  }

  async getProduct(Name: string) {
    const key = `product:${Name}`;
    return redis.getOrSetCache(key, async () => {
      return this.prisma.product.findMany({
        where: {
          isDeleted: false,
          name: {
            startsWith: Name,
            mode: 'insensitive',
          },
        },
      });
    });
  }

  async makeHidn(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
  }
}

const productsService = new ProductsService(prisma);
export default productsService;
