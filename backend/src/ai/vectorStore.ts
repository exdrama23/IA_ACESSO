import { pipeline } from '@xenova/transformers';
import { prisma } from '../lib/prisma';

let embedder: any = null;

export async function getEmbedding(text: string): Promise<number[]> {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export async function findSimilarQuestions(embedding: number[], threshold = 0.8, limit = 5) {
  const vectorStr = `[${embedding.join(',')}]`;
  
  const results = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, question, answer, confidence, source, "isVerified", "knowledgeVersion",
    (1 - (embedding::vector <=> '${vectorStr}'::vector)) as similarity
    FROM "ChatHistory"
    WHERE embedding IS NOT NULL
    AND "needsRevalidation" = false
    AND (1 - (embedding::vector <=> '${vectorStr}'::vector)) > ${threshold}
    ORDER BY "isVerified" DESC, embedding::vector <=> '${vectorStr}'::vector ASC
    LIMIT ${limit}
  `);
  
  return results;
}

export async function findSimilarVoiceCache(embedding: number[], threshold = 0.95) {
  const vectorStr = `[${embedding.join(',')}]`;
  
  const results = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, question, "audioUrl", 
    (1 - (embedding::vector <=> '${vectorStr}'::vector)) as similarity
    FROM "VoiceCache"
    WHERE embedding IS NOT NULL
    AND (1 - (embedding::vector <=> '${vectorStr}'::vector)) > ${threshold}
    ORDER BY embedding::vector <=> '${vectorStr}'::vector
    LIMIT 1
  `);
  
  return results[0] || null;
}
