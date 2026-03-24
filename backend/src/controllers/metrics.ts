import { prisma } from '../lib/prisma';
import { Request, Response } from 'express';

export async function getMetrics(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const totalUsers = await prisma.user.count();
    const adminUsers = await prisma.user.count({ where: { role: 'admin' } });
    
    const totalChats = await prisma.chatHistory.count();

    const loginAttempts24h = await prisma.loginAttempt.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    const failedLogins24h = await prisma.loginAttempt.count({
      where: {
        success: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    const apiUsageToday = await prisma.apiUsage.findMany({
      where: {
        date: {
          gte: todayStart
        }
      }
    });

    const totalCostToday = apiUsageToday.reduce((acc, u) => acc + u.estimatedCost, 0);

    const sources = await prisma.chatHistory.groupBy({
      by: ['source'],
      _count: {
        id: true
      }
    });

    res.json({
      status: 'ok',
      users: {
        total: totalUsers,
        admins: adminUsers
      },
      interactions: {
        totalChats,
        topSources: sources
      },
      security: {
        loginAttempts24h,
        failedLogins24h,
        failureRate: loginAttempts24h > 0 ? `${((failedLogins24h / loginAttempts24h) * 100).toFixed(2)}%` : '0%'
      },
      costs: {
        todayEstimated: `$ ${totalCostToday.toFixed(4)}`,
        byService: apiUsageToday.reduce((acc, u) => {
          if (!acc[u.service]) acc[u.service] = 0;
          acc[u.service] += u.estimatedCost;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    console.error('[METRICS] Erro:', error);
    res.status(500).json({ error: 'Erro ao obter métricas' });
  }
}

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { email: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.auditLog.count();

    res.json({
      status: 'ok',
      logs,
      total
    });
  } catch (error) {
    console.error('[AUDIT] Erro:', error);
    res.status(500).json({ error: 'Erro ao obter logs' });
  }
}
