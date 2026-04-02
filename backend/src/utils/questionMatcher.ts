import { redis } from "../cache/redis";
import { compareTwoStrings } from "string-similarity";
import { faq } from "../data/faq";
import { prisma } from "../lib/prisma";

export function extractKeywords(texto: string): Set<string> {
  const stopWords = new Set([
    "o", "a", "os", "as", "do", "da", "dos", "das", "de", "um", "uma",
    "qual", "quais", "quanto", "quanta", "quantos", "quantas",
    "é", "são", "será", "serão", "foi", "foram", "é",
    "e", "ou", "mas", "porém", "contudo", "todavia",
    "em", "para", "por", "com", "sem", "sobre", "entre",
    "que", "como", "onde", "quando", "por que", "porque"
  ]);

  return new Set(
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
  );
}

export function findCategoryInFAQ(pergunta: string): string | null {
  try {
    const perguntaNormalizada = pergunta.toLowerCase().trim();
    
    for (const faqGroup of Object.values(faq)) {
      for (const faqItem of faqGroup) {
        const found = faqItem.questions.some(q => 
          q.toLowerCase().trim() === perguntaNormalizada
        );
        
        if (found) {
          console.log(`[FAQ] ✓ Pergunta encontrada no FAQ - Categoria: "${faqItem.category}"`);
          return faqItem.category;
        }
        
        for (const faqQuestion of faqItem.questions) {
          const similarity = compareTwoStrings(perguntaNormalizada, faqQuestion.toLowerCase());
          if (similarity > 0.8) {
            console.log(`[FAQ] ✓ Pergunta similar encontrada no FAQ (${(similarity * 100).toFixed(1)}%) - Categoria: "${faqItem.category}"`);
            return faqItem.category;
          }
        }
      }
    }
    
    console.log(`[FAQ] ✗ Pergunta não encontrada no FAQ`);
    return null;
  } catch (error) {
    console.error("[FAQ] Erro ao buscar pergunta no FAQ:", error);
    return null;
  }
}

function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

export interface CachedQuestion {
  pergunta: string;
  audioUrl: string;
  voiceId: string;
  keywords: string[];
  category?: string; 
  timestamp: number;
}

