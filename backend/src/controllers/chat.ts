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
import { askOpenAI } from "../ai/openai";
import { askOpenRouter } from "../ai/openrouter";
import { gerarAudio } from "../ai/tts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateTFIDFVector } from "../ai/semantic";
import { getConfig, AIProvider, saveConfig } from "../config/settings";
import { createSystemNotification } from "../utils/notifications";
import { findSimilarQuestionFromDatabase, extractKeywords } from "../utils/questionMatcher";

async function askAI(provider: AIProvider, question: string, context: string, history: any[]): Promise<string> {
  if (provider === 'gemini') {
    return await askGemini(question, context, history);
  } else if (provider === 'openai') {
    return await askOpenAI(question, context, history);
  } else if (provider === 'openrouter') {
    return await askOpenRouter(question, context, history);
  } else {
    throw new Error(`Provider desconhecido: ${provider}`);
  }
}
import { prisma } from "../lib/prisma";
import { getCachedAudioByQuestion, cacheAudioByQuestion } from "../utils/audioCache";
import { findSimilarCachedQuestion, cacheQuestionWithAudio } from "../utils/questionMatcher";
import { neuralDetector } from "../ai/neuralEmbeddings";
import { neuralMetrics } from "../utils/neuralMetrics";
import { formatarRespostaComDirecionamento } from "../utils/responseFormatter";
import { faq } from "../data/faq";
import dotenv from "dotenv";
import path from "path";
import { performance } from "perf_hooks";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    const resolved = await resolveWorkingChatModel();
    if (!resolved) return "";

    const model = resolved.genAI.getGenerativeModel({ model: resolved.model });
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
  const chatStartTime = performance.now();
  let times: any = {};
  
  try {
    const { text, sessionId: bodySessionId } = req.body;
    const audioFile = req.file;
    
    // Robustez no sessionId: Header tem precedência absoluta
    const sessionId = (req.headers["x-session-id"] as string) || bodySessionId || "default_session"; 

    console.log(`[CHAT][${sessionId}] 🚀 Iniciando processamento...`);
    console.log(`[CHAT][${sessionId}] Input:`, { text: text?.substring(0, 50), audioFile: !!audioFile });
    
    const validationErrors = validateChatInput({ text, audio: audioFile, sessionId });
    if (validationErrors.length > 0) {
      throw new AppError(400, "Dados inválidos", validationErrors);
    }

    let question = text;

    if (!question && audioFile) {
      const sttStartTime = performance.now();
      console.log(`[CHAT][${sessionId}] Transcrevendo áudio via Gemini...`);
      question = await transcribeAudio(audioFile.buffer, audioFile.mimetype);
      times.stt = (performance.now() - sttStartTime).toFixed(0);

      await trackAICall('gemini', { tokens: 100, type: 'stt_transcription' });
    }

    if (!question) {
      return res.json({ text: "Não consegui entender. Pode repetir?", audioUrl: "" });
    }

    // ✅ DETECTAR COMANDO DE REPETIÇÃO
    const isRepeatCommand = (q: string): boolean => {
      const patterns = ["pode repetir", "repete", "repita", "repete aí", "de novo", "fala de novo", "outra vez", "novamente"];
      const lowerQ = q.toLowerCase().trim();
      return patterns.some(p => lowerQ.includes(p));
    };

    if (isRepeatCommand(question)) {
      const repeatStartTime = performance.now();
      const lastResponseKey = `session:${sessionId}:last_response`;
      console.log(`[REPETIR][${sessionId}] Buscando última resposta no cache...`);
      
      const cachedLastResponse = await getCache(lastResponseKey);

      if (cachedLastResponse) {
        try {
          const lastResponse = typeof cachedLastResponse === 'string' ? JSON.parse(cachedLastResponse) : cachedLastResponse;
          console.log(`[REPETIR][${sessionId}] ✓ Sucesso. Latência: ${(performance.now() - repeatStartTime).toFixed(0)}ms`);
          
          return res.json({
            text: lastResponse.text,
            audioUrl: lastResponse.audioUrl || "",
            source: lastResponse.source,
            confidence: 100,
            isRepeat: true
          });
        } catch (e) {
          console.error(`[REPETIR][${sessionId}] Erro ao processar cache:`, e);
        }
      } else {
        console.log(`[REPETIR][${sessionId}] ✗ Nenhuma resposta encontrada para esta sessão.`);
        return res.json({
          text: "Não há resposta anterior para repetir nesta sessão. Como posso te ajudar?",
          audioUrl: ""
        });
      }
    }

    if (isMalicious(question)) {
      console.log(`[CHAT][${sessionId}] 🛡️ Comando bloqueado por segurança.`);
      return res.json({ text: "Comando bloqueado por segurança.", audioUrl: "" });
    }

    let respostaText = "";
    let source = "IA_SEMANTICA";
    let matchScore = 0;

    // 1. BUSCA NEURAL UNIFICADA
    const neuralStartTime = performance.now();
    const neuralMatch = await neuralDetector.searchInFAQ(question, 0.85);
    times.neuralSearch = (performance.now() - neuralStartTime).toFixed(0);

    if (neuralMatch) {
      neuralMetrics.recordNeuralMatch(neuralMatch.score, parseFloat(times.neuralSearch));
      console.log(`[CHAT][${sessionId}] ✓ Match Neural (FAQ): "${neuralMatch.perguntaSimilar}" (${neuralMatch.score.toFixed(3)})`);
      respostaText = neuralMatch.resposta;
      source = "FAQ_NEURAL_UNIFICADO";
      matchScore = neuralMatch.score;
    }

    // 2. CACHE DE TEXTO (REDIS)
    if (!respostaText) {
      const textCacheKey = gerarChave(question, "text");
      const cachedResponse = await getCache(textCacheKey);
      if (cachedResponse) {
        console.log(`[CHAT][${sessionId}] ✓ Resposta recuperada do Redis`);
        respostaText = typeof cachedResponse === 'string' ? cachedResponse : (cachedResponse as any).text || "";
        source = "CACHE_REDIS";
      }
    }

    // 3. IA GENERATIVA (FALLBACKS)
    if (!respostaText) {
      const aiStartTime = performance.now();
      const config = await getConfig();
      const history = await getConversationHistory(sessionId);
      const topMatches = await neuralDetector.getTopMatches(question, 2);
      const contextText = topMatches.map(m => m.resposta).join("\n");

      const providers = [config.chat.primary, config.chat.fallback, config.chat.tertiary];
      
      for (const provider of providers) {
        try {
          console.log(`[AI][${sessionId}] Consultando ${provider}...`);
          respostaText = await askAI(provider as AIProvider, question, contextText, history);
          source = `IA_${provider.toUpperCase()}`;
          break; // Sucesso
        } catch (err: any) {
          console.error(`[AI][${sessionId}] Falha em ${provider}:`, err.message);
          continue;
        }
      }

      if (!respostaText) {
        respostaText = "Desculpe, estou com uma instabilidade técnica. Pode repetir em instantes?";
        source = "ERRO_SISTEMA";
      }
      times.ai = (performance.now() - aiStartTime).toFixed(0);
    }

    // 4. ÁUDIO (VOICE CACHE / ELEVENLABS)
    const audioStartTime = performance.now();
    const config = await getConfig();
    
    let audioUrl = "";
    const isFAQMatch = source === "FAQ_NEURAL_UNIFICADO";

    // ✅ OTIMIZAÇÃO: Reaproveitamento de áudio para IA se match exato
    // 85% para FAQ (flexível), 98% para IA (rígido/exato)
    const ttsThreshold = isFAQMatch ? 0.85 : 0.98;
    
    audioUrl = await gerarAudio(respostaText, false, ttsThreshold); 
    
    times.audio = (performance.now() - audioStartTime).toFixed(0);

    // 5. RESPOSTA AO USUÁRIO (RÁPIDA)
    const totalLatency = (performance.now() - chatStartTime).toFixed(0);
    console.log(`[CHAT][${sessionId}] Finalizado. Latência Total: ${totalLatency}ms. Times:`, times);

    res.json({
      text: respostaText,
      audioUrl: audioUrl,
      source,
      confidence: "100%",
      latency: `${totalLatency}ms`
    });

    // 6. TAREFAS DE BACKGROUND (NÃO BLOQUEANTES)
    (async () => {
      try {
        // Histórico de Conversa (Redis)
        addConversationHistory(sessionId, question, respostaText).catch(e => {});

        // Cache de Texto se for novo
        if (source.startsWith("IA_")) {
          const textCacheKey = gerarChave(question, "text");
          setCache(textCacheKey, respostaText, THREE_DAYS_SECONDS).catch(e => {});
        }

        // Última resposta para o comando "repita"
        const lastResponseKey = `session:${sessionId}:last_response`;
        const lastResponseData = {
          text: respostaText,
          audioUrl: audioUrl,
          source,
          timestamp: Date.now()
        };
        setCache(lastResponseKey, lastResponseData, 3600).catch(e => {});

        // Histórico no Banco de Dados (Prisma)
        const embedding = JSON.stringify(generateTFIDFVector(question).data);
        
        prisma.chatHistory.create({
          data: {
            userId: (req as any).user?.id || null,
            sessionId,
            question,
            answer: respostaText,
            source,
            confidence: 100,
            audioUrl: audioUrl || null,
            embedding
          }
        }).catch(err => console.error(`[BG][PRISMA] Erro ao salvar histórico:`, err.message));

      } catch (bgErr: any) {
        console.error(`[BG][ERROR] Erro em tarefas de background:`, bgErr.message);
      }
    })();

  } catch (error) {
    console.error("[CHAT] ERRO CRÍTICO:", error);
    res.status(500).json({ error: "Erro interno no processamento." });
  }
}

