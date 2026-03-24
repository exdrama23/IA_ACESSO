import { Request, Response } from 'express';
import { saveConfig, getConfig, invalidateConfigCache, SystemConfig } from '../config/settings';
import { redis, getCacheStats, MAX_CACHE_SIZE, ENABLE_CACHE_LIMIT } from '../cache/redis';
import { getCostSummary } from '../services/costTracker';

export async function getAdminDashboard(req: Request, res: Response) {
  try {
    const config = await getConfig();
    const costSummary = await getCostSummary();

    const history = await redis.lrange('config:history', 0, 5);
    const parsedHistory = history.map(h => {
      try { return JSON.parse(h as string); } catch (e) { return h; }
    });

    res.json({
      status: 'ok',
      config,
      metrics: costSummary,
      history: parsedHistory
    });
  } catch (error) {
    console.error('[ADMIN] Erro dashboard:', error);
    res.status(500).json({ error: 'Erro ao obter dados do dashboard' });
  }
}

export async function updateSystemConfig(req: Request, res: Response) {
  try {
    const adminEmail = (req as any).user?.email || 'admin@acessoia.com';
    const currentConfig = await getConfig();
    const updates = req.body;

    const newConfig: SystemConfig = {
      ...currentConfig,
      embedding: { ...currentConfig.embedding, ...updates.embedding },
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
