import { Request, Response } from 'express';
import { client } from '../cache/redis';

export async function healthCheck(req: Request, res: Response) {
  const checks: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      redis: 'pending',
      cloudinary: 'ok' 
    }
  };

  try {
    const ping = await client.ping();
    checks.services.redis = ping === 'PONG' ? 'ok' : 'error';
  } catch (error) {
    checks.services.redis = 'error';
    checks.status = 'degraded';
  }

  res.status(checks.status === 'ok' ? 200 : 503).json(checks);
}
