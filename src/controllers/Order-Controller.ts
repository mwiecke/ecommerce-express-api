import { Request, Response } from 'express';
import orderService from '../Database/Order-Service.js';

const createOrder = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    const order = await orderService.createOrder(
      userId,
      req.body.shippingAddress
    );

    res.status(201).json({ msg: 'Order created successfully', data: order });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const deleteOrder = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    const order = await orderService.deleteOrder(userId, req.params.orderId);
    res.status(200).json({ msg: 'Order deleted successfully', data: order });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const getALlOrder = async (req: Request, res: Response) => {
  try {
    const orders = await orderService.getALlOrder();
    res.status(201).json({ data: orders });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const GetOrderUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    const order = await orderService.GetOrderUser(userId);
    res.status(201).json({ data: order });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const getOrder = async (req: Request, res: Response) => {
  try {
    const order = await orderService.getOrder(req.params.orderId);
    res.status(201).json({ data: order });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const order = await orderService.updateOrderStatus(
      req.params.orderId,
      req.body.status
    );
    res.status(201).json({ data: order });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

export {
  createOrder,
  deleteOrder,
  getALlOrder,
  GetOrderUser,
  getOrder,
  updateOrderStatus,
};
