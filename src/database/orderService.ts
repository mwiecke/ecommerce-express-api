import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';

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
      throw new Error('Cart is empty');
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const stockIssues = [];

        for (const item of cart.items) {
          const currentProduct = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!currentProduct) {
            stockIssues.push(
              `Product "${item.product.name}" is no longer available`
            );
          } else if (item.quantity > currentProduct.stock) {
            stockIssues.push(
              `Not enough stock for "${item.product.name}". Available: ${currentProduct.stock}, Requested: ${item.quantity}`
            );
          }
        }

        if (stockIssues.length > 0) {
          throw new Error(`Insufficient stock: ${stockIssues.join('; ')}`);
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

        const order = await tx.order.create({
          data: {
            userId,
            totalPrice,
            status: 'PENDING',
            paymentMethod: 'CASH',
            shippingAddress: JSON.parse(
              typeof shippingAddress === 'string'
                ? shippingAddress
                : JSON.stringify(shippingAddress)
            ),
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
    } catch (error: any) {
      if (error.message.includes('Insufficient stock')) {
        throw error;
      }
      throw new Error(`Order creation failed: ${error.message}`);
    }
  }

  async deleteOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId: userId,
      },
    });

    if (!order) {
      throw new Error('Order not found or does not belong to this user');
    }

    if (order.status !== 'PENDING') {
      throw new Error('Only pending orders can be cancelled');
    }

    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId: order.id },
    });

    return await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        orderItems.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        )
      );

      const deletedOrder = await tx.order.delete({
        where: { id: order.id },
      });

      return deletedOrder;
    });
  }

  async getALlOrder() {
    return await this.prisma.order.findMany();
  }

  async GetOrderUser(userId: string) {
    try {
      const order = await this.prisma.order.findMany({
        where: { userId },
      });

      if (!order) {
        throw new Error('can`t find order for thiese user');
      }

      return order;
    } catch (error: any) {
      throw new Error(`Order finding failed: ${error.message}`);
    }
  }

  async getOrder(orderId: string) {
    try {
      const order = await this.prisma.order.findMany({
        where: { id: orderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new Error('can`t find order for thiese user');
      }

      return order;
    } catch (error: any) {
      throw new Error(`Order finding failed: ${error.message}`);
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        PENDING: ['PAID', 'SHIPPED'],
        PAID: ['SHIPPED'],
        SHIPPED: [],
      };

      if (!validTransitions[order.status].includes(status)) {
        throw new Error(
          `Invalid status transition from ${order.status} to ${status}`
        );
      }

      return await this.prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true },
      });
    } catch (error: any) {
      throw new Error(`Order status update failed: ${error.message}`);
    }
  }

  async getinf(userId: string) {
    const order = await this.prisma.order.findMany({
      where: { userId },
    });

    if (!order) {
      throw new Error('can`t find order for thiese user');
    }

    const { id, totalPrice } = order[0];
    return { id, totalPrice };
  }

  async payment(
    sessionId: string,
    orderId: string,
    paymentStatus: PaymentStatus
  ) {
    await this.prisma.payment.create({
      data: {
        paymentMethod: 'STRIPE',
        transactionId: sessionId,
        status: paymentStatus,
        orderId: orderId,
      },
    });
  }
}

const orderService = new OrderService(prisma);
export default orderService;
