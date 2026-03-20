import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const THREE_DAYS_SECONDS = 60 * 60 * 24 * 3;


export function gerarChave(pergunta: string, tipo: 'text' | 'audio' = 'text'): string {
  const crypto = require("crypto");
  
  let normalized = pergunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^\w\s]/gi, "") 
    .trim();

  const stopWords = ["o", "a", "os", "as", "do", "da", "dos", "das", "de", "um", "uma", "qual", "quais", "quanto", "quanta"];

  normalized = normalized.split(" ")
    .filter(word => !stopWords.includes(word))
    .map(word => {
      if (word.length > 3 && word.endsWith("s")) {
        return word.slice(0, -1);
      }
      return word;
    })
    .join(" ");

  const hash = crypto.createHash("md5").update(normalized).digest("hex");
  const key = `cache:${tipo}:${hash}`;
  
  console.log(`DEBUG CACHE: Original: "${pergunta}" | Semântica: "${normalized}" | Chave: ${key}`);
  
  return key;
}

export async function getCache(key: string) {
  try {
    return await redis.get(key);
  } catch (err) {
    console.error("Erro Upstash Get:", err);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = THREE_DAYS_SECONDS) {
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error("Erro Upstash Set:", err);
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
  try {
    const history = await redis.get<ChatMessage[]>(`history:${sessionId}`);
    return history || [];
  } catch (err) {
    console.error("Erro ao obter histórico:", err);
    return [];
  }
}

export async function addConversationHistory(sessionId: string, userMsg: string, aiMsg: string) {
  try {
    let history = await getConversationHistory(sessionId);
    history.push({ role: "user", content: userMsg });
    history.push({ role: "assistant", content: aiMsg });
    
    if (history.length > 120) {
      history = history.slice(-120);
    }
    
    await redis.set(`history:${sessionId}`, history, { ex: THREE_DAYS_SECONDS });
  } catch (err) {
    console.error("Erro ao salvar histórico:", err);
  }
}
