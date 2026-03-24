import { Request, Response, NextFunction } from 'express';
import { redis } from '../cache/redis';

export interface RateLimitConfig {
  windowMs: number;    
  maxRequests: number; 
  message?: string;
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const key = `ratelimit:${ip}`;
      
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, Math.ceil(config.windowMs / 1000));
      }

      res.set('X-RateLimit-Limit', config.maxRequests.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count).toString());

      if (count > config.maxRequests) {
        console.warn(`[RATELIMIT] IP ${ip} excedeu limite de ${config.maxRequests} requisições`);
        return res.status(429).json({
          error: config.message || 'Muitas requisições. Tente novamente mais tarde.',
          retry_after: Math.ceil(config.windowMs / 1000)
        });
      }

      next();
    } catch (error) {
      console.error('[RATELIMIT] Erro:', error);
      next(); 
    }
  };
}
