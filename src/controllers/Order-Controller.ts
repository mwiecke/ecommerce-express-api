import { Request, Response } from 'express';
import orderService from '../Database/Order-Service.ts';

const createOrder = (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    const order = orderService.createOrder(userId, req.body.shippingAddress);
    res.status(201).json({ msg: `Created successfully order ${order}` });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const deleteOrder = (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    const order = orderService.deleteOrder(userId, req.params.orderId);
    res.status(201).json({ msg: `Delete successfully ${order}` });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const getALlOrder = (req: Request, res: Response) => {
  try {
    const orders = orderService.getALlOrder();
    res.status(201).json({ data: orders });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const GetOrderUser = (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    const order = orderService.GetOrderUser(userId);
    res.status(201).json({ data: order });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const getOrder = (req: Request, res: Response) => {
  try {
    const order = orderService.getOrder(req.params.orderId);
    res.status(201).json({ data: order });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const updateOrderStatus = (req: Request, res: Response) => {
  try {
    const order = orderService.updateOrderStatus(
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
