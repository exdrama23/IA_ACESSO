import { prisma } from '../lib/prisma';
import { compareTwoStrings } from 'string-similarity';
import { generateTFIDFVector, compareTwoVectors } from '../ai/semantic';

const SIMILARITY_THRESHOLD = 0.85; // 85%+ de similaridade (ALTA - evita false positives)

/**
 * Normaliza pergunta para busca (sem acento, lowercase)
 */
export function normalizarPergunta(pergunta: string): string {
  return pergunta
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .trim();
}

/**
 * Interface para resultado de busca em VoiceCache
 */
export interface VoiceCacheMatch {
  id: string;
  perguntaOriginal: string;
  audioUrl: string;
  voiceId: string;
  similaridade: number;
  usageCount: number;
  lastUsed: Date;
}

/**
 * Busca áudio semelhante em VoiceCache com 3 estratégias:
 * 1. String similarity clássica (rápido)
 * 2. TF-IDF semântico (mais preciso)
 * 3. Keyword matching (fallback)
 */
export async function buscarAudioSimilarEmVoiceCache(
  pergunta: string,
  voiceId?: string,
  threshold: number = SIMILARITY_THRESHOLD
): Promise<VoiceCacheMatch | null> {
  try {
    const perguntaNormalizada = normalizarPergunta(pergunta);
    
    console.log(`[VOICE_CACHE] Buscando áudio similar para: "${pergunta}"`);
    console.log(`[VOICE_CACHE] Limiar de similaridade: ${(threshold * 100).toFixed(1)}%`);

    // ============ ESTRATÉGIA 0: Match Exato (Ultra Rápido) ============
    const matchExato = await prisma.voiceCache.findUnique({
      where: { question: perguntaNormalizada }
    });

    if (matchExato) {
      console.log(`[VOICE_CACHE] ✓ Match Exato encontrado (100%)`);
      return {
        id: matchExato.id,
        perguntaOriginal: matchExato.question,
        audioUrl: matchExato.audioUrl,
        voiceId: matchExato.voiceId,
        similaridade: 1.0,
        usageCount: matchExato.usageCount,
        lastUsed: matchExato.lastUsed
      };
    }

    // Se o threshold for muito alto (IA), e não deu match exato, nem tentamos o resto para poupar CPU
    if (threshold >= 0.98) {
      console.log('[VOICE_CACHE] ✗ Nenhum match exato para IA');
      return null;
    }

    // Buscar todas as perguntas cacheadas para similaridade (apenas se necessário)
    const todasAsPerguntas = await prisma.voiceCache.findMany({
      select: {
        id: true,
        question: true,
        audioUrl: true,
        voiceId: true,
        usageCount: true,
        lastUsed: true
      }
    });

    if (todasAsPerguntas.length === 0) {
      console.log('[VOICE_CACHE] ✗ Nenhuma pergunta cacheada encontrada');
      return null;
    }

    console.log(`[VOICE_CACHE] Perguntas cacheadas: ${todasAsPerguntas.length}`);

    // ============ ESTRATÉGIA 1: String Similarity ============
    const stringSimilarityScores = todasAsPerguntas.map(item => {
      const similarity = compareTwoStrings(
        perguntaNormalizada,
        normalizarPergunta(item.question)
      );
      
      return {
        ...item,
        similarity,
        estrategia: 'string'
      };
    });

    const melhoresString = stringSimilarityScores
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    if (melhoresString.length > 0) {
      const melhor = melhoresString[0];
      console.log(`[VOICE_CACHE] ✓ Match por String Similarity: ${(melhor.similarity * 100).toFixed(1)}%`);
      console.log(`[VOICE_CACHE] Pergunta similar: "${melhor.question}"`);
      
      return {
        id: melhor.id,
        perguntaOriginal: melhor.question,
        audioUrl: melhor.audioUrl,
        voiceId: melhor.voiceId,
        similaridade: melhor.similarity,
        usageCount: melhor.usageCount,
        lastUsed: melhor.lastUsed
      };
    }

    // ============ ESTRATÉGIA 2: TF-IDF Semântico ============
    console.log(`[VOICE_CACHE] String similarity insuficiente, tentando TF-IDF semântico...`);
    
    const vetorEntrada = generateTFIDFVector(pergunta);
    
    const tfidfScores = todasAsPerguntas.map(item => {
      const vetorCacheado = generateTFIDFVector(item.question);
      const similarity = compareTwoVectors(vetorEntrada, vetorCacheado);
      
      return {
        ...item,
        similarity,
        estrategia: 'tfidf'
      };
    });

    const melhoresTfidf = tfidfScores
      .filter(s => s.similarity >= threshold * 0.95) // Limiar ligeiramente menor para TF-IDF
      .sort((a, b) => b.similarity - a.similarity);

    if (melhoresTfidf.length > 0) {
      const melhor = melhoresTfidf[0];
      console.log(`[VOICE_CACHE] ✓ Match por TF-IDF: ${(melhor.similarity * 100).toFixed(1)}%`);
      console.log(`[VOICE_CACHE] Pergunta similar: "${melhor.question}"`);
      
      return {
        id: melhor.id,
        perguntaOriginal: melhor.question,
        audioUrl: melhor.audioUrl,
        voiceId: melhor.voiceId,
        similaridade: melhor.similarity,
        usageCount: melhor.usageCount,
        lastUsed: melhor.lastUsed
      };
    }

    // ============ ESTRATÉGIA 3: Keyword Matching (fallback) ============
    console.log(`[VOICE_CACHE] TF-IDF insuficiente, tentando keyword matching...`);

    const keywordsCacheados = todasAsPerguntas.map(item => {
      const palavrasEntrada = new Set(perguntaNormalizada.split(/\s+/));
      const palavrasCache = new Set(normalizarPergunta(item.question).split(/\s+/));
      
      const intersecao = new Set([...palavrasEntrada].filter(p => palavrasCache.has(p)));
      const uniao = new Set([...palavrasEntrada, ...palavrasCache]);
      
      const jaccardSimilarity = uniao.size > 0 ? intersecao.size / uniao.size : 0;
      
      return {
        ...item,
        similarity: jaccardSimilarity,
        estrategia: 'keywords'
      };
    });

    const melhoresKeywords = keywordsCacheados
      .filter(s => s.similarity >= threshold * 0.85) // Limiar ainda menor para keywords
      .sort((a, b) => b.similarity - a.similarity);

    if (melhoresKeywords.length > 0) {
      const melhor = melhoresKeywords[0];
      console.log(`[VOICE_CACHE] ✓ Match por Keywords: ${(melhor.similarity * 100).toFixed(1)}%`);
      console.log(`[VOICE_CACHE] Pergunta similar: "${melhor.question}"`);
      
      return {
        id: melhor.id,
        perguntaOriginal: melhor.question,
        audioUrl: melhor.audioUrl,
        voiceId: melhor.voiceId,
        similaridade: melhor.similarity,
        usageCount: melhor.usageCount,
        lastUsed: melhor.lastUsed
      };
    }

    console.log('[VOICE_CACHE] ✗ Nenhuma pergunta similar encontrada');
    return null;

  } catch (error) {
    console.error('[VOICE_CACHE] Erro ao buscar áudio similar:', error);
    return null;
  }
}

