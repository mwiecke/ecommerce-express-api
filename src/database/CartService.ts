import { PrismaClient } from '@prisma/client';
import { Cart, cartSchema } from '../schemas/index.ts';

const prisma = new PrismaClient();

class CartService {
  constructor(private readonly prisma: PrismaClient) {}

  async checkQuantity(Quantity: number, productId: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId, isDeleted: false },
      });

      if (!product) {
        throw new Error('Product not found in the store or has been deleted');
      }

      if (product.stock < Quantity) {
        throw new Error('Quantity is more then Product stock');
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
    try {
      const validItemData = cartSchema.parse(itemData);

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { cart: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.cart) {
        throw new Error('User does not have a cart');
      }

      await this.checkQuantity(validItemData.quantity, validItemData.productId);

      await this.prisma.cartItem.create({
        data: {
          ...validItemData,
          cartId: user.cart.id,
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to add item to cart: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async deleteItemFromCart(productId: string, userId: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId, isDeleted: false },
      });

      if (!product) {
        throw new Error('Product not found in the store or has been deleted');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { cart: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.cart) {
        throw new Error('User does not have a cart');
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
        throw new Error('Cart item not found');
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
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { cart: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.cart) {
        throw new Error('User does not have a cart');
      }

      const cartItems = await this.prisma.cartItem.findMany({
        where: { cartId: user.cart.id },
      });

      if (cartItems.length === 0) {
        throw new Error('The cart is already empty');
      }

      const deletedItems = await this.prisma.cartItem.deleteMany({
        where: {
          cartId: user.cart.id,
        },
      });

      return {
        message: `Successfully deleted ${deletedItems.count} items from the cart.`,
      };
    } catch (error) {
      throw new Error(
        `Failed to clear items from cart: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getItems(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { cart: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.cart) {
        throw new Error('User does not have a cart');
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
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { cart: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.cart) {
        throw new Error('User does not have a cart');
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
        throw new Error('Product not found in cart');
      }

      const updatedItem = await this.prisma.cartItem.update({
        where: {
          cartId_productId: {
            cartId: user.cart.id,
            productId: productId,
          },
        },
        data: {
          quantity: newQuantity,
        },
      });

      return updatedItem;
    } catch (error) {
      throw new Error(
        `Failed to update cart item: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

const cartService = new CartService(prisma);
export default cartService;
