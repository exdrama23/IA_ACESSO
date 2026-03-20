import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const chatModelCandidates = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

let activeChatModelName: string | null = null;

async function resolveWorkingChatModel(): Promise<string | null> {
  if (activeChatModelName) return activeChatModelName;

  for (const modelName of chatModelCandidates) {
    try {
      console.log(`Tentando inicializar modelo de chat: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      await model.generateContent("ping");
      activeChatModelName = modelName;
      console.log(`Modelo de chat ativo e verificado: ${modelName}`);
      return activeChatModelName;
    } catch (error: any) {
      console.warn(`Falha ao carregar modelo ${modelName}: ${error.message}`);
    }
  }

  console.error("ERRO CRÍTICO: Nenhum modelo de chat do Gemini funcionou.");
  return null;
}

import { ChatMessage } from "../cache/redis";

export async function askGemini(question: string, context: string = "", history: ChatMessage[] = []): Promise<string> {
  const modelName = await resolveWorkingChatModel();
  if (!modelName) {
    throw new Error("Nenhum modelo disponível para processar a pergunta.");
  }

  const model = genAI.getGenerativeModel({ model: modelName });
  const historyText = history.map(msg => `${msg.role === "user" ? "Cliente" : "Assistente"}: ${msg.content}`).join("\n");
  
  const prompt = `
Você é a voz oficial da ACESSO.NET em um evento. Sua missão é responder dúvidas do público de forma natural, rápida, empática e muito amigável.
Você não é apenas um robô, você é um atendente prestativo.

Informações Relevantes do Sistema (Base de Conhecimento):
${context ? context : "Nenhuma informação específica encontrada no FAQ para esta pergunta."}

Histórico da Conversa Recente:
${historyText}

Pergunta Atual do Cliente: ${question}

Regras de Resposta para Voz:
1. Respostas curtas (máximo 2 frases).
2. Linguagem extremamente natural e conversacional (ex: "Sim, a gente atende...", "O valor fica em...").
3. Use o contexto fornecido para responder com precisão. Se a resposta estiver no contexto, reescreva-a de forma fluida e direta.
4. Se o usuário fizer uma pergunta complementar (ex: "E o de 300 megas?"), use o histórico para entender o que ele está perguntando e responda com base no contexto.
5. Se não tiver certeza ou se a informação não estiver clara no contexto, responda: "Não tenho certeza sobre isso, mas posso te ajudar melhor se você reformular a pergunta."
6. Nunca use formatação Markdown como asteriscos, negrito ou listas, pois o texto será lido por um sintetizador de voz.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error(`Erro ao chamar Gemini (${modelName}):`, error);
    // Se falhou com o ativo, reseta para tentar o próximo na próxima vez
    activeChatModelName = null;
    throw error;
  }
}

// Exportando para ser usado na transcrição também
export { resolveWorkingChatModel };
