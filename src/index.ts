import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import { authRouter } from './routes/Auth.ts';
import { productRouter } from './routes/Product.ts';
import { reviewRouter } from './routes/Reviews.ts';
import rateLimiting from './middleware/limiter.ts';
import { cartRouter } from './routes/Cart.ts';
import { orderRouter } from './routes/Oder.ts';
import { paymentRouter } from './routes/payment.ts';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(rateLimiting);

app.use('/auth', authRouter);
app.use('/product', productRouter);
app.use('/review', reviewRouter);
app.use('/cart', cartRouter);
app.use('/order', orderRouter);
app.use('/payment', paymentRouter);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`App listening on port ${port}`));

// run in (wsl Terminal) code  sudo systemctl start redis
