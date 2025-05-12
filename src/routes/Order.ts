import express from 'express';
const orderRouter = express.Router();

import { checkPermission } from '../Middleware/Check-Permission.js';
import {
  createOrder,
  deleteOrder,
  getALlOrder,
  GetOrderUser,
  getOrder,
  updateOrderStatus,
} from '../Controllers/Order-Controller.js';

orderRouter.post('/', checkPermission('Order', 'create'), createOrder);

orderRouter.get('/', checkPermission('Order', 'view'), getALlOrder);
orderRouter.get('/user', checkPermission('Order', 'view'), GetOrderUser);
orderRouter.get('/:orderId', checkPermission('Order', 'view'), getOrder);

orderRouter.delete(
  '/:orderId',
  checkPermission('Order', 'delete'),
  deleteOrder
);

orderRouter.patch(
  '/:orderId/status',
  checkPermission('Order', 'update'),
  updateOrderStatus
);

export { orderRouter };
