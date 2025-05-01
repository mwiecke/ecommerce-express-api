import express from 'express';
const productRouter = express.Router();

import { authMiddleware } from '../Middleware/Auth-Middleware.ts';
import { checkPermission } from '../Middleware/Check-Review-Permission.ts';

import {
  addNewProducts,
  deleteProduct,
  UpdateProduct,
  GetPage,
  searchInProducts,
  hideProduct,
  restoreProduct,
  getHiden,
  getCategories,
  getTags,
} from '../Controllers/Product-Controller.ts';

productRouter.get('/:page', GetPage);
productRouter.post('/search', searchInProducts);

productRouter.post(
  '/',
  authMiddleware,
  checkPermission('Product', 'create'),
  addNewProducts
);

productRouter.put(
  '/:id',
  authMiddleware,
  checkPermission('Product', 'update'),
  UpdateProduct
);

productRouter.delete(
  '/:id',
  authMiddleware,
  checkPermission('Product', 'delete'),
  deleteProduct
);

productRouter.patch(
  '/:id',
  authMiddleware,
  checkPermission('Product', 'hide'),
  hideProduct
);

productRouter.patch(
  '/restoreProduct',
  checkPermission('Product', 'update'),
  restoreProduct
);

productRouter.get(
  '/getHiden',
  authMiddleware,
  checkPermission('Product', 'hide'),
  getHiden
);

productRouter.get('/getTags', checkPermission('Product', 'view'), getTags);

productRouter.get(
  '/getCategories',
  checkPermission('Product', 'view'),
  getCategories
);

export { productRouter };
