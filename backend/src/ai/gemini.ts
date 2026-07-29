import { GoogleGenerativeAI } from "@google/generative-ai";
import { trackAICall } from "../services/costTracker";
import { client } from "../cache/redis";
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
    if (envKey) {
      console.log('[GEMINI] Usando chave do .env (GEMINI_API_KEY)');
      return envKey;
    }
    activeApiKeyIndex = 1; 
  }

  if (activeApiKeyIndex === 1) {
    let primaryKey = await client.get("secret:key:gemini_primary");
    if (!primaryKey) {
      primaryKey = await client.get("secret:key:gemini");
    }
    if (primaryKey) {
      console.log('[GEMINI] Usando chave principal do admin (secret:key:gemini_primary ou secret:key:gemini)');
      return primaryKey as string;
    }
    activeApiKeyIndex = 2; 
  }

  if (activeApiKeyIndex === 2) {
    const b1 = await client.get("secret:key:gemini_backup_1");
    if (b1) {
      console.log('[GEMINI] Usando backup 1 (secret:key:gemini_backup_1)');
      return b1 as string;
    }
    activeApiKeyIndex = 3; 
  }

  if (activeApiKeyIndex === 3) {
    const b2 = await client.get("secret:key:gemini_backup_2");
    if (b2) {
      console.log('[GEMINI] Usando backup 2 (secret:key:gemini_backup_2)');
      return b2 as string;
    }
  }

  console.error('[GEMINI] Nenhuma chave de API disponível!');
  return null;
}

export async function resolveWorkingChatModel(): Promise<{ model: string, genAI: GoogleGenerativeAI } | null> {
  if (activeChatModelName && currentGenAI) {
    return { model: activeChatModelName, genAI: currentGenAI };
  }

  while (activeApiKeyIndex < 4) {
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
  
  const prompt = `Você é o Assistente Virtual oficial da LPG – Link Petróleo e Gás. Sua missão é fornecer informações EXATAS baseadas na nossa base de conhecimento.

SOBRE A LPG:
A LPG é uma plataforma inteligente que conecta profissionais, empresas prestadoras de serviços e grandes contratantes do setor de petróleo e gás. Usamos IA para fazer matching entre candidatos qualificados e vagas do setor.

DIRETRIZES DE PENSAMENTO:
1. Analise a pergunta do cliente.
2. Se perguntarem "o que é LPG", explique que é a Link Petróleo e Gás, uma plataforma de conexão profissional para o setor de óleo e gás.
3. Verifique se a resposta exata está na "Base de Conhecimento" abaixo.
4. Se a informação não estiver disponível, diga que não tem essa informação específica.

Base de Conhecimento:
${context ? context : "Nenhuma informação específica encontrada."}

Histórico da Conversa:
${historyText}

Pergunta do Cliente: ${question}

REGRAS DE RESPOSTA:
- Responda APENAS em português.
- Responda em no máximo 2 frases curtas e diretas.
- Use tom amigável, mas profissional.
- PROIBIDO usar Markdown (negrito, itálico, listas, asteriscos), pois sua resposta será convertida em áudio.
- NUNCA invente informações que não estejam na base de conhecimento.`;

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
