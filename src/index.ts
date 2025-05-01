import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import xssClean from 'xss-clean';
import helmet from 'helmet';
import cors from 'cors';

import rateLimiting from './Middleware/limiter.ts';
import { authRouter } from './Routes/Auth.ts';
import { productRouter } from './Routes/Product.ts';
import { reviewRouter } from './Routes/Reviews.ts';
import { cartRouter } from './Routes/Cart.ts';
import { orderRouter } from './Routes/Order.ts';
import { paymentRouter } from './Routes/payment.ts';
import { authMiddleware } from './Middleware/Auth-Middleware.ts';
import { validateCSRF } from './Middleware/CSRF.validation.ts';
import errorHandler from './Middleware/Error-handler.ts';
import { logger } from './Utils/logger.ts';
dotenv.config();

const app = express();
app.use(errorHandler);

const corsOptions = {
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['set-cookie', 'XSRF-TOKEN'],
  credentials: true,
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'trusted-cdn.com'],
        imgSrc: ["'self'", 'https://images.mycdn.com'],
      },
    },
    frameguard: { action: 'deny' },
  })
);

app.use(xssClean());
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(rateLimiting);

app.use('/cart', authMiddleware, validateCSRF, cartRouter);
app.use('/order', authMiddleware, validateCSRF, orderRouter);

app.use('/auth', authRouter);
app.use('/product', productRouter);
app.use('/review', reviewRouter);
app.use('/payment', paymentRouter);

const port = process.env.PORT || 5000;
app.listen(port, () => logger.info(`Server running on port ${port}`));

// run in (wsl Terminal) code  sudo systemctl start redis
