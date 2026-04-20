import { prisma } from '../lib/prisma';
import { client } from '../cache/redis';

async function sanitizeDatabase() {
  console.log('Iniciando saneamento de dados para evitar contaminacao...');
  
  try {
    // 1. Limpar cache de texto no Redis para forçar nova logica neural
    const keys = await client.keys('cache:text:*');
    if (keys.length > 0) {
      await client.del(...keys);
      console.log('Cache de texto do Redis limpo (' + keys.length + ' chaves).');
    }

    // 2. Marcar historico antigo como nao-treinavel
    // Dados criados antes da unificacao neural podem conter alucinacoes
    const updateHistory = await prisma.chatHistory.updateMany({
      where: {
        createdAt: { lt: new Date() },
        source: { not: 'FAQ_NEURAL_UNIFICADO' }
      },
      data: {
        confidence: 0.0 // Garante que o script de prepareTraining ignore esses dados
      }
    });
    console.log('Historico antigo invalidado para treinamento (' + updateHistory.count + ' registros).');

    console.log('Saneamento concluido com sucesso.');

  } catch (error) {
    console.error('Erro no saneamento: ' + error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

sanitizeDatabase();
