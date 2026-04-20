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

    // BUSCA NEURAL UNIFICADA (threshold 0.85)
    // O motor agora retorna a resposta direta do item mais similar ou match literal
    const neuralMatch = await neuralDetector.searchInFAQ(question, 0.85);

    if (neuralMatch) {
      const latency = performance.now() - startTime;
      neuralMetrics.recordNeuralMatch(neuralMatch.score, latency);
      
      console.log(`[CHAT] Match de alta precisao via Rede Neural: "${neuralMatch.perguntaSimilar}" (Score: ${neuralMatch.score.toFixed(3)})`);
      
      respostaText = neuralMatch.resposta;
      source = "FAQ_NEURAL_UNIFICADO";
      matchScore = neuralMatch.score;
    }

    if (!respostaText) {
      const textCacheKey = gerarChave(question, "text");
      const cachedResponse = await getCache(textCacheKey) as string;

      if (cachedResponse) {
        neuralMetrics.recordCacheMatch();
        console.log("[CACHE] Resposta de texto recuperada do Redis");
        respostaText = cachedResponse;
        source = "CACHE_REDIS";
      }
    }

    if (!respostaText) {
      const config = await getConfig();
      const history = await getConversationHistory(sessionId);

      // Busca contexto para a IA usando o motor neural (Top 2 resultados)
      const topMatches = await neuralDetector.getTopMatches(question, 2);
      contextText = topMatches.map(m => m.resposta).join("\n");

      const primary = config.chat.primary;
      const fallback = config.chat.fallback;
      const tertiary = config.chat.tertiary;

      console.log(`[AI] Configuração: Primary=${primary}, Fallback=${fallback}, Tertiary=${tertiary}, UseFallback=${config.chat.useFallback}`);

      try {
        console.log(`[AI] Consultando provedor primário: ${primary}...`);
        respostaText = await askAI(primary, question, contextText, history);
        source = `IA_${primary.toUpperCase()}`;
      } catch (primaryError: any) {
        console.warn(`[AI] Falha no provedor primário (${primary}):`, primaryError.message);
        
        if (config.chat.useFallback) {
          try {
            console.log(`[AI] Consultando fallback: ${fallback}...`);
            respostaText = await askAI(fallback, question, contextText, history);
            source = `IA_${fallback.toUpperCase()}_FALLBACK`;
            
            console.log(`[AI] FALLBACK FUNCIONOU! Promovendo ${fallback} a provedor principal...`);

            const newConfig = { ...config };
            newConfig.chat.primary = fallback;
            newConfig.chat.fallback = primary;
            newConfig.metadata.last_modified = Date.now();
            newConfig.metadata.modified_by = 'system:auto-failover';
            newConfig.metadata.version++;
            
            await saveConfig(newConfig, 'system@auto-failover');
            await createSystemNotification({
              type: 'warning',
              title: `Falha em ${primary} - Fallback Ativado`,
              message: `Houve um erro na chave API do ${primary}. ${fallback} agora é o provedor principal. A chave do ${primary} será retestada em breve.`
            });
            
          } catch (fallbackError) {
            console.warn(`[AI] Falha no fallback (${fallback}):`, (fallbackError as any).message);

            try {
              console.log(`[AI] Consultando terceiro fallback: ${tertiary}...`);
              respostaText = await askAI(tertiary, question, contextText, history);
              source = `IA_${tertiary.toUpperCase()}_TERTIARY_FALLBACK`;

              console.log(`[AI] TERCEIRO FALLBACK FUNCIONOU! Promovendo ${tertiary} a provedor principal...`);
              
              const newConfig = { ...config };
              newConfig.chat.primary = tertiary;
              newConfig.chat.fallback = fallback;
              newConfig.chat.tertiary = primary;
              newConfig.metadata.last_modified = Date.now();
              newConfig.metadata.modified_by = 'system:auto-failover-tertiary';
              newConfig.metadata.version++;
              
              await saveConfig(newConfig, 'system@auto-failover-tertiary');
              
              await createSystemNotification({
                type: 'error',
                title: `Falha em ${primary} e ${fallback} - ${tertiary} Ativado`,
                message: `Erros nos provedores ${primary} e ${fallback}. ${tertiary} agora é o provedor principal (modo emergência).`
              });
              
            } catch (tertiaryError) {
              console.error(`[AI]  FALHA TOTAL (Primário, Fallback e Tertiary).`);
              respostaText = "Desculpe, estou com uma instabilidade técnica severa. Pode repetir a pergunta em alguns minutos?";
              source = "ERRO_SISTEMA";
            }
          }
        } else {
          respostaText = "Desculpe, tive um problema ao processar sua resposta.";
          source = "ERRO_SISTEMA";
        }
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
    let confidence = "100%";
    let audioSource = "NOVO";

    // ⚠️ REGRA DE OURO GSD: Reaproveitamento de áudio
    // 1. Se for FAQ (Neural 0.85+), busca áudio exato para aquela resposta no DB
    // 2. Se for IA Generativa, SEMPRE gera áudio novo para evitar alucinações
    const isFAQMatch = source === "FAQ_NEURAL_UNIFICADO";

    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`[ÁUDIO] INICIANDO ESTRATÉGIA DE ÁUDIO`);
    console.log(`═══════════════════════════════════════════════`);

    if (!isFAQMatch) {
      console.log(`\n[ÁUDIO] 🤖 RESPOSTA DE IA DETECTADA - Gerando áudio único...`);
      const audioUrl_generated = await gerarAudio(respostaText, true);

      if (audioUrl_generated) {
        audioUrl = audioUrl_generated;
        audioSource = "CLOUDINARY_NOVO_IA";
        
        // Cacheia para repetições imediatas na mesma sessão
        await cacheQuestionWithAudio(question, audioUrl, activeVoiceId, config.audio.ttl_seconds);
      }
    } else {
      console.log(`[ÁUDIO] RESPOSTA DE FAQ DETECTADA - Buscando cache de áudio...`);
      
      const targetQuestion = neuralMatch?.perguntaSimilar || question;
      
      const dbCachedVoice = await prisma.voiceCache.findUnique({
        where: { question: targetQuestion }
      });

      if (dbCachedVoice && dbCachedVoice.audioUrl) {
        console.log(`[ÁUDIO] Audio reaproveitado do FAQ: "${targetQuestion}"`);
        audioUrl = dbCachedVoice.audioUrl;
        audioSource = "DATABASE_FAQ_REUSE";
        
        await prisma.voiceCache.update({
          where: { id: dbCachedVoice.id },
          data: { usageCount: { increment: 1 }, lastUsed: new Date() }
        });
      } else {
        console.log(`[ÁUDIO] Novo áudio necessário para: "${targetQuestion}"`);
        const audioUrl_generated = await gerarAudio(respostaText);

        if (audioUrl_generated) {
          audioUrl = audioUrl_generated;
          audioSource = "CLOUDINARY_FAQ_NOVO";
          
          await prisma.voiceCache.upsert({
            where: { question: targetQuestion },
            update: { audioUrl, usageCount: { increment: 1 }, lastUsed: new Date() },
            create: { question: targetQuestion, audioUrl, voiceId: activeVoiceId }
          });
        }
      }
    }
    
    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`[RESUMO] Fonte do áudio: ${audioSource}`);
    console.log(`═══════════════════════════════════════════════\n`);

    try {
      const existingErrorRecord = await prisma.chatHistory.findFirst({
        where: {
          question: question,
          source: "ERRO_SISTEMA"
        }
      });

      if (existingErrorRecord && source !== "ERRO_SISTEMA") {
        await prisma.chatHistory.update({
          where: { id: existingErrorRecord.id },
          data: {
            answer: respostaText,
            source: source,
            confidence: parseFloat(confidence),
            audioUrl: audioUrl || null,
            embedding: JSON.stringify(generateTFIDFVector(question).data),
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.chatHistory.create({
          data: {
            userId: (req as any).user?.id || null,
            sessionId,
            question,
            answer: respostaText,
            source,
            confidence: parseFloat(confidence),
            audioUrl: audioUrl || null,
            embedding: JSON.stringify(generateTFIDFVector(question).data)
          }
        });
      }
    } catch (dbErr) {
      console.error('[PRISMA] Erro ao salvar histórico:', dbErr);
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
