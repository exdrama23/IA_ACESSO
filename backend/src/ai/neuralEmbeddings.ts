import fs from "fs/promises";
import path from "path";
import { faq, FAQItem } from "../data/faq";

interface FAQEmbedding {
  pergunta: string;
  categoria: string;
  embedding: number[];
  linkDirecionamento: string;
}

interface FAQMatch {
  categoria: string;
  perguntaSimilar: string;
  score: number;
  linkDirecionamento: string;
}

export class NeuralCategoryDetector {
  private extractor: any;
  private faqEmbeddings: FAQEmbedding[] = [];
  private embeddingCache: Map<string, number[]> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("[NEURAL] Inicializando Sentence-Transformers...");
    try {
      process.env.XENOVA_ALLOW_LOCAL_MODELS = "true";

      const transformers = await (eval('import("@xenova/transformers")') as Promise<typeof import("@xenova/transformers")>);
      const { pipeline, env } = transformers;

      env.allowLocalModels = true;
      env.useBrowserCache = false;

      if (env.backends && (env.backends as any).vision) {
        (env.backends as any).vision = false;
      }

      this.extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

      const cached = await this.loadEmbeddingsCache();
      if (cached) {
        this.faqEmbeddings = cached;
        console.log(`[NEURAL] ✓ ${cached.length} embeddings carregados do cache`);
      } else {
        await this.preComputeFAQEmbeddings();
        await this.saveEmbeddingsCache();
      }

      this.initialized = true;
    } catch (error) {
      console.error("[NEURAL] Erro na inicialização:", error);
      throw error;
    }
  }

  private normalizeText(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async preComputeFAQEmbeddings(): Promise<void> {
    console.log("[NEURAL] Pre-computando embeddings para o FAQ...");

    let totalEmbeddings = 0;

    for (const categoryKey in faq) {
      const items = faq[categoryKey];
      
      for (const item of items) {
        for (const pergunta of item.questions) {
          const normalized = this.normalizeText(pergunta);
          const output = await this.extractor(normalized, {
            pooling: "mean",
            normalize: true
          });

          this.faqEmbeddings.push({
            pergunta: pergunta,
            categoria: item.category,
            embedding: Array.from(output.data),
            linkDirecionamento: item.linkDirecionamento || "https://acesso.net"
          });

          totalEmbeddings++;
        }
      }
    }

    console.log(`[NEURAL] ✓ Pre-computação completa (${totalEmbeddings} embeddings gerados)`);
  }

  async findCategoryBySimilarity(
    perguntaUsuario: string,
    threshold: number = 0.85
  ): Promise<FAQMatch | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const normalized = this.normalizeText(perguntaUsuario);
    
    let userEmbedding: number[];
    if (this.embeddingCache.has(normalized)) {
      userEmbedding = this.embeddingCache.get(normalized)!;
    } else {
      const output = await this.extractor(normalized, {
        pooling: "mean",
        normalize: true
      });
      userEmbedding = Array.from(output.data);
      this.embeddingCache.set(normalized, userEmbedding);
    }

    let bestMatch: FAQMatch | null = null;
    let bestScore = 0;

    for (const faqItem of this.faqEmbeddings) {
      const score = this.cosineSimilarity(userEmbedding, faqItem.embedding);

      if (score > threshold && score > bestScore) {
        bestMatch = {
          categoria: faqItem.categoria,
          perguntaSimilar: faqItem.pergunta,
          score,
          linkDirecionamento: faqItem.linkDirecionamento
        };
        bestScore = score;
      }
    }

    if (bestMatch) {
      console.log(`[NEURAL] Match encontrado: ${bestMatch.categoria} (Score: ${bestMatch.score.toFixed(3)})`);
    }

    return bestMatch;
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
    }
    return dotProduct;
  }

  private async saveEmbeddingsCache(): Promise<void> {
    const cacheDir = path.join(process.cwd(), "cache");
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      const cachePath = path.join(cacheDir, "faq_embeddings.json");
      await fs.writeFile(cachePath, JSON.stringify(this.faqEmbeddings));
      console.log(`[NEURAL] Cache salvo em: ${cachePath}`);
    } catch (error) {
      console.error("[NEURAL] Erro ao salvar cache:", error);
    }
  }

  private async loadEmbeddingsCache(): Promise<FAQEmbedding[] | null> {
    try {
      const cachePath = path.join(process.cwd(), "cache", "faq_embeddings.json");
      const data = await fs.readFile(cachePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

export const neuralDetector = new NeuralCategoryDetector();
