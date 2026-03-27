import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function getTables(req: Request, res: Response) {
  try {
    // Lista de tabelas baseada no schema.prisma
    const tables = [
      'User',
      'CalendarEvent',
      'LoginAttempt',
      'AuditLog',
      'ChatHistory',
      'ApiCall',
      'SystemConfig',
      'ApiUsage',
      'Notification',
      'NotificationPreference',
      'IntegrationKey'
    ];

    res.json({ status: 'ok', tables });
  } catch (error) {
    console.error('[DATABASE] Erro ao listar tabelas:', error);
    res.status(500).json({ error: 'Erro ao listar tabelas' });
  }
}

export async function getTableData(req: Request, res: Response) {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    let data: any[] = [];
    let total = 0;

    // Prisma não suporta chamadas dinâmicas como prisma[tableName].findMany() de forma tipada facilmente,
    // então usamos um switch para garantir segurança e tipos.
    switch (tableName) {
      case 'User':
        [data, total] = await Promise.all([
          prisma.user.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
          prisma.user.count()
        ]);
        break;
      case 'CalendarEvent':
        [data, total] = await Promise.all([
          prisma.calendarEvent.findMany({ skip, take, orderBy: { date: 'desc' } }),
          prisma.calendarEvent.count()
        ]);
        break;
      case 'LoginAttempt':
        [data, total] = await Promise.all([
          prisma.loginAttempt.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
          prisma.loginAttempt.count()
        ]);
        break;
      case 'AuditLog':
        [data, total] = await Promise.all([
          prisma.auditLog.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
          prisma.auditLog.count()
        ]);
        break;
      case 'ChatHistory':
        [data, total] = await Promise.all([
          prisma.chatHistory.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
          prisma.chatHistory.count()
        ]);
        break;
      case 'ApiCall':
        [data, total] = await Promise.all([
          prisma.apiCall.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
          prisma.apiCall.count()
        ]);
        break;
      case 'SystemConfig':
        [data, total] = await Promise.all([
          prisma.systemConfig.findMany({ skip, take }),
          prisma.systemConfig.count()
        ]);
        break;
      case 'ApiUsage':
        [data, total] = await Promise.all([
          prisma.apiUsage.findMany({ skip, take, orderBy: { date: 'desc' } }),
          prisma.apiUsage.count()
        ]);
        break;
      case 'Notification':
        [data, total] = await Promise.all([
          prisma.notification.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
          prisma.notification.count()
        ]);
        break;
      case 'NotificationPreference':
        [data, total] = await Promise.all([
          prisma.notificationPreference.findMany({ skip, take }),
          prisma.notificationPreference.count()
        ]);
        break;
      case 'IntegrationKey':
        [data, total] = await Promise.all([
          prisma.integrationKey.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
          prisma.integrationKey.count()
        ]);
        break;
      default:
        return res.status(404).json({ error: 'Tabela não encontrada' });
    }

    res.json({ 
      status: 'ok', 
      data, 
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error(`[DATABASE] Erro ao obter dados da tabela ${req.params.tableName}:`, error);
    res.status(500).json({ error: 'Erro ao obter dados da tabela' });
  }
}
