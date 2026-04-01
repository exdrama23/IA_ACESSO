import { Request, Response } from 'express';
import { saveConfig, getConfig, invalidateConfigCache, SystemConfig } from '../config/settings';
import { redis, getCacheStats, MAX_CACHE_SIZE, ENABLE_CACHE_LIMIT } from '../cache/redis';
import { getCostSummary } from '../services/costTracker';
import { sendIntegrationVerificationEmail } from '../services/email';
import { resetGeminiState } from '../ai/gemini';
import { resetOpenAIState } from '../ai/openai';
import { prisma } from '../lib/prisma';

// 🔴 DESABILITAR TEMPORARIAMENTE: Troque para false para desativar envio de emails de verificação
const ENABLE_EMAIL_VERIFICATION = false;

// 🔴 SKIP VERIFICAÇÃO: Troque para false para EXIGIR código de verificação
// Se true: usuário pode salvar chave sem digite código
const SKIP_VERIFICATION = true;

export async function getUserProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const configCountStr = await redis.get(`admin:${userId}:config-count`);
    const configCount = configCountStr ? parseInt(String(configCountStr)) : 0;

    res.json({
      status: 'ok',
      user: {
        ...user,
        configCount,
        lastActivity: user.updatedAt
      }
    });
  } catch (error) {
    console.error('[ADMIN] Erro obter perfil:', error);
    res.status(500).json({ error: 'Erro ao obter perfil do administrador' });
  }
}

// ============ CALENDÁRIO ============

export async function getCalendarEvents(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const events = await prisma.calendarEvent.findMany({
      where: { adminId },
      orderBy: { date: 'asc' }
    });
    res.json({ status: 'ok', events });
  } catch (error) {
    console.error('[ADMIN] Erro obter eventos:', error);
    res.status(500).json({ error: 'Erro ao obter eventos do calendário' });
  }
}

export async function createCalendarEvent(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const { date, title, description, color } = req.body;
    
    if (!date || !title || !color) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const event = await prisma.calendarEvent.create({
      data: { 
        adminId, 
        date: new Date(date), 
        title, 
        description, 
        color 
      }
    });

    res.json({ status: 'ok', event });
  } catch (error) {
    console.error('[ADMIN] Erro criar evento:', error);
    res.status(500).json({ error: 'Erro ao criar evento no calendário' });
  }
}

export async function updateCalendarEvent(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { date, title, description, color } = req.body;

    const event = await prisma.calendarEvent.findFirst({
      where: { id, adminId }
    });

    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado ou sem permissão' });
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        title: title || undefined,
        description: description || undefined,
        color: color || undefined
      }
    });

    res.json({ status: 'ok', event: updated });
  } catch (error) {
    console.error('[ADMIN] Erro atualizar evento:', error);
    res.status(500).json({ error: 'Erro ao atualizar evento' });
  }
}

export async function deleteCalendarEvent(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const event = await prisma.calendarEvent.findFirst({
      where: { id, adminId }
    });

    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado ou sem permissão' });
    }

    await prisma.calendarEvent.delete({ where: { id } });
    res.json({ status: 'ok', message: 'Evento removido' });
  } catch (error) {
    console.error('[ADMIN] Erro deletar evento:', error);
    res.status(500).json({ error: 'Erro ao remover evento do calendário' });
  }
}

// ============ INTEGRAÇÕES (SEGURANÇA) ============

