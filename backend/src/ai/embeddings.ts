import stringSimilarity from "string-similarity";
import { faq, FAQItem } from "../data/faq";

export interface SearchResult {
  item: FAQItem;
  score: number;
}

export async function searchFAQ(query: string, topK: number = 3): Promise<SearchResult[]> {
  const flattenedFAQ = Object.values(faq).flat();
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);

  const results: SearchResult[] = flattenedFAQ.map(item => {
    
    const scores = item.questions.map(q => 
      stringSimilarity.compareTwoStrings(queryLower, q.toLowerCase().trim())
    );
    
    let maxScore = Math.max(...scores);

    let keywordBonus = 0;
    const itemKeywords = item.keywords.map(k => k.toLowerCase());
    
    itemKeywords.forEach(kw => {
      if (queryLower.includes(kw)) {
        keywordBonus += 0.05; 
      }
    });

    let wordMatchCount = 0;
    itemKeywords.forEach(kw => {
      if (queryWords.includes(kw)) wordMatchCount++;
    });
    const overlapScore = wordMatchCount / Math.max(queryWords.length, 1);

    const finalScore = Math.min(maxScore + keywordBonus + (overlapScore * 0.2), 1.0);

    return { item, score: finalScore };
  });

  results.sort((a, b) => b.score - a.score);

  if (results.length > 0) {
    console.log(`[BUSCA ROBUSTA] Query: "${query}" | Top Match: "${results[0].item.questions[0]}" | Score Final: ${results[0].score.toFixed(4)}`);
  }

  return results.slice(0, topK);
}

export async function initFAQEmbeddings() {
  console.log("Busca local ativada: Embeddings desativados para economizar requisições.");
}

export async function getEmbedding(text: string): Promise<number[]> {
  return [];
}
