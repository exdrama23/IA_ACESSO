import crypto from 'crypto';
import { getCache, setCache } from '../cache/redis';

export function normalizeResponse(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') 
    .replace(/[.,!?;:]+$/g, ''); 
}

export function generateResponseHash(texto: string): string {
  const normalized = normalizeResponse(texto);
  return crypto.createHash('md5').update(normalized).digest('hex');
}

export async function getCachedAudioUrl(responseHash: string): Promise<string | null> {
  const key = `audio_hash:${responseHash}`;
  const cachedUrl = await getCache(key);
  
  if (cachedUrl) {
    console.log(`[AUDIO CACHE]  Encontrado áudio em cache para hash: ${responseHash}`);
    return cachedUrl as string;
  }
  
  console.log(`[AUDIO CACHE]  Nenhum áudio em cache para hash: ${responseHash}`);
  return null;
}

export async function cacheAudioUrl(
  responseHash: string,
  audioUrl: string,
  ttlSeconds: number = 86400 * 30 
): Promise<void> {
  const key = `audio_hash:${responseHash}`;
  await setCache(key, audioUrl, ttlSeconds);
  console.log(`[AUDIO CACHE]  Áudio salvo em cache para hash: ${responseHash}`);
}
