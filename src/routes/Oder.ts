import express from 'express';
const orderRouter = express.Router();

import { isAdmin } from '../middleware/adminMiddleware.ts';
import { authMiddleware } from '../middleware/authMiddleware.ts';

import {
  createOrder,
  deleteOrder,
  getALlOrder,
  GetOrderUser,
  getOrder,
  updateOrderStatus,
} from '../controllers/ordercontroller.ts';

orderRouter.post('/', authMiddleware, createOrder);
orderRouter.delete('/:orderId', authMiddleware, deleteOrder);
orderRouter.get('/', isAdmin, getALlOrder);
orderRouter.get('/', authMiddleware, GetOrderUser);
orderRouter.get('/:orderId', authMiddleware, getOrder);
orderRouter.patch('/:orderId', isAdmin, updateOrderStatus);

export { orderRouter };
