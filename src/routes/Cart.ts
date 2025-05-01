import express from 'express';
const cartRouter = express.Router();

import { authMiddleware } from '../Middleware/Auth-Middleware.ts';
import { checkPermission } from '../Middleware/Check-Review-Permission.ts';
import { validateCSRF } from '../Middleware/CSRF.validation.ts';

import {
  createCartWithItem,
  addItem,
  deleteItemFromCart,
  clearCart,
  getItems,
  updateCart,
} from '../Controllers/Cart-Controller.ts';

cartRouter.get('/:id', checkPermission('Cart', 'view'), getItems);

cartRouter.delete(
  '/:productId',
  checkPermission('Cart', 'delete'),
  deleteItemFromCart
);

cartRouter.delete('/', checkPermission('Cart', 'delete'), clearCart);

cartRouter.post(
  '/firstTime',
  checkPermission('Cart', 'create'),
  createCartWithItem
);

cartRouter.post('/', checkPermission('Cart', 'create'), addItem);

cartRouter.patch('/', checkPermission('Cart', 'update'), updateCart);

export { cartRouter };
