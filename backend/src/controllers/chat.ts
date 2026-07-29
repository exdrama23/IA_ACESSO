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
import { v4 as uuidv4 } from "uuid";
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
import { sanitizeInput } from "../utils/sanitizeData";

import { getEmbedding, findSimilarQuestions, findSimilarVoiceCache } from "../ai/vectorStore";
import { orchestrateAIResponse } from "../services/aiOrchestrator";
import { 
  buscarAudioSimilarEmVoiceCache, 
  incrementarUsageCount, 
  salvarAudioEmVoiceCache 
} from "../services/voiceCacheService";

export async function chat(req: Request, res: Response, next: any) {
  try {
    const startTime = performance.now();
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

    // Sanitização de Próximo Nível
    question = sanitizeInput(question);

    const questionEmbedding = await getEmbedding(question);
    const vectorStr = `[${questionEmbedding.join(',')}]`;

    console.log(`[SESSÃO: ${sessionId}] Pergunta a processar:`, question);

    // ✅ NOVO: Detectar comando de repetição ANTES de processar
    const isRepeatCommand = (q: string): boolean => {
      const patterns = ["pode repetir", "repete", "repita", "repete aí", "de novo", "fala de novo", "outra vez", "novamente"];
      const lowerQ = q.toLowerCase().trim();
      return patterns.some(p => lowerQ.includes(p));
    };

    if (isRepeatCommand(question)) {
      console.log(`[REPETIR] Comando de repeticao detectado`);
      
      const lastResponseKey = `session:${sessionId}:last_response`;
      const cachedLastResponse = await getCache(lastResponseKey) as any;

      if (cachedLastResponse) {
        try {
          const lastResponse = typeof cachedLastResponse === 'string' ? JSON.parse(cachedLastResponse) : cachedLastResponse;
          console.log(`[REPETIR] Ultima resposta encontrada: "${lastResponse.text.substring(0, 50)}..."`);
          
          return res.json({
            text: lastResponse.text,
            audioUrl: lastResponse.audioUrl || "",
            source: lastResponse.source,
            confidence: 100
          });
        } catch (e) {
          console.error("[REPETIR] Erro ao parsejar ultima resposta:", e);
        }
      } else {
        console.log(`[REPETIR] Nenhuma resposta anterior encontrada para repetir`);
        return res.json({
          text: "Não há resposta anterior para repetir. Faça uma pergunta primeiro.",
          audioUrl: ""
        });
      }
    }

    if (isMalicious(question)) {
      console.log('[CHAT] Pergunta bloqueada por filtro de segurança');
      return res.json({ text: "Comando bloqueado por segurança.", audioUrl: "" });
    }

    let respostaText = "";
    let contextText = "";
    let source = "IA_SEMANTICA";
    let matchScore = 0;

    // BUSCA VETORIAL NO HISTÓRICO E FAQ (PGVECTOR)
    const vectorMatches = await findSimilarQuestions(questionEmbedding, 0.85, 1);
    
    if (vectorMatches.length > 0) {
      const bestMatch = vectorMatches[0];
      const latency = performance.now() - startTime;
      
      console.log(`[CHAT] Match de alta precisao via PGVECTOR: "${bestMatch.question}" (Similarity: ${bestMatch.similarity.toFixed(3)})`);
      
      respostaText = bestMatch.answer;
      source = "DATABASE_VECTOR_MATCH";
      matchScore = bestMatch.similarity;
    }

    if (!respostaText) {
      const config = await getConfig();
      const history = await getConversationHistory(sessionId);

      // Busca contexto no banco usando vetores para a IA (Top 3)
      const semanticContext = await findSimilarQuestions(questionEmbedding, 0.6, 3);
      contextText = semanticContext.map(m => m.answer).join("\n");

      console.log(`[AI] Iniciando Orquestração (Executor + Juiz)...`);

      try {
        const orchResult = await orchestrateAIResponse(question, history);
        respostaText = orchResult.answer;
        source = orchResult.source;
        
        // Atribuir campos extras para salvar depois
        (req as any).aiMetadata = {
          isVerified: orchResult.isVerified,
          knowledgeVersion: orchResult.knowledgeVersion
        };

      } catch (orchError: any) {
        console.error(`[AI] Falha na orquestração:`, orchError.message);
        respostaText = "Desculpe, tive um problema ao processar sua resposta. Pode repetir?";
        source = "ERRO_SISTEMA";
      }

      if (respostaText && source !== "ERRO_SISTEMA") {
        const textCacheKey = gerarChave(question, "text");
        await setCache(textCacheKey, respostaText, THREE_DAYS_SECONDS);
      }
    }

    await addConversationHistory(sessionId, question, respostaText);

    const config = await getConfig();
    console.log(`[AUDIO] Processando cache de áudio...`);

    const activeVoiceId = config.tts.voiceId || "hpp4J3VqNfWAUOO0d1Us";
    console.log(`[AUDIO] Voz ativa: ${activeVoiceId}`);

    let audioUrl = "";
    let audioPublicId = "";
    let confidence = "100%";
    let audioSource = "NOVO";

    // ✅ ESTRATÉGIA DE CACHE DE ÁUDIO:
    // 1. Se é cache hit com audioUrl → reutilizar
    // 2. Se é LLM response → gerar áudio UMA VEZ
    // 3. Se não tiver audioUrl → gerar novo

    const isCacheHit = source === "DATABASE_VECTOR_MATCH" || source === "FAQ_CACHE";
    
    if (isCacheHit) {
      // ✅ CACHE HIT: Tentar reutilizar áudio
      console.log(`[ÁUDIO] 📦 Cache hit - Procurando áudio reutilizável...`);
      
      const voiceMatch = await findSimilarVoiceCache(questionEmbedding, 0.98);

      if (voiceMatch && voiceMatch.audioUrl) {
        console.log(`[ÁUDIO] ✅ Áudio reutilizado: "${voiceMatch.question}"`);
        audioUrl = voiceMatch.audioUrl;
        audioPublicId = voiceMatch.audioPublicId || "";
        audioSource = "DATABASE_VECTOR_VOICE_REUSE";
      } else {
        // Cache hit mas sem áudio - gerar apenas uma vez
        console.log(`[ÁUDIO] ⚠️ Cache hit sem áudio - Gerando novo...`);
        const { audioUrl: url, publicId: pId } = await gerarAudio(respostaText);

        if (url) {
          audioUrl = url;
          audioPublicId = pId || "";
          audioSource = "CLOUDINARY_FAQ_NOVO";
          
          // Salvar no VoiceCache para reutilizar depois
          await salvarAudioEmVoiceCache(
            question,
            audioUrl,
            activeVoiceId,
            audioPublicId,
            questionEmbedding
          );
        }
      }
    } else {
      // ❌ CACHE MISS: LLM foi usado - gerar áudio UMA VEZ
      console.log(`[ÁUDIO] 🤖 LLM response - Gerando áudio novo...`);
      const { audioUrl: url, publicId: pId } = await gerarAudio(respostaText, true);

      if (url) {
        audioUrl = url;
        audioPublicId = pId || "";
        audioSource = "CLOUDINARY_NOVO_IA";

        // Salvar no VoiceCache para reutilizar depois (mesmo sendo IA)
        await salvarAudioEmVoiceCache(
          question,
          audioUrl,
          activeVoiceId,
          audioPublicId,
          questionEmbedding
        );
      }
    }
    
    // ... (rest of summary code)

    try {
      const vectorStr = `[${questionEmbedding.join(',')}]`;
      const chatId = uuidv4();
      const aiMetadata = (req as any).aiMetadata || { isVerified: false, knowledgeVersion: null };
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO "ChatHistory" (
          id, "userId", "sessionId", question, answer, source, 
          confidence, "audioUrl", "audioPublicId", "isVerified", "knowledgeVersion", 
          embedding, "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '${vectorStr}'::vector, NOW(), NOW())
      `, 
      chatId, 
      (req as any).user?.id || null, 
      sessionId, 
      question, 
      respostaText, 
      source, 
      parseFloat(confidence), 
      audioUrl || null,
      audioPublicId || null,
      aiMetadata.isVerified,
      aiMetadata.knowledgeVersion
      );
      
    } catch (dbErr) {
      console.error('[PRISMA] Erro ao salvar histórico vetorial:', dbErr);
    }

    // ✅ NOVO: Armazenar última resposta no Redis para repetição
    try {
      const lastResponseKey = `session:${sessionId}:last_response`;
      const lastResponseData = {
        text: respostaText,
        audioUrl: audioUrl,
        source,
        confidence,
        timestamp: Date.now()
      };
      await setCache(lastResponseKey, JSON.stringify(lastResponseData), 3600); // 1 hora
      console.log(`[CACHE] Última resposta armazenada para sessão ${sessionId}`);
    } catch (cacheErr) {
      console.error("[CACHE] Erro ao armazenar última resposta:", cacheErr);
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

/**
 * 🎯 Novo Endpoint: Predizer tipo de resposta (Cache vs IA)
 * 
 * Permite o frontend SABER ANTES se a resposta será rápida (cache) ou lenta (IA)
 * e mostrar a notificação apropriada.
 */
export async function predictResponseType(req: Request, res: Response, next: any) {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        type: "error",
        message: "Pergunta não fornecida"
      });
    }

    const question = text.trim();
    console.log('[PREDICT] Analisando tipo de resposta para:', question.substring(0, 50));

    // Gerar embedding da pergunta
    const questionEmbedding = await getEmbedding(question);

    // Buscar no banco com threshold alto (0.85)
    const vectorMatches = await findSimilarQuestions(questionEmbedding, 0.85, 1);

    if (vectorMatches.length > 0) {
      // ✅ CACHE HIT - Resposta rápida!
      console.log('[PREDICT] Cache hit detectado!');
      return res.json({
        type: "cache",
        message: "Encontrei a resposta! ⚡",
        icon: "🚀",
        estimatedTime: "< 100ms",
        willCallAI: false
      });
    }

    // ❌ NÃO ENCONTROU - Vai chamar IA
    console.log('[PREDICT] Cache miss - será necessário chamar IA');
    return res.json({
      type: "ai",
      message: "Sua pergunta foi interessante, vou processar um pouco... 🤔",
      icon: "🤖",
      estimatedTime: "1-3 segundos",
      willCallAI: true
    });

  } catch (error) {
    console.error('[PREDICT] Erro:', error);
    res.status(500).json({
      type: "error",
      message: "Erro ao analisar pergunta"
    });
  }
}
