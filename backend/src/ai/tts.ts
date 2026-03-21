import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function gerarAudio(texto: string): Promise<string> {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
  const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; 

  const projectRoot = path.resolve(__dirname, "../../..");
  const publicAudioPath = path.join(projectRoot, "public", "audio");
  
  // Cria pasta se não existir
  if (!fs.existsSync(publicAudioPath)) {
    fs.mkdirSync(publicAudioPath, { recursive: true });
  }

  // Gera nome de arquivo baseado no hash do texto
  const textHash = crypto.createHash('md5').update(texto).digest('hex');
  const audioFile = `audio_${textHash}.mp3`;
  const audioPath = path.join(publicAudioPath, audioFile);
  const audioUrl = `/audio/${audioFile}`;

  // Se arquivo já existe, retorna a URL direto
  if (fs.existsSync(audioPath)) {
    console.log("[CACHE_ARQUIVO] Áudio já existe no disco");
    return audioUrl;
  }

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

      fs.writeFileSync(audioPath, response.data);
      console.log("[ELEVENLABS] Áudio gerado e salvo com sucesso");
      return audioUrl;
      
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
    
    fs.writeFileSync(audioPath, response.data);
    console.log("[GOOGLE_TTS] Áudio gerado via Google e salvo no disco");
    return audioUrl;
  } catch (e: any) {
    console.error(`[TTS] Erro fatal no fallback:`, e.message);
    return "";
  }
}