export async function findSimilarCachedQuestion(
  perguntaNova: string,
  voiceId: string,
  similarityThreshold: number = 0.5
): Promise<CachedQuestion | null> {
  try {
    console.log(`\n[MATCHER] ═══════════════════════════════════════`);
    console.log(`[MATCHER] Buscando perguntas similares para: "${perguntaNova}"`);
    console.log(`[MATCHER] ═══════════════════════════════════════`);
    
    const categoryFromFAQ = findCategoryInFAQ(perguntaNova);
    console.log(`[MATCHER] Categoria do FAQ: ${categoryFromFAQ || "Nenhuma"}`);

    const allKeys = await redis.keys("cache:audio:*");
    
    if (!allKeys || allKeys.length === 0) {
      console.log("[MATCHER] ✗ Nenhuma pergunta cacheada encontrada no Redis");
      console.log("[MATCHER] ═══════════════════════════════════════\n");
      return null;
    }

    console.log(`[MATCHER] Perguntas cacheadas encontradas: ${allKeys.length}\n`);

    if (categoryFromFAQ) {
      console.log(`[MATCHER] ╔════ PASSO 2: Buscando pergunta da categoria "${categoryFromFAQ}" ════╗`);
      
      const pergundasDaCategoria: CachedQuestion[] = [];

      for (const key of allKeys) {
        try {
          const cached = await redis.get(key) as CachedQuestion | null;
          
          if (!cached) continue;
          
          if (cached.voiceId !== voiceId) continue;
          
          if (cached.category === categoryFromFAQ) {
            pergundasDaCategoria.push(cached);
            console.log(`[MATCHER] ✓ "${cached.pergunta}"`);
            console.log(`[MATCHER]   URL: ${cached.audioUrl}`);
          }
        } catch (err) {
          console.error(`[MATCHER] Erro ao processar ${key}:`, err);
        }
      }

      if (pergundasDaCategoria.length > 0) {
        const chosen = pergundasDaCategoria[0];
        console.log(`\n[MATCHER] ✓ SUCESSO! Reutilizando áudio da categoria "${categoryFromFAQ}"`);
        console.log(`[MATCHER] Pergunta usada como referência: "${chosen.pergunta}"`);
        console.log(`[MATCHER] Áudio: ${chosen.audioUrl}`);
        console.log(`[MATCHER] ═══════════════════════════════════════\n`);
        return chosen;
      } else {
        console.log(`[MATCHER] ✗ Nenhuma pergunta encontrada na categoria "${categoryFromFAQ}"`);
        console.log(`[MATCHER] ╚═══════════════════════════════════════╝\n`);
      }
    }

    console.log(`[MATCHER] ╔════ PASSO 3: Matching por Similaridade (threshold: ${similarityThreshold}) ════╗`);
    
    const keywordsNova = extractKeywords(perguntaNova);
    console.log(`[MATCHER] Palavras-chave: [${Array.from(keywordsNova).join(", ")}]\n`);

    let bestMatch: { question: CachedQuestion; score: number } = { 
      question: null as any, 
      score: 0 
    };
    let analysisCount = 0;

    for (const key of allKeys) {
      try {
        const cached = await redis.get(key) as CachedQuestion | null;
        
        if (!cached) continue;

        if (cached.voiceId !== voiceId) {
          console.log(`  ✗ "${cached.pergunta}" - Voz diferente (${cached.voiceId})`);
          continue;
        }

        analysisCount++;
        const keywordsCached = new Set(cached.keywords || []);

        const exataMatch = perguntaNova.toLowerCase().trim() === 
                          cached.pergunta.toLowerCase().trim();
        
        if (exataMatch) {
          console.log(`  ✓ MATCH EXATO (100%): "${cached.pergunta}"`);
          console.log(`    URL: ${cached.audioUrl}`);
          console.log(`[MATCHER] ╚═══════════════════════════════════════╝\n`);
          return cached;
        }

        const jaccardScore = jaccardSimilarity(keywordsNova, keywordsCached);

        const semanticScore = compareTwoStrings(
          perguntaNova.toLowerCase(),
          cached.pergunta.toLowerCase()
        );

        const combinedScore = (jaccardScore * 0.4) + (semanticScore * 0.6);

        const passThreshold = combinedScore >= similarityThreshold;
        const symbol = passThreshold ? "✓" : "✗";
        console.log(`  ${symbol} "${cached.pergunta}" - Categoria: ${cached.category || "Nenhuma"}`);
        console.log(`     Scores: Jaccard=${jaccardScore.toFixed(3)} | Semântico=${semanticScore.toFixed(3)} | Combinado=${combinedScore.toFixed(3)}`);
        if (passThreshold) {
          console.log(`     URL: ${cached.audioUrl}`);
        }

        if (combinedScore > bestMatch.score) {
          bestMatch = { 
            question: cached, 
            score: combinedScore 
          };
        }
      } catch (err) {
        console.error(`[MATCHER] Erro ao processar chave ${key}:`, err);
      }
    }

    console.log(`\n[MATCHER] Análise completa: ${analysisCount} pergunta(s) verificada(s)`);

    if (bestMatch.score >= similarityThreshold) {
      console.log(`[MATCHER] ✓ SUCESSO! Match encontrado com score ${bestMatch.score.toFixed(3)}`);
      console.log(`[MATCHER] Pergunta: "${bestMatch.question.pergunta}"`);
      console.log(`[MATCHER] URL: ${bestMatch.question.audioUrl}`);
      console.log(`[MATCHER] ╚═══════════════════════════════════════╝\n`);
      return bestMatch.question;
    }

    console.log(`[MATCHER] ✗ Nenhum match ≥ ${similarityThreshold} encontrado`);
    if (bestMatch.question) {
      console.log(`[MATCHER] Melhor candidato: "${bestMatch.question.pergunta}" (${bestMatch.score.toFixed(3)}) - REJEITADO`);
    }
    console.log(`[MATCHER] ╚═══════════════════════════════════════╝\n`);
    return null;

  } catch (error) {
    console.error("[MATCHER] Erro ao buscar perguntas similares:", error);
    return null;
  }
}

