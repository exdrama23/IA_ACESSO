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
import { generateTFIDFVector } from "../ai/semantic";
import { getConfig } from "../config/settings";
import { prisma } from "../lib/prisma";
import { getCachedAudioUrl, cacheAudioUrl, generateResponseHash } from "../utils/audioCache";
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

import { validateChatInput } from "../utils/validators";
import { AppError } from "../middleware/errorHandler";
import { trackAICall } from "../services/costTracker";

export async function chat(req: Request, res: Response, next: any) {
  try {
    console.log('[CHAT] Iniciando processamento...');
    const { text, sessionId: bodySessionId } = req.body;
    const audioFile = req.file;
    const sessionId = (req.headers["x-session-id"] as string) || bodySessionId || "default_session"; 

    console.log('[CHAT] Input:', { text: text?.substring(0, 50), audioFile: !!audioFile, sessionId });
    
    const validationErrors = validateChatInput({ text, audio: audioFile, sessionId });
    if (validationErrors.length > 0) {
      throw new AppError(400, "Dados inválidos", validationErrors);
    }

    let question = text;

    if (!question && audioFile) {
      console.log("Transcrevendo áudio via Gemini (Fallback)...");
      question = await transcribeAudio(audioFile.buffer, audioFile.mimetype);

      await trackAICall('gemini', { tokens: 100, type: 'stt_transcription' });
    }

    if (!question) {
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

    const config = await getConfig();
    console.log(`[AUDIO] Processando cache de áudio...`);

    const responseHash = generateResponseHash(respostaText);
    console.log(`[AUDIO] Hash da resposta: ${responseHash}`);

    let audioUrl = "";
    let confidence = "100%";

    const cachedAudioUrl = await getCachedAudioUrl(responseHash);
    
    if (cachedAudioUrl) {
      console.log(`[AUDIO]  Reutilizando áudio da cache (sem gerar novo)`);
      audioUrl = cachedAudioUrl;
      source = "CACHE_AUDIO_HASH";
    } else {
      console.log(`[AUDIO] Gerando novo áudio com TTS...`);
      const audioUrl_generated = await gerarAudio(respostaText);

      audioUrl = audioUrl_generated;
      
      await cacheAudioUrl(responseHash, audioUrl, config.audio.ttl_seconds);
      console.log(`[AUDIO] Novo áudio gerado, uploadado e cacheado`);
    }

    try {
      await prisma.chatHistory.create({
        data: {
          userId: (req as any).user?.id || null,
          sessionId,
          question,
          answer: respostaText,
          source,
          confidence: parseFloat(confidence),
          audioUrl,
          embedding: JSON.stringify(generateTFIDFVector(question).data)
        }
      });
    } catch (dbErr) {
      console.error('[PRISMA] Erro ao salvar histórico:', dbErr);
    }

    res.json({
      text: respostaText,
      audioUrl: audioUrl,
      source,
      confidence
    });

  } catch (error) {
    console.error("[CHAT] ERRO COMPLETO:", {
      type: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    
    const err = error as Error;
    console.error("Stack completo:", err.stack);
    
    res.status(500).json({ 
      error: "Erro interno",
      details: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        type: err.constructor.name
      } : undefined
    });
  }
}
