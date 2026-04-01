import OpenAI from "openai";
import { trackAICall } from "../services/costTracker";
import { redis } from "../cache/redis";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

let activeApiKeyIndex = 0;
let currentClient: OpenAI | null = null;

export function resetOpenAIState() {
  activeApiKeyIndex = 0;
  currentClient = null;
}

async function getNextOpenAIClient(): Promise<OpenAI | null> {
  if (activeApiKeyIndex === 0) {
    const customKey = await redis.get("secret:key:openai");
    const apiKey = customKey || process.env.OPENAI_API_KEY;
    if (apiKey) {
      currentClient = new OpenAI({ apiKey: apiKey as string });
      return currentClient;
    }
    activeApiKeyIndex = 1;
  }

  if (activeApiKeyIndex === 1) {
    const b1 = await redis.get("secret:key:openai_backup_1");
    if (b1) {
      currentClient = new OpenAI({ apiKey: b1 as string });
      return currentClient;
    }
    activeApiKeyIndex = 2;
  }

  if (activeApiKeyIndex === 2) {
    const b2 = await redis.get("secret:key:openai_backup_2");
    if (b2) {
      currentClient = new OpenAI({ apiKey: b2 as string });
      return currentClient;
    }
  }

  return null;
}

export async function askOpenAI(question: string, context: string = "", history: any[] = []): Promise<string> {
  try {
    const openai = currentClient || await getNextOpenAIClient();
    
    if (!openai) {
      throw new Error("Cota de todas as chaves da OpenAI esgotada.");
    }

    const messages: any[] = [
      {
        role: "system",
        content: `Você é a voz oficial da ACESSO.NET. Responda de forma rápida e amigável.
Base de Conhecimento (FAQ):
${context ? context : "Nenhuma informação específica encontrada."}
REGRAS:
1. Máximo 2 frases.
2. Linguagem natural e direta.
3. Se a informação estiver no FAQ, use-a.
4. NUNCA use Markdown (como * ou **), pois o texto será lido por voz.`
      }
    ];

    history.forEach(msg => {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      });
    });

    messages.push({ role: "user", content: question });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 150,
    });

    const text = response.choices[0].message.content?.trim() || "";
    const estimatedTokens = response.usage?.total_tokens || Math.ceil((question.length + text.length) / 4);
    await trackAICall('openai', { tokens: estimatedTokens, type: 'chat_generation' });

    return text;
  } catch (error: any) {
    if (error.status === 429 || error.status === 401) {
      activeApiKeyIndex++;
      currentClient = null;
      if (activeApiKeyIndex < 3) {
        return askOpenAI(question, context, history);
      }
    }
    
    activeApiKeyIndex = 0;
    currentClient = null;
    throw error;
  }
}
