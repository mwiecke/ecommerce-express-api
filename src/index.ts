import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import { authRouter } from './routes/Auth.ts';
import { productRouter } from './routes/Product.ts';
import { reviewRouter } from './routes/Reviews.ts';
import rateLimiting from './middleware/limiter.ts';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(rateLimiting);

app.use('/auth', authRouter);
app.use('/product', productRouter);
app.use('/review', reviewRouter);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`App listening on port ${port}`));

// run in (wsl Terminal) code  sudo systemctl start redis
