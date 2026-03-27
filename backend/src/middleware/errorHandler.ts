import { Request, Response, NextFunction } from 'express';
import { createSystemNotification } from '../utils/notifications';

export class AppError extends Error {
  constructor(
    public statusCode: number = 500,
    public message: string = 'Erro interno do servidor',
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Erro interno do servidor';

  console.error('[GLOBAL_ERROR]', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  if (statusCode >= 500) {
    createSystemNotification({
      type: 'error',
      title: 'Erro Crítico de Sistema',
      message: `Ocorreu uma falha no endpoint ${req.path}: ${message}`
    });
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { details: err.details, stack: err.stack })
  });
}
