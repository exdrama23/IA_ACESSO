import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const THREE_DAYS_SECONDS = 60 * 60 * 24 * 3;
export const MAX_CACHE_SIZE = parseInt(process.env.CACHE_MAX_SIZE || "20", 10);
export const ENABLE_CACHE_LIMIT = process.env.ENABLE_CACHE_LIMIT?.toLowerCase() === 'true';

export function gerarChave(pergunta: string, tipo: 'text' | 'audio' = 'text'): string {
  const crypto = require("crypto");
  
  let normalized = pergunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^\w\s]/gi, "") 
    .trim();

  const stopWords = ["o", "a", "os", "as", "do", "da", "dos", "das", "de", "um", "uma", "qual", "quais", "quanto", "quanta"];

  normalized = normalized.split(" ")
    .filter(word => !stopWords.includes(word))
    .map(word => {
      if (word.length > 3 && word.endsWith("s")) {
        return word.slice(0, -1);
      }
      return word;
    })
    .join(" ");

  const hash = crypto.createHash("md5").update(normalized).digest("hex");
  const key = `cache:${tipo}:${hash}`;
  
  console.log(`DEBUG CACHE: Original: "${pergunta}" | Semântica: "${normalized}" | Chave: ${key}`);
  
  return key;
}

export async function getCache(key: string) {
  try {
    return await redis.get(key);
  } catch (err) {
    console.error("Erro Upstash Get:", err);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = THREE_DAYS_SECONDS) {
  try {
    await redis.set(key, value, { ex: ttlSeconds });

    if (ENABLE_CACHE_LIMIT) {
      const cacheKeysListKey = "cache:all_keys";

      const allKeys = (await redis.zrange(cacheKeysListKey, 0, -1)) as string[];
      
      if (allKeys.length >= MAX_CACHE_SIZE) {
        
        const oldestKey = allKeys[0];
        await redis.del(oldestKey);
        await redis.zrem(cacheKeysListKey, oldestKey);
        console.log(`[CACHE LIMITE] Removed oldest cache key: ${oldestKey}`);
      }

      await redis.zadd(cacheKeysListKey, {
        score: Date.now(),
        member: key
      });
      
      console.log(`[CACHE] Requisição armazenada em cache (com limite de ${MAX_CACHE_SIZE}): ${key}`);
    } else {
      console.log(`[CACHE] Requisição armazenada em cache (ilimitado - modo evento public): ${key}`);
    }
  } catch (err) {
    console.error("Erro Upstash Set:", err);
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
  try {
    const history = await redis.get<ChatMessage[]>(`history:${sessionId}`);
    return history || [];
  } catch (err) {
    console.error("Erro ao obter histórico:", err);
    return [];
  }
}

export async function addConversationHistory(sessionId: string, userMsg: string, aiMsg: string) {
  try {
    let history = await getConversationHistory(sessionId);
    history.push({ role: "user", content: userMsg });
    history.push({ role: "assistant", content: aiMsg });
    
    if (history.length > 120) {
      history = history.slice(-120);
    }
    
    await redis.set(`history:${sessionId}`, history, { ex: THREE_DAYS_SECONDS });
  } catch (err) {
    console.error("Erro ao salvar histórico:", err);
  }
}

export interface AudioCacheEntry {
  pergunta_original: string;
  resposta: string;
  embedding: string; 
  cloudinary_url: string;
  tts_model: 'elevenlabs' | 'google';
  similarity_score: number;
  timestamp: number;
}

export async function setAudioCacheHash(
  sessionId: string,
  entry: AudioCacheEntry,
  ttlSeconds: number = THREE_DAYS_SECONDS
): Promise<void> {
  try {
    const hashKey = `audio_cache:${sessionId}:${entry.timestamp}`;
    
    await redis.hset(hashKey, {
      pergunta_original: entry.pergunta_original,
      resposta: entry.resposta,
      embedding: entry.embedding,
      cloudinary_url: entry.cloudinary_url,
      tts_model: entry.tts_model,
      similarity_score: entry.similarity_score.toString(),
      timestamp: entry.timestamp.toString()
    });

    await redis.expire(hashKey, ttlSeconds);

    await redis.zadd(`audio_cache:${sessionId}:index`, {
      score: entry.similarity_score,
      member: entry.timestamp.toString()
    });

    if (ENABLE_CACHE_LIMIT) {
      await enforceCacheLimit(sessionId, MAX_CACHE_SIZE);
      console.log(`[REDIS] Áudio salvo (com limite de ${MAX_CACHE_SIZE}): ${hashKey}`);
    } else {
      console.log(`[REDIS] Áudio salvo (ilimitado - modo evento public): ${hashKey}`);
    }
  } catch (err) {
    console.error('[REDIS] Erro ao salvar áudio:', err);
  }
}

export async function findSimilarAudioInHistory(
  sessionId: string,
  newSemantic: any, 
  threshold: number = 0.85,
  compareFn: (s1: any, s2: any) => number
): Promise<AudioCacheEntry | null> {
  try {
    
    const indexKey = `audio_cache:${sessionId}:index`;
    const timestamps = (await redis.zrange(indexKey, 0, -1)).reverse(); 
    
    if (!timestamps || timestamps.length === 0) return null;

    for (const tsStr of timestamps) {
      const hashKey = `audio_cache:${sessionId}:${tsStr}`;

      const cachedEntry = await redis.hgetall(hashKey) as Record<string, string>;
      if (!cachedEntry || !cachedEntry.embedding) continue;

      try {
        const cachedEmbedding = JSON.parse(cachedEntry.embedding);
        const cachedSemantic = {
          ...newSemantic,
          data: cachedEmbedding,
          normalized: cachedEntry.pergunta_original
        };

        const similarity = compareFn(newSemantic, cachedSemantic);
        
        if (similarity >= threshold) {
          console.log(
            `[CACHE SEMÂNTICO] Encontrado! Pergunta: "${cachedEntry.pergunta_original}" | Similaridade: ${(similarity * 100).toFixed(1)}%`
          );
          
          return {
            pergunta_original: cachedEntry.pergunta_original,
            resposta: cachedEntry.resposta,
            embedding: cachedEntry.embedding,
            cloudinary_url: cachedEntry.cloudinary_url,
            tts_model: cachedEntry.tts_model as 'elevenlabs' | 'google',
            similarity_score: similarity,
            timestamp: parseInt(tsStr as string)
          };
        }
      } catch (parseErr) {
        console.warn(`[REDIS] Erro ao fazer parse do embedding: ${tsStr}`, parseErr);
      }
    }
    
    console.log(
      `[CACHE SEMÂNTICO] Nenhum áudio similar encontrado (threshold: ${(threshold * 100).toFixed(0)}%)`
    );
    return null;
  } catch (err) {
    console.error('[REDIS] Erro ao buscar áudio similar:', err);
    return null;
  }
}

export async function listAudioCacheBySession(sessionId: string): Promise<AudioCacheEntry[]> {
  try {
    const indexKey = `audio_cache:${sessionId}:index`;
    const timestamps = await redis.zrange(indexKey, 0, -1);
    
    const entries: AudioCacheEntry[] = [];
    
    for (const tsStr of timestamps) {
      const hashKey = `audio_cache:${sessionId}:${tsStr}`;
      const cachedEntry = await redis.hgetall(hashKey) as Record<string, string>;
      
      if (cachedEntry) {
        entries.push({
          pergunta_original: cachedEntry.pergunta_original,
          resposta: cachedEntry.resposta,
          embedding: cachedEntry.embedding,
          cloudinary_url: cachedEntry.cloudinary_url,
          tts_model: cachedEntry.tts_model as 'elevenlabs' | 'google',
          similarity_score: parseFloat(cachedEntry.similarity_score),
          timestamp: parseInt(tsStr as string)
        });
      }
    }
    
    return entries;
  } catch (err) {
    console.error('[REDIS] Erro ao listar cache:', err);
    return [];
  }
}

export async function clearAudioCacheBySession(sessionId: string): Promise<void> {
  try {
    const indexKey = `audio_cache:${sessionId}:index`;
    const timestamps = await redis.zrange(indexKey, 0, -1);
    
    for (const tsStr of timestamps) {
      const hashKey = `audio_cache:${sessionId}:${tsStr}`;
      await redis.del(hashKey);
    }
    
    await redis.del(indexKey);
    console.log(`[REDIS] Cache de áudios limpo para sessão: ${sessionId}`);
  } catch (err) {
    console.error('[REDIS] Erro ao limpar cache:', err);
  }
}

export async function enforceCacheLimit(sessionId: string, maxCacheSize: number = MAX_CACHE_SIZE): Promise<void> {
  try {
    const indexKey = `audio_cache:${sessionId}:index`;
    const timestamps = (await redis.zrange(indexKey, 0, -1)) as string[];

    if (timestamps.length > maxCacheSize) {
      const itemsToRemove = timestamps.slice(0, timestamps.length - maxCacheSize);
      
      for (const tsStr of itemsToRemove) {
        const hashKey = `audio_cache:${sessionId}:${tsStr}`;
        await redis.del(hashKey);
        await redis.zrem(indexKey, tsStr);
        console.log(`[CACHE LIMITE] Removed old entry: ${hashKey}`);
      }
      
      console.log(`[CACHE LIMITE] Cache reduzido para ${maxCacheSize} entradas. Removidas: ${itemsToRemove.length}`);
    }
  } catch (err) {
    console.error('[REDIS] Erro ao aplicar limite de cache:', err);
  }
}

export async function getCacheStats(sessionId?: string): Promise<{
  totalAudioCacheEntries: number;
  totalTextCacheEntries: number;
  audioEntriesBySession?: { [key: string]: number };
  maxCacheSize: number;
}> {
  try {
    let totalAudio = 0;
    let totalText = 0;
    const audioEntriesBySession: { [key: string]: number } = {};

    const textCacheKeys = (await redis.zrange("cache:all_keys", 0, -1)) as string[];
    totalText = textCacheKeys.length;

    if (sessionId) {
      const indexKey = `audio_cache:${sessionId}:index`;
      const timestamps = (await redis.zrange(indexKey, 0, -1)) as string[];
      totalAudio = timestamps.length;
      audioEntriesBySession[sessionId] = totalAudio;
    } else {

      console.warn("[CACHE STATS] Para listar por sessão, forneça sessionId específico");
    }

    return {
      totalAudioCacheEntries: totalAudio,
      totalTextCacheEntries: totalText,
      audioEntriesBySession,
      maxCacheSize: MAX_CACHE_SIZE
    };
  } catch (err) {
    console.error('[REDIS] Erro ao obter stats:', err);
    return {
      totalAudioCacheEntries: 0,
      totalTextCacheEntries: 0,
      maxCacheSize: MAX_CACHE_SIZE
    };
  }
}
