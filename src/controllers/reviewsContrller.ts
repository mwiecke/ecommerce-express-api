import { Request, Response } from 'express';
import { reviews } from '../schemas/index.ts';
import reviewsService from '../database/reviewsService.ts';

const addReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const data: reviews = {
      userId: req.user.id,
      productId: req.body.productId,
      rating: req.body.rating,
      comment: req.body.comment,
    };

    const review = await reviewsService.addReview(data);
    res.status(200).json({ data: review });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error });
  }
};

const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user || !user.id) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const data: reviews = {
      userId: user.id,
      productId: req.body.productId,
      rating: req.body.rating,
      comment: req.body.comment,
    };

    const review = await reviewsService.updateReview(data);
    res.status(200).json({ data: review });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error });
  }
};

const deleteReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: Record<string, any> = {};

    const user = req.user;

    if (!user || !user.id) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }
    data.userId = user.id;

    if (!req.params.productId) {
      res.status(400).json({ msg: 'Missing product ID' });
      return;
    }
    data.productId = req.params.productId;

    await reviewsService.deleteReviews(data);
    res.status(200).json({ msg: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error });
  }
};

const getReviews = async (req: Request, res: Response) => {
  try {
    const productId = req.params.productId;

    const data = await reviewsService.getReviews(productId);
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error });
  }
};

export { addReview, update, deleteReviews, getReviews };
