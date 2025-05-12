import express from 'express';
const reviewRouter = express.Router();

import { authMiddleware } from '../Middleware/Auth-Middleware.js';
import { checkPermission } from '../Middleware/Check-Permission.js';
import { validateCSRF } from '../Middleware/CSRF.validation.js';

import {
  addReview,
  update,
  deleteReviews,
  getReviews,
} from '../Controllers/Reviews-Controller.js';

reviewRouter.get(
  '/:productId',
  authMiddleware,
  validateCSRF,
  checkPermission('Review', 'view'),
  getReviews
);

reviewRouter.delete(
  '/:productId',
  authMiddleware,
  validateCSRF,
  checkPermission('Review', 'delete'),
  deleteReviews
);

reviewRouter.post(
  '/',
  authMiddleware,
  validateCSRF,
  checkPermission('Review', 'create'),
  addReview
);

reviewRouter.patch(
  '/:productId',
  authMiddleware,
  validateCSRF,
  checkPermission('Review', 'update'),
  update
);

export { reviewRouter };
