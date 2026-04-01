import { GoogleGenerativeAI } from "@google/generative-ai";
import { trackAICall } from "../services/costTracker";
import { redis } from "../cache/redis";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const chatModelCandidates = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

let activeApiKeyIndex = 0; 
let activeChatModelName: string | null = null;
let currentGenAI: GoogleGenerativeAI | null = null;

export function resetGeminiState() {
  activeApiKeyIndex = 0;
  activeChatModelName = null;
  currentGenAI = null;
}

async function getNextApiKey(): Promise<string | null> {
  if (activeApiKeyIndex === 0) {
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey) return envKey;
    activeApiKeyIndex = 1; 
  }

  if (activeApiKeyIndex === 1) {
    const b1 = await redis.get("secret:key:gemini_backup_1");
    if (b1) return b1 as string;
    activeApiKeyIndex = 2; 
  }

  if (activeApiKeyIndex === 2) {
    const b2 = await redis.get("secret:key:gemini_backup_2");
    if (b2) return b2 as string;
  }

  return null;
}

export async function resolveWorkingChatModel(): Promise<{ model: string, genAI: GoogleGenerativeAI } | null> {
  if (activeChatModelName && currentGenAI) {
    return { model: activeChatModelName, genAI: currentGenAI };
  }

  while (activeApiKeyIndex < 3) {
    const apiKey = await getNextApiKey();
    
    if (!apiKey) {
      activeApiKeyIndex++;
      continue;
    }

    const tempGenAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of chatModelCandidates) {
      try {
        const model = tempGenAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
          generationConfig: { maxOutputTokens: 5 }
        });
        
        if (result.response) {
          activeChatModelName = modelName;
          currentGenAI = tempGenAI;
          return { model: activeChatModelName, genAI: currentGenAI };
        }
      } catch (error: any) {
      }
    }

    activeApiKeyIndex++;
  }

  activeApiKeyIndex = 0; 
  activeChatModelName = null;
  currentGenAI = null;
  return null;
}

import { ChatMessage } from "../cache/redis";

export async function askGemini(question: string, context: string = "", history: ChatMessage[] = []): Promise<string> {
  const working = await resolveWorkingChatModel();
  
  if (!working) {
    throw new Error("Cota de todas as chaves do Gemini esgotada.");
  }

  const { model: modelName, genAI } = working;
  const model = genAI.getGenerativeModel({ model: modelName });
  const historyText = history.map(msg => `${msg.role === "user" ? "Cliente" : "Assistente"}: ${msg.content}`).join("\n");
  
  const prompt = `Você é a voz oficial da ACESSO.NET. Responda de forma rápida e amigável.
Base de Conhecimento (FAQ):
${context ? context : "Nenhuma informação específica encontrada."}
Histórico:
${historyText}
Pergunta: ${question}
REGRAS:
1. Máximo 2 frases.
2. Linguagem natural e direta.
3. Se a informação estiver no FAQ, use-a.
4. NUNCA use Markdown (como * ou **), pois o texto será lido por voz.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const estimatedTokens = Math.ceil((prompt.length + text.length) / 4);
    await trackAICall('gemini', { tokens: estimatedTokens, type: 'chat_generation' });

    return text;
  } catch (error: any) {
    if (error.status === 429) {
      activeChatModelName = null;
      currentGenAI = null;
      return askGemini(question, context, history);
    }
    throw error;
  }
}
