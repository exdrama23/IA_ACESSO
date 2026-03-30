import { redis } from '../cache/redis';
import { prisma } from '../lib/prisma';

export type AIService = 'gemini' | 'elevenlabs' | 'google-tts' | 'cloudinary';

export interface CostEntry {
  service: AIService;
  tokens?: number;
  characters?: number;
  request_type: string;
  estimated_cost: number;
  timestamp: number;
}

const COSTS = {
  GEMINI_TOKEN: 0.000000125, 
  ELEVENLABS_CHAR: 0.0000003, 
  CLOUDINARY_REQ: 0.00001,
  GOOGLE_TTS_CHAR: 0.000004,
};

export async function trackAICall(service: AIService, data: { tokens?: number, characters?: number, type: string }) {
  try {
    let cost = 0;
    if (service === 'gemini' && data.tokens) cost = data.tokens * COSTS.GEMINI_TOKEN;
    if (service === 'elevenlabs' && data.characters) cost = data.characters * COSTS.ELEVENLABS_CHAR;
    if (service === 'google-tts' && data.characters) cost = data.characters * COSTS.GOOGLE_TTS_CHAR;
    if (service === 'cloudinary') cost = COSTS.CLOUDINARY_REQ;

    // Granularidade horária para gráficos de 24h
    const now = new Date();
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);

    try {
      // Upsert por HORA para permitir visão detalhada de 24h
      await prisma.apiUsage.upsert({
        where: {
          service_date: {
            service,
            date: hourStart
          }
        },
        update: {
          tokens: data.tokens ? { increment: data.tokens } : undefined,
          characters: data.characters ? { increment: data.characters } : undefined,
          requests: { increment: 1 },
          estimatedCost: { increment: cost }
        },
        create: {
          service,
          date: hourStart,
          tokens: data.tokens || 0,
          characters: data.characters || 0,
          requests: 1,
          estimatedCost: cost
        }
      });

      await prisma.apiCall.create({
        data: {
          endpoint: service,
          method: data.type,
          status: 200,
          duration: 0, 
          requestBody: data as any,
          responseBody: { cost } as any
        }
      });

    } catch (dbErr) {
      console.error('[PRISMA] Erro custo:', dbErr);
    }

    const entry: CostEntry = {
      service,
      tokens: data.tokens,
      characters: data.characters,
      request_type: data.type,
      estimated_cost: cost,
      timestamp: Date.now()
    };

    await redis.lpush('metrics:costs', JSON.stringify(entry));
    await redis.ltrim('metrics:costs', 0, 999);
    
    const todayStr = new Date().toISOString().split('T')[0];
    await redis.hincrbyfloat(`metrics:daily:${todayStr}`, 'total_cost', cost);
    await redis.hincrbyfloat(`metrics:daily:${todayStr}`, `cost:${service}`, cost);
    
    console.log(`[COST] ${service.toUpperCase()} call tracked: $${cost.toFixed(6)}`);
  } catch (error) {
    console.error('[COST] Erro ao rastrear custo:', error);
  }
}

export async function getCostSummary() {
  const todayStr = new Date().toISOString().split('T')[0];
  const stats = await redis.hgetall(`metrics:daily:${todayStr}`) as Record<string, string>;
  
  const history = await redis.lrange('metrics:costs', 0, 10);
  const parsedHistory = history.map(h => {
    if (typeof h === 'string') {
      try {
        return JSON.parse(h);
      } catch (e) {
        console.error('[COST] Erro no parse do histórico de custos:', e);
        return h;
      }
    }
    return h;
  });

  return {
    today: {
      total: parseFloat(stats?.total_cost || '0'),
      gemini: parseFloat(stats?.['cost:gemini'] || '0'),
      elevenlabs: parseFloat(stats?.['cost:elevenlabs'] || '0'),
      cloudinary: parseFloat(stats?.['cost:cloudinary'] || '0'),
    },
    recent: parsedHistory
  };
}
