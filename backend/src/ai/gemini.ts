import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const chatModelCandidates = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

let activeChatModelName: string | null = null;

async function resolveWorkingChatModel(): Promise<string | null> {
  if (activeChatModelName) return activeChatModelName;

  for (const modelName of chatModelCandidates) {
    try {
      console.log(`[GEMINI] Testando modelo: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        generationConfig: { maxOutputTokens: 5 }
      });
      
      if (result.response) {
        activeChatModelName = modelName;
        console.log(`[GEMINI] Modelo ativo selecionado: ${modelName}`);
        return activeChatModelName;
      }
    } catch (error: any) {
      console.warn(`[GEMINI] Modelo ${modelName} indisponível ou quota excedida: ${error.message}`);
    }
  }

  console.error("[GEMINI] ERRO CRÍTICO: Nenhum modelo de chat do Gemini funcionou (Cota esgotada em todos).");
  return null;
}

import { ChatMessage } from "../cache/redis";

export async function askGemini(question: string, context: string = "", history: ChatMessage[] = []): Promise<string> {
  const modelName = await resolveWorkingChatModel();
  if (!modelName) {
    throw new Error("Cota do Gemini esgotada. Usando base local.");
  }

  const model = genAI.getGenerativeModel({ model: modelName });
  const historyText = history.map(msg => `${msg.role === "user" ? "Cliente" : "Assistente"}: ${msg.content}`).join("\n");
  
  const prompt = `
Você é a voz oficial da ACESSO.NET. Responda de forma rápida e amigável.

Base de Conhecimento (FAQ):
${context ? context : "Nenhuma informação específica encontrada."}

Histórico:
${historyText}

Pergunta: ${question}

REGRAS:
1. Máximo 2 frases.
2. Linguagem natural e direta.
3. Se a informação estiver no FAQ, use-a.
4. NUNCA use Markdown (como * ou **), pois o texto será lido por voz.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    if (error.status === 429) {
      console.error(`[GEMINI] Cota excedida no modelo ${modelName}. Resetando para trocar de modelo.`);
      activeChatModelName = null; 
    }
    throw error;
  }
}

export { resolveWorkingChatModel };
