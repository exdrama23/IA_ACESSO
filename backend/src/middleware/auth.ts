import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user';
    iat: number;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    console.error('[AUTH] Token inválido:', error);
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (authReq.user.role !== 'admin') {
    console.warn(`[AUTH] Usuário ${authReq.user.email} tentou acesso restrito`);
    return res.status(403).json({ error: 'Requer permissão de admin' });
  }

  next();
}

export function generateToken(userId: string, email: string, role: 'admin' | 'user') {
  return jwt.sign(
    { id: userId, email, role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}