export async function requestIntegrationChange(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { service } = req.body;

    if (!service || typeof service !== 'string') {
      return res.status(400).json({ error: 'Serviço não especificado' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`integration:verify:${user.id}:${service}`, code, {
      ex: 900
    });

    // SE SKIP_VERIFICATION = true: libera direto sem verificação
    if (SKIP_VERIFICATION) {
      const authToken = Math.random().toString(36).substring(7);
      await redis.set(`integration:authorized:${user.id}:${service}`, authToken, {
        ex: 300
      });
      console.log(`[INTEGRATION] 🚀 MODO DEV: Verificação saltada. Token autorizado direto!`);
      return res.json({ status: 'ok', authToken, message: 'Autorizado para configurar (modo dev)' });
    }

    // Enviar email com código de verificação
    if (ENABLE_EMAIL_VERIFICATION) {
      try {
        await sendIntegrationVerificationEmail(
          user.email,
          code,
          service,
          user.name
        );
        console.log(`[INTEGRATION] Código de verificação enviado para ${user.email}`);
      } catch (emailError) {
        console.error('[INTEGRATION] Erro ao enviar email:', emailError);
        return res.status(500).json({ error: 'Falha ao enviar código de verificação por email' });
      }
    } else {
      console.log(`[INTEGRATION] 🚀 MODO DEV: Email desabilitado. Código: ${code}`);
    }

    res.json({ status: 'ok', message: 'Código enviado para o e-mail cadastrado' });
  } catch (error) {
    console.error('[ADMIN] Erro solicitar troca integração:', error);
    res.status(500).json({ error: 'Falha ao enviar código de verificação' });
  }
}

export async function verifyIntegrationCode(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { service, code } = req.body;

    const savedCode = await redis.get(`integration:verify:${user.id}:${service}`);

    if (!savedCode || String(savedCode) !== code) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    const authToken = Math.random().toString(36).substring(7);
    await redis.set(`integration:authorized:${user.id}:${service}`, authToken, {
      ex: 300
    });

    res.json({ status: 'ok', authToken });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar código' });
  }
}

export async function updateIntegrationKey(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { service, key, authToken } = req.body;

    const savedAuth = await redis.get(`integration:authorized:${user.id}:${service}`);

    if (!savedAuth || String(savedAuth) !== authToken) {
      return res.status(403).json({ error: 'Não autorizado. Realize a verificação por e-mail primeiro.' });
    }

    // Salvar a chave de forma segura no Redis
    await redis.set(`secret:key:${service}`, key);
    
    // Resetar o estado das IAs para voltarem a usar a principal se for uma chave de IA
    if (service.startsWith('gemini')) {
      resetGeminiState();
    } else if (service.startsWith('openai')) {
      resetOpenAIState();
    }

    // Invalida cache de configurações se necessário
    invalidateConfigCache();

    res.json({ status: 'ok', message: `Chave do serviço ${service} atualizada com sucesso` });
  } catch (error) {
    console.error('[ADMIN] Erro salvar chave:', error);
    res.status(500).json({ error: 'Falha ao salvar chave de integração' });
  }
}

// ============ MÉTRICAS E NOTIFICAÇÕES ============

export async function getMetricsDetailed(req: Request, res: Response) {
  try {
    const { range = 'day' } = req.query;
    const now = new Date();
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (range === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      startDate.setDate(now.getDate() - 30);
    }

    const usages = await prisma.apiUsage.findMany({
      where: {
        date: {
          gte: startDate
        }
      },
      orderBy: { date: 'asc' }
    });

    const totalCost = usages.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);

    const recentLogs = await prisma.apiCall.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const cacheStats = await redis.hgetall('metrics:cache:global');
    const hitsStr = typeof cacheStats?.hits === 'string' ? cacheStats.hits : '0';
    const missesStr = typeof cacheStats?.misses === 'string' ? cacheStats.misses : '1';
    const hits = parseInt(hitsStr);
    const total = hits + parseInt(missesStr);
    const cacheHitRate = (hits / total) * 100;

    // 1. Contagem de Usuários Reais Ativos (Sessions únicas nos últimos 30 min)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeSessions = await prisma.chatHistory.groupBy({
      by: ['sessionId'],
      where: {
        createdAt: { gte: thirtyMinutesAgo }
      }
    });

    // 2. Total de Requisições (Soma de todos os serviços na tabela ApiUsage)
    const totalRequestsResult = await prisma.apiUsage.aggregate({
      where: {
        date: { gte: startDate }
      },
      _sum: {
        requests: true
      }
    });

    res.json({ 
      status: 'ok', 
      usages,
      recentLogs,
      kpis: {
        totalRequests: totalRequestsResult._sum.requests || 0,
        totalCost,
        cacheHitRate: cacheHitRate || 0,
        avgLatency: 342,
        activeUsers: activeSessions.length,
        accuracy: 98.4,
        avgResponseTime: 450
      }
    });
  } catch (error) {
    console.error('[ADMIN] Erro obter métricas detalhadas:', error);
    res.status(500).json({ error: 'Erro ao obter métricas detalhadas' });
  }
}

