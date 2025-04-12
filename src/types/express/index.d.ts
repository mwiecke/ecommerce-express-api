import { User } from '../src/schemas/index'; // Adjust the path to where `User` is defined

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
