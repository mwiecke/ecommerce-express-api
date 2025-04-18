import * as Express from 'express';
import { User } from '../../schemas/index.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User; // Use the Zod User type
    }
  }
}

export {};
