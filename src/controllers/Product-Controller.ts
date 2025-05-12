import productsService from '../Database/ProductsService.js';
import multer from 'multer';
import { Request, Response } from 'express';
import { productFilterSchema, productSortingSchema } from '../Schemas/index.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

const addNewProducts = [
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ err: 'Image is required' });
        return;
      }

      const product = await productsService.createProduct(
        req.body,
        req.file.path
      );

      res.status(201).json({ msg: product.name });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ err: error });
        return;
      } else if (error instanceof Error && error.name === 'ConflictError') {
        res.status(409).json({ err: error.message });
        return;
      } else {
        console.error('Product creation error:', error);
        res.status(500).json({ err: 'Server error while creating product' });
        return;
      }
    }
  },
];

const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ msg: 'Product ID is required' });
      return;
    }

    const deleteIt = productsService.deleteProduct(id);
    res.status(200).json({ msg: 'deleteIt' });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ msg: 'Product ID is required' });
      return;
    }

    const updatedProduct = await productsService.updateProduct(id, req.body);
    res.status(200).json({
      msg: `Product ${updatedProduct.name} updated successfully`,
      data: updatedProduct,
    });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const getPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;

    let filter;
    if (req.query.filter) {
      filter = productFilterSchema.parse(
        typeof req.query.filter === 'string'
          ? JSON.parse(req.query.filter)
          : req.query.filter
      );
    }

    let sorting;
    if (req.query.sort) {
      sorting = productSortingSchema.parse(
        typeof req.query.sort === 'string'
          ? JSON.parse(req.query.sort)
          : req.query.sort
      );
    }

    const result = await productsService.getProductByPage(
      page,
      filter,
      sorting
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ msg: 'Server error. Please try again later.' });
  }
};

const searchInProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ msg: 'Valid product name is required' });
      return;
    }

    const result = await productsService.searchProductsByName(name);

    if (!result || result.length === 0) {
      res.status(404).json({ msg: 'No products found' });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ msg: 'Server error. Please try again.' });
    return;
  }
};

const hideProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ msg: 'Product ID is required' });
      return;
    }

    const result = await productsService.hideProduct(id);

    res.status(200).json({
      msg: `Product ${result.name} hidden successfully`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const restoreProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ msg: 'Product ID is required' });
      return;
    }

    const result = await productsService.restoreProduct(id);
    res.status(200).json({
      msg: `Product ${result.name} restored successfully`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const getHidden = async (req: Request, res: Response) => {
  try {
    const result = await productsService.getHidden();
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const getCategories = async (req: Request, res: Response) => {
  try {
    const result = await productsService.getCategories();
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const getTags = async (req: Request, res: Response) => {
  try {
    const result = await productsService.getAllTags();
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

export {
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
};
