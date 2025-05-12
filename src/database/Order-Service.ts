import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../Errors/Custom-errors.js';

const prisma = new PrismaClient();

class OrderService {
  constructor(private readonly prisma: PrismaClient) {}

  async createOrder(userId: string, shippingAddress: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new NotFoundError('Cart is empty');
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const stockIssues = [];

        // Check stock for all items first
        for (const item of cart.items) {
          const currentProduct = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!currentProduct) {
            stockIssues.push(
              `Product "${item.product.name}" is no longer available`
            );
          } else if (currentProduct.isDeleted) {
            stockIssues.push(
              `Product "${item.product.name}" has been removed from the store`
            );
          } else if (item.quantity > currentProduct.stock) {
            stockIssues.push(
              `Not enough stock for "${item.product.name}". Available: ${currentProduct.stock}, Requested: ${item.quantity}`
            );
          }
        }

        if (stockIssues.length > 0) {
          throw new ConflictError(
            `Insufficient stock: ${stockIssues.join('; ')}`
          );
        }

        const totalPrice = cart.items.reduce((sum, item) => {
          return sum + item.quantity * Number(item.product.price);
        }, 0);

        await Promise.all(
          cart.items.map((item) =>
            tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            })
          )
        );

        let parsedShippingAddress;
        try {
          parsedShippingAddress =
            typeof shippingAddress === 'string'
              ? JSON.parse(shippingAddress)
              : shippingAddress;
        } catch (e) {
          throw new ValidationError('Invalid shipping address format');
        }

        const order = await tx.order.create({
          data: {
            userId,
            totalPrice,
            status: 'PENDING',
            paymentMethod: 'CASH',
            shippingAddress: parsedShippingAddress,
            items: {
              create: cart.items.map((item) => ({
                productId: item.productId,
                productName: item.product.name,
                productPrice: item.product.price,
                productImage: item.product.imageUrl,
                quantity: item.quantity,
                price: item.quantity * Number(item.product.price),
              })),
            },
          },
          include: { items: true },
        });

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return order;
      });

      return result;
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new Error(`Order creation failed: ${error.message}`);
      }
      throw new Error('Order creation failed due to an unknown error');
    }
  }

  async deleteOrder(userId: string, orderId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          userId: userId,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundError(
          'Order not found or does not belong to this user'
        );
      }

      if (order.status !== 'PENDING') {
        throw new ForbiddenError('Only pending orders can be cancelled');
      }

      await tx.orderItem.deleteMany({
        where: { orderId: order.id },
      });

      await Promise.all(
        order.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        )
      );

      return await tx.order.delete({
        where: { id: order.id },
      });
    });
  }

  async getALlOrder() {
    return await this.prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async GetOrderUser(userId: string) {
    try {
      const orders = await this.prisma.order.findMany({
        where: { userId },
        include: {
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!orders || orders.length === 0) {
        throw new NotFoundError('No orders found for this user');
      }

      return orders;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(
        `Order finding failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async getOrder(orderId: string) {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(
        `Order finding failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return await this.prisma.$transaction(async (prisma) => {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundError('Order not found');
      }
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        PENDING: ['PAID', 'SHIPPED'],
        PAID: ['SHIPPED'],
        SHIPPED: [],
      };

      if (!validTransitions[order.status].includes(status)) {
        throw new ValidationError(
          `Invalid status transition from ${order.status} to ${status}`
        );
      }

      return await this.prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true },
      });
    });
  }

  async getOrderSummary(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!orders || orders.length === 0) {
      throw new NotFoundError('No orders found for this user');
    }

    const { id, totalPrice } = orders[0];
    return { id, totalPrice, totalOrders: orders.length };
  }

  async payment(sessionId: string, orderId: string, status: PaymentStatus) {
    return await this.prisma.$transaction(async (tx) => {
      // Verify order exists
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const payment = await tx.payment.create({
        data: {
          paymentMethod: 'STRIPE',
          transactionId: sessionId,
          status,
          orderId,
        },
      });

      if (status === 'COMPLETED') {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'PAID' },
        });
      }

      return payment;
    });
  }

  async getinf(userId: string) {
    const order = await this.prisma.order.findMany({
      where: { userId },
    });

    if (!order) {
      throw new NotFoundError('No orders found for this user');
    }

    const { id, totalPrice } = order[0];
    return { id, totalPrice };
  }
}

const orderService = new OrderService(prisma);
export default orderService;
