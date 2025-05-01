import { PrismaClient } from '@prisma/client';
import { Cart, cartSchema } from '../Schemas/index.ts';

import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../Errors/Custom-errors.ts';

const prisma = new PrismaClient();

class CartService {
  constructor(private readonly prisma: PrismaClient) {}

  async checkQuantity(Quantity: number, productId: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId, isDeleted: false },
      });

      if (!product) {
        throw new NotFoundError('Product not found or has been deleted');
      }

      if (product.stock < Quantity) {
        throw new ConflictError(
          `Insufficient stock. Available: ${product.stock}, Requested: ${Quantity}`
        );
      }

      return true;
    } catch (error) {
      throw new Error(
        `Failed there is error ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async createCartWithItem(userId: string, cartItemData: Cart) {
    try {
      const validItemData = cartSchema.parse(cartItemData);

      await this.checkQuantity(validItemData.quantity, validItemData.productId);

      return await this.prisma.$transaction(async (tx) => {
        const cart = await tx.cart.create({
          data: {
            userId: userId,
          },
        });

        const item = await tx.cartItem.create({
          data: {
            ...validItemData,
            cartId: cart.id,
          },
        });

        return {
          cart,
          item,
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to create cart: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async addItemToCart(userId: string, itemData: Cart) {
    const validItemData = cartSchema.parse(itemData);

    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { cart: true },
      });
      if (!user?.cart) throw new NotFoundError('User or cart not found');

      await this.checkQuantity(validItemData.quantity, validItemData.productId);

      return tx.cartItem.create({
        data: {
          ...validItemData,
          cartId: user.cart.id,
        },
      });
    });
  }

  async deleteItemFromCart(productId: string, userId: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId, isDeleted: false },
      });

      if (!product) {
        throw new NotFoundError(
          'Product not found in the store or has been deleted'
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { cart: true },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.cart) {
        throw new NotFoundError('User does not have a cart');
      }

      const cartItem = await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: user.cart.id,
            productId: productId,
          },
        },
      });

      if (!cartItem) {
        throw new NotFoundError('Cart item not found');
      }

      return await this.prisma.cartItem.delete({
        where: {
          cartId_productId: {
            cartId: user.cart.id,
            productId: productId,
          },
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to delete item from cart: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async clearCart(userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { cart: true },
      });
      if (!user?.cart) throw new NotFoundError('User or cart not found');

      const { count } = await tx.cartItem.deleteMany({
        where: { cartId: user.cart.id },
      });
      return { message: `Deleted ${count} items` };
    });
  }

  async getItems(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { cart: true },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.cart) {
        throw new NotFoundError('User does not have a cart');
      }

      return await this.prisma.cartItem.findMany({
        where: {
          cartId: user.cart.id,
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to get items from cart: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async updateCartItemQuantity(
    productId: string,
    userId: string,
    newQuantity: number
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { cart: true },
      });
      if (!user?.cart) throw new NotFoundError('User or cart not found');

      const cartItem = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: user.cart.id, productId } },
      });
      if (!cartItem) throw new NotFoundError('Item not in cart');

      await this.checkQuantity(newQuantity, productId);

      return tx.cartItem.update({
        where: { cartId_productId: { cartId: user.cart.id, productId } },
        data: { quantity: newQuantity },
      });
    });
  }
}

const cartService = new CartService(prisma);
export default cartService;
