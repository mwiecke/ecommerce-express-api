import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import xssClean from 'xss-clean';
import helmet from 'helmet';
import cors from 'cors';

dotenv.config();

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
        imgSrc: ["'self'", 'https://images.mycdn.com'],
      },
    },
    frameguard: { action: 'deny' },
  })
);

app.use(xssClean());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
//app.use(validateCSRF);
app.use(rateLimiting);
app.use(errorHandler);

app.use('/cart', authMiddleware, cartRouter);
app.use('/order', authMiddleware, orderRouter);

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

export default app;

// run in (wsl Terminal) code  sudo systemctl start redis
