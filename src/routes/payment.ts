import * as express from 'express';
const paymentRouter = express.Router();

import { authMiddleware } from '../Middleware/Auth-Middleware.js';
import { checkPermission } from '../Middleware/Check-Permission.js';

import {
  GetPublishableKEY,
  webhook,
  payment,
} from '../Controllers/Payments-Controller.js';

paymentRouter.get('/', authMiddleware, GetPublishableKEY);

paymentRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhook
);

paymentRouter.post('/', checkPermission('Payment', 'view'), payment);

export { paymentRouter };
