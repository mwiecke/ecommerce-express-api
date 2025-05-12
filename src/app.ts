import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import xssClean from 'xss-clean';
import helmet from 'helmet';
import cors from 'cors';

dotenv.config();

import rateLimiting from './Middleware/limiter.js';
import { authRouter } from './Routes/Auth.js';
import { productRouter } from './Routes/Product.js';
import { reviewRouter } from './Routes/Reviews.js';
import { cartRouter } from './Routes/Cart.js';
import { orderRouter } from './Routes/Order.js';
import { paymentRouter } from './Routes/payment.js';
import { authMiddleware } from './Middleware/Auth-Middleware.js';
import { validateCSRF } from './Middleware/CSRF.validation.js';
import errorHandler from './Middleware/Error-handler.js';

const app = express();

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
        imgSrc: ["'self'", 'https://images.mycdn.com', 'https://example.com'],
      },
    },
    frameguard: { action: 'deny' },
  })
);

app.use(xssClean());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(rateLimiting);

app.use('/cart', authMiddleware, validateCSRF, cartRouter);
app.use('/orders', authMiddleware, validateCSRF, orderRouter);

app.use('/auth', authRouter);
app.use('/product', productRouter);
app.use('/review', reviewRouter);
app.use('/payment', paymentRouter);

app.get('/healthz', (req, res) => {
  res.status(200).json({ message: 'OK' });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

export default app;
