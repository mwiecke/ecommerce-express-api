import express from 'express';
const productRouter = express.Router();

import { authMiddleware } from '../Middleware/Auth-Middleware.js';
import { checkPermission } from '../Middleware/Check-Permission.js';
import { validateCSRF } from '../Middleware/CSRF.validation.js';

import {
  addNewProducts,
  deleteProduct,
  updateProduct,
  getPage,
  searchInProducts,
  hideProduct,
  restoreProduct,
  getHidden,
  getCategories,
  getTags,
} from '../Controllers/Product-Controller.js';

productRouter.get('/page/:page', getPage);
productRouter.post('/search', searchInProducts);

productRouter.post(
  '/',
  authMiddleware,
  validateCSRF,
  checkPermission('Product', 'create'),
  addNewProducts
);

productRouter.patch(
  '/:id',
  authMiddleware,
  validateCSRF,
  checkPermission('Product', 'update'),
  updateProduct
);

productRouter.delete(
  '/:id',
  authMiddleware,
  validateCSRF,
  checkPermission('Product', 'delete'),
  deleteProduct
);

productRouter.patch(
  '/hide/:id',
  authMiddleware,
  validateCSRF,
  checkPermission('Product', 'hide'),
  hideProduct
);

productRouter.patch(
  '/restore/:id',
  authMiddleware,
  validateCSRF,
  checkPermission('Product', 'update'),
  restoreProduct
);

productRouter.get(
  '/hidden',
  authMiddleware,
  validateCSRF,
  checkPermission('Product', 'hide'),
  getHidden
);

productRouter.get(
  '/tags',
  authMiddleware,
  validateCSRF,
  checkPermission('Product', 'view'),
  getTags
);

productRouter.get(
  '/categories',
  authMiddleware,
  validateCSRF,
  checkPermission('Product', 'view'),
  getCategories
);

export { productRouter };
