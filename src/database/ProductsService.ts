import { PrismaClient, Prisma } from '@prisma/client';
import { productSchema, Product } from '../Schemas/index.js';
import redis from './Redis-Service.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../Errors/Custom-errors.js';

const prisma = new PrismaClient();

export type ProductFilter = {
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  category?: string;
  tags?: string[];
};

export type ProductSorting = {
  field: 'name' | 'price' | 'createdAt' | 'rating' | 'category';
  order: 'asc' | 'desc';
};

class ProductsService {
  constructor(private readonly prisma: PrismaClient) {}

  async createProduct(data: unknown, imageUrl: string) {
    const validData = productSchema.parse({
      ...(data as object),
      imageUrl,
    });

    return await this.prisma.$transaction(async (prisma) => {
      const existingProduct = await prisma.product.findFirst({
        where: {
          name: { equals: validData.name, mode: 'insensitive' },
          isDeleted: false,
        },
      });

      if (existingProduct) {
        throw new ConflictError(`Product "${validData.name}" already exists`);
      }

      return prisma.product.create({
        data: {
          ...validData,
          imageUrl: validData.imageUrl || '',
          isDeleted: false,
        },
      });
    });
  }

  async deleteProduct(id: string) {
    return await this.prisma.$transaction(async (prisma) => {
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundError(`Product with ID ${id} not found`);
      }

      return prisma.product.delete({
        where: { id },
      });
    });
  }

  async updateProduct(id: string, data: Partial<Product>) {
    return await this.prisma.$transaction(async (prisma) => {
      const updateData: Partial<Product> = { ...data };

      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundError(`Product with ID ${id} not found`);
      }

      if (product.isDeleted) {
        throw new ForbiddenError('Cannot update a deleted product');
      }

      return prisma.product.update({
        where: { id },
        data: updateData,
      });
    });
  }

  async getProductByPage(
    page: number = 1,
    filter?: ProductFilter,
    sorting?: ProductSorting
  ) {
    const cacheKey = `products:page:${page}:${JSON.stringify(
      filter
    )}:${JSON.stringify(sorting)}`;

    return redis.getOrSetCache(cacheKey, async () => {
      const where: Prisma.ProductWhereInput = {
        isDeleted: false,
      };

      if (filter) {
        if (filter.name) {
          where.name = {
            contains: filter.name,
            mode: 'insensitive',
          };
        }

        if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
          where.price = {};

          if (filter.minPrice !== undefined) {
            where.price.gte = filter.minPrice;
          }

          if (filter.maxPrice !== undefined) {
            where.price.lte = filter.maxPrice;
          }
        }

        if (filter.inStock !== undefined) {
          where.stock = filter.inStock ? { gt: 0 } : { equals: 0 };
        }

        if (filter.category) {
          where.category = filter.category;
        }

        if (filter.tags && filter.tags.length > 0) {
          where.tags = {
            hasSome: filter.tags,
          };
        }
      }

      const orderBy: Prisma.ProductOrderByWithRelationInput = sorting
        ? { [sorting.field]: sorting.order }
        : { name: 'asc' };

      const [products, totalCount] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip: (page - 1) * 20,
          take: 20,
          orderBy,
        }),
        this.prisma.product.count({ where }),
      ]);

      return {
        products,
        totalPages: Math.ceil(totalCount / 20),
        currentPage: page,
        hasNext: page * 20 < totalCount,
      };
    });
  }

  async searchProductsByName(name: string) {
    const key = `product:${name}`;
    return redis.getOrSetCache(key, async () => {
      return this.prisma.product.findMany({
        where: {
          isDeleted: false,
          name: {
            startsWith: name,
            mode: 'insensitive',
          },
        },
      });
    });
  }

  async hideProduct(id: string) {
    return await this.prisma.$transaction(async (prisma) => {
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundError(`Product with ID ${id} not found`);
      }

      if (product.isDeleted) {
        throw new ForbiddenError('Product is already hidden');
      }

      return prisma.product.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });
    });
  }

  async restoreProduct(id: string) {
    return await this.prisma.$transaction(async (prisma) => {
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundError(`Product with ID ${id} not found`);
      }

      if (!product.isDeleted) {
        throw new ForbiddenError('Product is not deleted');
      }

      return prisma.product.update({
        where: { id },
        data: {
          isDeleted: false,
        },
      });
    });
  }

  async getHidden() {
    return await this.prisma.product.findMany({
      where: {
        isDeleted: true,
      },
    });
  }

  async getCategories() {
    return this.prisma.product.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    });
  }

  async getAllTags() {
    const products = await this.prisma.product.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        tags: true,
      },
    });

    const allTags = products.flatMap((product) => product.tags);
    return [...new Set(allTags)];
  }
}

const productsService = new ProductsService(prisma);
export default productsService;