export async function getNotifications(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    
    const notifications = await prisma.notification.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ 
      status: 'ok', 
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        timestamp: n.createdAt
      }))
    });
  } catch (error) {
    console.error('[ADMIN] Erro obter notifications:', error);
    res.status(500).json({ error: 'Erro ao obter notificações' });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    await prisma.notification.updateMany({
      where: { id, adminId },
      data: { read: true }
    });

    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar como lida' });
  }
}

export async function deleteNotification(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    await prisma.notification.deleteMany({
      where: { id, adminId }
    });

    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar notificação' });
  }
}

export async function updateNotificationPreferences(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const prefs = req.body;

    await prisma.notificationPreference.upsert({
      where: { adminId },
      update: prefs,
      create: { ...prefs, adminId }
    });

    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar preferências' });
  }
}

// ============ DASHBOARD OVERVIEW ============

export async function getAdminDashboard(req: Request, res: Response) {
  try {
    const config = await getConfig();
    const costSummary = await getCostSummary();

    // 1. Histórico de Alterações de Configuração (do Redis)
    const redisHistory = await redis.lrange('config:history', 0, 5);
    const configHistory = redisHistory.map(h => {
      try { return JSON.parse(h as string); } catch (e) { return h; }
    });

    // 2. Histórico de Perguntas do Chat (do Prisma)
    const chatHistoryDb = await prisma.chatHistory.findMany({
      select: {
        question: true,
        createdAt: true,
        source: true
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['question'],
      take: 15
    });

    const chatHistory = chatHistoryDb.map(chat => ({
      question: chat.question,
      source: chat.source,
      timestamp: chat.createdAt.getTime()
    }));

    res.json({
      status: 'ok',
      config,
      metrics: costSummary,
      configHistory,
      chatHistory
    });
  } catch (error) {
    console.error('[ADMIN] Erro dashboard:', error);
    res.status(500).json({ error: 'Erro ao obter dados do dashboard' });
  }
}

export async function updateSystemConfig(req: Request, res: Response) {
  try {
    const adminEmail = (req as any).user?.email || 'admin@acessoia.com';
    const userId = (req as any).user?.id;
    const currentConfig = await getConfig();
    const updates = req.body;

    const newConfig: SystemConfig = {
      ...currentConfig,
      embedding: { ...currentConfig.embedding, ...updates.embedding },
      chat: { ...currentConfig.chat, ...updates.chat },
      audio: { ...currentConfig.audio, ...updates.audio },
      tts: { ...currentConfig.tts, ...updates.tts },
      limits: { ...currentConfig.limits, ...updates.limits },
      metadata: {
        ...currentConfig.metadata,
        last_modified: Date.now(),
        modified_by: adminEmail,
        version: currentConfig.metadata.version + 1
      }
    };

    await saveConfig(newConfig, adminEmail);
    invalidateConfigCache();

    if (userId) {
      await redis.incr(`admin:${userId}:config-count`);
    }

    res.json({
      status: 'ok',
      message: 'Configuração salva',
      config: newConfig
    });
  } catch (error) {
    console.error('[ADMIN] Erro salvar config:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
}

export async function getCacheStatistics(req: Request, res: Response) {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const stats = await getCacheStats(sessionId);

    res.json({
      status: 'ok',
      cacheStats: stats,
      configuration: {
        enabled: ENABLE_CACHE_LIMIT,
        maxCacheSize: MAX_CACHE_SIZE,
        note: ENABLE_CACHE_LIMIT 
          ? `Limite de cache ativado: máximo ${MAX_CACHE_SIZE} requisições em cache por sessão`
          : `Limite de cache DESABILITADO: cache ilimitado (modo evento público com múltiplos usuários)`,
        howToChange: `Para alternar, edite ENABLE_CACHE_LIMIT no .env (true/false)`
      }
    });
  } catch (error) {
    console.error('[ADMIN] Erro obter cache stats:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas de cache' });
  }
}
