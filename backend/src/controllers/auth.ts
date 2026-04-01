import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';
import { redis } from '../cache/redis';
import { prisma } from '../lib/prisma';
import { sendPasswordResetEmailWithName } from '../services/email';

// 🔴 DESABILITAR TEMPORARIAMENTE: Troque para false para desativar envio de emails de reset
const ENABLE_EMAIL_VERIFICATION = false;

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      
      await prisma.loginAttempt.create({
        data: {
          email: email || 'unknown',
          success: false,
          ipAddress: req.ip || undefined,
          userAgent: req.get('user-agent')
        }
      });
      return res.status(400).json({ error: 'Email e senha obrigatórios' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    const isPasswordValid = user && await bcrypt.compare(password, user.password);

    if (!user || !isPasswordValid) {
      
      await prisma.loginAttempt.create({
        data: {
          userId: user?.id,
          email,
          success: false,
          ipAddress: req.ip || undefined,
          userAgent: req.get('user-agent')
        }
      });

      console.warn(`[AUTH] Tentativa de login falha: ${email}`);

      const attemptKey = `login_attempts:${email}`;
      const attempts = parseInt(await redis.get(attemptKey) || '0') + 1;
      await redis.set(attemptKey, attempts, { ex: 900 }); 
      
      if (attempts >= 5) {
        return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em 15 minutos' });
      }
      
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem acessar esta área' });
    }

    await prisma.loginAttempt.create({
      data: {
        userId: user.id,
        email: user.email,
        success: true,
        ipAddress: req.ip || undefined,
        userAgent: req.get('user-agent')
      }
    });

    const token = generateToken(user.id, email, user.role as 'admin' | 'user');

    await redis.del(`login_attempts:${email}`);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        status: 'success',
        ipAddress: req.ip || undefined,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'ok',
      token,
      message: 'Login bem-sucedido',
      expires_in: '24h'
    });
  } catch (error) {
    console.error('[AUTH] Erro login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const token = req.headers.authorization?.split(' ')[1];

    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'logout',
          status: 'success',
          ipAddress: req.ip || undefined,
          userAgent: req.get('user-agent')
        }
      });
    }

    if (token) {
      await redis.set(`token:blacklist:${token}`, '1', { ex: 86400 });
    }

    res.json({ status: 'ok', message: 'Logout bem-sucedido' });
  } catch (error) {
    console.error('[AUTH] Erro logout:', error);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const resetKey = `password_reset:${email.toLowerCase()}`;
    await redis.set(resetKey, code, { ex: 15 * 60 });

    // Enviar email de reset
    if (ENABLE_EMAIL_VERIFICATION) {
      await sendPasswordResetEmailWithName(email, code, user.name);
      console.log(`[AUTH] Código enviado para ${email}`);
    } else {
      console.log(`[AUTH] 🚀 MODO DEV: Email desabilitado. Código: ${code}`);
    }

    res.json({ status: 'ok', message: 'Código enviado com sucesso' });
  } catch (error) {
    console.error('[AUTH] Erro forgot-password:', error);

    if (error instanceof Error && error.message.includes('email não configurado')) {
      return res.status(503).json({ 
        error: 'Serviço de email não disponível',
        details: 'As credenciais do Gmail não foram configuradas. Siga as instruções em SETUP_EMAIL_GMAIL.md',
        helpLink: 'https://github.com/seu-repo/blob/main/SETUP_EMAIL_GMAIL.md'
      });
    }

    res.status(500).json({ 
      error: 'Erro ao processar solicitação',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, código e nova senha são obrigatórios' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const resetKey = `password_reset:${email.toLowerCase()}`;
    const savedCode = await redis.get(resetKey);

    if (!savedCode || String(savedCode) !== String(code)) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword
      }
    });

    await redis.del(resetKey);

    res.json({ status: 'ok', message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('[AUTH] Erro reset-password:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    if (!user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' });
    }

    // Buscar usuário no banco
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!userRecord) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha atual
    const isPasswordValid = await bcrypt.compare(currentPassword, userRecord.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Criptografar nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha no banco
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log(`[AUTH] Senha alterada com sucesso para: ${userRecord.email}`);
    res.json({ status: 'ok', message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('[AUTH] Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
}
