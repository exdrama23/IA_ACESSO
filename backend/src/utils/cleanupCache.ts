import { prisma } from '../lib/prisma';

const TERMOS_PARA_REMOVER = [
  'oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'e ai', 
  'tudo bem', 'como vai', 'teste', 'testando', 'ok', 'ta', 'sim', 'nao'
];

async function cleanVoiceCache() {
  console.log('🚀 Iniciando limpeza profunda da VoiceCache...');
  
  try {
    const allCache = await prisma.voiceCache.findMany({
      select: { id: true, question: true }
    });

    const idsToDelete: string[] = [];

    allCache.forEach(c => {
      const q = c.question.toLowerCase().trim();
      // Remover se: menor que 5 chars, não tem espaços, ou está na lista de termos
      if (q.length < 5 || !q.includes(' ') || TERMOS_PARA_REMOVER.includes(q) || q.includes('undefined')) {
        idsToDelete.push(c.id);
      }
    });

    if (idsToDelete.length > 0) {
      const deleted = await prisma.voiceCache.deleteMany({
        where: {
          id: { in: idsToDelete }
        }
      });
      console.log(`✅ Removidas ${deleted.count} entradas de ruído ou saudações.`);
    } else {
      console.log('✨ Nenhuma entrada de ruído encontrada.');
    }

    const finalCount = await prisma.voiceCache.count();
    console.log(`📊 Limpeza concluída. Total de entradas saudáveis no VoiceCache: ${finalCount}`);

  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanVoiceCache();
