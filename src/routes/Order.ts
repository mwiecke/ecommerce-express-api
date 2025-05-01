import express from 'express';
const orderRouter = express.Router();

import { authMiddleware } from '../Middleware/Auth-Middleware.ts';
import { checkPermission } from '../Middleware/Check-Review-Permission.ts';

import {
  createOrder,
  deleteOrder,
  getALlOrder,
  GetOrderUser,
  getOrder,
  updateOrderStatus,
} from '../Controllers/Order-Controller.ts';

// User routes
orderRouter.post('/', checkPermission('Order', 'create'), createOrder);

orderRouter.get('/user', checkPermission('Order', 'view'), GetOrderUser);

orderRouter.get('/:orderId', checkPermission('Order', 'view'), getOrder);

orderRouter.delete(
  '/:orderId',
  checkPermission('Order', 'delete'),
  deleteOrder
);

orderRouter.get('/', checkPermission('Order', 'view'), getALlOrder);

orderRouter.patch(
  '/:orderId/status',
  checkPermission('Order', 'update'),
  updateOrderStatus
);

export { orderRouter };
