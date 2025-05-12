import { Request, Response, NextFunction } from 'express';
import { logger } from '../Utils/logger.js';

interface ExtendedError extends Error {
  statusCode?: number;
  errorCode?: string;
  isOperational?: boolean;
  stack?: string;
}

const sendDevError = (err: ExtendedError, res: Response): void => {
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message,
    errorCode: err.errorCode || 'SERVER_ERROR',
    stack: err.stack,
    error: err,
  });
};

const sendProdError = (err: ExtendedError, res: Response): void => {
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: 'error',
      message: err.message,
      errorCode: err.errorCode || 'SERVER_ERROR',
    });
  } else {
    logger.error('ERROR', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
      errorCode: 'SERVER_ERROR',
    });
  }
};

const errorHandler = (
  err: ExtendedError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  logger.error(
    `${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
  );

  if (err.stack) {
    logger.error(err.stack);
  }

  if (process.env.NODE_ENV === 'development') {
    sendDevError(err, res);
  } else {
    sendProdError(err, res);
  }
};

export default errorHandler;
