import stringSimilarity from "string-similarity";
import { faq, FAQItem } from "../data/faq";

// Mantemos a interface para não quebrar o controlador
export interface SearchResult {
  item: FAQItem;
  score: number;
}

// Esta função agora é síncrona e local e lida com frases contextualizadas
export async function searchFAQ(query: string, topK: number = 3): Promise<SearchResult[]> {
  const flattenedFAQ = Object.values(faq).flat();
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);

  const results: SearchResult[] = flattenedFAQ.map(item => {
    // 1. Similaridade de String Clássica (Dice's Coefficient)
    const scores = item.questions.map(q => 
      stringSimilarity.compareTwoStrings(queryLower, q.toLowerCase().trim())
    );
    
    let maxScore = Math.max(...scores);

    // 2. Bônus por Palavras-Chave (Aumenta a precisão em frases longas)
    // Se a frase do usuário contiver palavras-chave importantes, aumentamos o score
    let keywordBonus = 0;
    const itemKeywords = item.keywords.map(k => k.toLowerCase());
    
    itemKeywords.forEach(kw => {
      if (queryLower.includes(kw)) {
        keywordBonus += 0.05; // 5% de bônus por palavra-chave encontrada
      }
    });

    // 3. Verificação de Correspondência de Palavras (Overlap)
    // Ajuda em frases como "Queria saber o valor da internet" vs "Qual o valor da internet"
    let wordMatchCount = 0;
    itemKeywords.forEach(kw => {
      if (queryWords.includes(kw)) wordMatchCount++;
    });
    const overlapScore = wordMatchCount / Math.max(queryWords.length, 1);

    // Score final unificado (máximo de 1.0)
    const finalScore = Math.min(maxScore + keywordBonus + (overlapScore * 0.2), 1.0);

    return { item, score: finalScore };
  });

  // Ordena pelos melhores resultados
  results.sort((a, b) => b.score - a.score);

  if (results.length > 0) {
    console.log(`[BUSCA ROBUSTA] Query: "${query}" | Top Match: "${results[0].item.questions[0]}" | Score Final: ${results[0].score.toFixed(4)}`);
  }

  return results.slice(0, topK);
}

// Função dummy para manter compatibilidade com o app.ts
export async function initFAQEmbeddings() {
  console.log("Busca local ativada: Embeddings desativados para economizar requisições.");
}

// Função dummy para manter compatibilidade
export async function getEmbedding(text: string): Promise<number[]> {
  return [];
}