/**
 * Incrementa contador de uso e atualiza lastUsed
 */
export async function incrementarUsageCount(voiceCacheId: string): Promise<void> {
  try {
    await prisma.voiceCache.update({
      where: { id: voiceCacheId },
      data: {
        usageCount: { increment: 1 },
        lastUsed: new Date()
      }
    });
    
    console.log(`[VOICE_CACHE] ✓ Contador de uso atualizado para ID: ${voiceCacheId}`);
  } catch (error) {
    console.error('[VOICE_CACHE] Erro ao incrementar usageCount:', error);
  }
}

/**
 * Salva novo áudio em VoiceCache
 */
export async function salvarAudioEmVoiceCache(
  pergunta: string,
  audioUrl: string,
  voiceId: string = 'elevenlabs_default'
): Promise<string | null> {
  try {
    const perguntaNormalizada = normalizarPergunta(pergunta);

    // Verificar se já existe (por pergunta normalizada)
    const existe = await prisma.voiceCache.findUnique({
      where: { question: perguntaNormalizada }
    });

    if (existe) {
      console.log(`[VOICE_CACHE] Pergunta já existe: "${pergunta}"`);
      return existe.id;
    }

    const novo = await prisma.voiceCache.create({
      data: {
        question: perguntaNormalizada,
        audioUrl,
        voiceId,
        usageCount: 1,
        lastUsed: new Date()
      }
    });

    console.log(`[VOICE_CACHE] ✓ Novo áudio salvo em VoiceCache`);
    console.log(`[VOICE_CACHE] ID: ${novo.id}`);
    console.log(`[VOICE_CACHE] Pergunta: "${pergunta}"`);
    console.log(`[VOICE_CACHE] URL: ${audioUrl}`);

    return novo.id;
  } catch (error) {
    console.error('[VOICE_CACHE] Erro ao salvar áudio:', error);
    return null;
  }
}

/**
 * Retorna estatísticas de VoiceCache
 */
export async function obterEstatisticasVoiceCache(): Promise<any> {
  try {
    const total = await prisma.voiceCache.count();
    
    const stats = await prisma.voiceCache.aggregate({
      _sum: { usageCount: true },
      _avg: { usageCount: true }
    });

    const maisUsados = await prisma.voiceCache.findMany({
      orderBy: { usageCount: 'desc' },
      take: 5,
      select: { question: true, usageCount: true, audioUrl: true }
    });

    return {
      totalPerguntas: total,
      totalUsos: stats._sum.usageCount || 0,
      usosMediana: Math.round(stats._avg.usageCount || 0),
      top5MaisUsados: maisUsados,
      economiaEstimada: {
        chamadaAElivenLabsEvitadas: stats._sum.usageCount ? stats._sum.usageCount - total : 0,
        custoReducao: `~${Math.round((stats._sum.usageCount || 0) * 0.002)}%` // Estimativa
      }
    };
  } catch (error) {
    console.error('[VOICE_CACHE] Erro ao obter estatísticas:', error);
    return null;
  }
}

/**
 * Limpa VoiceCache antigos (não usados há X dias)
 */
export async function limparVoiceCacheAntigos(diasSemUso: number = 90): Promise<number> {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasSemUso);

    const resultado = await prisma.voiceCache.deleteMany({
      where: {
        lastUsed: {
          lt: dataLimite
        }
      }
    });

    console.log(`[VOICE_CACHE] ✓ Limpeza concluída: ${resultado.count} registros removidos`);
    return resultado.count;
  } catch (error) {
    console.error('[VOICE_CACHE] Erro ao limpar cache antigo:', error);
    return 0;
  }
}
