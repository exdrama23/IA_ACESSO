import { faq, FAQItem } from "../data/faq";
import { getEmbedding } from "./vectorStore";

export interface SearchResult {
  item: FAQItem;
  score: number;
}

// Nota: Para buscas em tempo real no FAQ (que é um arquivo estático), 
// podemos continuar usando busca local ou migrar o FAQ para o banco.
// Por enquanto, vamos atualizar o getEmbedding.

export async function initFAQEmbeddings() {
  console.log("[EMBEDDINGS] Iniciando motor de embeddings locais...");
}

export { getEmbedding };
