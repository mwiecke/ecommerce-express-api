import * as express from 'express';
const paymentRouter = express.Router();

import { authMiddleware } from '../middleware/authMiddleware.ts';
import {
  GetPublishableKEY,
  webhook,
  payment,
} from '../controllers/paymentsController.ts';

paymentRouter.get('/', authMiddleware, GetPublishableKEY);
paymentRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhook
);
paymentRouter.post('/', payment);

export { paymentRouter };
