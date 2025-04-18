import { Request, Response } from 'express';
import cartService from '../database/CartService.ts';

const createCartWithItem = (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    cartService.createCartWithItem(userId, req.body);
    res.status(201).json({ msg: 'Created successfully' });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const addItem = (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    cartService.addItemToCart(userId, req.body);
    res.status(200).json({ msg: 'Add successfully' });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const deleteItemFromCart = (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    cartService.deleteItemFromCart(req.params.productId, userId);
    res.status(200).json({ msg: 'Delete successfully' });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const clearCart = (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    cartService.clearCart(userId);
    res.status(200).json({ msg: 'Clear cart successfully' });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const getItems = (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
    }

    const userId = (req.user as { id: string }).id;

    const items = cartService.getItems(userId);
    res.status(200).json({ data: items });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const updateCart = (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    cartService.updateCartItemQuantity(
      req.body.productId,
      userId,
      req.body.quantity
    );

    res.status(200).json({ msg: 'Get items successfully' });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

export {
  createCartWithItem,
  addItem,
  deleteItemFromCart,
  clearCart,
  getItems,
  updateCart,
};
