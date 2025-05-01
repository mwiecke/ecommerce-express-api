import * as Express from 'express';
import { User } from '../../Schemas/index.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
