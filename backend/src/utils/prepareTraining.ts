import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function prepareTrainingData() {
  console.log('Iniciando extracao de dados para treinamento...');
  
  try {
    const history = await prisma.chatHistory.findMany({
      where: {
        NOT: { source: 'ERRO_SISTEMA' },
        confidence: { gt: 0.5 }
      },
      select: { question: true, answer: true, source: true }
    });

    const trainingData = history.map(h => ({
      pergunta: h.question.trim(),
      origem: h.source
    }));

    const outputPath = path.join(__dirname, '../../training/training_data/chat_history_export.json');
    
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(trainingData, null, 2));
    console.log('Dados exportados com sucesso para: ' + outputPath);
    console.log('Total de interacoes validas para treino: ' + trainingData.length);

  } catch (error) {
    console.error('Erro na preparacao dos dados: ' + error);
  } finally {
    await prisma.$disconnect();
  }
}

prepareTrainingData();
