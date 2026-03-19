import { Request, Response } from "express";
import { isMalicious } from "../security/filter";
import { getCache, setCache, gerarChave, getConversationHistory, addConversationHistory } from "../cache/redis";
import { searchFAQ } from "../ai/embeddings";
import { askGemini } from "../ai/gemini";
import { gerarAudio } from "../ai/tts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// TRANSCRIÇÃO REAL USANDO GEMINI
async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  try {
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

    let contextText = "";
    if (topMatches.length > 0 && topMatches[0].score > 0.4) {
      console.log(`[BUSCA SEMÂNTICA] Top Match Score: ${topMatches[0].score}`);
      contextText = topMatches
        .filter(match => match.score > 0.4)
        .map(match => match.item.answer)
        .join(" ");
    } else {
      console.log(`[BUSCA SEMÂNTICA] Nenhuma correspondência forte encontrada.`);
    }

    const history = await getConversationHistory(sessionId);

    const respostaText = await askGemini(question, contextText, history);

    await addConversationHistory(sessionId, question, respostaText);


    const audioCacheKey = gerarChave(respostaText, "audio");
    let audioUrl = await getCache(audioCacheKey) as string;

    if (!audioUrl) {
      audioUrl = await gerarAudio(respostaText);
      if (audioUrl) {
        await setCache(audioCacheKey, audioUrl, 172800); 
      }
    } else {
      console.log("[CACHE] Áudio recuperado do cache");
    }

    res.json({ text: respostaText, audioUrl, source: "IA_SEMANTICA" });

  } catch (error) {
    console.error("Erro Pipeline:", error);
    res.status(500).json({ error: "Erro interno" });
  }
}
