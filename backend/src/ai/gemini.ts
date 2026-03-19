import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

import { ChatMessage } from "../cache/redis";

export async function askGemini(question: string, context: string = "", history: ChatMessage[] = []): Promise<string> {
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
    console.error("Erro ao chamar Gemini:", error);
    return "Desculpe, tive um problema ao processar sua pergunta. Pode repetir?";
  }
}
