import express from 'express';
const productRouter = express.Router();

import { isAdmin } from '../middleware/adminMiddleware.ts';
import { authMiddleware } from '../middleware/authMiddleware.ts';

import {
  addNewProducts,
  deleteProduct,
  UpdateProduct,
  searchInProducts,
  makeHidn,
  GetPage,
} from '../controllers/ProductsController.ts';

productRouter.get('/:page', authMiddleware, GetPage);
productRouter.post('/search', authMiddleware, searchInProducts);

productRouter.post('/', isAdmin, addNewProducts);
productRouter.put('/:id', isAdmin, UpdateProduct);
productRouter.delete('/:id', isAdmin, deleteProduct);
productRouter.patch('/:id/hide', isAdmin, makeHidn);

export { productRouter };
