import crypto from 'crypto';
import { getCache, setCache, gerarChave } from '../cache/redis';

export function normalizeResponse(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') 
    .replace(/[.,!?;:]+$/g, ''); 
}

export function generateResponseHash(texto: string, voiceId: string = 'default'): string {
  const normalized = normalizeResponse(texto);
  return crypto.createHash('md5').update(`${voiceId}:${normalized}`).digest('hex');
}

export interface CachedAudio {
  pergunta: string; 
  audioUrl: string; 
  voiceId: string;  
  timestamp: number; 
}

export async function getCachedAudioByQuestion(pergunta: string, voiceId: string = 'default'): Promise<CachedAudio | null> {
  const key = gerarChave(pergunta, 'audio');
  
  try {
    const cached = await getCache(key) as CachedAudio | null;
    
    if (cached) {
      console.log(`[AUDIO CACHE] Encontrado áudio em cache para pergunta: "${pergunta}"`);
      console.log(`[AUDIO CACHE] URL armazenada: ${cached.audioUrl}`);

      if (cached.voiceId !== voiceId) {
        console.log(`[AUDIO CACHE] Voz mudou (${cached.voiceId} → ${voiceId}), gerando novo áudio`);
        return null;
      }
      
      return cached;
    }
    
    console.log(`[AUDIO CACHE] Nenhum áudio em cache para pergunta: "${pergunta}"`);
    return null;
  } catch (error) {
    console.error(`[AUDIO CACHE] Erro ao recuperar cache:`, error);
    return null;
  }
}

export async function cacheAudioByQuestion(
  pergunta: string,
  audioUrl: string,
  voiceId: string = 'default',
  ttlSeconds: number = 86400 * 30 
): Promise<void> {
  const key = gerarChave(pergunta, 'audio');
  
  const cachedData: CachedAudio = {
    pergunta,
    audioUrl,
    voiceId,
    timestamp: Date.now()
  };
  
  try {
    await setCache(key, cachedData, ttlSeconds);
    console.log(`[AUDIO CACHE] Pergunta cacheada com sucesso: "${pergunta}"`);
    console.log(`[AUDIO CACHE] URL armazenada: ${audioUrl}`);
    console.log(`[AUDIO CACHE] Válido por ${ttlSeconds} segundos`);
  } catch (error) {
    console.error(`[AUDIO CACHE] Erro ao salvar cache:`, error);
  }
}

export async function getCachedAudioUrl(responseHash: string): Promise<string | null> {
  const key = `audio_hash:${responseHash}`;
  const cachedUrl = await getCache(key);
  
  if (cachedUrl) {
    console.log(`[AUDIO CACHE] Encontrado áudio (método antigo) para hash: ${responseHash}`);
    return cachedUrl as string;
  }
  
  return null;
}

export async function cacheAudioUrl(
  responseHash: string,
  audioUrl: string,
  ttlSeconds: number = 86400 * 30 
): Promise<void> {
  const key = `audio_hash:${responseHash}`;
  await setCache(key, audioUrl, ttlSeconds);
  console.log(`[AUDIO CACHE] Áudio salvo (método antigo) para hash: ${responseHash}`);
}
