import axios from "axios";
import { redis } from "../cache/redis";

interface AudioResponse {
  audioUrl: string;
  cached: boolean;
}

/**
 * Serviço de TTS otimizado com Redis + ElevenLabs
 * Implementa memoization puro: cache em Redis, geração sob demanda, sem ficheiros locais
 */
export async function gerarAudio(textoDaResposta: string): Promise<AudioResponse> {
  // 1. Normaliza o texto para chave Redis consistente
  const textoNormalizado = textoDaResposta.trim().toLowerCase();
  const chaveRedis = `audio:${textoNormalizado}`;

  try {
    // 2. CACHE HIT: Verifica Redis primeiro
    const audioEmCache = await redis.get(chaveRedis) as string | null;
    if (audioEmCache) {
      console.log(`[CACHE HIT] Base64 recuperado do Redis - Tokens poupados!`);
      return { 
        audioUrl: audioEmCache,
        cached: true 
      };
    }

    console.log(`[CACHE MISS] Gerando áudio na ElevenLabs...`);

    // 3. Se não tem no cache, chama ElevenLabs
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ElevenLabs API Key não configurada");
    }

    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      data: {
        text: textoDaResposta,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer' // CRUCIAL: recebemos binários, não texto
    });

    // 4. Conversão Mágica: Binário → Base64 com prefixo Data URI
    // O navegador sabe tocar "data:audio/mpeg;base64,..." nativamente
    const base64Audio = `data:audio/mpeg;base64,${Buffer.from(response.data).toString('base64')}`;

    // 5. Guarda no Redis para próximas requisições
    await redis.set(chaveRedis, base64Audio);
    console.log(`[ELEVENLABS] Áudio gerado, convertido e cacheado no Redis`);

    return {
      audioUrl: base64Audio,
      cached: false
    };

  } catch (error: any) {
    console.error("[ELEVENLABS] Erro na API:", error.message);
    
    // 6. FALLBACK: Tenta Google Translate TTS
    console.log("[FALLBACK] Tentando Google Translate TTS...");
    try {
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textoDaResposta.substring(0, 200))}&tl=pt-br&client=tw-ob`;
      
      const googleResponse = await axios({
        method: 'get',
        url: googleTtsUrl,
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      // Mesma conversão mágica para Google
      const base64Google = `data:audio/mpeg;base64,${Buffer.from(googleResponse.data).toString('base64')}`;
      
      // Guarda mesmo o fallback no Redis (mais barato que regenerar)
      await redis.set(chaveRedis, base64Google);
      console.log(`[GOOGLE_TTS] Áudio gerado via fallback e cacheado`);

      return {
        audioUrl: base64Google,
        cached: false
      };

    } catch (googleError: any) {
      console.error("[GOOGLE_TTS] Erro no fallback:", googleError.message);
      throw new Error("Falha total ao gerar áudio (ElevenLabs + Google)");
    }
  }
}
