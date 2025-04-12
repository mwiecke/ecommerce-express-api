import productsService from '../database/ProductsService.ts';
import multer from 'multer';
import { Request, Response } from 'express';

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
      const product = await productsService.createproduct(
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
    const updateIt = productsService.UpdateProduct(id, req.body);
    res.status(200).json({ msg: updateIt });
  } catch (error) {
    res.status(400).json({ msg: error });
  }
};

const GetPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page } = req.params;
    const parsedPage = Number.parseInt(page);

    if (isNaN(parsedPage)) {
      res.status(400).json({ msg: 'Invalid page number' });
      return;
    }

    const products = await productsService.getProductBYPage(parsedPage);
    res.status(200).json({ data: products });
  } catch (error) {
    res.status(500).json({ msg: 'Server error. Please try again later.' });
  }
};

const searchInProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const result = await productsService.getProduct(name);

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

const makeHidn = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = productsService.makeHidn(id);
    res.status(200).json({ msg: result });
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
  makeHidn,
};