export async function findSimilarQuestionFromDatabase(
  perguntaNova: string,
  voiceId: string,
  similarityThreshold: number = 0.5
): Promise<CachedQuestion | null> {
  try {
    const allCached = await prisma.voiceCache.findMany();
    
    if (!allCached || allCached.length === 0) {
      return null;
    }

    const categoryFromFAQ = findCategoryInFAQ(perguntaNova);

    if (categoryFromFAQ) {
      const categoryMatches = allCached.filter(
        cached => cached.voiceId === voiceId
      );

      if (categoryMatches.length > 0) {
        const chosen = categoryMatches[0];
        return {
          pergunta: chosen.question,
          audioUrl: chosen.audioUrl,
          voiceId: chosen.voiceId,
          keywords: [],
          timestamp: chosen.createdAt.getTime()
        };
      }
    }

    const keywordsNova = extractKeywords(perguntaNova);
    let bestMatch: { question: CachedQuestion; score: number } = { 
      question: null as any, 
      score: 0 
    };

    for (const cached of allCached) {
      if (cached.voiceId !== voiceId) {
        continue;
      }

      const exataMatch = perguntaNova.toLowerCase().trim() === 
                        cached.question.toLowerCase().trim();
      
      if (exataMatch) {
        return {
          pergunta: cached.question,
          audioUrl: cached.audioUrl,
          voiceId: cached.voiceId,
          keywords: [],
          timestamp: cached.createdAt.getTime()
        };
      }

      const keywordsCached = extractKeywords(cached.question);
      const jaccardScore = jaccardSimilarity(keywordsNova, keywordsCached);
      const semanticScore = compareTwoStrings(
        perguntaNova.toLowerCase(),
        cached.question.toLowerCase()
      );

      const combinedScore = (jaccardScore * 0.4) + (semanticScore * 0.6);

      if (combinedScore > bestMatch.score) {
        bestMatch = { 
          question: {
            pergunta: cached.question,
            audioUrl: cached.audioUrl,
            voiceId: cached.voiceId,
            keywords: [],
            timestamp: cached.createdAt.getTime()
          }, 
          score: combinedScore 
        };
      }
    }

    if (bestMatch.score >= similarityThreshold) {
      return bestMatch.question;
    }

    return null;

  } catch (error) {
    console.error("[MATCHER] Erro ao buscar no banco de dados:", error);
    return null;
  }
}

export async function cacheQuestionWithAudio(
  pergunta: string,
  audioUrl: string,
  voiceId: string,
  ttlSeconds: number = 86400 * 30
): Promise<void> {
  try {
    const keywords = Array.from(extractKeywords(pergunta));
    const category = findCategoryInFAQ(pergunta);

    const cachedQuestion: CachedQuestion = {
      pergunta,
      audioUrl,
      voiceId,
      keywords,
      category: category || undefined, 
      timestamp: Date.now()
    };

    const key = `cache:audio:${voiceId}:${Date.now()}`; 
    await redis.set(key, cachedQuestion, { ex: ttlSeconds });

    console.log(`[MATCHER] Pergunta cacheada: "${pergunta}"`);
    if (category) {
      console.log(`[MATCHER] Categoria: ${category}`);
    }
    console.log(`[MATCHER] Chave: ${key}`);
    console.log(`[MATCHER] Audiô URL: ${audioUrl}`);
    console.log(`[MATCHER] Palavras-chave: ${keywords.join(", ")}`);
    console.log(`[MATCHER] Válido por ${ttlSeconds} segundos`);
  } catch (error) {
    console.error("[MATCHER] Erro ao cachear pergunta:", error);
  }
}
