import { Request, Response } from 'express';
import { saveConfig, getConfig, invalidateConfigCache, SystemConfig } from '../config/settings';
import { client, getCacheStats, MAX_CACHE_SIZE, ENABLE_CACHE_LIMIT } from '../cache/redis';
import { getCostSummary } from '../services/costTracker';
import { sendIntegrationVerificationEmail } from '../services/email';
import { resetGeminiState } from '../ai/gemini';
import { resetOpenAIState } from '../ai/openai';
import { resetOpenRouterState } from '../ai/openrouter';
import { prisma } from '../lib/prisma';
import { 
  obterEstatisticasVoiceCache, 
  limparVoiceCacheAntigos 
} from '../services/voiceCacheService';

const ENABLE_EMAIL_VERIFICATION = false;

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

    const configCountStr = await client.get(`admin:${userId}:config-count`);
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

export async function requestIntegrationChange(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { service } = req.body;

    if (!service || typeof service !== 'string') {
      return res.status(400).json({ error: 'Serviço não especificado' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await client.setex(`integration:verify:${user.id}:${service}`, 900, code);

    console.log(`[INTEGRATION] Requisição de mudança - Usuário: ${user.id}, Serviço: ${service}`);

    if (SKIP_VERIFICATION) {
      const authToken = Math.random().toString(36).substring(7);
      await client.setex(`integration:authorized:${user.id}:${service}`, 300, authToken);
      console.log(`[INTEGRATION] MODO DEV: Verificação saltada. Token: ${authToken.substring(0, 5)}... salvo no Redis (TTL: 300s)`);
      return res.json({ status: 'ok', authToken, message: 'Autorizado para configurar (modo dev)' });
    }

    if (ENABLE_EMAIL_VERIFICATION) {
      try {
        await sendIntegrationVerificationEmail(
          user.email,
          code,
          service,
          user.name
        );
        console.log(`[INTEGRATION] Email de verificação enviado para ${user.email}`);
      } catch (emailError) {
        console.error('[INTEGRATION] Erro ao enviar email:', emailError);
        return res.status(500).json({ error: 'Falha ao enviar código de verificação por email' });
      }
    } else {
      console.log(`[INTEGRATION] MODO DEV: Email desabilitado. Código: ${code}`);
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

    const savedCode = await client.get(`integration:verify:${user.id}:${service}`);

    if (!savedCode || String(savedCode) !== code) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    const authToken = Math.random().toString(36).substring(7);
    await client.setex(`integration:authorized:${user.id}:${service}`, 300, authToken);

    res.json({ status: 'ok', authToken });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar código' });
  }
}

export async function updateIntegrationKey(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { service, key, authToken } = req.body;

    console.log(`[INTEGRATION] Atualizando chave - Usuário: ${user?.id}, Serviço: ${service}, Token recebido: ${authToken ? 'Sim' : 'Não'}`);

    const savedAuth = await client.get(`integration:authorized:${user.id}:${service}`);
    
    console.log(`[INTEGRATION] Token salvo no Redis: ${savedAuth ? 'Encontrado' : 'NÃO ENCONTRADO'}`);
    console.log(`[INTEGRATION] Comparação: '${savedAuth}' === '${authToken}' = ${String(savedAuth) === authToken}`);

    if (!savedAuth || String(savedAuth) !== authToken) {
      console.error(`[INTEGRATION] Autorização falhou!`);
      return res.status(403).json({ error: 'Não autorizado. Realize a verificação por e-mail primeiro.' });
    }

    const keyName = service.includes('backup') ? `secret:key:${service}` : `secret:key:${service}_primary`;
    await client.set(keyName, key);
    console.log(`[INTEGRATION] Chave salva em Redis: ${keyName}`);

    if (service.startsWith('gemini')) {
      resetGeminiState();
    } else if (service.startsWith('openai')) {
      resetOpenAIState();
    } else if (service.startsWith('openrouter')) {
      resetOpenRouterState();
    }

    invalidateConfigCache();

    console.log(`[INTEGRATION] Chave do serviço ${service} atualizada com sucesso`);
    res.json({ status: 'ok', message: `Chave do serviço ${service} atualizada com sucesso` });
  } catch (error) {
    console.error('[ADMIN] Erro salvar chave:', error);
    res.status(500).json({ error: 'Falha ao salvar chave de integração' });
  }
}

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

    const cacheStats = await client.hgetall('metrics:cache:global');
    const hitsStr = typeof cacheStats?.hits === 'string' ? cacheStats.hits : '0';
    const missesStr = typeof cacheStats?.misses === 'string' ? cacheStats.misses : '1';
    const hits = parseInt(hitsStr);
    const total = hits + parseInt(missesStr);
    const cacheHitRate = (hits / total) * 100;

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeSessions = await prisma.chatHistory.groupBy({
      by: ['sessionId'],
      where: {
        createdAt: { gte: thirtyMinutesAgo }
      }
    });

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


export async function getAdminDashboard(req: Request, res: Response) {
  try {
    const config = await getConfig();
    const costSummary = await getCostSummary();

    const redisHistory = await client.lrange('config:history', 0, 5);
    const configHistory = redisHistory.map(h => {
      try { return JSON.parse(h as string); } catch (e) { return h; }
    });

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
      await client.incr(`admin:${userId}:config-count`);
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

/**
 * Retorna estatísticas de VoiceCache (base de dados de áudios)
 * Mostra quanto de economia já foi alcançada
 */
export async function getVoiceCacheStatistics(req: Request, res: Response) {
  try {
    console.log('[ADMIN] Obtendo estatísticas de VoiceCache...');
    
    const stats = await obterEstatisticasVoiceCache();

    if (!stats) {
      return res.status(500).json({ error: 'Erro ao obter estatísticas de VoiceCache' });
    }

    // Calcular economia estimada em custos
    const costoPorCaracter = 0.000015; // ElevenLabs cobra por caractere
    const audioGeradoSemCache = stats.totalPerguntas;
    const audioReutilizado = stats.totalUsos - stats.totalPerguntas;
    const custoEvitado = audioReutilizado * costoPorCaracter;
    const custoTotal = stats.totalUsos * costoPorCaracter;

    res.json({
      status: 'ok',
      voiceCacheStats: {
        totalPerguntas: stats.totalPerguntas,
        totalUsos: stats.totalUsos,
        taxaDeReutilizacao: stats.totalPerguntas > 0 
          ? `${((audioReutilizado / stats.totalUsos) * 100).toFixed(1)}%`
          : '0%',
        usosMediana: stats.usosMediana,
        audioMaisUsados: stats.top5MaisUsados,
        economia: {
          chamadaElevenlabsEvitadas: audioReutilizado,
          custoEvitado: `$${custoEvitado.toFixed(4)}`,
          custoTotalSemReutilizacao: `$${custoTotal.toFixed(4)}`
        },
        recomendacoes: stats.totalPerguntas < 50 
          ? 'Base pequena - continue usando o sistema para acumular mais áudios'
          : `Ótimo! Base com ${stats.totalPerguntas} áudios indexados. Continue acumulando!`
      }
    });
  } catch (error) {
    console.error('[ADMIN] Erro ao obter VoiceCache stats:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas de VoiceCache' });
  }
}

/**
 * Limpa áudios antigos de VoiceCache (não usados há X dias)
 */
export async function limparVoiceCacheAntigo(req: Request, res: Response) {
  try {
    const diasSemUso = req.body.diasSemUso || 90;

    if (diasSemUso < 7) {
      return res.status(400).json({ 
        error: 'Número de dias deve ser no mínimo 7 para segurança' 
      });
    }

    console.log(`[ADMIN] Limpando VoiceCache com mais de ${diasSemUso} dias sem uso...`);
    
    const registrosRemovidos = await limparVoiceCacheAntigos(diasSemUso);

    res.json({
      status: 'ok',
      message: `Limpeza concluída`,
      detalhes: {
        registrosRemovidos,
        diasSemUso,
        audiosSalvosApenasHoje: false
      }
    });
  } catch (error) {
    console.error('[ADMIN] Erro ao limpar VoiceCache:', error);
    res.status(500).json({ error: 'Erro ao limpar VoiceCache' });
  }
}

/**
 * Retorna lista de todos os áudios em VoiceCache
 */
export async function listarVoiceCache(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [audios, total] = await Promise.all([
      prisma.voiceCache.findMany({
        orderBy: { usageCount: 'desc' },
        skip,
        take: limit
      }),
      prisma.voiceCache.count()
    ]);

    res.json({
      status: 'ok',
      audios,
      paginacao: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[ADMIN] Erro ao listar VoiceCache:', error);
    res.status(500).json({ error: 'Erro ao listar VoiceCache' });
  }
}

/**
 * Reseta a configuração para os defaults
 * Limpa o Redis e força o sistema usar DEFAULT_CONFIG
 */
export async function resetConfigToDefault(req: Request, res: Response) {
  try {
    const adminEmail = (req as any).user?.email || 'admin@acessoia.com';

    console.log(`[ADMIN] ⚠️  RESETANDO CONFIG PARA DEFAULTS - Admin: ${adminEmail}`);

    // Deletar todas as chaves de config do Redis
    const configKeys = [
      'config:embedding:strategy',
      'config:embedding:tfidf_threshold',
      'config:embedding:gemini_threshold',
      'config:chat:primary',
      'config:chat:fallback',
      'config:chat:tertiary',
      'config:chat:useFallback',
      'config:audio:storage',
      'config:audio:ttl_seconds',
      'config:tts:model',
      'config:cache:max_per_session',
      'config:admin:last_modified',
      'config:admin:modified_by',
      'config:admin:version'
    ];

    for (const key of configKeys) {
      await client.del(key);
    }

    console.log(`[ADMIN] ✅ Cache limpo. Sistema agora usa DEFAULT_CONFIG`);
    invalidateConfigCache();

    // Recarregar config (vai usar defaults)
    const newConfig = await getConfig();

    res.json({
      status: 'ok',
      message: 'Configuração resetada para defaults',
      estrategia: newConfig.embedding.strategy,
      config: newConfig
    });
  } catch (error) {
    console.error('[ADMIN] Erro ao resetar config:', error);
    res.status(500).json({ error: 'Erro ao resetar configuração' });
  }
}
