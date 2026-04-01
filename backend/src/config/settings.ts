import { redis } from '../cache/redis';

export type EmbeddingStrategy = 'tfidf' | 'gemini' | 'hybrid';
export type TTSModel = 'elevenlabs' | 'google';
export type StorageType = 'cloudinary' | 'redis';
export type AIProvider = 'gemini' | 'openai';

export interface SystemConfig {
  embedding: {
    strategy: EmbeddingStrategy;
    tfidf_threshold: number;
    gemini_threshold: number;
  };
  chat: {
    primary: AIProvider;
    fallback: AIProvider;
    useFallback: boolean;
  };
  audio: {
    storage: StorageType;
    ttl_seconds: number;
  };
  tts: {
    model: TTSModel;
    voiceId: string;
    availableVoices: { id: string, name: string }[];
  };
  limits: {
    max_audios_per_session: number;
    max_request_size_mb: number;
  };
  metadata: {
    last_modified: number;
    modified_by: string;
    version: number;
  };
}

const DEFAULT_CONFIG: SystemConfig = {
  embedding: {
    strategy: 'tfidf',           
    tfidf_threshold: 0.75,
    gemini_threshold: 0.85
  },
  chat: {
    primary: 'gemini',
    fallback: 'openai',
    useFallback: true
  },
  audio: {
    storage: 'cloudinary',
    ttl_seconds: 259200
  },
  tts: {
    model: 'elevenlabs',
    voiceId: 'hpp4J3VqNfWAUOO0d1Us', 
    availableVoices: [
      { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Eduarda (Oficial)' }
    ]
  },
  limits: {
    max_audios_per_session: 100,
    max_request_size_mb: 10
  },
  metadata: {
    last_modified: Date.now(),
    modified_by: 'system',
    version: 1
  }
};

export async function loadConfig(): Promise<SystemConfig> {
  try {
    const strategy = (await redis.get('config:embedding:strategy')) as EmbeddingStrategy;
    
    if (!strategy) {
      console.log('[CONFIG] Usando padrões');
      return DEFAULT_CONFIG;
    }

    const tfidfThreshold = parseFloat(await redis.get('config:embedding:tfidf_threshold') || '0.75');
    const geminiThreshold = parseFloat(await redis.get('config:embedding:gemini_threshold') || '0.85');
    const storage = (await redis.get('config:audio:storage')) as StorageType;
    const ttsModel = (await redis.get('config:tts:model')) as TTSModel;
    const ttl = parseInt(await redis.get('config:cache:ttl_seconds') || '259200');
    const maxAudios = parseInt(await redis.get('config:cache:max_per_session') || '100');

    const voiceId: string = (await redis.get('config:tts:voiceId')) as string || 'hpp4J3VqNfWAUOO0d1Us';
    const availableVoicesStr = await redis.get('config:tts:availableVoices');
    const availableVoices: { id: string; name: string }[] = availableVoicesStr 
      ? JSON.parse(availableVoicesStr as string) 
      : DEFAULT_CONFIG.tts.availableVoices;

    const chatPrimary = (await redis.get('config:chat:primary')) as AIProvider || 'gemini';
    const chatFallback = (await redis.get('config:chat:fallback')) as AIProvider || 'openai';
    const chatUseFallback = (await redis.get('config:chat:useFallback')) === 'true';

    const config: SystemConfig = {
      embedding: { strategy, tfidf_threshold: tfidfThreshold, gemini_threshold: geminiThreshold },
      chat: { primary: chatPrimary, fallback: chatFallback, useFallback: chatUseFallback },
      audio: { storage, ttl_seconds: ttl },
      tts: { model: ttsModel, voiceId: voiceId, availableVoices: availableVoices },
      limits: { max_audios_per_session: maxAudios, max_request_size_mb: 10 },
      metadata: {
        last_modified: parseInt(await redis.get('config:admin:last_modified') || Date.now().toString()),
        modified_by: (await redis.get('config:admin:modified_by')) || 'system',
        version: parseInt(await redis.get('config:admin:version') || '1')
      }
    };

    console.log(`[CONFIG] Estratégia: ${strategy.toUpperCase()}`);
    return config;
  } catch (error) {
    console.error('[CONFIG] Erro ao carregar:', error);
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(newConfig: SystemConfig, adminEmail: string): Promise<void> {
  try {
    const versionStr = await redis.get('config:admin:version');
    const version = parseInt((versionStr as string) || '0') + 1;

    await redis.mset({
      'config:embedding:strategy': newConfig.embedding.strategy,
      'config:embedding:tfidf_threshold': newConfig.embedding.tfidf_threshold.toString(),
      'config:embedding:gemini_threshold': newConfig.embedding.gemini_threshold.toString(),
      'config:chat:primary': newConfig.chat.primary,
      'config:chat:fallback': newConfig.chat.fallback,
      'config:chat:useFallback': newConfig.chat.useFallback.toString(),
      'config:audio:storage': newConfig.audio.storage,
      'config:audio:ttl_seconds': newConfig.audio.ttl_seconds.toString(),
      'config:tts:model': newConfig.tts.model,
      'config:cache:max_per_session': newConfig.limits.max_audios_per_session.toString(),
      'config:admin:last_modified': Date.now().toString(),
      'config:admin:modified_by': adminEmail,
      'config:admin:version': version.toString()
    });

    await redis.rpush(
      `config:history`,
      JSON.stringify({
        timestamp: Date.now(),
        version,
        strategy: newConfig.embedding.strategy,
        modified_by: adminEmail
      })
    );

    console.log(`[CONFIG] Salva v${version} por ${adminEmail}`);
  } catch (error) {
    console.error('[CONFIG] Erro ao salvar:', error);
    throw error;
  }
}

let cachedConfig: SystemConfig | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 30000; 

export async function getConfig(): Promise<SystemConfig> {
  const now = Date.now();
  
  if (cachedConfig && now - lastFetch < CACHE_DURATION) {
    return cachedConfig;
  }

  cachedConfig = await loadConfig();
  lastFetch = now;
  return cachedConfig;
}

export function invalidateConfigCache(): void {
  cachedConfig = null;
  lastFetch = 0;
}
