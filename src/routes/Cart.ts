import express from 'express';
const cartRouter = express.Router();

import { authMiddleware } from '../middleware/authMiddleware.ts';

import {
  createCartWithItem,
  addItem,
  deleteItemFromCart,
  clearCart,
  getItems,
  updateCart,
} from '../controllers/CartController.ts';

cartRouter.get('/:id', authMiddleware, getItems);

cartRouter.delete('/:productId', authMiddleware, deleteItemFromCart);
cartRouter.delete('/', authMiddleware, clearCart);

cartRouter.post('/firstTime', authMiddleware, createCartWithItem);
cartRouter.post('/', authMiddleware, addItem);

cartRouter.patch('/', authMiddleware, updateCart);

export { cartRouter };
