import { Request, Response } from 'express';
import cartService from '../Database/Cart-Service.js';

const addItem = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (user as { id: string }).id;

    await cartService.addOrCreateCartItem(userId, req.body);
    res.status(200).json({ msg: 'Item added successfully' });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const deleteItemFromCart = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    await cartService.deleteItemFromCart(req.params.productId, userId);
    res.status(200).json({ msg: 'Delete successfully' });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const clearCart = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    await cartService.clearCart(userId);
    res.status(200).json({ msg: 'Clear cart successfully' });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const getItems = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    const items = await cartService.getItems(userId);
    res.status(200).json({ data: items });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : error });
  }
};

const updateCart = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    await cartService.updateCartItemQuantity(
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

export { addItem, deleteItemFromCart, clearCart, getItems, updateCart };
