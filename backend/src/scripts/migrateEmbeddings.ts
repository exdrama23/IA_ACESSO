import { prisma } from '../lib/prisma';
import { getEmbedding } from '../ai/vectorStore';

async function migrate() {
  console.log('🚀 Iniciando migração de embeddings para PGVECTOR...');

  // Usar query bruta para buscar registros sem embedding, já que o Prisma não tipa campos Unsupported
  const historyWithNoEmbedding = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, question FROM "ChatHistory" WHERE embedding IS NULL
  `);

  console.log(`Found ${historyWithNoEmbedding.length} records to re-index.`);

  for (const record of historyWithNoEmbedding) {
    try {
      const vector = await getEmbedding(record.question);
      const vectorStr = `[${vector.join(',')}]`;
      
      await prisma.$executeRawUnsafe(`
        UPDATE "ChatHistory" 
        SET embedding = '${vectorStr}'::vector
        WHERE id = $1
      `, record.id);
      
      console.log(`✅ Indexed: ${record.question.substring(0, 30)}...`);
    } catch (err) {
      console.error(`❌ Error indexing record ${record.id}:`, err);
    }
  }

  // Opcional: Indexar o FAQ estático no banco para busca vetorial
  const { faq } = await import('../data/faq');
  console.log('📦 Indexando FAQ no ChatHistory para busca semântica...');
  
  for (const [category, items] of Object.entries(faq)) {
    for (const item of items as any[]) {
      for (const q of item.questions) {
        const vector = await getEmbedding(q);
        const vectorStr = `[${vector.join(',')}]`;
        
        await prisma.$executeRawUnsafe(`
          INSERT INTO "ChatHistory" (id, question, answer, source, confidence, embedding, "createdAt", "updatedAt", "sessionId")
          VALUES ($1, $2, $3, $4, $5, '${vectorStr}'::vector, NOW(), NOW(), 'system_faq')
          ON CONFLICT DO NOTHING
        `, `faq_${Math.random().toString(36).substr(2, 9)}`, q, item.answer, 'FAQ_IMPORT', 1.0);
      }
    }
  }

  console.log('✨ Migração concluída!');
}

migrate().catch(console.error);
