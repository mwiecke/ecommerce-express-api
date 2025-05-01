import * as express from 'express';
const paymentRouter = express.Router();

import { authMiddleware } from '../Middleware/Auth-Middleware.ts';
import { checkPermission } from '../Middleware/Check-Review-Permission.ts';

import {
  GetPublishableKEY,
  webhook,
  payment,
} from '../Controllers/Payments-Controller.ts';

paymentRouter.get('/', authMiddleware, GetPublishableKEY);

paymentRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhook
);

paymentRouter.post('/', checkPermission('Payment', 'view'), payment);

export { paymentRouter };
