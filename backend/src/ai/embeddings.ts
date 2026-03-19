import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { faq, FAQItem } from "../data/faq";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

interface FAQEmbedding {
  item: FAQItem;
  vector: number[];
}

let faqEmbeddings: FAQEmbedding[] = [];

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Erro ao gerar embedding:", error);
    return [];
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}


export async function initFAQEmbeddings() {
  if (faqEmbeddings.length > 0) return;

  console.log("Inicializando base de embeddings do FAQ...");
  const flattenedFAQ = Object.values(faq).flat();
  
  for (const item of flattenedFAQ) {
    const textToEmbed = `Categoria: ${item.category}. Perguntas: ${item.questions.join(", ")}. Palavras-chave: ${item.keywords.join(", ")}. Resposta: ${item.answer}`;
    const vector = await getEmbedding(textToEmbed);
    if (vector.length > 0) {
      faqEmbeddings.push({ item, vector });
    }
  }
  console.log(`Embeddings do FAQ carregados: ${faqEmbeddings.length} itens.`);
}

export interface SearchResult {
  item: FAQItem;
  score: number;
}

export async function searchFAQ(query: string, topK: number = 3): Promise<SearchResult[]> {
  if (faqEmbeddings.length === 0) {
    await initFAQEmbeddings();
  }

  const queryVector = await getEmbedding(query);
  if (queryVector.length === 0) return [];

  const results: SearchResult[] = faqEmbeddings.map(doc => ({
    item: doc.item,
    score: cosineSimilarity(queryVector, doc.vector)
  }));

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, topK);
}
