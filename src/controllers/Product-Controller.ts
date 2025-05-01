import productsService from '../Database/ProductsService.ts';
import multer from 'multer';
import { Request, Response } from 'express';
import { productFilterSchema, productSortingSchema } from '../Schemas/index.ts';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

const addNewProducts =
  (upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const product = await productsService.createProduct(
        req.body,
        req.file?.path!
      );

      res.status(200).json({ msg: product.name });
    } catch (error) {
      res.status(401).json({ err: error });
    }
  });

const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteIt = productsService.deleteProduct(id);
    res.status(200).json({ msg: deleteIt });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const UpdateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateIt = productsService.updateProduct(id, req.body);
    res.status(200).json({ msg: updateIt });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const GetPage = async (req: Request, res: Response): Promise<void> => {
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

    // Parse and validate sorting
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
    const result = productsService.hideProduct(id);
    res.status(200).json({ msg: result });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const restoreProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = productsService.restoreProduct(id);
    res.status(200).json({ msg: result });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const getHiden = async (req: Request, res: Response) => {
  try {
    const result = productsService.getHiden();
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const getCategories = async (req: Request, res: Response) => {
  try {
    const result = productsService.getCategories();
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const getTags = async (req: Request, res: Response) => {
  try {
    const result = productsService.getAllTags();
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

export {
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
};
