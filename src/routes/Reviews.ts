import express from 'express';
const reviewRouter = express.Router();

import { authMiddleware } from '../Middleware/Auth-Middleware.ts';
import { checkPermission } from '../Middleware/Check-Review-Permission.ts';

import {
  addReview,
  update,
  deleteReviews,
  getReviews,
} from '../Controllers/Reviews-Controller.ts';

reviewRouter.get('/', checkPermission('Review', 'view'), getReviews);
reviewRouter.delete(
  '/:productId',
  authMiddleware,
  checkPermission('Review', 'delete'),
  deleteReviews
);

reviewRouter.post('/', checkPermission('Review', 'create'), addReview);
reviewRouter.post('/:productId', checkPermission('Review', 'update'), update);

export { reviewRouter };
