import express from 'express';
const reviewRouter = express.Router();

import { isAdmin } from '../middleware/adminMiddleware.ts';
import { authMiddleware } from '../middleware/authMiddleware.ts';

import {
  addReview,
  update,
  deleteReviews,
  getreviews,
} from '../controllers/reviewsContrller.ts';

reviewRouter.get('/', getreviews);
reviewRouter.delete('/:productId', authMiddleware, deleteReviews);
reviewRouter.post('/', addReview);
reviewRouter.post('/:productId', update);

export { reviewRouter };
