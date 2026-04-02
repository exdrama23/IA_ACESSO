import OpenAI from "openai";
import { trackAICall } from "../services/costTracker";
import { redis } from "../cache/redis";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

let activeApiKeyIndex = 0;
let currentClient: OpenAI | null = null;

export function resetOpenRouterState() {
  activeApiKeyIndex = 0;
  currentClient = null;
}

async function getNextOpenRouterClient(): Promise<OpenAI | null> {
  if (activeApiKeyIndex === 0) {
    const envKey = process.env.OPENROUTER_API_KEY;
    if (envKey) {
      console.log('[OPENROUTER] Usando chave do .env (OPENROUTER_API_KEY)');
      currentClient = new OpenAI({
        apiKey: envKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://acessonet.br",
          "X-OpenRouter-Title": "ACESSO.NET - IA Assistant"
        }
      });
      return currentClient;
    }
    activeApiKeyIndex = 1;
  }

  if (activeApiKeyIndex === 1) {
    let primaryKey = await redis.get("secret:key:openrouter_primary");
    if (!primaryKey) {
      primaryKey = await redis.get("secret:key:openrouter");
    }
    if (primaryKey) {
      console.log('[OPENROUTER] Usando chave principal do admin (secret:key:openrouter_primary ou secret:key:openrouter)');
      currentClient = new OpenAI({
        apiKey: primaryKey as string,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://acessonet.br",
          "X-OpenRouter-Title": "ACESSO.NET - IA Assistant"
        }
      });
      return currentClient;
    }
    activeApiKeyIndex = 2;
  }

  if (activeApiKeyIndex === 2) {
    const b1 = await redis.get("secret:key:openrouter_backup_1");
    if (b1) {
      console.log('[OPENROUTER] Usando backup 1 (secret:key:openrouter_backup_1)');
      currentClient = new OpenAI({
        apiKey: b1 as string,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://acessonet.br",
          "X-OpenRouter-Title": "ACESSO.NET - IA Assistant"
        }
      });
      return currentClient;
    }
    activeApiKeyIndex = 3;
  }

  if (activeApiKeyIndex === 3) {
    const b2 = await redis.get("secret:key:openrouter_backup_2");
    if (b2) {
      console.log('[OPENROUTER] Usando backup 2 (secret:key:openrouter_backup_2)');
      currentClient = new OpenAI({
        apiKey: b2 as string,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://acessonet.br",
          "X-OpenRouter-Title": "ACESSO.NET - IA Assistant"
        }
      });
      return currentClient;
    }
  }

  console.error('[OPENROUTER] Nenhuma chave de API disponível!');
  return null;
}

export async function askOpenRouter(question: string, context: string = "", history: any[] = []): Promise<string> {
  const modelsToTry = [
    "qwen/qwen3.6-plus:free",
    "qwen/qwen3.6-plus-preview:free",
    "minimax/minimax-m2.5:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/llama-nemotron-embed-vl-1b-v2:free"
  ];

  for (const model of modelsToTry) {
    try {
      let openrouter = currentClient;
      
      if (!openrouter) {
        openrouter = await getNextOpenRouterClient();
      }
      
      if (!openrouter) {
        console.error(`[OPENROUTER] Nenhuma chave disponível. Tentando reinicializar...`);
        resetOpenRouterState();
        openrouter = await getNextOpenRouterClient();
      }
      
      if (!openrouter) {
        throw new Error("Cota de todas as chaves da OpenRouter esgotada.");
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

      console.log(`[OPENROUTER] Tentando modelo: ${model}`);

      const response = await openrouter.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 150,
      });

      const text = response.choices[0].message.content?.trim() || "";
      const estimatedTokens = response.usage?.total_tokens || Math.ceil((question.length + text.length) / 4);
      
      console.log(`[OPENROUTER] Sucesso com modelo: ${model}`);
      await trackAICall('openrouter', { tokens: estimatedTokens, type: 'chat_generation' });

      return text;
    } catch (error: any) {
      const statusCode = error.status;
      console.warn(`[OPENROUTER]  Erro com ${model} (Status: ${statusCode}). Tentando próximo modelo...`);

      if (statusCode === 401) {
        console.log(`[OPENROUTER] Erro 401: Resetando cliente para tentar próxima chave...`);
        activeApiKeyIndex++;
        currentClient = null;
        continue;
      }

      if (statusCode === 429) {
        console.log(`[OPENROUTER] Erro 429: Quota excedida. Tentando próximo modelo com mesma chave...`);
        continue;
      }

      if (error.error?.message) {
        console.error(`[OPENROUTER] Detalhes do erro: ${error.error.message}`);
      }
    }
  }

  console.error('[OPENROUTER] FALHA TOTAL: Nenhum modelo disponível funcionou');
  throw new Error("Todos os modelos OpenRouter falharam. Tente novamente em instantes.");
}
