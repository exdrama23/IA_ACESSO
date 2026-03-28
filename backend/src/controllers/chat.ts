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

    if (isMalicious(question)) {
      return res.json({ text: "Comando bloqueado por segurança.", audioUrl: "" });
    }

    let respostaText = "";
    let contextText = "";
    let source = "IA_SEMANTICA";
    let matchScore = 0;

    // ═══════════════════════════════════════════════════════════════
    // PASSO 1: Detectar categoria com NEURAL embeddings
    // ═══════════════════════════════════════════════════════════════
    const neuralMatch = await neuralDetector.findCategoryBySimilarity(question, 0.85);

    if (neuralMatch) {
      const latency = performance.now() - startTime;
      neuralMetrics.recordNeuralMatch(neuralMatch.score, latency);
      
      console.log(`[CHAT] ✓ Categoria detectada por rede neural: ${neuralMatch.categoria} (Score: ${neuralMatch.score.toFixed(3)})`);
      
      let faqItem: any = undefined;
      for (const cat in faq) {
        faqItem = faq[cat].find((item: any) => item.category === neuralMatch.categoria);
        if (faqItem) break;
      }

      if (faqItem) {
        // IA fala e exibe apenas o texto da resposta
        respostaText = faqItem.answer;
        source = "FAQ_NEURAL";
        matchScore = neuralMatch.score;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PASSO 2: Fallback para Cache Redis (Texto)
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // PASSO 3: Fallback para Gemini
    // ═══════════════════════════════════════════════════════════════
    if (!respostaText) {
      neuralMetrics.recordGeminiMatch();
      try {
        console.log("[GEMINI] Consultando API do Gemini...");
        const history = await getConversationHistory(sessionId);
        
        // Usar busca semântica legada APENAS para fornecer contexto ao Gemini se neural falhar
        const topMatches = await searchFAQ(question, 2);
        contextText = topMatches.map(m => m.item.answer).join("\n");

        respostaText = await askGemini(question, contextText, history);

        const textCacheKey = gerarChave(question, "text");
        await setCache(textCacheKey, respostaText, THREE_DAYS_SECONDS);
        source = "IA_GEMINI";
      } catch (geminiError) {
        console.error("FALHA NO GEMINI.");
        respostaText = "Desculpe, estou com uma instabilidade técnica. Pode repetir a pergunta em instantes?";
        source = "ERRO_SISTEMA";
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

    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`[FLUXO] INICIANDO BUSCA DE ÁUDIO EM CACHE`);
    console.log(`═══════════════════════════════════════════════`);

    // PASSO 1: Buscar perguntas SIMILARES no Redis (mesma categoria + semântica)
    console.log(`\n[PASSO 1] Buscando perguntas similares no Redis...`);
    const similarQuestion = await findSimilarCachedQuestion(question, activeVoiceId, 0.5);

    if (similarQuestion && similarQuestion.audioUrl) {
      console.log(`\n✓ [SUCESSO] Pergunta similar encontrada!`);
      console.log(`  Pergunta similar: "${similarQuestion.pergunta}"`);
      console.log(`  Categoria: ${similarQuestion.category || "Sem categoria"}`);
      console.log(`  URL do áudio (Redis): ${similarQuestion.audioUrl}`);
      console.log(`\n  → REUTILIZANDO áudio existente (SEM gerar novo)`);
      
      audioUrl = similarQuestion.audioUrl;
      audioSource = "REDIS_SIMILAR";
      source = `${source}_AUDIO_REDIS_SIMILAR`;
      
      // Salvar a NOVA pergunta com o MESMO áudio (sem fazer novo upload)
      console.log(`\n[PASSO 2] Salvando nova pergunta vinculada ao áudio existente...`);
      await cacheQuestionWithAudio(question, audioUrl, activeVoiceId, config.audio.ttl_seconds);
      console.log(`  ✓ Nova pergunta cacheada com URL do Redis`);
      
    } else {
      // PASSO 2: Se não encontrar similar, buscar por EXATIDÃO na pergunta
      console.log(`\n[PASSO 2] Nenhuma similar encontrada. Buscando por exatidão...`);
      const cachedAudio = await getCachedAudioByQuestion(question, activeVoiceId);
      
      if (cachedAudio && cachedAudio.audioUrl) {
        console.log(`\n✓ [SUCESSO] Pergunta exata encontrada!`);
        console.log(`  URL do áudio (Redis): ${cachedAudio.audioUrl}`);
        console.log(`\n  → REUTILIZANDO áudio existente (SEM gerar novo)`);
        
        audioUrl = cachedAudio.audioUrl;
        audioSource = "REDIS_EXATO";
        source = source === "CACHE_REDIS" ? "CACHE_AUDIO_REDIS" : `${source}_AUDIO_REDIS_EXATO`;
        
      } else {
        // PASSO 3: Se não encontrar nada, gerar novo áudio
        console.log(`\n[PASSO 3] Nenhum áudio em cache. Gerando novo áudio com TTS...`);
        const audioUrl_generated = await gerarAudio(respostaText);

        if (audioUrl_generated) {
          console.log(`\n✓ [SUCESSO] Áudio gerado e enviado para Cloudinary`);
          console.log(`  Nova URL (Cloudinary): ${audioUrl_generated}`);
          
          audioUrl = audioUrl_generated;
          audioSource = "CLOUDINARY_NOVO";
          
          // Salvar a nova pergunta com seu novo áudio
          console.log(`\n[PASSO 4] Salvando pergunta com novo áudio...`);
          await cacheQuestionWithAudio(question, audioUrl, activeVoiceId, config.audio.ttl_seconds);
          console.log(`  ✓ Pergunta cacheada no Redis com URL da Cloudinary`);
        } else {
          console.error("\n✗ [ERRO] Falha ao gerar áudio");
          audioUrl = "";
        }
      }
    }
    
    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`[RESUMO] Fonte do áudio: ${audioSource}`);
    console.log(`═══════════════════════════════════════════════\n`);

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
