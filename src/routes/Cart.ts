import express from 'express';
const cartRouter = express.Router();

import { checkPermission } from '../Middleware/Check-Permission.js';
import {
  addItem,
  deleteItemFromCart,
  clearCart,
  getItems,
  updateCart,
} from '../Controllers/Cart-Controller.js';

cartRouter.get('/', checkPermission('Cart', 'view'), getItems);

cartRouter.delete(
  '/:productId',
  checkPermission('Cart', 'delete'),
  deleteItemFromCart
);

cartRouter.delete('/', checkPermission('Cart', 'delete'), clearCart);
cartRouter.post('/', checkPermission('Cart', 'create'), addItem);
cartRouter.patch('/', checkPermission('Cart', 'update'), updateCart);
export { cartRouter };
