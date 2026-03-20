import { Request, Response } from "express";
import { isMalicious } from "../security/filter";
import {
  getCache,
  setCache,
  gerarChave,
  getConversationHistory,
  addConversationHistory,
  THREE_DAYS_SECONDS,
} from "../cache/redis";
import { searchFAQ } from "../ai/embeddings";
import { askGemini, resolveWorkingChatModel } from "../ai/gemini";
import { gerarAudio } from "../ai/tts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    const modelName = await resolveWorkingChatModel();
    if (!modelName) return "";

    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent([
      {
        inlineData: {
          data: audioBuffer.toString("base64"),
          mimeType: mimeType
        }
      },
      { text: "Transcreva exatamente o que foi dito neste áudio em português. Retorne apenas o texto transcrito, sem comentários." },
    ]);
    return result.response.text().trim();
  } catch (error) {
    console.error("Erro STT Gemini:", error);
    return "";
  }
}

export async function chat(req: Request, res: Response) {
  try {
    let question = req.body.text;
    const audioFile = req.file;
    const sessionId = req.headers["x-session-id"] as string || "default_session"; 

    if (!question && audioFile) {
      console.log("Transcrevendo áudio via Gemini (Fallback)...");
      question = await transcribeAudio(audioFile.buffer, audioFile.mimetype);
    }

    if (!question) {
      console.log("Nenhuma pergunta detectada (vazio).");
      return res.json({ text: "Não consegui entender. Pode repetir?", audioUrl: "" });
    }

    console.log(`[SESSÃO: ${sessionId}] Pergunta a processar:`, question);

    if (isMalicious(question)) {
      return res.json({ text: "Comando bloqueado por segurança.", audioUrl: "" });
    }

    const topMatches = await searchFAQ(question, 3);
    let respostaText = "";
    let contextText = "";
    let source = "IA_SEMANTICA";

    if (topMatches.length > 0 && topMatches[0].score > 0.4) {
      console.log(`[BUSCA LOCAL] Top Match Score: ${topMatches[0].score.toFixed(4)} para: "${topMatches[0].item.questions[0]}"`);

      if (topMatches[0].score > 0.6) {
        console.log(`[FAQ] Resposta direta encontrada (Confiança: ${topMatches[0].score.toFixed(4)})`);
        respostaText = topMatches[0].item.answer;
        source = "FAQ_DIRETO";
      } else {
        console.log(`[FAQ] Confiança insuficiente para resposta direta (${topMatches[0].score.toFixed(4)}), usando como contexto.`);
        contextText = topMatches
          .filter(match => match.score > 0.4)
          .map(match => match.item.answer)
          .join(" ");
      }
    }

    if (!respostaText) {
      const textCacheKey = gerarChave(question, "text");
      const cachedResponse = await getCache(textCacheKey) as string;

      if (cachedResponse) {
        console.log("[CACHE] Resposta de texto recuperada do Redis");
        respostaText = cachedResponse;
        source = "CACHE_REDIS";
      }
    }

    if (!respostaText) {
      try {
        console.log("[GEMINI] Consultando API do Gemini...");
        const history = await getConversationHistory(sessionId);
        respostaText = await askGemini(question, contextText, history);

        const textCacheKey = gerarChave(question, "text");
        await setCache(textCacheKey, respostaText, THREE_DAYS_SECONDS);
        source = "IA_GEMINI";
      } catch (geminiError) {
        console.error("FALHA TOTAL NO GEMINI. Ativando Independência Total (Melhor Chute do FAQ)...");
        if (topMatches.length > 0) {
          console.log(`[FALLBACK FAQ] Usando o melhor resultado encontrado localmente (Score: ${topMatches[0].score.toFixed(4)})`);
          respostaText = topMatches[0].item.answer;
          source = "FALLBACK_FAQ_LOCAL";
        } else {
          respostaText = "Desculpe, estou com uma instabilidade técnica. Pode repetir a pergunta em instantes?";
          source = "ERRO_SISTEMA";
        }
      }
    }

    await addConversationHistory(sessionId, question, respostaText);

    const audioCacheKey = gerarChave(respostaText, "audio");
    let audioUrl = await getCache(audioCacheKey) as string;

    if (!audioUrl) {
      audioUrl = await gerarAudio(respostaText);
      if (audioUrl) {
        await setCache(audioCacheKey, audioUrl, THREE_DAYS_SECONDS);
      }
    } else {
      console.log("[CACHE] Áudio recuperado do cache");
    }

    res.json({ text: respostaText, audioUrl, source });

  } catch (error) {
    console.error("Erro Pipeline:", error);
    res.status(500).json({ error: "Erro interno" });
  }
}
