import axios from "axios";

export async function gerarAudio(texto: string): Promise<string> {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
  const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; 

  // 1. Tenta ElevenLabs
  if (ELEVENLABS_API_KEY) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
    try {
      const response = await axios({
        method: 'post',
        url: url,
        data: {
          text: texto,
          model_id: "eleven_v3", 
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        },
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': ELEVENLABS_API_KEY, 
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer' 
      });

      const base64Audio = Buffer.from(response.data).toString('base64');
      console.log("[ELEVENLABS] Áudio gerado com sucesso (Base64)");
      return `data:audio/mpeg;base64,${base64Audio}`;
      
    } catch (error: any) {
      console.error("[ELEVENLABS] Erro na API, tentando fallback do Google...");
    }
  }

  try {
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto.substring(0, 200))}&tl=pt-br&client=tw-ob`;
    const response = await axios({
      method: 'get',
      url: googleTtsUrl,
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const base64Audio = Buffer.from(response.data).toString('base64');
    console.log("[TTS] Áudio gerado via Google Fallback (Base64)");
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (e: any) {
    console.error(`[TTS] Erro fatal no fallback:`, e.message);
    return "";
  }
}
